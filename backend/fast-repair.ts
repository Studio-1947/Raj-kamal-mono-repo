
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Running fast title repair via SQL...');
  const count = await prisma.$executeRawUnsafe(`
    UPDATE "google_sheet_offline_sales" 
    SET "title" = TRIM("rawJson"->>4) 
    WHERE "title" = '' OR "title" IS NULL;
  `);
  console.log(`Successfully repaired ${count} titles.`);
}
main().finally(() => prisma.$disconnect());
