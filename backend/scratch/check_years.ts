
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const samples = await prisma.googleSheetOfflineSale.findMany({
    where: { date: null },
    select: { dateStr: true },
    take: 1000
  });
  
  const years: Record<string, number> = {};
  samples.forEach(s => {
    if (s.dateStr) {
      const year = s.dateStr.substring(0, 4);
      years[year] = (years[year] || 0) + 1;
    } else {
      years['null'] = (years['null'] || 0) + 1;
    }
  });
  
  console.log("DateStr Year Distribution (Sample 1000):", years);
}

main().finally(() => prisma.$disconnect());
