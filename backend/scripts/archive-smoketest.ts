// End-to-end exercise of the archive storage layer against a real Postgres.
//
//   npm run archive:smoketest
//
// Writes and then deletes rows under the reserved region name "__smoketest__", so it
// never touches real archive data. Verifies the parts that unit tests can't: bytea
// round-trips, content dedup, the retention window SQL, and jsonb handling.
//
// Run this once against a newly provisioned archive DB to confirm it is wired up.

import zlib from "zlib";
import { promisify } from "util";
import {
  recordDump,
  setDumpVerdict,
  getLastAcceptedDump,
  recordSnapshot,
  readDumpBytes,
  readSnapshotRows,
  getSnapshotMeta,
  getDumpMeta,
  listDumps,
  listSnapshots,
  archiveStats,
  pruneBlobs,
  recordRestore,
} from "../src/features/archive/archiveStore.js";
import { archiveDb, ensureArchiveSchema, closeArchiveDb, isArchiveConfigured } from "../src/features/archive/archiveDb.js";

const gzip = promisify(zlib.gzip);
const REGION = "__smoketest__";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function cleanup() {
  const db = archiveDb();
  await db.$executeRawUnsafe(`DELETE FROM "sheet_dumps" WHERE "region" = $1`, REGION);
  await db.$executeRawUnsafe(`DELETE FROM "table_snapshots" WHERE "region" = $1`, REGION);
  await db.$executeRawUnsafe(`DELETE FROM "restore_events" WHERE "region" = $1`, REGION);
}

