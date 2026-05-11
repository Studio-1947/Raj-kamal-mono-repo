
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nullDateRows = await prisma.googleSheetOfflineSale.findMany({
    where: { date: null },
    take: 5
  });
  console.log(JSON.stringify(nullDateRows, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

main().finally(() => prisma.$disconnect());
