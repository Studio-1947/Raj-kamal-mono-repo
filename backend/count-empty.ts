
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const emptyCount = await prisma.googleSheetOfflineSale.count({
    where: { title: '' }
  });
  const totalCount = await prisma.googleSheetOfflineSale.count();
  console.log(`Total rows: ${totalCount}`);
  console.log(`Empty title rows: ${emptyCount}`);
  console.log(`Percent empty: ${(emptyCount/totalCount*100).toFixed(2)}%`);
}
main().finally(() => prisma.$disconnect());
