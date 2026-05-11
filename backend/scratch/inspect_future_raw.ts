
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const futureRecord = await prisma.googleSheetOfflineSale.findFirst({
    where: { date: { gt: new Date() } }
  });
  
  console.log(JSON.stringify(futureRecord, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

main().finally(() => prisma.$disconnect());
