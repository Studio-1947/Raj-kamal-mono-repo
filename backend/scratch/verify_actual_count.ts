import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Checking actual row counts in the database...");
  const onlineCount = await prisma.onlineOfflineSale.count();
  const bookFairCount = await prisma.bookFairOfflineSale.count();
  const lokbhartiCount = await prisma.lokbhartiOfflineSale.count();

  console.log(`\nDatabase Counts:`);
  console.log(`- Online Offline Sales: ${onlineCount}`);
  console.log(`- BookFair Offline Sales: ${bookFairCount}`);
  console.log(`- Lokbharti Offline Sales: ${lokbhartiCount}`);

  // Let's check if there are duplicate row hashes in the database
  const onlineUniqueHashes = await prisma.onlineOfflineSale.groupBy({
    by: ['rowHash'],
    _count: { _all: true }
  });
  console.log(`- Online Unique Hashes in DB: ${onlineUniqueHashes.length}`);
}

main().finally(() => prisma.$disconnect());
