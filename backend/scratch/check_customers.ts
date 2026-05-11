
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const uniqueCustomersAll = await prisma.googleSheetOfflineSale.aggregate({
    _count: { customerName: true }
  });
  
  const distinctCustomers = await prisma.$queryRaw`SELECT COUNT(DISTINCT "customerName") FROM google_sheet_offline_sales`;
  
  const futureCustomers = await prisma.$queryRaw`SELECT COUNT(DISTINCT "customerName") FROM google_sheet_offline_sales WHERE date > NOW()`;

  console.log({
    distinctCustomers,
    futureCustomers
  });
}

main().finally(() => prisma.$disconnect());
