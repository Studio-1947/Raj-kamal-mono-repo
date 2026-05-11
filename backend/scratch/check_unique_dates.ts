
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.googleSheetOfflineSale.findMany({
    where: { date: null },
    select: { dateStr: true }
  });
  
  const uniqueDates = new Set(records.map(r => r.dateStr).filter(Boolean));
  console.log(`Found ${records.length} records with ${uniqueDates.size} unique date strings.`);
}

main().finally(() => prisma.$disconnect());
