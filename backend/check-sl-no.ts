
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.googleSheetOfflineSale.findFirst({
    where: { docNo: 'RJ/EX/4', title: { contains: 'NIRALA', mode: 'insensitive' } },
    select: { slNo: true, title: true, rate: true }
  });
  console.log('Sample for user:', row);
}
main().finally(() => prisma.$disconnect());
