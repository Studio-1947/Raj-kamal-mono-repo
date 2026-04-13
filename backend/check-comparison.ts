
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const titles = [
    'RAJKAMAL CHOUDHARY RACHANAWALI',
    'SHRIKANT VERMA RACHANAWALI',
    'RAJENDRA YADAV RACHNAWALI',
    'RAMCHANDRA SHUKLA RACHANAWALI'
  ];
  const results: any[] = [];
  for (const t of titles) {
    const r = await prisma.googleSheetOfflineSale.aggregate({
      where: { title: { contains: t, mode: 'insensitive' } },
      _sum: { amount: true, qty: true },
      _max: { rate: true },
      _count: { _all: true }
    });
    results.push({ title: t, data: r });
  }
  fs.writeFileSync('comparison_results.json', JSON.stringify(results, null, 2));
}
main().finally(() => prisma.$disconnect());
