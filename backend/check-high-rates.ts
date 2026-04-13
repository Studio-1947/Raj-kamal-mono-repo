
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.googleSheetOfflineSale.findMany({
    where: { rate: { gt: 50000 } },
    take: 20,
    select: { id: true, title: true, rate: true, docNo: true, customerName: true, date: true }
  });
  fs.writeFileSync('high_rates.json', JSON.stringify(rows, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
}
main().finally(() => prisma.$disconnect());
