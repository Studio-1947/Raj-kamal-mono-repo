import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const row = await prisma.googleSheetOfflineSale.findFirst();
  console.log("SAMPLE ROW ID:", row?.id);
  console.log("SAMPLE ROW TYPE:", row?.type);
  
  const types = await prisma.googleSheetOfflineSale.groupBy({
    by: ['type'],
    _count: { _all: true }
  });
  console.log("TYPES SUMMARY:", JSON.stringify(types, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
