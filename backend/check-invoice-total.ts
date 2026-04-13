
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.googleSheetOfflineSale.aggregate({
    where: { docNo: 'RJ/EX/4' },
    _sum: { amount: true },
    _count: { _all: true }
  });
  console.log('Invoice RJ/EX/4 metrics:');
  console.log(r);
}
main().finally(() => prisma.$disconnect());
