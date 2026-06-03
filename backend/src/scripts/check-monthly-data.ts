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
      console.log(`==================== CHANNEL: ${ch} ====================`);
      const model = getModel(ch);
      
      // Let's query and group by month using JS
      const items = await model.findMany({
        select: {
          date: true,
          qty: true,
          inQty: true,
          amount: true,
          inAmount: true
        }
      });

      const monthlyData: Record<number, {
        grossQty: number,
        inQty: number,
        netQty: number,
        grossAmount: number,
        inAmount: number,
        netAmount: number,
        count: number
      }> = {};

      for (let m = 1; m <= 12; m++) {
        monthlyData[m] = { grossQty: 0, inQty: 0, netQty: 0, grossAmount: 0, inAmount: 0, netAmount: 0, count: 0 };
      }

      for (const item of items) {
        if (!item.date) continue;
        const month = new Date(item.date).getMonth() + 1; // 1-indexed (1 = Jan, 12 = Dec)
        const gQty = Number(item.qty ?? 0);
        const iQty = Number(item.inQty ?? 0);
        const gAmt = Number(item.amount ?? 0);
        const iAmt = Number(item.inAmount ?? 0);

        monthlyData[month].grossQty += gQty;
        monthlyData[month].inQty += iQty;
        monthlyData[month].netQty += (gQty - iQty);
        monthlyData[month].grossAmount += gAmt;
        monthlyData[month].inAmount += iAmt;
        monthlyData[month].netAmount += (gAmt - iAmt);
        monthlyData[month].count++;
      }

      console.log('| Month | Count | Gross Qty | Net Qty | Gross Rev | Net Rev |');
      console.log('------------------------------------------------------------------');
      const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      let totalGrossQty = 0;
      let totalNetQty = 0;
      let totalGrossRev = 0;
      let totalNetRev = 0;

      for (let m = 1; m <= 12; m++) {
        const d = monthlyData[m];
        if (d.count === 0) continue;
        console.log(`| ${MONTH_NAMES[m].padEnd(5)} | ${d.count.toString().padEnd(5)} | ${d.grossQty.toString().padEnd(9)} | ${d.netQty.toString().padEnd(7)} | ₹${d.grossAmount.toFixed(2).padEnd(9)} | ₹${d.netAmount.toFixed(2).padEnd(9)} |`);
        
        // Sum only for April, May, June (which matches the user's dates)
        if (m === 4 || m === 5 || m === 6) {
          totalGrossQty += d.grossQty;
          totalNetQty += d.netQty;
          totalGrossRev += d.grossAmount;
          totalNetRev += d.netAmount;
        }
      }
      console.log('------------------------------------------------------------------');
      console.log(`| AMJ   |       | ${totalGrossQty.toString().padEnd(9)} | ${totalNetQty.toString().padEnd(7)} | ₹${totalGrossRev.toFixed(2).padEnd(9)} | ₹${totalNetRev.toFixed(2).padEnd(9)} |`);
      console.log('========================================================\n');
    }
  } catch (err) {
    console.error("Error analyzing monthly data:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
