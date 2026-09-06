/**
 * READ-ONLY diagnostic: reconcile the "Website / Online" channel across
 * Google Sheet  ->  online_offline_sales table  ->  the three API aggregation paths.
 * No writes. Safe to delete after use.
 */
import * as XLSX from "xlsx";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const URL =
  "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=541252527";

const n = (v: any) => Number(v ?? 0);
const money = (v: any) => "₹" + Math.round(Number(v ?? 0)).toLocaleString("en-IN");

function getVal(row: any[], map: Record<string, number>, key: string): string {
  const k = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const i = map[k];
  if (i === undefined || i >= row.length) return "";
  return String(row[i] || "").trim().replace(/\s+/g, " ");
}

async function sheetSide() {
  const res = await fetch(URL);
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = (rows[0] as string[]) ?? [];
  const map: Record<string, number> = {};
  headers.forEach((h: any, i: number) => {
    if (h) {
      const nk = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (nk) map[nk] = i;
    }
  });

  let count = 0, empty = 0, gross = 0, inAmt = 0, qty = 0, inQty = 0;
  let noDate = 0, negAmt = 0, eTitles = 0, eTitleAmt = 0;
  for (const row of rows.slice(1)) {
    if (!Array.isArray(row) || row.length === 0 || row.every((c) => c === "" || c === null)) { empty++; continue; }
    count++;
    const a = parseFloat(getVal(row, map, "OUTAmount") || getVal(row, map, "Amount") || "0") || 0;
    const ia = parseFloat(getVal(row, map, "INAmount") || "0") || 0;
    const q = parseInt(getVal(row, map, "OUT") || getVal(row, map, "Qty") || "0") || 0;
    const iq = parseInt(getVal(row, map, "IN") || "0") || 0;
    gross += a > 0 ? a : 0; inAmt += ia > 0 ? ia : 0; qty += q; inQty += iq;
    const rawDate = getVal(row, map, "Trnsdocdate") || getVal(row, map, "Date") || getVal(row, map, "TrnsdocdateStr");
    if (!rawDate) noDate++;
    if (a < 0) negAmt++;
    const t = getVal(row, map, "BookName") || getVal(row, map, "ItemName") || getVal(row, map, "Title");
    if (/^E-/i.test(t)) { eTitles++; eTitleAmt += a > 0 ? a : 0; }
  }
  return { headers, count, empty, gross, inAmt, net: gross - inAmt, qty, inQty, noDate, negAmt, eTitles, eTitleAmt };
}

