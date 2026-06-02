import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const countsByType = await prisma.googleSheetOfflineSale.groupBy({
    by: ['type'],
    _count: { _all: true },
    _sum: {
      qty: true,
      amount: true
    }
  });

  console.log("Counts grouped by type:");
  console.log(JSON.stringify(countsByType, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));

  // Let's check the date range for each type
  for (const t of countsByType) {
    const dates = await prisma.googleSheetOfflineSale.aggregate({
      where: { type: t.type },
      _min: { date: true },
      _max: { date: true }
    });
    console.log(`Type: ${t.type || 'NULL'} | Min Date: ${dates._min.date} | Max Date: ${dates._max.date}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
