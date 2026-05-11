
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const futureRecords = await prisma.googleSheetOfflineSale.findMany({
    where: { date: { gt: new Date() } },
    select: { date: true, dateStr: true },
    take: 10
  });
  
  console.log(JSON.stringify(futureRecords, null, 2));
}

main().finally(() => prisma.$disconnect());
