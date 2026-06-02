import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Checking if new models exist on Prisma client...");
  try {
    const c1 = await prisma.onlineOfflineSale.count();
    const c2 = await prisma.bookFairOfflineSale.count();
    const c3 = await prisma.lokbhartiOfflineSale.count();
    console.log(`Success! New tables are fully queryable. Counts: Online: ${c1}, BookFair: ${c2}, Lokbharti: ${c3}`);
  } catch (e: any) {
    console.error("Failed to query new tables:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
