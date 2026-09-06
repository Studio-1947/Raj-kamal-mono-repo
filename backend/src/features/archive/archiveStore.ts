// ─────────────────────────────────────────────────────────────────────────────
// archiveStore.ts
//
// Read/write layer over the archive database. Two things get archived:
//
//   sheet_dumps     — the raw bytes of every Google-Sheet export we ever fetched,
//                     gzipped, content-hashed, with the verdict we reached on it.
//   table_snapshots — the full contents of a live region table captured immediately
//                     BEFORE the destructive wipe, as gzipped JSONL.
//
// Between them, any past state is reconstructable: the snapshot replays exactly what
// the table held, and the dump replays exactly what the sheet said.
//
// EVERY write here is best-effort. An archive failure must never break a sync — the
// worst outcome of a broken archive is a missing backup, and the worst outcome of an
// archive that throws is a broken production sync. Callers get `null` on failure.
//
// BYTEA is moved as hex text (encode/decode) rather than as a driver-level binary
// parameter. Costs 2x on the wire, but behaves identically across Prisma versions and
// connection poolers, which matters for the one code path that has to work when
// everything else is broken.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import zlib from "zlib";
import { promisify } from "util";
import { archiveDb, ensureArchiveSchema } from "./archiveDb.js";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// "warned" = the guard objected but ARCHIVE_GUARD=warn let the import through anyway.
// Those rows DID reach the live table, so they count as a baseline for the next run —
// otherwise the baseline would freeze at the last clean day and every subsequent run
// would be measured against increasingly stale numbers.
export type Verdict = "accepted" | "rejected" | "warned" | "pending";

const BASELINE_VERDICTS = "('accepted','warned')";

/** Prisma raw returns BigInt/Decimal; JSON.stringify chokes on BigInt. Normalise. */
export function jsonSafe<T>(value: T): any {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `<${value.length} bytes>`;
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === "object") {
    // Prisma Decimal exposes toNumber(); unwrap it rather than emitting {s,e,d}.
    const anyVal = value as any;
    if (typeof anyVal.toNumber === "function" && typeof anyVal.toFixed === "function") {
      return anyVal.toNumber();
    }
    const out: any = {};
    for (const [k, v] of Object.entries(anyVal)) out[k] = jsonSafe(v);
    return out;
  }
  return value;
}

export function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export interface DumpStats {
  sheetRowCount: number;
  headers: string[];
  parsedRowCount: number;
  parsedTotalAmount: number;
  parsedTotalQty: number;
}

/**
 * Volume totals over parsed records. These are what the guard compares against the
 * previous accepted export — deliberately coarse, because the guard is looking for a
 * collapse, not for a discrepancy.
 */
export function summarizeRecords(records: any[]): { totalAmount: number; totalQty: number } {
  let totalAmount = 0;
  let totalQty = 0;
  for (const r of records) {
    const a = Number(r?.amount);
    const q = Number(r?.qty);
    if (Number.isFinite(a)) totalAmount += a;
    if (Number.isFinite(q)) totalQty += q;
  }
  // Rounded: the column is NUMERIC(18,2) and float accumulation over 100k rows leaves
  // a long tail of noise digits that make stored baselines annoying to eyeball.
  return { totalAmount: Math.round(totalAmount * 100) / 100, totalQty };
}

export interface RecordedDump {
  id: number;
  sha256: string;
  /** Set when this export was byte-identical to an earlier one; bytes stored once. */
  duplicateOf: number | null;
}

/**
 * Archives one raw sheet export. Byte-identical repeat exports store metadata only and
 * point `duplicate_of` at the first copy — the sheet is re-fetched on every boot as well
 * as daily, so unchanged days would otherwise dominate storage.
 */
