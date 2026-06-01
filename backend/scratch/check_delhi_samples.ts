import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.googleSheetOfflineSale.count();
  console.log("Total Count:", count);
  const samples = await prisma.googleSheetOfflineSale.findMany({ take: 5 });
  console.dir(samples, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
