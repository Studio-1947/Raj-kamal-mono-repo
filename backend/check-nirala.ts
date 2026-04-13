
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.googleSheetOfflineSale.findUnique({
    where: { id: 649080n },
    select: { rawJson: true }
  });
  if (row) {
    fs.writeFileSync('nirala_raw.json', JSON.stringify(row, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
  }
}
main().finally(() => prisma.$disconnect());
