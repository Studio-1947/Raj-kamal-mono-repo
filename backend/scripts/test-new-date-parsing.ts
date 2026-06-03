import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function parseSheetDate(val: string): Date | null {
  if (!val) return null;
  val = String(val).trim();
  
  // 1. Check Excel serial number
  if (/^\d{5}(\.\d+)?$/.test(val)) {
    const serial = parseFloat(val);
    return new Date((serial - 25569) * 86400 * 1000);
  }
  
  // 2. Check DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = val.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed month
    const year = parseInt(dmyMatch[3], 10);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    
    const date = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 3. Fallback to native JS Date parser
  const parsedDate = new Date(val);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  
  return null;
}

async function run() {
  console.log("Loading all GoogleSheetOfflineSale records...");
  const rows = await prisma.googleSheetOfflineSale.findMany({
    select: {
      id: true,
      dateStr: true,
      qty: true,
      inQty: true,
      amount: true,
      inAmount: true
    }
  });

  console.log(`Loaded ${rows.length} rows. Parsing dates using new logic...`);

  const monthly: Record<string, { count: number; grossQty: number; netQty: number; grossRevenue: number; netRevenue: number }> = {};
  let nullCount = 0;

  for (const r of rows) {
    const parsed = parseSheetDate(r.dateStr || "");
    if (!parsed) {
      nullCount++;
      continue;
    }
    const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly[monthKey]) {
      monthly[monthKey] = { count: 0, grossQty: 0, netQty: 0, grossRevenue: 0, netRevenue: 0 };
    }
    const m = monthly[monthKey];
    m.count++;
    
    const qtyVal = Number(r.qty || 0);
    const inQtyVal = Number(r.inQty || 0);
    const amountVal = Number(r.amount || 0);
    const inAmountVal = Number(r.inAmount || 0);

    m.grossQty += qtyVal;
    m.netQty += (qtyVal - inQtyVal);
    m.grossRevenue += amountVal;
    m.netRevenue += (amountVal - inAmountVal);
  }

  console.log(`Parsing done. Null dates count: ${nullCount}`);
  console.log("\n=== Corrected Monthly Summary for Offline (Delhi) ===");
  const sortedMonths = Object.keys(monthly).sort();
  for (const mKey of sortedMonths) {
    const m = monthly[mKey];
    console.log(`Month: ${mKey}`);
    console.log(`  Rows: ${m.count}`);
    console.log(`  Gross Qty (Sold): ${m.grossQty} | Net Qty: ${m.netQty}`);
    console.log(`  Gross Revenue: ${m.grossRevenue.toFixed(2)} | Net Revenue: ${m.netRevenue.toFixed(2)}`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
