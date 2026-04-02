import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const usaList = await prisma.googleSheetOfflineSale.findMany({
    where: { state: { in: ['USA', 'Singapore'] } },
    take: 5
  });
  console.log(usaList);
  process.exit(0);
}
run();
