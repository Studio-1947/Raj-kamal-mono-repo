
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.googleSheetOfflineSale.findUnique({
    where: { id: 649080n },
    select: { title: true, rawJson: true }
  });
  console.log('Row with title:', row);
}
main().finally(() => prisma.$disconnect());
