
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.googleSheetOfflineSale.findMany({
    where: { rate: 5100 },
    select: { title: true, amount: true, qty: true, docNo: true }
  });
  console.log(JSON.stringify(rows, null, 2));
}
main().finally(() => prisma.$disconnect());
