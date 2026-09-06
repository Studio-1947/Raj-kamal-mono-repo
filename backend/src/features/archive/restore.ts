// ─────────────────────────────────────────────────────────────────────────────
// restore.ts
//
// Puts archived data back into a live region table. Two sources, two guarantees:
//
//   restoreFromSnapshot — replays the exact rows the table held at capture time. This
//     is the one to reach for after a bad import: it is byte-for-byte what the dashboard
//     was serving, with no re-parsing and no dependency on the sheet still existing.
//
//   restoreFromDump — re-parses an archived sheet export through the live parser and
//     imports the result. Use this to import an export the guard refused (once a human
//     has confirmed it is genuinely fine), or to rebuild from a point where no snapshot
//     survives retention.
//
// Both are wipe-and-replace inside one transaction, matching how the sync itself writes,
// and both snapshot the current contents first — so an ill-judged restore is itself
// undoable. Every restore is logged to restore_events.
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma.js";
import { offlineSyncService } from "../sales/server/offlineSyncService.js";
import { readDumpBytes, readSnapshotRows, getSnapshotMeta, getDumpMeta, recordRestore } from "./archiveStore.js";
import { takePreSyncSnapshot } from "./snapshot.js";
import { requireRegion, type RegionSpec } from "./regions.js";

export interface RestoreResult {
  region: string;
  sourceKind: "snapshot" | "dump";
  sourceId: number;
  rowsWritten: number;
  rowsReplaced: number;
  safetySnapshotId: number | null;
  dryRun: boolean;
}

export interface RestoreOptions {
  /** Report what would happen without writing anything. */
  dryRun?: boolean;
  /** Skip the pre-restore safety snapshot. Not recommended. */
  skipSafetySnapshot?: boolean;
  actor?: string | undefined;
  note?: string | undefined;
}

const CHUNK = 2000;

/** Columns Postgres owns; a snapshot carries them but they must not be re-inserted. */
const GENERATED_COLUMNS = new Set(["id"]);

const DATE_COLUMNS = new Set(["date", "createdAt"]);
const DECIMAL_COLUMNS = new Set(["rate", "discount", "addDiscount", "amount", "inAmount"]);

/**
 * Parses a timestamp out of snapshot JSON, forcing UTC when no zone is given.
 *
 * Prisma maps DateTime to `timestamp(3)` — WITHOUT time zone — and stores UTC in it.
 * `to_jsonb()` renders that as "2026-08-08T00:00:00" with no zone designator, and
 * `new Date()` reads a zone-less string as LOCAL time. On an IST server that silently
 * moved every restored date back 5h30m, which reassigns sales across day, month and
 * financial-year boundaries. Pin the zone explicitly instead.
 */
