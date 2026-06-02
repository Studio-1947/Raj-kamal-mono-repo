import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const june_start = new Date('2026-06-01T00:00:00.000Z');
  const june_end   = new Date('2026-06-30T23:59:59.999Z');
  const w = { date: { gte: june_start, lte: june_end } };

  const [d, m, p, o, b, l] = await Promise.all([
    prisma.googleSheetOfflineSale.aggregate({ _sum: { amount: true }, where: w }),
    prisma.mumbaiOfflineSale.aggregate(     { _sum: { amount: true }, where: w }),
    prisma.patnaOfflineSale.aggregate(      { _sum: { amount: true }, where: w }),
    prisma.onlineOfflineSale.aggregate(     { _sum: { amount: true }, where: w }),
    prisma.bookFairOfflineSale.aggregate(   { _sum: { amount: true }, where: w }),
    prisma.lokbhartiOfflineSale.aggregate(  { _sum: { amount: true }, where: w }),
  ]);

  const toNum = (x: any) => Number(x._sum?.amount?.toString() || '0');
  const delhi    = toNum(d);
  const mumbai   = toNum(m);
  const patna    = toNum(p);
  const online   = toNum(o);
  const bookfair = toNum(b);
  const lok      = toNum(l);
  const total    = delhi + mumbai + patna + online + bookfair + lok;

  console.log('=== June 2026 ACTUAL DB Totals ===');
  console.log('Delhi Offline   :', delhi.toLocaleString('en-IN'));
  console.log('Mumbai Offline  :', mumbai.toLocaleString('en-IN'));
  console.log('Patna Offline   :', patna.toLocaleString('en-IN'));
  console.log('Online Website  :', online.toLocaleString('en-IN'));
  console.log('BookFair        :', bookfair.toLocaleString('en-IN'));
  console.log('Lokbharti       :', lok.toLocaleString('en-IN'));
  console.log('---');
  console.log('TOTAL           :', total.toLocaleString('en-IN'), '= Rs', (total / 100000).toFixed(2), 'L');

  // Also check how many records and which dates exist in June
  const [dCount, mCount, pCount, oCount, bCount, lCount] = await Promise.all([
    prisma.googleSheetOfflineSale.count({ where: w }),
    prisma.mumbaiOfflineSale.count(     { where: w }),
    prisma.patnaOfflineSale.count(      { where: w }),
    prisma.onlineOfflineSale.count(     { where: w }),
    prisma.bookFairOfflineSale.count(   { where: w }),
    prisma.lokbhartiOfflineSale.count(  { where: w }),
  ]);

  console.log('\n=== June Row Counts ===');
  console.log('Delhi   :', dCount);
  console.log('Mumbai  :', mCount);
  console.log('Patna   :', pCount);
  console.log('Online  :', oCount);
  console.log('BookFair:', bCount);
  console.log('Lok     :', lCount);

  // Sample dates present in June for Delhi
  if (dCount > 0) {
    const sample = await prisma.googleSheetOfflineSale.findMany({
      where: w,
      select: { date: true, amount: true },
      take: 5,
      orderBy: { date: 'asc' }
    });
    console.log('\nSample Delhi June records:');
    sample.forEach(r => console.log(' ', r.date?.toISOString().slice(0, 10), '->', Number(r.amount)));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