export async function recordDump(params: {
  region: string;
  sourceUrl: string;
  trigger: string;
  raw: Buffer;
  stats: DumpStats;
}): Promise<RecordedDump | null> {
  try {
    await ensureArchiveSchema();
    const db = archiveDb();
    const { region, sourceUrl, trigger, raw, stats } = params;
    const digest = sha256(raw);

    // Reuse the bytes of the newest earlier dump with this exact content, but only if
    // that row still HAS its bytes (retention pruning may have cleared them).
    const prior: any[] = await db.$queryRawUnsafe(
      `SELECT "id" FROM "sheet_dumps"
        WHERE "region" = $1 AND "content_sha256" = $2 AND "raw_gz" IS NOT NULL
        ORDER BY "fetched_at" DESC LIMIT 1`,
      region,
      digest,
    );
    const duplicateOf: number | null = prior.length ? Number(prior[0].id) : null;

    let gzHex: string | null = null;
    let gzSize: number | null = null;
    if (!duplicateOf) {
      const gz = await gzip(raw, { level: 9 });
      gzHex = gz.toString("hex");
      gzSize = gz.length;
    }

    const inserted: any[] = await db.$queryRawUnsafe(
      `INSERT INTO "sheet_dumps"
         ("region","source_url","trigger","content_sha256","raw_gz","raw_size_bytes",
          "gz_size_bytes","duplicate_of","sheet_row_count","headers","parsed_row_count",
          "parsed_total_amount","parsed_total_qty","verdict")
       VALUES ($1,$2,$3,$4,
               CASE WHEN $5::text IS NULL THEN NULL ELSE decode($5::text,'hex') END,
               $6,$7,$8,$9,$10::jsonb,$11,$12,$13,'pending')
       RETURNING "id"`,
      region,
      sourceUrl,
      trigger,
      digest,
      gzHex,
      raw.length,
      gzSize,
      duplicateOf,
      stats.sheetRowCount,
      JSON.stringify(stats.headers ?? []),
      stats.parsedRowCount,
      stats.parsedTotalAmount,
      stats.parsedTotalQty,
    );

    return { id: Number(inserted[0].id), sha256: digest, duplicateOf };
  } catch (e: any) {
    console.error(`[archive] recordDump(${params.region}) failed:`, e?.message || e);
    return null;
  }
}

/**
 * Fills in the parse-derived figures on a dump that was archived before parsing.
 * The bytes are recorded the moment they arrive — before XLSX touches them — so an
 * export the parser refuses outright is still preserved for inspection.
 */
export async function updateDumpStats(
  dumpId: number,
  stats: Pick<DumpStats, "headers" | "parsedRowCount" | "parsedTotalAmount" | "parsedTotalQty">,
): Promise<void> {
  try {
    await ensureArchiveSchema();
    await archiveDb().$executeRawUnsafe(
      `UPDATE "sheet_dumps"
          SET "headers" = $2::jsonb, "parsed_row_count" = $3,
              "parsed_total_amount" = $4, "parsed_total_qty" = $5
        WHERE "id" = $1`,
      dumpId,
      JSON.stringify(stats.headers ?? []),
      stats.parsedRowCount,
      stats.parsedTotalAmount,
      stats.parsedTotalQty,
    );
  } catch (e: any) {
    console.error(`[archive] updateDumpStats(${dumpId}) failed:`, e?.message || e);
  }
}

/** Stamps the guard's decision onto an already-archived dump. */
export async function setDumpVerdict(
  dumpId: number,
  verdict: Verdict,
  reason: string | null,
  checks: unknown,
): Promise<void> {
  try {
    await ensureArchiveSchema();
    await archiveDb().$executeRawUnsafe(
      `UPDATE "sheet_dumps" SET "verdict" = $2, "verdict_reason" = $3, "checks" = $4::jsonb WHERE "id" = $1`,
      dumpId,
      verdict,
      reason,
      JSON.stringify(checks ?? {}),
    );
  } catch (e: any) {
    console.error(`[archive] setDumpVerdict(${dumpId}) failed:`, e?.message || e);
  }
}

export interface DumpBaseline {
  id: number;
  fetchedAt: Date;
  parsedRowCount: number;
  parsedTotalAmount: number;
  parsedTotalQty: number;
  contentSha256: string;
}

/**
 * The most recent export we accepted for this region — the yardstick the guard measures
 * a new export against. `null` on the very first sync, which is why a first run is always
 * allowed through.
 */