function parseStoredTimestamp(value: unknown): Date | null {
  const s = String(value).trim().replace(" ", "T");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(s);
  const d = new Date(hasZone ? s : `${s}Z`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Snapshot rows arrive as JSON, so dates are ISO strings and Decimals are strings.
 * Prisma's createMany needs real Dates and numbers, so coerce by looking at the field
 * rather than by guessing from the value — `dateStr` is a string that must stay one.
 */
function reviveSnapshotRow(row: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (GENERATED_COLUMNS.has(k)) continue;
    if (v === null || v === undefined) {
      out[k] = null;
      continue;
    }
    if (DATE_COLUMNS.has(k)) {
      out[k] = parseStoredTimestamp(v);
    } else if (DECIMAL_COLUMNS.has(k)) {
      const n = Number(v);
      out[k] = Number.isFinite(n) ? n : null;
    } else {
      out[k] = v;
    }
  }
  // rawJson is a REQUIRED Json column on every region model, but snapshots omit it by
  // default (ARCHIVE_SNAPSHOT_RAW_JSON=false — it duplicates what the dump archive
  // already holds and roughly triples snapshot size). Without a value here, createMany
  // rejects the whole batch and the restore fails at the worst possible moment. An empty
  // array is the same shape the parser writes, so downstream readers see nothing unusual;
  // the verbatim sheet row remains available in the corresponding dump.
  if (out.rawJson === undefined || out.rawJson === null) out.rawJson = [];
  return out;
}

async function writeRows(spec: RegionSpec, records: any[]): Promise<{ written: number; replaced: number }> {
  let written = 0;
  let replaced = 0;
  await prisma.$transaction(
    async (tx) => {
      const model = (tx as any)[modelKeyFor(spec)];
      const before = await model.count();
      replaced = before;
      await model.deleteMany({});
      for (let i = 0; i < records.length; i += CHUNK) {
        const res = await model.createMany({ data: records.slice(i, i + CHUNK), skipDuplicates: true });
        written += res.count;
      }
    },
    { maxWait: 30_000, timeout: 240_000 },
  );
  return { written, replaced };
}

/** Prisma delegate name for a region, needed to address the model on a tx client. */
function modelKeyFor(spec: RegionSpec): string {
  const target = spec.model();
  const key = Object.keys(prisma).find((k) => {
    if (k.startsWith("$") || k.startsWith("_")) return false;
    try {
      return (prisma as any)[k] === target;
    } catch {
      return false;
    }
  });
  if (!key) throw new Error(`Could not resolve a Prisma model key for region "${spec.region}"`);
  return key;
}

/** Replays a captured snapshot back into its region's live table. */
export async function restoreFromSnapshot(
  snapshotId: number,
  opts: RestoreOptions = {},
): Promise<RestoreResult> {
  const meta = await getSnapshotMeta(snapshotId);
  if (!meta) throw new Error(`Snapshot #${snapshotId} not found in the archive.`);
  if (!meta.restorable) {
    throw new Error(
      `Snapshot #${snapshotId} has no stored rows — its blob was either never captured ` +
        `(ARCHIVE_SNAPSHOT_ROWS=false at the time) or aged out by retention. Restore from a dump instead.`,
    );
  }
  const spec = requireRegion(meta.region);

  const rows = await readSnapshotRows(snapshotId);
  if (!rows || rows.length === 0) throw new Error(`Snapshot #${snapshotId} decompressed to zero rows.`);
  const records = rows.map(reviveSnapshotRow);

  if (opts.dryRun) {
    return {
      region: spec.region,
      sourceKind: "snapshot",
      sourceId: snapshotId,
      rowsWritten: records.length,
      rowsReplaced: await spec.model().count(),
      safetySnapshotId: null,
      dryRun: true,
    };
  }

  const safetySnapshotId = opts.skipSafetySnapshot
    ? null
    : await takePreSyncSnapshot(spec, null, `pre-restore-from-snapshot-${snapshotId}`);

  const { written, replaced } = await writeRows(spec, records);
  await recordRestore({
    region: spec.region,
    sourceKind: "snapshot",
    sourceId: snapshotId,
    rowsWritten: written,
    actor: opts.actor,
    note: opts.note,
  });

  return {
    region: spec.region,
    sourceKind: "snapshot",
    sourceId: snapshotId,
    rowsWritten: written,
    rowsReplaced: replaced,
    safetySnapshotId,
    dryRun: false,
  };
}

/**
 * Re-parses an archived sheet export and imports it. This is also the "approve" path for
 * an export the guard rejected — the operator has looked at it and decided it is real.
 */
export async function restoreFromDump(dumpId: number, opts: RestoreOptions = {}): Promise<RestoreResult> {
  const meta = await getDumpMeta(dumpId);
  if (!meta) throw new Error(`Dump #${dumpId} not found in the archive.`);
  if (!meta.restorable) {
    throw new Error(`Dump #${dumpId} no longer has its stored bytes (aged out by retention).`);
  }
  const spec = requireRegion(meta.region);

  const raw = await readDumpBytes(dumpId);
  if (!raw) throw new Error(`Dump #${dumpId} decompressed to nothing.`);

  const workbook = XLSX.read(raw, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error(`Dump #${dumpId} contains no sheets.`);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Dump #${dumpId}: sheet "${sheetName}" is unreadable.`);
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Same last-known-good metadata backfill the live sync applies, so a restore can't
  // blank out author/binding/publisher that the export happens to leave empty.
  const preserveMap = await offlineSyncService.buildPreserveMap(spec.model());
  const parsed = offlineSyncService.parseRows(rows, spec.model(), preserveMap);
  if (parsed.records.length === 0) throw new Error(`Dump #${dumpId} parsed to zero rows; refusing to wipe the table.`);

  if (opts.dryRun) {
    return {
      region: spec.region,
      sourceKind: "dump",
      sourceId: dumpId,
      rowsWritten: parsed.records.length,
      rowsReplaced: await spec.model().count(),
      safetySnapshotId: null,
      dryRun: true,
    };
  }

  const safetySnapshotId = opts.skipSafetySnapshot
    ? null
    : await takePreSyncSnapshot(spec, dumpId, `pre-restore-from-dump-${dumpId}`);

  const { written, replaced } = await writeRows(spec, parsed.records);
  await recordRestore({
    region: spec.region,
    sourceKind: "dump",
    sourceId: dumpId,
    rowsWritten: written,
    actor: opts.actor,
    note: opts.note,
  });

  return {
    region: spec.region,
    sourceKind: "dump",
    sourceId: dumpId,
    rowsWritten: written,
    rowsReplaced: replaced,
    safetySnapshotId,
    dryRun: false,
  };
}
