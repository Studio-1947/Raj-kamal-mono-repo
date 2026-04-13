
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.googleSheetOfflineSale.findMany({
    take: 20,
    orderBy: { id: 'desc' },
    select: { id: true, title: true, rate: true, amount: true, qty: true, docNo: true }
  });
  console.log(JSON.stringify(rows, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
}
main().finally(() => prisma.$disconnect());
