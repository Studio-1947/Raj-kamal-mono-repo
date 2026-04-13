
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.googleSheetOfflineSale.count({
    where: { inQty: { gt: 0 } }
  });
  console.log(`Rows with returns (inQty > 0): ${count}`);
  
  const sample = await prisma.googleSheetOfflineSale.findFirst({
    where: { inQty: { gt: 0 } },
    select: { rate: true, title: true }
  });
  console.log('Sample return rate:', sample?.rate);
}
main().finally(() => prisma.$disconnect());
