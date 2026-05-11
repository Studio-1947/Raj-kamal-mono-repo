
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting raw SQL migration to fix null dates...");
  
  // Try with double quotes for camelCase column names in Postgres
  const result = await prisma.$executeRawUnsafe(`
    UPDATE google_sheet_offline_sales 
    SET "date" = CAST("dateStr" AS TIMESTAMP) 
    WHERE "date" IS NULL 
    AND "dateStr" IS NOT NULL 
    AND "dateStr" != ''
  `);
  
  console.log(`Migration complete. Fixed ${result} records.`);
}

main().finally(() => prisma.$disconnect());