async function dbSide() {
  const [row]: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*)::int                                                              AS rows,
      COUNT(*) FILTER (WHERE "date" IS NULL)::int                                AS null_date_rows,
      COUNT(*) FILTER (WHERE "amount" < 0)::int                                  AS neg_amount_rows,
      COUNT(*) FILTER (WHERE "title" ~* '^E-')::int                              AS e_title_rows,
      COALESCE(SUM(CASE WHEN "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate"*"qty" ELSE 0 END),0)::float AS gross,
      COALESCE(SUM(CASE WHEN "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate"*"inQty" ELSE 0 END),0)::float AS in_amt,
      COALESCE(SUM("qty"),0)::int                                                AS qty,
      COALESCE(SUM("inQty"),0)::int                                              AS in_qty,
      MIN("date")                                                                AS min_date,
      MAX("date")                                                                AS max_date,
      COUNT(DISTINCT "rowHash")::int                                             AS distinct_hashes
    FROM "online_offline_sales"
  `);
  return row;
}

// The three aggregation paths the UI actually renders, all with NO user filter
// (i.e. the page's default view) so any delta is purely a code-path difference.
async function apiPaths() {
  const [counts]: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS cnt,
      (COALESCE(SUM(CASE WHEN "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate"*"qty" ELSE 0 END),0)
     - COALESCE(SUM(CASE WHEN "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate"*"inQty" ELSE 0 END),0))::float AS total
    FROM "online_offline_sales"
  `);
  // /summary timeSeries: requires date IS NOT NULL
  const [ts]: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS cnt,
      (COALESCE(SUM(CASE WHEN "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate"*"qty" ELSE 0 END),0)
     - COALESCE(SUM(CASE WHEN "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate"*"inQty" ELSE 0 END),0))::float AS total
    FROM "online_offline_sales" WHERE "date" IS NOT NULL
  `);
  // /summary topItems (itemsWhereClause): NO date filter at all + quality filters
  const [items]: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS cnt,
      (COALESCE(SUM(CASE WHEN "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate"*"qty" ELSE 0 END),0)
     - COALESCE(SUM(CASE WHEN "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate"*"inQty" ELSE 0 END),0))::float AS total
    FROM "online_offline_sales"
    WHERE ("amount" IS NULL OR "amount" >= 0) AND ("rate" IS NULL OR "rate" >= 0)
      AND ("qty" IS NULL OR "qty" >= 0) AND ("title" IS NULL OR "title" !~* '^E-')
  `);
  // /summary projection monthlyRows: FY-to-date + quality filters, ignores all user filters
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const [proj]: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS cnt,
      (COALESCE(SUM(CASE WHEN "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate"*"qty" ELSE 0 END),0)
     - COALESCE(SUM(CASE WHEN "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate"*"inQty" ELSE 0 END),0))::float AS total
    FROM "online_offline_sales"
    WHERE "date" IS NOT NULL AND "date" >= '${fyStart}-04-01T00:00:00Z' AND "date" <= NOW()
      AND ("amount" IS NULL OR "amount" >= 0) AND ("title" IS NULL OR "title" !~* '^E-')
  `);
  // Same FY window WITHOUT the quality filters — what the chart/KPI would show
  const [fyPlain]: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS cnt,
      (COALESCE(SUM(CASE WHEN "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate"*"qty" ELSE 0 END),0)
     - COALESCE(SUM(CASE WHEN "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate"*"inQty" ELSE 0 END),0))::float AS total
    FROM "online_offline_sales"
    WHERE "date" IS NOT NULL AND "date" >= '${fyStart}-04-01T00:00:00Z' AND "date" <= NOW()
  `);
  // Rows outside the current FY (would silently inflate the unfiltered KPI)
  const [outside]: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS cnt, MIN("date") AS min_date, MAX("date") AS max_date
    FROM "online_offline_sales"
    WHERE "date" IS NOT NULL AND ("date" < '${fyStart}-04-01T00:00:00Z' OR "date" > NOW())
  `);
  return { counts, ts, items, proj, fyPlain, outside, fyStart };
}

async function main() {
  const [s, d, a] = await Promise.all([sheetSide(), dbSide(), apiPaths()]);

  console.log("\n=== GOOGLE SHEET (Online tab, gid 541252527) ===");
  console.log("headers:", JSON.stringify(s.headers));
  console.log({ rows: s.count, emptySkipped: s.empty, gross: money(s.gross), inAmount: money(s.inAmt), net: money(s.net), qty: s.qty, inQty: s.inQty });
  console.log("quality:", { rowsWithNoDate: s.noDate, rowsWithNegativeAmount: s.negAmt, eTitleRows: s.eTitles, eTitleAmount: money(s.eTitleAmt) });

  console.log("\n=== DB online_offline_sales ===");
  console.log({ rows: n(d.rows), gross: money(d.gross), inAmount: money(d.in_amt), net: money(n(d.gross) - n(d.in_amt)), qty: n(d.qty), inQty: n(d.in_qty) });
  console.log("quality:", { nullDateRows: n(d.null_date_rows), negAmountRows: n(d.neg_amount_rows), eTitleRows: n(d.e_title_rows), distinctRowHashes: n(d.distinct_hashes), minDate: d.min_date, maxDate: d.max_date });

  console.log("\n=== SHEET vs DB ===");
  console.log({ rowDelta: n(d.rows) - s.count, netDelta: money(n(d.gross) - n(d.in_amt) - s.net), qtyDelta: n(d.qty) - s.qty });
  if (n(d.rows) !== n(d.distinct_hashes)) {
    console.log(`  NOTE: ${n(d.rows) - n(d.distinct_hashes)} rows share a rowHash with another row (identical business keys).`);
  }

  console.log(`\n=== API AGGREGATION PATHS (no filters, FY${a.fyStart}) ===`);
  console.log("KPI tiles      /counts        :", { rows: n(a.counts.cnt), net: money(a.counts.total) });
  console.log("Charts         /summary.timeSeries:", { rows: n(a.ts.cnt), net: money(a.ts.total) });
  console.log("Top/Bottom items (itemsWhere) :", { rows: n(a.items.cnt), net: money(a.items.total) });
  console.log("Projection     monthlyRows    :", { rows: n(a.proj.cnt), net: money(a.proj.total) });
  console.log("Same FY window, no quality flt:", { rows: n(a.fyPlain.cnt), net: money(a.fyPlain.total) });
  console.log("Rows OUTSIDE current FY       :", { rows: n(a.outside.cnt), min: a.outside.min_date, max: a.outside.max_date });

  console.log("\n=== DELTAS BETWEEN UI SURFACES ===");
  console.log("KPI - Chart          :", money(n(a.counts.total) - n(a.ts.total)), `(rows: ${n(a.counts.cnt) - n(a.ts.cnt)})`);
  console.log("KPI - TopItems basis :", money(n(a.counts.total) - n(a.items.total)), `(rows: ${n(a.counts.cnt) - n(a.items.cnt)})`);
  console.log("FY plain - Projection:", money(n(a.fyPlain.total) - n(a.proj.total)), `(rows: ${n(a.fyPlain.cnt) - n(a.proj.cnt)})`);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
