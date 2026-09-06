// Inspect the archive: what has been captured, what the guard made of it, how much
// space it is using.
//
//   npm run archive:list
//   npm run archive:list -- --region delhi --limit 20
//   npm run archive:list -- --snapshots
//   npm run archive:list -- --stats

import { listDumps, listSnapshots, archiveStats } from "../src/features/archive/archiveStore.js";
import { closeArchiveDb, isArchiveConfigured } from "../src/features/archive/archiveDb.js";
import { REGION_NAMES } from "../src/features/archive/regions.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const mb = (n: any) => (Number(n || 0) / 1e6).toFixed(1) + "MB";

async function run() {
  if (!isArchiveConfigured()) {
    console.error(
      "ARCHIVE_DATABASE_URL is not set. The archive never touches the application database — " +
      "provision a separate Postgres and set ARCHIVE_DATABASE_URL in backend/.env.",
    );
    process.exit(1);
  }

  const region = arg("region") ?? null;
  if (region && !REGION_NAMES.includes(region as any)) {
    console.error(`Unknown region "${region}". Expected one of: ${REGION_NAMES.join(", ")}`);
    process.exit(1);
  }
  const limit = Math.min(Math.max(Number(arg("limit")) || 20, 1), 500);

  if (has("stats")) {
    const s = await archiveStats();
    console.log("\n── Archive totals ─────────────────────────────────────────────");
    console.log(
      `Dumps:     ${s.dumps.total} (${s.dumps.rejected} rejected, ${s.dumps.with_bytes} holding bytes, ${mb(s.dumps.stored_bytes)})`,
    );
    console.log(
      `Snapshots: ${s.snapshots.total} (${s.snapshots.with_rows} holding rows, ${mb(s.snapshots.stored_bytes)})`,
    );
    console.log(`Oldest dump: ${s.dumps.oldest ?? "—"}   Newest: ${s.dumps.newest ?? "—"}\n`);
    console.table(s.perRegion);
    return;
  }

  if (has("snapshots")) {
    const items = await listSnapshots(region, limit);
    if (!items.length) {
      console.log("No snapshots recorded yet.");
      return;
    }
    console.table(
      items.map((s: any) => ({
        id: s.id,
        region: s.region,
        takenAt: s.taken_at,
        reason: s.reason,
        rows: s.row_count,
        amount: s.total_amount,
        size: mb(s.gz_size_bytes),
        restorable: s.restorable ? "yes" : "NO (pruned)",
      })),
    );
    return;
  }

  const items = await listDumps(region, limit);
  if (!items.length) {
    console.log("No dumps recorded yet. The archive fills up on the next sync.");
    return;
  }
  console.table(
    items.map((d: any) => ({
      id: d.id,
      region: d.region,
      fetchedAt: d.fetched_at,
      trigger: d.trigger,
      verdict: d.verdict,
      rows: d.parsed_row_count,
      amount: d.parsed_total_amount,
      size: d.duplicate_of ? `dup of #${d.duplicate_of}` : mb(d.gz_size_bytes),
      reason: d.verdict_reason ? String(d.verdict_reason).slice(0, 48) : "",
    })),
  );

  const rejected = items.filter((d: any) => d.verdict === "rejected");
  if (rejected.length) {
    console.log(
      `\n⚠  ${rejected.length} rejected export(s) above were NOT imported; the live tables kept their previous data.`,
    );
    console.log(`   Inspect one:  npm run archive:restore -- --dump ${rejected[0].id} --dry-run`);
    console.log(`   Import it:    npm run archive:approve -- --dump ${rejected[0].id}`);
  }
}

run()
  .catch((e) => {
    console.error(e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeArchiveDb();
    process.exit(process.exitCode ?? 0);
  });
