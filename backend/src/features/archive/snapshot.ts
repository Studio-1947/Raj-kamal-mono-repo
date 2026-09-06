// ─────────────────────────────────────────────────────────────────────────────
// snapshot.ts
//
// Captures the full contents of a live region table immediately BEFORE the sync
// wipes it, and writes it to the archive DB as gzipped JSONL.
//
// The dump archive already stores the sheet export, so why also snapshot the table?
// Because the table is not a pure function of the sheet: processData backfills blank
// author/binding/publisher/pubYear from the previous contents (the SELF-HEAL path in
// offlineSyncService), so replaying an old export against a different starting state
// can produce different rows. The snapshot is the only exact record of what was
// actually being served. It also restores in seconds without re-parsing anything.
//
// Rows are paged and fed straight into a gzip stream, so peak memory is one page plus
// the compressed output — not the whole table. A ~100k-row region compresses to a few
// MB, which is why keeping one per sync is affordable.
// ─────────────────────────────────────────────────────────────────────────────

import zlib from "zlib";
import { prisma } from "../../lib/prisma.js";
import { recordSnapshot, type SnapshotSummary } from "./archiveStore.js";
import { REGIONS, type RegionSpec } from "./regions.js";

const PAGE_SIZE = Number(process.env.ARCHIVE_SNAPSHOT_PAGE_SIZE) || 5000;

/** Guards against SQL injection via a table name — only registry tables are allowed. */
function assertKnownTable(table: string): void {
  const known = Object.values(REGIONS).some((r) => r.table === table);
  if (!known) throw new Error(`Refusing to snapshot unknown table "${table}"`);
}

/** Counts/sums/date-range of a live table. Cheap enough to take even when blobs are off. */
export async function summarizeTable(table: string): Promise<SnapshotSummary> {
  assertKnownTable(table);
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int              AS row_count,
            COALESCE(sum("amount"),0)  AS total_amount,
            COALESCE(sum("qty"),0)     AS total_qty,
            count(DISTINCT "isbn")::int AS distinct_isbns,
            min("date")                AS min_date,
            max("date")                AS max_date
       FROM "${table}"`,
  );
  const r = rows[0] ?? {};
  return {
    rowCount: Number(r.row_count ?? 0),
    totalAmount: r.total_amount === null || r.total_amount === undefined ? null : Number(r.total_amount),
    totalQty: r.total_qty === null || r.total_qty === undefined ? null : Number(r.total_qty),
    distinctIsbns: r.distinct_isbns === null || r.distinct_isbns === undefined ? null : Number(r.distinct_isbns),
    minDate: r.min_date ? new Date(r.min_date) : null,
    maxDate: r.max_date ? new Date(r.max_date) : null,
  };
}

/**
 * Streams every row of `table` as JSONL through gzip. `rawJson` is dropped by default:
 * it is a verbatim copy of the sheet row, which the dump archive already holds, and it
 * roughly triples snapshot size. Set ARCHIVE_SNAPSHOT_RAW_JSON=true to include it.
 */
async function gzipTableRows(table: string): Promise<{ gz: Buffer; rawSize: number; rows: number }> {
  assertKnownTable(table);
  const includeRawJson = process.env.ARCHIVE_SNAPSHOT_RAW_JSON === "true";
  const projection = includeRawJson ? `to_jsonb(t)` : `to_jsonb(t) - 'rawJson'`;

  const gzipStream = zlib.createGzip({ level: 9 });
  const out: Buffer[] = [];
  gzipStream.on("data", (c: Buffer) => out.push(c));
  const finished = new Promise<void>((resolve, reject) => {
    gzipStream.on("end", resolve);
    gzipStream.on("error", reject);
  });

  let cursor = "0";
  let rawSize = 0;
  let rows = 0;

  // Keyset pagination on the BigInt PK. OFFSET would degrade quadratically on the
  // larger regions, and a cursor is stable even though nothing else writes here.
  for (;;) {
    const page: any[] = await prisma.$queryRawUnsafe(
      `SELECT ${projection} AS j
         FROM (SELECT * FROM "${table}" WHERE "id" > $1::bigint ORDER BY "id" LIMIT $2) t`,
      cursor,
      PAGE_SIZE,
    );
    if (page.length === 0) break;

    let chunk = "";
    for (const r of page) {
      chunk += JSON.stringify(r.j) + "\n";
    }
    const buf = Buffer.from(chunk, "utf8");
    rawSize += buf.length;
    rows += page.length;
    if (!gzipStream.write(buf)) {
      await new Promise<void>((resolve) => gzipStream.once("drain", resolve));
    }

    const last = page[page.length - 1]!.j;
    cursor = String(last.id);
    if (page.length < PAGE_SIZE) break;
  }

  gzipStream.end();
  await finished;
  return { gz: Buffer.concat(out), rawSize, rows };
}

/**
 * Takes and stores a pre-wipe snapshot. Best-effort by design: a snapshot failure logs
 * and returns null rather than aborting the sync it was protecting.
 *
 * Set ARCHIVE_SNAPSHOT_ROWS=false to record only the summary (counts, totals, date
 * range) and skip the row blob — much cheaper, but restore then depends on replaying
 * an archived dump instead of a direct row replay.
 */
export async function takePreSyncSnapshot(
  spec: RegionSpec,
  dumpId: number | null,
  reason = "pre-sync",
): Promise<number | null> {
  try {
    const summary = await summarizeTable(spec.table);

    // An empty table has nothing worth capturing (first-ever sync for this region).
    if (summary.rowCount === 0) return null;

    if (process.env.ARCHIVE_SNAPSHOT_ROWS === "false") {
      return recordSnapshot({
        region: spec.region,
        table: spec.table,
        reason,
        dumpId,
        summary,
        rowsGz: null,
        rowsSizeBytes: null,
      });
    }

    const { gz, rawSize } = await gzipTableRows(spec.table);
    const id = await recordSnapshot({
      region: spec.region,
      table: spec.table,
      reason,
      dumpId,
      summary,
      rowsGz: gz,
      rowsSizeBytes: rawSize,
    });
    console.log(
      `[archive] snapshot #${id} ${spec.region}: ${summary.rowCount} rows, ` +
        `${(rawSize / 1e6).toFixed(1)}MB → ${(gz.length / 1e6).toFixed(1)}MB gzipped`,
    );
    return id;
  } catch (e: any) {
    console.error(`[archive] takePreSyncSnapshot(${spec.region}) failed:`, e?.message || e);
    return null;
  }
}
