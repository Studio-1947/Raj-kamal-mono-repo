
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.googleSheetOfflineSale.findUnique({
    where: { id: 649455n },
    select: { rawJson: true }
  });
  fs.writeFileSync('raw_row.json', JSON.stringify(row, null, 2));
}
main().finally(() => prisma.$disconnect());
