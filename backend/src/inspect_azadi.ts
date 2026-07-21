import { prisma } from './lib/prisma.js';

async function main() {
  console.log("=== DELHI SHEET SALES MATCHING 'AZADI' ===");
  const delhiRows = await prisma.googleSheetOfflineSale.findMany({
    where: {
      title: { contains: 'azadi', mode: 'insensitive' }
    },
    select: {
      id: true,
      title: true,
      binding: true,
      qty: true,
      inQty: true,
      amount: true,
      inAmount: true,
      date: true
    }
  });

  console.log(`Total rows found in Delhi sheet: ${delhiRows.length}`);
  
  // Group by title and binding as stored
  const groups: Record<string, { qty: number; inQty: number; netQty: number; count: number }> = {};
  for (const r of delhiRows) {
    const key = `${r.title} | ${r.binding}`;
    if (!groups[key]) {
      groups[key] = { qty: 0, inQty: 0, netQty: 0, count: 0 };
    }
    const q = Number(r.qty || 0);
    const iq = Number(r.inQty || 0);
    groups[key].qty += q;
    groups[key].inQty += iq;
    groups[key].netQty += (q - iq);
    groups[key].count += 1;
  }

  console.table(Object.entries(groups).map(([key, val]) => ({
    Group: key,
    RowsCount: val.count,
    GrossQty: val.qty,
    ReturnsQty: val.inQty,
    NetQty: val.netQty
  })));
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
