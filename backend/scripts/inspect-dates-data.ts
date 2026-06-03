import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const models = [
    { name: "Offline (GoogleSheetOfflineSale)", delegate: prisma.googleSheetOfflineSale },
    { name: "Lokbharti (LokbhartiOfflineSale)", delegate: prisma.lokbhartiOfflineSale },
    { name: "Mumbai (MumbaiOfflineSale)", delegate: prisma.mumbaiOfflineSale },
    { name: "Online (OnlineOfflineSale)", delegate: prisma.onlineOfflineSale },
    { name: "BookFair (BookFairOfflineSale)", delegate: prisma.bookFairOfflineSale },
    { name: "Patna (PatnaOfflineSale)", delegate: prisma.patnaOfflineSale },
  ];

  for (const model of models) {
    console.log(`\n=== Model: ${model.name} ===`);
    const totalCount = await (model.delegate as any).count();
    console.log(`Total rows: ${totalCount}`);

    if (totalCount === 0) continue;

    // Get date range
    const firstRow = await (model.delegate as any).findFirst({
      orderBy: { date: 'asc' },
      select: { date: true, dateStr: true }
    });
    const lastRow = await (model.delegate as any).findFirst({
      orderBy: { date: 'desc' },
      select: { date: true, dateStr: true }
    });
    console.log(`Date range in DB: ${firstRow?.date?.toISOString()} (${firstRow?.dateStr}) to ${lastRow?.date?.toISOString()} (${lastRow?.dateStr})`);

    // Let's query monthly aggregates directly via prisma query or raw SQL
    // Since prisma date grouping is easy, let's pull all dates and aggregate in JS to avoid SQL dialect details
    const rows = await (model.delegate as any).findMany({
      select: {
        date: true,
        dateStr: true,
        qty: true,
        inQty: true,
        amount: true,
        inAmount: true
      }
    });

    const monthly: Record<string, { count: number; grossQty: number; netQty: number; grossRevenue: number; netRevenue: number; sampleDates: string[] }> = {};
    let nullDates = 0;
    let invalidDates = 0;

    for (const r of rows) {
      if (!r.date) {
        nullDates++;
        continue;
      }
      const d = new Date(r.date);
      if (isNaN(d.getTime())) {
        invalidDates++;
        continue;
      }
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[monthKey]) {
        monthly[monthKey] = { count: 0, grossQty: 0, netQty: 0, grossRevenue: 0, netRevenue: 0, sampleDates: [] };
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
      if (m.sampleDates.length < 3 && r.dateStr && !m.sampleDates.includes(r.dateStr)) {
        m.sampleDates.push(r.dateStr);
      }
    }

    console.log(`Null dates: ${nullDates}, Invalid dates: ${invalidDates}`);
    console.log("Monthly summary (sorted by month):");
    const sortedMonths = Object.keys(monthly).sort();
    for (const mKey of sortedMonths) {
      const data = monthly[mKey];
      console.log(`  Month: ${mKey}`);
      console.log(`    Rows: ${data.count}`);
      console.log(`    Gross Qty: ${data.grossQty} | Net Qty: ${data.netQty}`);
      console.log(`    Gross Rev: ${data.grossRevenue.toFixed(2)} | Net Rev: ${data.netRevenue.toFixed(2)}`);
      console.log(`    Sample DateStrings: ${data.sampleDates.join(', ')}`);
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
