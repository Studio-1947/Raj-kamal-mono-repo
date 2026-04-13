
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total,
      COUNT("date") as with_date
    FROM "google_sheet_offline_sales"
  `;
  console.log('Counts:', r);
}

main().finally(() => prisma.$disconnect());
