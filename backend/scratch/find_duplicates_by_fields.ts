
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Finding duplicates in GoogleSheetOfflineSale based on docNo, date, isbn, qty, amount...");

  const duplicates = await prisma.$queryRaw`
    SELECT "docNo", "date", "isbn", "qty", "amount", COUNT(*) as count
    FROM google_sheet_offline_sales
    WHERE "docNo" IS NOT NULL
    GROUP BY "docNo", "date", "isbn", "qty", "amount"
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `;

  console.log("Top 20 duplicate groups:");
  console.log(JSON.stringify(duplicates, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));

  const totalDuplicates = await prisma.$queryRaw`
    SELECT SUM(count - 1) as "totalDuplicateRows"
    FROM (
      SELECT COUNT(*) as count
      FROM google_sheet_offline_sales
      WHERE "docNo" IS NOT NULL
      GROUP BY "docNo", "date", "isbn", "qty", "amount"
      HAVING COUNT(*) > 1
    ) as sub
  `;
  
  console.log("\nTotal duplicate rows to remove:", totalDuplicates);
}

main().finally(() => prisma.$disconnect());
