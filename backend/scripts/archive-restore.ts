// Put archived data back into a live region table.
//
//   npm run archive:restore -- --snapshot 42            # replay exact captured rows
//   npm run archive:restore -- --snapshot 42 --dry-run  # show what would happen
//   npm run archive:restore -- --dump 108               # re-parse an archived export
//   npm run archive:approve -- --dump 108               # same thing, for a rejected export
//
// Both paths wipe and replace the region's table inside one transaction, and both take
// a safety snapshot of the current contents first — so a restore is itself undoable.

import { restoreFromSnapshot, restoreFromDump } from "../src/features/archive/restore.js";
import { closeArchiveDb, isArchiveConfigured } from "../src/features/archive/archiveDb.js";
import { prisma } from "../src/lib/prisma.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

async function run() {
  if (!isArchiveConfigured()) {
    console.error(
      "ARCHIVE_DATABASE_URL is not set. The archive never touches the application database — " +
      "provision a separate Postgres and set ARCHIVE_DATABASE_URL in backend/.env.",
    );
    process.exit(1);
  }

  const snapshotId = arg("snapshot");
  const dumpId = arg("dump");
  const dryRun = has("dry-run");

  if (!snapshotId && !dumpId) {
    console.error(
      "Specify a source:\n" +
        "  --snapshot <id>   replay the exact rows captured before a sync (preferred)\n" +
        "  --dump <id>       re-parse and import an archived sheet export\n\n" +
        "Find ids with:  npm run archive:list -- --snapshots",
    );
    process.exit(1);
  }
  if (snapshotId && dumpId) {
    console.error("Pass only one of --snapshot or --dump.");
    process.exit(1);
  }

  const opts = {
    dryRun,
    actor: process.env.USER || process.env.USERNAME || "cli",
    note: arg("note"),
  };

  const result = snapshotId
    ? await restoreFromSnapshot(Number(snapshotId), opts)
    : await restoreFromDump(Number(dumpId), opts);

  if (result.dryRun) {
    console.log(
      `\nDRY RUN — nothing was written.\n` +
        `  Region:            ${result.region}\n` +
        `  Source:            ${result.sourceKind} #${result.sourceId}\n` +
        `  Rows it would write: ${result.rowsWritten}\n` +
        `  Rows it would replace: ${result.rowsReplaced}\n\n` +
        `Re-run without --dry-run to apply.`,
    );
    return;
  }

  console.log(
    `\n✅ Restored ${result.region} from ${result.sourceKind} #${result.sourceId}\n` +
      `  Rows written:  ${result.rowsWritten}\n` +
      `  Rows replaced: ${result.rowsReplaced}\n` +
      `  Safety snapshot of the previous contents: ${
        result.safetySnapshotId ? `#${result.safetySnapshotId}` : "none (table was empty or skipped)"
      }`,
  );
  if (result.safetySnapshotId) {
    console.log(`  Undo this restore:  npm run archive:restore -- --snapshot ${result.safetySnapshotId}`);
  }
}

run()
  .catch((e) => {
    console.error(`\n❌ ${e?.message || e}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeArchiveDb();
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
