
import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const t = 'E-RAJKAMAL CHOUDHARY RACHANAWALI : VOLS. 1-8';
  const sql = Prisma.sql`
      SELECT
        CASE
          WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title")
          WHEN "isbn" IS NOT NULL AND "isbn" != '' THEN '[No Title] ISBN: ' || "isbn"
          ELSE 'Untitled Item (Doc: ' || COALESCE("docNo", 'Unknown') || ')'
        END AS title,
        COALESCE(SUM(
          CASE
            WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
            WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
            ELSE 0
          END
        ), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty,
        CASE 
          WHEN COALESCE(SUM("qty"), 0) > 0 THEN 
            COALESCE(SUM(
              CASE
                WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
                WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
                ELSE 0
              END
            ), 0)::float / SUM("qty")
          ELSE 0 
        END AS rate
      FROM "google_sheet_offline_sales"
      WHERE title = ${t}
      GROUP BY 1
  `;
  const result = await prisma.$queryRaw(sql);
  console.log(JSON.stringify(result, null, 2));
}
main().finally(() => prisma.$disconnect());
