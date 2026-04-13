
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.googleSheetOfflineSale.findFirst({
    where: { title: { contains: 'RAMVILAS SHARMA', mode: 'insensitive' } },
    select: { title: true, rate: true, amount: true, rawJson: true }
  });
  if (row) {
    fs.writeFileSync('ramvilas_raw.json', JSON.stringify(row, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log('Saved Ramvilas raw JSON');
  }
}
main().finally(() => prisma.$disconnect());
