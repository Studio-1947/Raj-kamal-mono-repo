
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.googleSheetOfflineSale.findMany({
    where: { title: { contains: 'RAJKAMAL CHOUDHARY RACHANAWALI', mode: 'insensitive' } },
    select: { id: true, docNo: true, title: true, amount: true, rate: true, qty: true }
  });
  const fs = require('fs');
  fs.writeFileSync('rajkamal_rows.json', JSON.stringify(rows, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
}
main().finally(() => prisma.$disconnect());
