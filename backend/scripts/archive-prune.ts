// Age out archive blobs on the grandfather-father-son ladder. Metadata rows are never
// deleted — only the heavy gzipped bodies are cleared, and only where a newer capture
// in the same retention bucket already covers that period.
//
//   npm run archive:prune -- --dry-run
//   npm run archive:prune
//
// Tune with ARCHIVE_RETAIN_DAILY_DAYS (default 30) and ARCHIVE_RETAIN_WEEKLY_WEEKS
// (default 26). Safe to run from cron.

import { pruneBlobs, archiveStats } from "../src/features/archive/archiveStore.js";
import { closeArchiveDb, isArchiveConfigured } from "../src/features/archive/archiveDb.js";

const mb = (n: any) => (Number(n || 0) / 1e6).toFixed(1) + "MB";

async function run() {
  if (!isArchiveConfigured()) {
    console.error(
      "ARCHIVE_DATABASE_URL is not set. The archive never touches the application database — " +
      "provision a separate Postgres and set ARCHIVE_DATABASE_URL in backend/.env.",
    );
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");

  const before = await archiveStats();
  const result = await pruneBlobs({ dryRun });
  const after = dryRun ? before : await archiveStats();

  const dailyDays = Number(process.env.ARCHIVE_RETAIN_DAILY_DAYS) || 30;
  const weeklyWeeks = Number(process.env.ARCHIVE_RETAIN_WEEKLY_WEEKS) || 26;

  console.log(
    `\nRetention: every capture for ${dailyDays} days, then one per week for ${weeklyWeeks} weeks, ` +
      `then one per month indefinitely.`,
  );
  console.log(
    dryRun
      ? `\nDRY RUN — would clear ${result.dumpsPruned} dump blob(s) and ${result.snapshotsPruned} snapshot blob(s).`
      : `\n✅ Cleared ${result.dumpsPruned} dump blob(s) and ${result.snapshotsPruned} snapshot blob(s).`,
  );
  if (!dryRun) {
    console.log(
      `   Dumps:     ${mb(before.dumps.stored_bytes)} → ${mb(after.dumps.stored_bytes)}\n` +
        `   Snapshots: ${mb(before.snapshots.stored_bytes)} → ${mb(after.snapshots.stored_bytes)}`,
    );
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
