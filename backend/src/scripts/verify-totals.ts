import { prisma } from '../lib/prisma.js';

type ChannelKey = 'Delhi' | 'Mumbai' | 'Patna' | 'Online' | 'BookFair' | 'Lokbharti';

const ALL_CHANNELS: ChannelKey[] = ['Delhi', 'Mumbai', 'Patna', 'Online', 'BookFair', 'Lokbharti'];

function getModel(ch: ChannelKey): any {
  switch (ch) {
    case 'Delhi':     return prisma.googleSheetOfflineSale;
    case 'Mumbai':    return prisma.mumbaiOfflineSale;
    case 'Patna':     return prisma.patnaOfflineSale;
    case 'Online':    return prisma.onlineOfflineSale;
    case 'BookFair':  return prisma.bookFairOfflineSale;
    case 'Lokbharti': return prisma.lokbhartiOfflineSale;
  }
}

async function verify() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
  const fyStart = new Date(`${startYear}-04-01T00:00:00.000Z`);

  console.log(`Verifying data for Indian Financial Year to Date (FYTD) starting from: ${fyStart.toISOString()} to ${now.toISOString()}\n`);

  const whereClause = {
    date: {
      gte: fyStart,
      lte: now
    }
  };

  let grandTotalRevenue = 0;
  let grandTotalQty = 0;
  let grandTotalCount = 0;

  console.log('----------------------------------------------------------------------------------------');
  console.log('| Channel    | Count   | Revenue (Amount)   | Quantity (Qty) |');
  console.log('----------------------------------------------------------------------------------------');

  for (const ch of ALL_CHANNELS) {
    const model = getModel(ch);
    const count = await model.count({ where: whereClause });
    const agg = await model.aggregate({
      _sum: { amount: true, qty: true, inAmount: true, inQty: true },
      where: whereClause
    });

    const revenue = Number(agg._sum.amount ?? 0) - Number(agg._sum.inAmount ?? 0);
    const qty = Number(agg._sum.qty ?? 0) - Number(agg._sum.inQty ?? 0);

    grandTotalRevenue += revenue;
    grandTotalQty += qty;
    grandTotalCount += count;

    console.log(`| ${ch.padEnd(10)} | ${count.toString().padEnd(7)} | ₹${revenue.toLocaleString('en-IN').padEnd(17)} | ${qty.toString().padEnd(14)} |`);
  }

  console.log('----------------------------------------------------------------------------------------');
  console.log(`| GRAND TOTAL | ${grandTotalCount.toString().padEnd(7)} | ₹${grandTotalRevenue.toLocaleString('en-IN').padEnd(17)} | ${grandTotalQty.toString().padEnd(14)} |`);
  console.log('----------------------------------------------------------------------------------------\n');

  // Compute Days Elapsed and Projections
  const diffTime = Math.abs(now.getTime() - fyStart.getTime());
  const daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  const projectedAnnualRevenue = Math.round((grandTotalRevenue / daysElapsed) * 365);
  const velocity = grandTotalRevenue / daysElapsed;

  console.log(`Days Elapsed since April 1st: ${daysElapsed} days`);
  console.log(`Velocity: ₹${Math.round(velocity).toLocaleString('en-IN')} / day (exact: ₹${velocity.toFixed(2)})`);
  console.log(`Annual Projected Sales (Velocity * 365): ₹${projectedAnnualRevenue.toLocaleString('en-IN')}`);
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
