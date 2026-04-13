
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.googleSheetOfflineSale.aggregate({
    where: { title: { contains: 'RAJKAMAL CHOUDHARY RACHANAWALI', mode: 'insensitive' } },
    _sum: { amount: true, qty: true },
    _max: { rate: true },
    _count: { _all: true }
  });
  console.log(r);
}
main().finally(() => prisma.$disconnect());
