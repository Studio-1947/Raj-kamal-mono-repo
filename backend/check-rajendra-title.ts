
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.googleSheetOfflineSale.findFirst({
    where: { title: { contains: 'RAJENDRA YADAV', mode: 'insensitive' } },
    select: { title: true }
  });
  console.log('Rajendra row title:', row?.title);
}
main().finally(() => prisma.$disconnect());
