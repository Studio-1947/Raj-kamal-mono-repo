
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting deduplication of GoogleSheetOfflineSale...");

  // We'll find the MIN(id) for each group of fields that define a unique record
  // and delete all others.
  
  const result = await prisma.$executeRaw`
    DELETE FROM google_sheet_offline_sales
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "docNo", "date", "isbn", "qty", "amount", "customerName", "slNo", "title"
                 ORDER BY id ASC
               ) as row_num
        FROM google_sheet_offline_sales
      ) t
      WHERE t.row_num > 1
    )
  `;

  console.log(`Successfully removed ${result} duplicate rows.`);
}

main().catch(err => {
  console.error("Deduplication failed:", err);
}).finally(() => prisma.$disconnect());
