
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const stats = await prisma.$queryRaw`
    SELECT 
      date_trunc('month', date) as mo,
      COUNT(*) as total,
      SUM(CASE WHEN title = '' THEN 1 ELSE 0 END) as empty
    FROM google_sheet_offline_sales
    GROUP BY 1
    ORDER BY 1
  `;
  console.log(JSON.stringify(stats, null, 2));
}
main().finally(() => prisma.$disconnect());
