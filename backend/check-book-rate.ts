
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.googleSheetOfflineSale.findMany({
    where: { 
      title: { contains: 'RAJKAMAL CHOUDHARY RACHANAWALI', mode: 'insensitive' } 
    },
    select: { rate: true, qty: true, amount: true, title: true, isbn: true }
  });
  console.log(JSON.stringify(r, null, 2));
}
main().finally(() => prisma.$disconnect());
