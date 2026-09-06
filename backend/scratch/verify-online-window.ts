/** READ-ONLY: reconcile the sheet's 17,694 count against the dashboard KPI tiles. */
import * as XLSX from "xlsx";
import fetch from "node-fetch";

const URL =
  "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=541252527";

function getVal(row: any[], map: Record<string, number>, key: string): string {
  const k = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const i = map[k];
  if (i === undefined || i >= row.length) return "";
  return String(row[i] || "").trim().replace(/\s+/g, " ");
}
function parseDate(val: string): Date | null {
  if (!val) return null;
  const v = String(val).trim();
  if (/^\d{5}(\.\d+)?$/.test(v)) return new Date((parseFloat(v) - 25569) * 86400 * 1000);
  const m = v.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (m) return new Date(Date.UTC(+m[3]!, +m[2]! - 1, +m[1]!));
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
const money = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");

interface Bucket { rows: number; gross: number; inAmt: number; qty: number; inQty: number; refundRows: number; docs: Set<string>; customers: Set<string> }
const mk = (): Bucket => ({ rows: 0, gross: 0, inAmt: 0, qty: 0, inQty: 0, refundRows: 0, docs: new Set(), customers: new Set() });
const add = (b: Bucket, a: number, ia: number, q: number, iq: number, doc: string, cust: string) => {
  b.rows++; b.gross += a > 0 ? a : 0; b.inAmt += ia > 0 ? ia : 0; b.qty += q; b.inQty += iq;
  if (iq > 0 || ia > 0) b.refundRows++;
  if (doc) b.docs.add(doc);
  if (cust) b.customers.add(cust.trim().toLowerCase());
};
const show = (name: string, b: Bucket) => {
  console.log(`\n--- ${name} ---`);
  console.log({
    rows: b.rows,
    netRevenue: money(b.gross - b.inAmt),
    grossOut: money(b.gross),
    returnsIn: money(b.inAmt),
    netCopies: b.qty - b.inQty,
    grossQty: b.qty,
    inQty: b.inQty,
    refundRows: b.refundRows,
    distinctDocNos: b.docs.size,
    distinctCustomers: b.customers.size,
  });
};

async function main() {
  const res = await fetch(URL);
  const wb = XLSX.read(await res.arrayBuffer(), { type: "buffer" });
  const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!]!, { header: 1 });
  const headers = (rows[0] as string[]) ?? [];
  const map: Record<string, number> = {};
  headers.forEach((h: any, i: number) => {
    if (h) { const nk = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, ""); if (nk) map[nk] = i; }
  });

  // The dashboard's default window: FY-to-date. FY2026-27 => 1 Apr 2026 .. end of today.
  const now = new Date();
  const fyStart = new Date(Date.UTC(2026, 3, 1, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const all = mk(), inWindow = mk(), beforeFy = mk(), future = mk(), noDate = mk();
  const futureByMonth = new Map<string, number>();

  for (const row of rows.slice(1)) {
    if (!Array.isArray(row) || row.length === 0 || row.every((c) => c === "" || c === null)) continue;
    const d = parseDate(getVal(row, map, "Trnsdocdate") || getVal(row, map, "TrnsdocdateStr"));
    const a = parseFloat(getVal(row, map, "OUTAmount") || "0") || 0;
    const ia = parseFloat(getVal(row, map, "INAmount") || "0") || 0;
    const q = parseInt(getVal(row, map, "OUT") || "0") || 0;
    const iq = parseInt(getVal(row, map, "IN") || "0") || 0;
    const doc = getVal(row, map, "TrnsdocNo");
    const cust = getVal(row, map, "CustomerName");

    add(all, a, ia, q, iq, doc, cust);
    if (!d) { add(noDate, a, ia, q, iq, doc, cust); continue; }
    if (d < fyStart) add(beforeFy, a, ia, q, iq, doc, cust);
    else if (d > todayEnd) {
      add(future, a, ia, q, iq, doc, cust);
      const k = d.toISOString().slice(0, 7);
      futureByMonth.set(k, (futureByMonth.get(k) ?? 0) + 1);
    } else add(inWindow, a, ia, q, iq, doc, cust);
  }

  console.log(`Today (UTC): ${todayEnd.toISOString().slice(0, 10)}   FY window: 2026-04-01 .. today`);
  show("WHOLE SHEET (what the 17,694 row count shows)", all);
  show("IN DASHBOARD WINDOW (FY-to-date)", inWindow);
  show("EXCLUDED — dated BEFORE 1 Apr 2026 (previous FY)", beforeFy);
  show("EXCLUDED — dated in the FUTURE (after today)", future);
  if (noDate.rows) show("EXCLUDED — no parseable date", noDate);

  console.log("\nFuture-dated rows by month:", Object.fromEntries([...futureByMonth].sort()));
  console.log("\nRow arithmetic:", inWindow.rows, "+", beforeFy.rows, "+", future.rows, "+", noDate.rows, "=",
    inWindow.rows + beforeFy.rows + future.rows + noDate.rows, "(sheet data rows:", all.rows + ")");
}
main().catch((e) => { console.error(e); process.exit(1); });
