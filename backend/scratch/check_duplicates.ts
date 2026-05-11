
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.googleSheetOfflineSale.count();
  const distinctHashes = await prisma.$queryRaw`SELECT COUNT(DISTINCT "rowHash") FROM google_sheet_offline_sales`;
  
  console.log({
    total,
    distinctHashes
  });
}

main().finally(() => prisma.$disconnect());