export async function getLastAcceptedDump(region: string): Promise<DumpBaseline | null> {
  try {
    await ensureArchiveSchema();
    const rows: any[] = await archiveDb().$queryRawUnsafe(
      `SELECT "id","fetched_at","parsed_row_count","parsed_total_amount","parsed_total_qty","content_sha256"
         FROM "sheet_dumps"
        WHERE "region" = $1 AND "verdict" IN ${BASELINE_VERDICTS}
        ORDER BY "fetched_at" DESC LIMIT 1`,
      region,
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: Number(r.id),
      fetchedAt: new Date(r.fetched_at),
      parsedRowCount: Number(r.parsed_row_count ?? 0),
      parsedTotalAmount: Number(r.parsed_total_amount ?? 0),
      parsedTotalQty: Number(r.parsed_total_qty ?? 0),
      contentSha256: String(r.content_sha256),
    };
  } catch (e: any) {
    console.error(`[archive] getLastAcceptedDump(${region}) failed:`, e?.message || e);
    return null;
  }
}

export interface SnapshotSummary {
  rowCount: number;
  totalAmount: number | null;
  totalQty: number | null;
  distinctIsbns: number | null;
  minDate: Date | null;
  maxDate: Date | null;
}

/**
 * Persists a pre-wipe capture. `rowsGz` arrives already gzipped — snapshot.ts streams
 * the table through gzip as it pages, so the uncompressed body never exists in full.
 * `rowsSizeBytes` is that uncompressed size, kept for reporting.
 */
export async function recordSnapshot(params: {
  region: string;
  table: string;
  reason: string;
  dumpId: number | null;
  summary: SnapshotSummary;
  rowsGz: Buffer | null;
  rowsSizeBytes: number | null;
}): Promise<number | null> {
  try {
    await ensureArchiveSchema();
    const db = archiveDb();
    const { region, table, reason, dumpId, summary, rowsGz, rowsSizeBytes } = params;

    const gzHex: string | null = rowsGz && rowsGz.length ? rowsGz.toString("hex") : null;
    const gzSize: number | null = rowsGz && rowsGz.length ? rowsGz.length : null;

    const inserted: any[] = await db.$queryRawUnsafe(
      `INSERT INTO "table_snapshots"
         ("region","table_name","reason","dump_id","row_count","total_amount","total_qty",
          "distinct_isbns","min_date","max_date","rows_gz","rows_size_bytes","gz_size_bytes")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
               CASE WHEN $11::text IS NULL THEN NULL ELSE decode($11::text,'hex') END,$12,$13)
       RETURNING "id"`,
      region,
      table,
      reason,
      dumpId,
      summary.rowCount,
      summary.totalAmount,
      summary.totalQty,
      summary.distinctIsbns,
      summary.minDate,
      summary.maxDate,
      gzHex,
      rowsSizeBytes,
      gzSize,
    );
    return Number(inserted[0].id);
  } catch (e: any) {
    console.error(`[archive] recordSnapshot(${params.region}) failed:`, e?.message || e);
    return null;
  }
}

/** Recent dumps, newest first. Blob columns excluded — use readDumpBytes for those. */
export async function listDumps(region: string | null, limit: number): Promise<any[]> {
  await ensureArchiveSchema();
  const params: any[] = region ? [region, limit] : [limit];
  const where = region ? `WHERE "region" = $1` : "";
  const rows: any[] = await archiveDb().$queryRawUnsafe(
    `SELECT "id","region","trigger","fetched_at","content_sha256","raw_size_bytes","gz_size_bytes",
            "duplicate_of","sheet_row_count","parsed_row_count","parsed_total_amount","parsed_total_qty",
            "verdict","verdict_reason","checks",
            ("raw_gz" IS NOT NULL OR "duplicate_of" IS NOT NULL) AS "restorable"
       FROM "sheet_dumps" ${where}
      ORDER BY "fetched_at" DESC LIMIT $${params.length}`,
    ...params,
  );
  return rows.map(jsonSafe);
}

export async function listSnapshots(region: string | null, limit: number): Promise<any[]> {
  await ensureArchiveSchema();
  const params: any[] = region ? [region, limit] : [limit];
  const where = region ? `WHERE "region" = $1` : "";
  const rows: any[] = await archiveDb().$queryRawUnsafe(
    `SELECT "id","region","table_name","taken_at","reason","dump_id","row_count","total_amount",
            "total_qty","distinct_isbns","min_date","max_date","rows_size_bytes","gz_size_bytes",
            ("rows_gz" IS NOT NULL) AS "restorable"
       FROM "table_snapshots" ${where}
      ORDER BY "taken_at" DESC LIMIT $${params.length}`,
    ...params,
  );
  return rows.map(jsonSafe);
}

