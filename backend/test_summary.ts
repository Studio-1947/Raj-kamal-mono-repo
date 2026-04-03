import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const since = new Date(Date.now() - 90 * 86400000);
  const until = new Date();

  const conditions = [Prisma.sql`"date" IS NOT NULL AND "date" >= ${since} AND "date" <= ${until}`];
  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

  try {
    console.log('Testing timeSeries query...');
    const r1 = await prisma.$queryRaw`
      SELECT to_char("date", 'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY to_char("date", 'YYYY-MM-DD')
      ORDER BY day ASC LIMIT 3
    `;
    console.log('timeSeries OK:', JSON.stringify(r1));
  } catch(e: any) { console.error('timeSeries FAILED:', e.message); }

  try {
    console.log('Testing topItems query...');
    const r2 = await prisma.$queryRaw`
      SELECT COALESCE(NULLIF(TRIM("title"), ''), 'Untitled Item') AS title,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty
      FROM "google_sheet_offline_sales"
      GROUP BY COALESCE(NULLIF(TRIM("title"), ''), 'Untitled Item')
      HAVING (SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END) > 0 OR SUM("qty") > 0)
      ORDER BY total DESC LIMIT 10
    `;
    console.log('topItems OK, count:', (r2 as any[]).length);
  } catch(e: any) { console.error('topItems FAILED:', e.message); }

  try {
    console.log('Testing revenueByState query...');
    const r3 = await prisma.$queryRaw`
      SELECT COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State') AS state,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State')
      ORDER BY total DESC LIMIT 10
    `;
    console.log('revenueByState OK:', JSON.stringify(r3).slice(0,200));
  } catch(e: any) { console.error('revenueByState FAILED:', e.message); }

  try {
    console.log('Testing revenueByPublisher query...');
    const r4 = await prisma.$queryRaw`
      SELECT COALESCE(NULLIF(TRIM("publisher"), ''), 'Unknown Publisher') AS publisher,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM("publisher"), ''), 'Unknown Publisher')
      ORDER BY total DESC LIMIT 10
    `;
    console.log('revenueByPublisher OK:', JSON.stringify(r4).slice(0,200));
  } catch(e: any) { console.error('revenueByPublisher FAILED:', e.message); }

  try {
    console.log('Testing topCustomers query...');
    const r5 = await prisma.$queryRaw`
      SELECT COALESCE(NULLIF(TRIM("customerName"), ''), 'Unnamed Customer') AS customer_name,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM("customerName"), ''), 'Unnamed Customer')
      ORDER BY total DESC LIMIT 10
    `;
    console.log('topCustomers OK:', JSON.stringify(r5).slice(0,200));
  } catch(e: any) { console.error('topCustomers FAILED:', e.message); }

  await prisma.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
