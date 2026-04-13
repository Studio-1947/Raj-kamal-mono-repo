
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.googleSheetOfflineSale.findMany({
    where: { docNo: 'RJ/EX/4' },
    select: { title: true, rate: true, amount: true, qty: true }
  });
  console.log(JSON.stringify(rows, null, 2));
}
main().finally(() => prisma.$disconnect());
