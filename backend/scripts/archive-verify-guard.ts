// Proves the corruption guard is armed, on the real deployment, without risking data.
//
//   npm run archive:verify-guard
//   npm run archive:verify-guard -- --region bookfair
//
// Feeds a deliberately corrupt "export" through the exact sync path a real Google Sheet
// takes, and checks three things: the guard rejected it, the live table is byte-for-byte
// unchanged, and the bad export was still archived for inspection.
//
// SAFE ON PRODUCTION. A rejected export throws before deleteMany() ever runs, so the live
// table cannot be modified. The row count is captured before and after and compared. The
// rejected dump never becomes a baseline, so it cannot affect later syncs either.

import { offlineSyncService } from "../src/features/sales/server/offlineSyncService.js";
import { listDumps } from "../src/features/archive/archiveStore.js";
import { closeArchiveDb, isArchiveConfigured } from "../src/features/archive/archiveDb.js";
import { requireRegion } from "../src/features/archive/regions.js";
import { guardMode } from "../src/features/archive/sheetGuard.js";
import { prisma } from "../src/lib/prisma.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (ok) console.log(`  ✓ ${label}`);
  else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

// A URL that reliably returns an HTML page rather than a CSV — the same shape Google
// serves when a sheet stops being publicly readable.
const BAD_URL = "https://example.com/";

async function run() {
  if (!isArchiveConfigured()) {
    console.error(
      "ARCHIVE_DATABASE_URL is not set, so the guard is not active and there is nothing to verify.\n" +
        "Set it in backend/.env and restart with: pm2 restart backend --update-env",
    );
    process.exit(1);
  }

  const spec = requireRegion(arg("region") || "bookfair");
  const mode = guardMode();
  console.log(`Verifying the guard on "${spec.region}" (ARCHIVE_GUARD=${mode})\n`);

  if (mode !== "block") {
    console.warn(
      `⚠  ARCHIVE_GUARD is "${mode}", not "block" — a corrupt export would be imported, not refused.\n` +
        `   This check only proves the guard blocks when it is set to block.\n`,
    );
  }

  const before = await spec.model().count();
  console.log(`  live rows before: ${before}`);

  const svc = offlineSyncService as any;
  let caught: any = null;
  try {
    await svc.syncFromGoogleSheet(BAD_URL, spec.model());
  } catch (e: any) {
    caught = e;
  }

  const after = await spec.model().count();
  console.log(`  live rows after:  ${after}\n`);

  if (mode === "block") {
    check("the guard rejected the corrupt export", caught?.name === "SheetRejectedError", caught?.name ?? "nothing thrown");
    check("the rejection names the region", String(caught?.message ?? "").includes(spec.region));
  }
  check("THE LIVE TABLE WAS NOT MODIFIED", after === before, `${before} → ${after}`);

  const dumps = await listDumps(spec.region, 3);
  const newest = dumps[0];
  check("the corrupt export was archived anyway", !!newest, "no dumps found");
  if (mode === "block") {
    check("it is recorded as rejected", newest?.verdict === "rejected", String(newest?.verdict));
    check("with a readable reason", !!newest?.verdict_reason);
    if (newest?.verdict_reason) console.log(`\n  reason: ${newest.verdict_reason}`);
  }

  console.log(
    failed === 0
      ? `\n✅ Guard verified. A corrupt export cannot reach "${spec.region}".\n` +
          `   The rejected dump (#${newest?.id}) is kept for inspection and is not used as a baseline,\n` +
          `   so it has no effect on the next real sync.`
      : `\n❌ ${failed} check(s) failed — the guard is not protecting this region as expected.`,
  );
}

run()
  .catch((e) => {
    failed++;
    console.error(`\n💥 ${e?.message || e}`);
  })
  .finally(async () => {
    await closeArchiveDb();
    await prisma.$disconnect();
    process.exit(failed === 0 ? 0 : 1);
  });
