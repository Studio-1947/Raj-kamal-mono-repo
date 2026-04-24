
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.googleSheetOfflineSale.findMany({
    where: {
      title: { contains: 'Meri Tibbat Yatra(PB)', mode: 'insensitive' }
    },
    take: 5
  });
  console.log(JSON.stringify(result, null, 2));
}

main().finally(() => prisma.$disconnect());
