// Provision (or verify) the archive database, then optionally take a full snapshot of
// every region straight away so there is a restore point before the next sync runs.
//
//   npm run archive:init            # create tables, report status
//   npm run archive:init -- --now   # ...and snapshot all six regions immediately
//
// Idempotent: safe to run on every deploy.

import { archiveDb, ensureArchiveSchema, closeArchiveDb, isArchiveConfigured } from "../src/features/archive/archiveDb.js";
import { archiveStats } from "../src/features/archive/archiveStore.js";
import { takePreSyncSnapshot } from "../src/features/archive/snapshot.js";
import { REGIONS, REGION_NAMES } from "../src/features/archive/regions.js";
import { prisma } from "../src/lib/prisma.js";

async function run() {
  console.log("Connecting to the archive database…");
  const db = archiveDb();
  const who: any[] = await db.$queryRawUnsafe(
    `SELECT current_database() AS db, current_user AS usr, version() AS version`,
  );
  console.log(`  database: ${who[0].db}`);
  console.log(`  user:     ${who[0].usr}`);
  console.log(`  server:   ${String(who[0].version).split(",")[0]}`);

  if (!isArchiveConfigured()) {
    console.error(
      "ARCHIVE_DATABASE_URL is not set. The archive never touches the application database — " +
      "provision a separate Postgres and set ARCHIVE_DATABASE_URL in backend/.env.",
    );
    process.exit(1);
  }
  console.log("\n✅ Archive is on its own database, isolated from the application DB.");

  console.log("\nEnsuring archive schema…");
  await ensureArchiveSchema();
  const tables: any[] = await db.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('sheet_dumps','table_snapshots','restore_events')
      ORDER BY table_name`,
  );
  console.log(`  tables ready: ${tables.map((t) => t.table_name).join(", ") || "(none!)"}`);

  if (process.argv.includes("--now")) {
    console.log("\nTaking an immediate snapshot of every region…");
    for (const name of REGION_NAMES) {
      const spec = REGIONS[name];
      const id = await takePreSyncSnapshot(spec, null, "manual");
      console.log(`  ${name.padEnd(10)} ${id ? `snapshot #${id}` : "skipped (table is empty)"}`);
    }
  }

  const stats = await archiveStats();
  console.log(
    `\nArchive now holds ${stats.dumps.total} dump(s) and ${stats.snapshots.total} snapshot(s).`,
  );
  if (!process.argv.includes("--now") && stats.snapshots.total === 0) {
    console.log("Tip: run with --now to capture a restore point before the next sync.");
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
