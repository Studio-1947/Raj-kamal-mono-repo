
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const eTitles = await prisma.googleSheetOfflineSale.count({
    where: { title: { startsWith: 'E-', mode: 'insensitive' } }
  });
  
  const negativeAmount = await prisma.googleSheetOfflineSale.count({
    where: { amount: { lt: 0 } }
  });

  const zeroOrNullAmount = await prisma.googleSheetOfflineSale.count({
    where: { OR: [{ amount: null }, { amount: 0 }] }
  });

  console.log({ eTitles, negativeAmount, zeroOrNullAmount });
}

main().finally(() => prisma.$disconnect());
