
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.googleSheetOfflineSale.findFirst({
    where: { title: { not: '' } },
    select: { id: true, title: true, rawJson: true }
  });
  if (row) {
    fs.writeFileSync('non_empty_title_raw.json', JSON.stringify(row, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log('Saved non-empty title row to non_empty_title_raw.json');
  }
}
main().finally(() => prisma.$disconnect());
