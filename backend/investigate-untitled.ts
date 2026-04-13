
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.googleSheetOfflineSale.findMany({
    where: { 
      OR: [
        { title: null },
        { title: { equals: '' } }
      ]
    },
    take: 10,
    select: { isbn: true, docNo: true, amount: true, customerName: true, rawJson: true }
  });
  console.log(JSON.stringify(r, null, 2));
}
main().finally(() => prisma.$disconnect());
