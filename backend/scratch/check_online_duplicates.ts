
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const duplicates = await prisma.$queryRaw`
    SELECT "orderNo", isbn, date, qty, amount, COUNT(*) as count
    FROM "OnlineSale"
    GROUP BY "orderNo", isbn, date, qty, amount
    HAVING COUNT(*) > 1
    LIMIT 10
  `;
  console.log("OnlineSale sample duplicates:", duplicates);
}

main().finally(() => prisma.$disconnect());
