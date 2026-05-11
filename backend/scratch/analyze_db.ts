
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.googleSheetOfflineSale.count();
  const negativeAmount = await prisma.googleSheetOfflineSale.count({
    where: { amount: { lt: 0 } }
  });
  const eTitle = await prisma.googleSheetOfflineSale.count({
    where: { title: { startsWith: 'E-', mode: 'insensitive' } }
  });
  const nullDate = await prisma.googleSheetOfflineSale.count({
    where: { date: null }
  });

  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const withinOneYear = await prisma.googleSheetOfflineSale.count({
    where: {
      date: { gte: oneYearAgo }
    }
  });

  const withinOneYearFiltered = await prisma.googleSheetOfflineSale.count({
    where: {
      AND: [
        { date: { gte: oneYearAgo } },
        { OR: [{ amount: null }, { amount: { gte: 0 } }] },
        { NOT: { title: { startsWith: 'E-', mode: 'insensitive' } } }
      ]
    }
  });

  console.log({
    total,
    negativeAmount,
    eTitle,
    nullDate,
    withinOneYear,
    withinOneYearFiltered
  });
}

main().finally(() => prisma.$disconnect());
