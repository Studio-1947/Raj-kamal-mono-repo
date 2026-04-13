
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.googleSheetOfflineSale.findMany({
    take: 5,
    orderBy: { date: 'desc' },
    select: { date: true, binding: true, title: true }
  });
  console.log(r);
}
main().finally(() => prisma.$disconnect());