async function run() {
  if (!isArchiveConfigured()) {
    console.error(
      "ARCHIVE_DATABASE_URL is not set. The archive never touches the application database — " +
      "provision a separate Postgres and set ARCHIVE_DATABASE_URL in backend/.env.",
    );
    process.exit(1);
  }
  console.log("Testing against the dedicated archive database.\n");

  console.log("Schema bootstrap");
  await ensureArchiveSchema();
  await ensureArchiveSchema(); // memoised; must be safe to call repeatedly
  const tables: any[] = await archiveDb().$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('sheet_dumps','table_snapshots','restore_events')`,
  );
  check("all three tables exist", tables.length === 3, `found ${tables.length}`);

  await cleanup(); // in case a previous run died mid-way

  // ── Dump round-trip ────────────────────────────────────────────────────────
  console.log("\nDump storage");
  // Deliberately includes non-ASCII and a NUL byte: real exports carry Hindi titles,
  // and hex encoding must survive both.
  const body = Buffer.concat([
    Buffer.from("BookCode,BookName,OUT,OUTAmount\n", "utf8"),
    Buffer.from("978-81,राजकमल प्रकाशन,3,450.50\n", "utf8"),
    Buffer.from([0x00, 0xff, 0xfe]),
  ]);

  const d1 = await recordDump({
    region: REGION,
    sourceUrl: "https://example.invalid/export",
    trigger: "smoketest",
    raw: body,
    stats: {
      sheetRowCount: 2,
      headers: ["BookCode", "BookName", "OUT", "OUTAmount"],
      parsedRowCount: 2,
      parsedTotalAmount: 450.5,
      parsedTotalQty: 3,
    },
  });
  check("recordDump returned an id", !!d1?.id, JSON.stringify(d1));
  check("no duplicate on first insert", d1?.duplicateOf === null);

  const back = await readDumpBytes(d1!.id);
  check("bytes round-trip exactly", !!back && back.equals(body), `got ${back?.length} of ${body.length} bytes`);

  // ── Dedup ──────────────────────────────────────────────────────────────────
  const d2 = await recordDump({
    region: REGION,
    sourceUrl: "https://example.invalid/export",
    trigger: "smoketest",
    raw: body,
    stats: { sheetRowCount: 2, headers: [], parsedRowCount: 2, parsedTotalAmount: 450.5, parsedTotalQty: 3 },
  });
  check("identical export deduped", d2?.duplicateOf === d1?.id, `duplicateOf=${d2?.duplicateOf}`);

  const dupRow: any[] = await archiveDb().$queryRawUnsafe(
    `SELECT "raw_gz" IS NULL AS no_bytes FROM "sheet_dumps" WHERE "id" = $1`,
    d2!.id,
  );
  check("deduped row stores no second copy of the bytes", dupRow[0]?.no_bytes === true);

  const viaDup = await readDumpBytes(d2!.id);
  check("deduped row still reads back the original bytes", !!viaDup && viaDup.equals(body));

  // ── Verdicts and baseline ──────────────────────────────────────────────────
  console.log("\nVerdicts");
  await setDumpVerdict(d1!.id, "accepted", null, [{ id: "row_count_stable", passed: true, detail: "ok" }]);
  const baseline = await getLastAcceptedDump(REGION);
  check("accepted dump becomes the baseline", baseline?.id === d1?.id, `baseline=${baseline?.id}`);
  check("baseline carries parsed totals", baseline?.parsedTotalAmount === 450.5, `${baseline?.parsedTotalAmount}`);
  check("baseline carries the content hash", baseline?.contentSha256 === d1?.sha256);

  await setDumpVerdict(d2!.id, "rejected", "row_count_stable — collapsed", [
    { id: "row_count_stable", passed: false, detail: "12 vs 100000" },
  ]);
  const stillBaseline = await getLastAcceptedDump(REGION);
  check("a rejected dump does NOT become the baseline", stillBaseline?.id === d1?.id);

  const meta = await getDumpMeta(d2!.id);
  check("getDumpMeta reports the region", meta?.region === REGION);
  check("getDumpMeta reports restorability via the dedup pointer", meta?.restorable === true);

  // ── Snapshot round-trip ────────────────────────────────────────────────────
  console.log("\nSnapshot storage");
  const rows = [
    { id: "1", isbn: "978-81", title: "राजकमल", qty: 3, amount: "450.50", date: "2026-08-01T00:00:00.000Z" },
    { id: "2", isbn: "978-82", title: "Another", qty: 1, amount: null, date: null },
  ];
  const jsonl = Buffer.from(rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  const snapId = await recordSnapshot({
    region: REGION,
    table: "google_sheet_offline_sales",
    reason: "smoketest",
    dumpId: d1!.id,
    summary: {
      rowCount: 2,
      totalAmount: 450.5,
      totalQty: 4,
      distinctIsbns: 2,
      minDate: new Date("2026-08-01T00:00:00Z"),
      maxDate: new Date("2026-08-02T00:00:00Z"),
    },
    rowsGz: await gzip(jsonl, { level: 9 }),
    rowsSizeBytes: jsonl.length,
  });
  check("recordSnapshot returned an id", !!snapId, String(snapId));

  const readRows = await readSnapshotRows(snapId!);
  check("snapshot rows round-trip", readRows?.length === 2, `got ${readRows?.length}`);
  check("unicode survives the round-trip", readRows?.[0]?.title === "राजकमल", readRows?.[0]?.title);
  check("nulls survive the round-trip", readRows?.[1]?.amount === null);

  const snapMeta = await getSnapshotMeta(snapId!);
  check("getSnapshotMeta reports restorable", snapMeta?.restorable === true);
  check("getSnapshotMeta reports the row count", snapMeta?.row_count === 2, String(snapMeta?.row_count));

  // ── Listing / stats / restore log ──────────────────────────────────────────
  console.log("\nListing and stats");
  const dumps = await listDumps(REGION, 10);
  check("listDumps returns both dumps", dumps.length === 2, `got ${dumps.length}`);
  check("listDumps output is JSON-serialisable", (() => {
    try { JSON.stringify(dumps); return true; } catch { return false; }
  })());
  check("listDumps unwraps NUMERIC into a number", typeof dumps[0].parsed_total_amount === "number",
    typeof dumps[0].parsed_total_amount);

  const snaps = await listSnapshots(REGION, 10);
  check("listSnapshots returns the snapshot", snaps.length === 1, `got ${snaps.length}`);

  const unfiltered = await listDumps(null, 5);
  check("listDumps with no region filter works", Array.isArray(unfiltered));

  const stats = await archiveStats();
  check("archiveStats is JSON-serialisable", (() => {
    try { JSON.stringify(stats); return true; } catch { return false; }
  })());
  check("archiveStats counts dumps", Number(stats.dumps.total) >= 2, String(stats.dumps.total));

  await recordRestore({ region: REGION, sourceKind: "snapshot", sourceId: snapId!, rowsWritten: 2, actor: "smoketest" });
  const restores: any[] = await archiveDb().$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "restore_events" WHERE "region" = $1`, REGION);
  check("restore event logged", restores[0]?.n === 1);

  // ── Retention SQL ──────────────────────────────────────────────────────────
  console.log("\nRetention");
  const dry = await pruneBlobs({ dryRun: true });
  check("prune dry-run executes", typeof dry.dumpsPruned === "number");
  check("fresh rows are not pruning candidates", dry.dumpsPruned === 0 && dry.snapshotsPruned === 0,
    `${dry.dumpsPruned}/${dry.snapshotsPruned}`);

  // Age the smoketest rows past every retention window, then confirm the ladder keeps
  // exactly one blob per bucket and clears the rest.
  const db = archiveDb();
  await db.$executeRawUnsafe(
    `UPDATE "sheet_dumps" SET "fetched_at" = now() - interval '400 days' WHERE "region" = $1`, REGION);
  await db.$executeRawUnsafe(
    `UPDATE "table_snapshots" SET "taken_at" = now() - interval '400 days' WHERE "region" = $1`, REGION);

  // Two more old dumps in the same monthly bucket, with distinct content so neither is
  // a dedup. Offset by hours so their ordering within the bucket is unambiguous.
  const extraIds: number[] = [];
  for (const n of [1, 2]) {
    const extra = await recordDump({
      region: REGION,
      sourceUrl: "https://example.invalid/export",
      trigger: "smoketest",
      raw: Buffer.from(`distinct-content-${n}`),
      stats: { sheetRowCount: 1, headers: [], parsedRowCount: 1, parsedTotalAmount: n, parsedTotalQty: n },
    });
    extraIds.push(extra!.id);
    await db.$executeRawUnsafe(
      `UPDATE "sheet_dumps" SET "fetched_at" = date_trunc('month', now() - interval '400 days')
                                              + interval '5 days' + ($2::text || ' hours')::interval
        WHERE "id" = $1`, extra!.id, String(n));
  }
  // d1 is likewise pinned into that same bucket, so the ladder has a real choice to make.
  await db.$executeRawUnsafe(
    `UPDATE "sheet_dumps" SET "fetched_at" = date_trunc('month', now() - interval '400 days') + interval '5 days'
      WHERE "id" = $1`, d1!.id);

  const dry2 = await pruneBlobs({ dryRun: true });
  check("aged rows become pruning candidates", dry2.dumpsPruned > 0, `${dry2.dumpsPruned}`);

  const real = await pruneBlobs();
  check("prune executes for real", real.dumpsPruned > 0, `${real.dumpsPruned}`);

  const hasBytes = async (id: number) => {
    const r: any[] = await db.$queryRawUnsafe(
      `SELECT "raw_gz" IS NOT NULL AS b FROM "sheet_dumps" WHERE "id" = $1`, id);
    return r[0]?.b === true;
  };

  // d1 is the oldest in the bucket, so the ladder would normally clear it — but d2
  // borrows its bytes, and pruning it would make d2 unrestorable. It must survive.
  check("a dump whose bytes are borrowed by a dedup is never pruned", await hasBytes(d1!.id));
  check("newest blob in the bucket survives", await hasBytes(extraIds[1]!));
  check("older blob in the same bucket is cleared", !(await hasBytes(extraIds[0]!)));
  check("the deduped copy still resolves to real bytes", (await readDumpBytes(d2!.id))?.equals(body) === true);

  const kept: any[] = await db.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "sheet_dumps" WHERE "region" = $1`, REGION);
  check("prune clears blobs but keeps every metadata row", kept[0]?.n === 4, `${kept[0]?.n} rows`);

  const stamped: any[] = await db.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "sheet_dumps" WHERE "region" = $1 AND "blob_pruned_at" IS NOT NULL`, REGION);
  check("pruned rows are stamped", stamped[0]?.n === real.dumpsPruned, `${stamped[0]?.n} vs ${real.dumpsPruned}`);

  await cleanup();
  console.log("\nTest rows removed.");
}

run()
  .catch((e) => {
    failed++;
    console.error(`\n💥 ${e?.message || e}`);
    console.error(e?.stack);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch { /* best effort */ }
    await closeArchiveDb();
    console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });
