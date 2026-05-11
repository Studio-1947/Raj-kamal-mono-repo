
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const futureRecords = await prisma.googleSheetOfflineSale.count({
    where: { date: { gt: now } }
  });
  
  console.log({
    now: now.toISOString(),
    futureRecords
  });
}

main().finally(() => prisma.$disconnect());
