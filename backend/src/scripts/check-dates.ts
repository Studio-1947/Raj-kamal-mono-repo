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

async function run() {
  try {
    for (const ch of ALL_CHANNELS) {
      const model = getModel(ch);
      const count = await model.count();
      
      const minMax = await model.aggregate({
        _min: { date: true },
        _max: { date: true },
        _sum: { qty: true, inQty: true, amount: true, inAmount: true }
      });

      console.log(`Channel: ${ch}`);
      console.log(`  Total Rows: ${count}`);
      console.log(`  Min Date: ${minMax._min.date ? minMax._min.date.toISOString() : 'N/A'}`);
      console.log(`  Max Date: ${minMax._max.date ? minMax._max.date.toISOString() : 'N/A'}`);
      console.log(`  Gross Qty Sum: ${minMax._sum.qty ?? 0}`);
      console.log(`  Return Qty Sum (inQty): ${minMax._sum.inQty ?? 0}`);
      console.log(`  Net Qty: ${(minMax._sum.qty ?? 0) - (minMax._sum.inQty ?? 0)}`);
      console.log(`  Gross Amount Sum: ${minMax._sum.amount ?? 0}`);
      console.log(`  Return Amount Sum (inAmount): ${minMax._sum.inAmount ?? 0}`);
      console.log(`  Net Amount: ${Number(minMax._sum.amount ?? 0) - Number(minMax._sum.inAmount ?? 0)}`);
      console.log('------------------------------------------------------------');
    }
  } catch (err) {
    console.error("Error checking dates:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
