
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.googleSheetOfflineSale.findMany({
    where: { title: { contains: 'RAJKAMAL CHOUDHARY RACHANAWALI', mode: 'insensitive' } },
    select: { amount: true, rate: true, qty: true }
  });
  console.log(r);
}
main().finally(() => prisma.$disconnect());
