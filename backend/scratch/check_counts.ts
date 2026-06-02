import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.googleSheetOfflineSale.count();
  console.log("Delhi/General Count:", count);
  const mumbaiCount = await prisma.mumbaiOfflineSale.count();
  console.log("Mumbai Count:", mumbaiCount);
  const patnaCount = await prisma.patnaOfflineSale.count();
  console.log("PatnaCount:", patnaCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
