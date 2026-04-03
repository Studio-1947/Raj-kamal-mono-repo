import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const since = new Date(Date.now() - 90 * 86400000);
  const until = new Date();

  const conditions = [Prisma.sql`"date" IS NOT NULL AND "date" >= ${since} AND "date" <= ${until}`];
  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

  const itemConditions: any[] = [];
  const itemsWhereClause = itemConditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(itemConditions, ' AND ')}`
    : Prisma.sql``;

  console.log('Step 1: timeSeries...');
  const timeSeriesRows = await prisma.$queryRaw<
    { day: string; total: number }[]
  >(Prisma.sql`
    SELECT
      to_char("date", 'YYYY-MM-DD') AS day,
      COALESCE(SUM(
        CASE
          WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
          ELSE 0
        END
      ), 0)::float AS total
    FROM "google_sheet_offline_sales"
    ${whereClause}
    GROUP BY to_char("date", 'YYYY-MM-DD')
    ORDER BY day ASC
  `);
  console.log('timeSeries rows:', timeSeriesRows.length);

  console.log('Step 2: topItems...');
  const topItemsRows = await prisma.$queryRaw<
    { title: string; total: number; qty: number }[]
  >(Prisma.sql`
    SELECT
      COALESCE(NULLIF(TRIM("title"), ''), 'Untitled Item') AS title,
      COALESCE(SUM(
        CASE
          WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
          ELSE 0
        END
      ), 0)::float AS total,
      COALESCE(SUM("qty"), 0)::int AS qty
    FROM "google_sheet_offline_sales"
    ${itemsWhereClause}
    GROUP BY COALESCE(NULLIF(TRIM("title"), ''), 'Untitled Item')
    HAVING SUM(
      CASE
        WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
        WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
        ELSE 0
      END
    ) > 0 OR SUM("qty") > 0
    ORDER BY total DESC
    LIMIT 10
  `);
  console.log('topItems rows:', topItemsRows.length);

  console.log('Step 3: bottomItems...');
  const bottomItemsRows = await prisma.$queryRaw<
    { title: string; total: number; qty: number }[]
  >(Prisma.sql`
    SELECT
      COALESCE(NULLIF(TRIM("title"), ''), 'Untitled Item') AS title,
      COALESCE(SUM(
        CASE
          WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
          ELSE 0
        END
      ), 0)::float AS total,
      COALESCE(SUM("qty"), 0)::int AS qty
    FROM "google_sheet_offline_sales"
    ${itemsWhereClause}
    GROUP BY COALESCE(NULLIF(TRIM("title"), ''), 'Untitled Item')
    HAVING (
      SUM(
        CASE
          WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
          ELSE 0
        END
      ) > 0 OR SUM("qty") > 0
    )
    AND TRIM("title") IS NOT NULL AND TRIM("title") != ''
    ORDER BY total ASC
    LIMIT 10
  `);
  console.log('bottomItems rows:', bottomItemsRows.length);

  console.log('Step 4: revenueByState...');
  const revenueByStateRows = await prisma.$queryRaw<
    { state: string; total: number }[]
  >(Prisma.sql`
    SELECT
      COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State') AS state,
      COALESCE(SUM(
        CASE
          WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
          ELSE 0
        END
      ), 0)::float AS total
    FROM "google_sheet_offline_sales"
    ${whereClause}
    GROUP BY COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State')
    ORDER BY total DESC
    LIMIT 10
  `);
  console.log('revenueByState rows:', revenueByStateRows.length);

  console.log('Step 5: revenueByPublisher...');
  const revenueByPubRows = await prisma.$queryRaw<
    { publisher: string; total: number }[]
  >(Prisma.sql`
    SELECT
      COALESCE(NULLIF(TRIM("publisher"), ''), 'Unknown Publisher') AS publisher,
      COALESCE(SUM(
        CASE
          WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
          ELSE 0
        END
      ), 0)::float AS total
    FROM "google_sheet_offline_sales"
    ${whereClause}
    GROUP BY COALESCE(NULLIF(TRIM("publisher"), ''), 'Unknown Publisher')
    ORDER BY total DESC
    LIMIT 10
  `);
  console.log('revenueByPublisher rows:', revenueByPubRows.length);

  console.log('Step 6: topCustomers...');
  const topCustomerRows = await prisma.$queryRaw<
    { customerName: string; total: number }[]
  >(Prisma.sql`
    SELECT
      COALESCE(NULLIF(TRIM("customerName"), ''), 'Unnamed Customer') AS customer_name,
      COALESCE(SUM(
        CASE
          WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
          ELSE 0
        END
      ), 0)::float AS total
    FROM "google_sheet_offline_sales"
    ${whereClause}
    GROUP BY COALESCE(NULLIF(TRIM("customerName"), ''), 'Unnamed Customer')
    ORDER BY total DESC
    LIMIT 10
  `);
  console.log('topCustomers rows:', topCustomerRows.length);
  console.log('ALL DONE - no errors!');

  await prisma.$disconnect();
}

main().catch(e => { console.error('FATAL ERROR:', e.message, e); process.exit(1); });