/** The original export bytes for a dump, following `duplicate_of` when deduped. */
export async function readDumpBytes(dumpId: number): Promise<Buffer | null> {
  await ensureArchiveSchema();
  const rows: any[] = await archiveDb().$queryRawUnsafe(
    `SELECT COALESCE(d."raw_gz", src."raw_gz") AS gz
       FROM "sheet_dumps" d
       LEFT JOIN "sheet_dumps" src ON src."id" = d."duplicate_of"
      WHERE d."id" = $1`,
    dumpId,
  );
  const gz = rows[0]?.gz;
  if (!gz) return null;
  return gunzip(Buffer.isBuffer(gz) ? gz : Buffer.from(gz));
}

/** The captured rows for a snapshot, as parsed JSON objects. */
export async function readSnapshotRows(snapshotId: number): Promise<any[] | null> {
  await ensureArchiveSchema();
  const rows: any[] = await archiveDb().$queryRawUnsafe(
    `SELECT "rows_gz" AS gz FROM "table_snapshots" WHERE "id" = $1`,
    snapshotId,
  );
  const gz = rows[0]?.gz;
  if (!gz) return null;
  const jsonl = await gunzip(Buffer.isBuffer(gz) ? gz : Buffer.from(gz));
  return jsonl
    .toString("utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

/** Metadata for one snapshot, without decompressing its blob. */
export async function getSnapshotMeta(snapshotId: number): Promise<any | null> {
  await ensureArchiveSchema();
  const rows: any[] = await archiveDb().$queryRawUnsafe(
    `SELECT "id","region","table_name","taken_at","row_count","total_amount","dump_id",
            ("rows_gz" IS NOT NULL) AS "restorable"
       FROM "table_snapshots" WHERE "id" = $1`,
    snapshotId,
  );
  return rows.length ? jsonSafe(rows[0]) : null;
}

/** Region + restorability of one dump, without decompressing its blob. */
export async function getDumpMeta(dumpId: number): Promise<any | null> {
  await ensureArchiveSchema();
  const rows: any[] = await archiveDb().$queryRawUnsafe(
    `SELECT d."id", d."region", d."fetched_at", d."verdict", d."parsed_row_count",
            (d."raw_gz" IS NOT NULL OR src."raw_gz" IS NOT NULL) AS "restorable"
       FROM "sheet_dumps" d
       LEFT JOIN "sheet_dumps" src ON src."id" = d."duplicate_of"
      WHERE d."id" = $1`,
    dumpId,
  );
  return rows.length ? jsonSafe(rows[0]) : null;
}

export async function recordRestore(params: {
  region: string;
  sourceKind: "snapshot" | "dump";
  sourceId: number;
  rowsWritten: number;
  actor?: string | undefined;
  note?: string | undefined;
}): Promise<void> {
  try {
    await ensureArchiveSchema();
    await archiveDb().$executeRawUnsafe(
      `INSERT INTO "restore_events" ("region","source_kind","source_id","rows_written","actor","note")
       VALUES ($1,$2,$3,$4,$5,$6)`,
      params.region,
      params.sourceKind,
      params.sourceId,
      params.rowsWritten,
      params.actor ?? null,
      params.note ?? null,
    );
  } catch (e: any) {
    console.error("[archive] recordRestore failed:", e?.message || e);
  }
}

// ── Retention ────────────────────────────────────────────────────────────────
// Metadata rows are kept forever — they are small and they are the audit trail. Only
// the heavy blobs age out, on a grandfather-father-son ladder:
//   • younger than ARCHIVE_RETAIN_DAILY_DAYS  → every blob kept
//   • up to ARCHIVE_RETAIN_WEEKLY_WEEKS old   → newest blob per ISO week kept
//   • older than that                         → newest blob per calendar month kept
// A pruned row keeps its hash, counts and verdict, so you can still see what existed
// even where the bytes are gone.

export interface PruneResult {
  dumpsPruned: number;
  snapshotsPruned: number;
  dryRun: boolean;
}

export async function pruneBlobs(opts?: { dryRun?: boolean }): Promise<PruneResult> {
  await ensureArchiveSchema();
  const db = archiveDb();
  const dailyDays = Number(process.env.ARCHIVE_RETAIN_DAILY_DAYS) || 30;
  const weeklyWeeks = Number(process.env.ARCHIVE_RETAIN_WEEKLY_WEEKS) || 26;
  const dryRun = opts?.dryRun ?? false;

  // A deduped dump borrows its bytes from the row it points at, so that row must not be
  // pruned out from under it. Drop pointers that are already dangling first, then treat
  // any row still referenced as ineligible.
  if (!dryRun) {
    await db.$executeRawUnsafe(
      `UPDATE "sheet_dumps" d SET "duplicate_of" = NULL
        WHERE d."duplicate_of" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "sheet_dumps" s WHERE s."id" = d."duplicate_of" AND s."raw_gz" IS NOT NULL
          )`,
    );
  }

  // Rows whose blob is NOT the newest of its retention bucket, past the daily window.
  const victimSql = (table: string, tsCol: string, blobCol: string, protectReferenced: boolean) => `
    WITH aged AS (
      SELECT t."id", t."region", t.${tsCol} AS ts,
             CASE WHEN t.${tsCol} > now() - ($1::text || ' weeks')::interval
                  THEN date_trunc('week', t.${tsCol})
                  ELSE date_trunc('month', t.${tsCol})
             END AS bucket
        FROM "${table}" t
       WHERE t.${blobCol} IS NOT NULL
         AND t.${tsCol} < now() - ($2::text || ' days')::interval
         ${protectReferenced
           ? `AND NOT EXISTS (SELECT 1 FROM "sheet_dumps" r WHERE r."duplicate_of" = t."id")`
           : ""}
    ),
    ranked AS (
      SELECT "id", row_number() OVER (PARTITION BY "region", bucket ORDER BY ts DESC) AS rn
        FROM aged
    )
    SELECT "id" FROM ranked WHERE rn > 1
  `;

  const run = async (
    table: string,
    tsCol: string,
    blobCol: string,
    protectReferenced: boolean,
  ): Promise<number> => {
    const victims: any[] = await db.$queryRawUnsafe(
      victimSql(table, tsCol, blobCol, protectReferenced),
      String(weeklyWeeks),
      String(dailyDays),
    );
    if (dryRun || victims.length === 0) return victims.length;
    const ids = victims.map((v) => Number(v.id));
    let done = 0;
    // Chunked so a large first prune doesn't build a multi-megabyte statement.
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const placeholders = chunk.map((_, k) => `$${k + 1}`).join(",");
      await db.$executeRawUnsafe(
        `UPDATE "${table}" SET ${blobCol} = NULL, "blob_pruned_at" = now() WHERE "id" IN (${placeholders})`,
        ...chunk,
      );
      done += chunk.length;
    }
    return done;
  };

  const dumpsPruned = await run("sheet_dumps", `"fetched_at"`, `"raw_gz"`, true);
  const snapshotsPruned = await run("table_snapshots", `"taken_at"`, `"rows_gz"`, false);
  return { dumpsPruned, snapshotsPruned, dryRun };
}

/** Aggregate storage + coverage figures, for the health endpoint and CLI. */
export async function archiveStats(): Promise<any> {
  await ensureArchiveSchema();
  const db = archiveDb();
  const dumps: any[] = await db.$queryRawUnsafe(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE "verdict" = 'rejected')::int AS rejected,
            count(*) FILTER (WHERE "raw_gz" IS NOT NULL)::int AS with_bytes,
            COALESCE(sum("gz_size_bytes"),0)::bigint AS stored_bytes,
            min("fetched_at") AS oldest,
            max("fetched_at") AS newest
       FROM "sheet_dumps"`,
  );
  const snaps: any[] = await db.$queryRawUnsafe(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE "rows_gz" IS NOT NULL)::int AS with_rows,
            COALESCE(sum("gz_size_bytes"),0)::bigint AS stored_bytes,
            min("taken_at") AS oldest,
            max("taken_at") AS newest
       FROM "table_snapshots"`,
  );
  const perRegion: any[] = await db.$queryRawUnsafe(
    `SELECT "region",
            count(*)::int AS dumps,
            max("fetched_at") AS last_dump,
            max("fetched_at") FILTER (WHERE "verdict" IN ('accepted','warned')) AS last_accepted,
            count(*) FILTER (WHERE "verdict" = 'rejected')::int AS rejected
       FROM "sheet_dumps" GROUP BY "region" ORDER BY "region"`,
  );
  return jsonSafe({ dumps: dumps[0], snapshots: snaps[0], perRegion });
}
