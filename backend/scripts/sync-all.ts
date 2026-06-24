import { runScheduledSync } from "../src/features/sales/server/syncScheduler.js";

// Manually run a full sync of every region (same path the daily scheduler runs:
// syncs all regions, writes a sync_logs row tagged "manual", updates /health status).
async function run() {
  console.log("Starting FULL Offline Sales Sync (all regions)...");
  const status = await runScheduledSync("manual");
  if (!status) {
    console.log("A sync is already in progress; skipped.");
    process.exit(0);
  }
  console.table(
    status.regions.map((r) => ({
      region: r.region,
      ok: r.success,
      imported: r.importedCount,
      skipped: r.skippedCount,
      error: r.error ?? "",
    })),
  );
  process.exit(status.ok ? 0 : 1);
}

run();
