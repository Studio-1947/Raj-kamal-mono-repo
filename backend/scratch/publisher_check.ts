import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [dPubs, mPubs, pPubs, oPubs, bPubs, lPubs] = await Promise.all([
    prisma.googleSheetOfflineSale.groupBy({
      by: ['publisher'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.mumbaiOfflineSale.groupBy({
      by: ['publisher'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.patnaOfflineSale.groupBy({
      by: ['publisher'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.onlineOfflineSale.groupBy({
      by: ['publisher'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.bookFairOfflineSale.groupBy({
      by: ['publisher'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.lokbhartiOfflineSale.groupBy({
      by: ['publisher'],
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  console.log('=== Delhi Offline (Google Sheet) Publishers ===');
  dPubs.slice(0, 10).forEach(p => console.log(`  ${p.publisher || '[Empty]'}: Count = ${p._count._all}, Revenue = ${Number(p._sum.amount ?? 0).toLocaleString('en-IN')}`));

  console.log('\n=== Patna Offline Publishers ===');
  pPubs.slice(0, 10).forEach(p => console.log(`  ${p.publisher || '[Empty]'}: Count = ${p._count._all}, Revenue = ${Number(p._sum.amount ?? 0).toLocaleString('en-IN')}`));

  console.log('\n=== Online Offline Publishers ===');
  oPubs.slice(0, 10).forEach(p => console.log(`  ${p.publisher || '[Empty]'}: Count = ${p._count._all}, Revenue = ${Number(p._sum.amount ?? 0).toLocaleString('en-IN')}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
