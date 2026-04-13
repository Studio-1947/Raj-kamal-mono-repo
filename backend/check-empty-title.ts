
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.googleSheetOfflineSale.findFirst({
    where: { title: '' },
    select: { id: true, isbn: true, author: true, rawJson: true }
  });
  if (row) {
    fs.writeFileSync('empty_title_raw.json', JSON.stringify(row, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log('Saved raw row for empty title to empty_title_raw.json');
  } else {
    console.log('No rows found with empty title');
  }
}
main().finally(() => prisma.$disconnect());
