
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total,
      COUNT(binding) as with_binding,
      COUNT(date) as with_date,
      COUNT(*) FILTER (WHERE date IS NOT NULL AND binding IS NOT NULL AND binding != '') as dated_binding
    FROM "google_sheet_offline_sales"
  `;
  console.log('Counts:', r);

  const top = await prisma.$queryRaw`
    SELECT binding, COUNT(*) as count 
    FROM "google_sheet_offline_sales" 
    WHERE binding IS NOT NULL AND binding != ''
    GROUP BY binding 
    ORDER BY count DESC 
    LIMIT 5
  `;
  console.log('Top bindings:', top);
}

main().finally(() => prisma.$disconnect());
