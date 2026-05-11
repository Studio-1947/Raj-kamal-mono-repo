
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const now = new Date("2026-05-11"); // User's current date
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  
  const total = await prisma.googleSheetOfflineSale.count();
  const olderThan90 = await prisma.googleSheetOfflineSale.count({
    where: { date: { lt: ninetyDaysAgo } }
  });
  const newerThan90 = await prisma.googleSheetOfflineSale.count({
    where: { date: { gte: ninetyDaysAgo } }
  });

  console.log({
    now: now.toISOString(),
    ninetyDaysAgo: ninetyDaysAgo.toISOString(),
    total,
    olderThan90,
    newerThan90
  });
}

main().finally(() => prisma.$disconnect());
