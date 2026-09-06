/** READ-ONLY: locate WHERE the sheet->DB gap sits for the Online channel. */
import * as XLSX from "xlsx";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const URL =
  "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=541252527";

function getVal(row: any[], map: Record<string, number>, key: string): string {
  const k = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const i = map[k];
  if (i === undefined || i >= row.length) return "";
  return String(row[i] || "").trim().replace(/\s+/g, " ");
}
const money = (v: any) => "₹" + Math.round(Number(v ?? 0)).toLocaleString("en-IN");

// Same date parsing as offlineSyncService.processData (non-Patna path)
function parseDate(val: string): Date | null {
  if (!val) return null;
  const v = String(val).trim();
  if (/^\d{5}(\.\d+)?$/.test(v)) return new Date((parseFloat(v) - 25569) * 86400 * 1000);
  const m = v.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (m) return new Date(Date.UTC(+m[3]!, +m[2]! - 1, +m[1]!));
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const res = await fetch(URL);
  const wb = XLSX.read(await res.arrayBuffer(), { type: "buffer" });
  const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!]!, { header: 1 });
  const headers = (rows[0] as string[]) ?? [];
  const map: Record<string, number> = {};
  headers.forEach((h: any, i: number) => {
    if (h) { const nk = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, ""); if (nk) map[nk] = i; }
  });

  const sheetByMonth = new Map<string, { rows: number; net: number }>();
  let unparseable = 0;
  const sheetDocNos = new Set<string>();
  for (const row of rows.slice(1)) {
    if (!Array.isArray(row) || row.length === 0 || row.every((c) => c === "" || c === null)) continue;
    const d = parseDate(getVal(row, map, "Trnsdocdate") || getVal(row, map, "TrnsdocdateStr"));
    const key = d ? d.toISOString().slice(0, 7) : "NO-DATE";
    if (!d) unparseable++;
    const a = parseFloat(getVal(row, map, "OUTAmount") || "0") || 0;
    const ia = parseFloat(getVal(row, map, "INAmount") || "0") || 0;
    const cur = sheetByMonth.get(key) ?? { rows: 0, net: 0 };
    cur.rows++; cur.net += (a > 0 ? a : 0) - (ia > 0 ? ia : 0);
    sheetByMonth.set(key, cur);
    const dn = getVal(row, map, "TrnsdocNo"); if (dn) sheetDocNos.add(dn);
  }

  const dbRows: any[] = await prisma.$queryRawUnsafe(`
    SELECT to_char("date",'YYYY-MM') AS m, COUNT(*)::int AS rows,
      (COALESCE(SUM(CASE WHEN "amount">0 THEN "amount" ELSE 0 END),0)
     - COALESCE(SUM(CASE WHEN "inAmount">0 THEN "inAmount" ELSE 0 END),0))::float AS net
    FROM "online_offline_sales" GROUP BY 1 ORDER BY 1
  `);
  const dbByMonth = new Map<string, { rows: number; net: number }>(
    dbRows.map((r) => [r.m ?? "NO-DATE", { rows: Number(r.rows), net: Number(r.net) }]),
  );

  console.log("\nmonth      sheet_rows  db_rows   row_gap   sheet_net        db_net           net_gap");
  const months = [...new Set([...sheetByMonth.keys(), ...dbByMonth.keys()])].sort();
  for (const m of months) {
    const s = sheetByMonth.get(m) ?? { rows: 0, net: 0 };
    const d = dbByMonth.get(m) ?? { rows: 0, net: 0 };
    console.log(
      m.padEnd(10),
      String(s.rows).padStart(10), String(d.rows).padStart(8), String(s.rows - d.rows).padStart(9),
      money(s.net).padStart(16), money(d.net).padStart(16), money(s.net - d.net).padStart(16),
    );
  }
  console.log("\nsheet rows with unparseable date:", unparseable);
  console.log("distinct docNos in sheet:", sheetDocNos.size);

  const dbDocs: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT "docNo")::int AS c FROM "online_offline_sales"`);
  console.log("distinct docNos in DB   :", dbDocs[0].c);

  const logs: any[] = await prisma.$queryRawUnsafe(`
    SELECT * FROM "sync_logs" ORDER BY "startedAt" DESC LIMIT 8
  `).catch(() => []);
  console.log("\n=== recent sync_logs ===");
  for (const l of logs) {
    const regions = typeof l.regions === "string" ? JSON.parse(l.regions) : l.regions;
    const online = Array.isArray(regions) ? regions.find((r: any) => r.region === "online") : null;
    console.log(l.startedAt, "| trigger=", l.trigger, "| ok=", l.ok, "| online=", JSON.stringify(online));
  }

  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
