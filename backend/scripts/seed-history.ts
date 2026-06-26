/**
 * Manual seed of a PAST financial year's offline sales into the isolated
 * `offline_sales_history` table. Each past year lives on its own Google Sheet
 * (one tab per channel) — configured per year in YEARS below.
 *
 * This is intentionally NOT part of the live sync (`sync:*` / `sync:all`), which
 * wipe-and-replace the CURRENT-year live tables. The daily scheduler never touches
 * offline_sales_history. Re-running is safe — each channel is cleared and
 * re-inserted for that year (idempotent), so it's a manual "catch-up" you can run
 * anytime.
 *
 *   npm run seed:history                       # default year, real seed
 *   npm run seed:history -- 25                 # FY 2025-26 (alias "25" / "2025")
 *   npm run seed:history -- 25 --dry-run       # fetch + parse + count, NO DB writes
 *   npm run seed:history -- 25 --only Delhi,Patna
 *
 * To add a future year, append one entry to YEARS with that year's spreadsheetId
 * and per-channel gids. No new script needed.
 */
import * as XLSX from "xlsx";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";
import { offlineSyncService } from "../src/features/sales/server/offlineSyncService.js";

const prisma = new PrismaClient();

interface YearConfig {
  financialYear: string; // canonical label stored on every row
  spreadsheetId: string;
  channels: { channel: string; gid: string }[];
}

// One entry per historical financial year. Keyed by the canonical FY label;
// short aliases (e.g. "25", "2025") resolve to it via resolveYear().
const YEARS: Record<string, YearConfig> = {
  "2025-26": {
    financialYear: "2025-26",
    spreadsheetId: "1wl4YoMMQY3H7mMbekPQZZA31ZycYBC_z0aaodDLnT6s",
    channels: [
      { channel: "Delhi",     gid: "1541048746" },
      { channel: "Online",    gid: "1200469601" },
      { channel: "BookFair",  gid: "243120142"  },
      { channel: "Mumbai",    gid: "460592538"  },
      { channel: "Lokbharti", gid: "1187294605" },
      { channel: "Patna",     gid: "1102934728" },
    ],
  },
};

const DEFAULT_YEAR = "2025-26";

// Accepts "2025-26", "2025", or "25" → canonical "2025-26".
function resolveYear(input: string | undefined): YearConfig {
  if (!input) return YEARS[DEFAULT_YEAR]!;
  if (YEARS[input]) return YEARS[input]!;
  const norm = input.trim();
  for (const [key, cfg] of Object.entries(YEARS)) {
    const startFull = key.split("-")[0]!;        // "2025"
    const startShort = startFull.slice(-2);       // "25"
    if (norm === startFull || norm === startShort) return cfg;
  }
  throw new Error(
    `Unknown year "${input}". Configured years: ${Object.keys(YEARS).join(", ")}`,
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyIdx = args.indexOf("--only");
  const only = onlyIdx !== -1 && args[onlyIdx + 1]
    ? args[onlyIdx + 1]!.split(",").map((s) => s.trim().toLowerCase())
    : null;
  // First non-flag token (and not the value of --only) is the year selector.
  const yearArg = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--only");
  return { dryRun, only, year: resolveYear(yearArg) };
}

async function fetchRows(spreadsheetId: string, gid: string): Promise<any[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status} ${res.statusText})`);
  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheet in workbook");
  const sheet = workbook.Sheets[sheetName]!;
  return XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
}

async function run() {
  const { dryRun, only, year } = parseArgs();
  const FINANCIAL_YEAR = year.financialYear;
  const targets = only
    ? year.channels.filter((c) => only.includes(c.channel.toLowerCase()))
    : year.channels;

  console.log(
    `\n=== Seed FY ${FINANCIAL_YEAR} history ${dryRun ? "(DRY RUN — no DB writes)" : "(LIVE — writing to DB)"} ===`,
  );
  console.log(`Channels: ${targets.map((t) => t.channel).join(", ")}\n`);

  const summary: { channel: string; sourceRows: number; imported: number; minDate?: string; maxDate?: string }[] = [];

  for (const { channel, gid } of targets) {
    const t0 = Date.now();
    process.stdout.write(`[${channel}] fetching… `);
    const rows = await fetchRows(year.spreadsheetId, gid);
    const sourceRows = Math.max(0, rows.length - 1); // minus header
    process.stdout.write(`${sourceRows} data rows. `);

    // Date range from the source (col index 1 = Trnsdocdate, YYYY-MM-DD)
    let minDate: string | undefined;
    let maxDate: string | undefined;
    for (let i = 1; i < rows.length; i++) {
      const raw = rows[i]?.[1];
      let iso: string | undefined;
      if (raw instanceof Date && !isNaN(raw.getTime())) iso = raw.toISOString().slice(0, 10);
      else if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) iso = raw.slice(0, 10);
      else if (typeof raw === "number" && raw > 30000 && raw < 60000) {
        // Excel serial date → ISO (same conversion processData uses)
        const d = new Date((raw - 25569) * 86400 * 1000);
        if (!isNaN(d.getTime())) iso = d.toISOString().slice(0, 10);
      }
      if (iso) {
        if (!minDate || iso < minDate) minDate = iso;
        if (!maxDate || iso > maxDate) maxDate = iso;
      }
    }

    if (dryRun) {
      console.log(`range ${minDate ?? "?"} → ${maxDate ?? "?"} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      summary.push({ channel, sourceRows, imported: 0, minDate, maxDate });
      continue;
    }

    // Idempotent: clear only THIS channel + THIS year before re-inserting, so
    // re-seeding one year never disturbs other archived years.
    const deleted = await (prisma as any).offlineSaleHistory.deleteMany({ where: { channel, financialYear: FINANCIAL_YEAR } });
    process.stdout.write(`cleared ${deleted.count} existing… `);

    const result = await offlineSyncService.processData(
      rows,
      (prisma as any).offlineSaleHistory,
      undefined,
      undefined,
      { channel, financialYear: FINANCIAL_YEAR },
      true, // omitRawJson — history table has no rawJson column
    );

    console.log(`imported ${result.importedCount} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    summary.push({ channel, sourceRows, imported: result.importedCount, minDate, maxDate });
  }

  console.log("\n=== Summary ===");
  console.table(summary);
  const totalSrc = summary.reduce((s, r) => s + r.sourceRows, 0);
  const totalImp = summary.reduce((s, r) => s + r.imported, 0);
  console.log(`Total source rows: ${totalSrc}${dryRun ? "" : ` | Total imported: ${totalImp}`}`);
  if (dryRun) console.log("\nDry run complete — no data written. Re-run without --dry-run to seed.");
}

run()
  .catch((e) => {
    console.error("\nSeed failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
