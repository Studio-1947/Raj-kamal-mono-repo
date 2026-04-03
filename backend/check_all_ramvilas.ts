
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const searchTerm = 'RAMVILAS SHARMA';
  const records = await prisma.googleSheetOfflineSale.findMany({
    where: {
      title: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    },
    select: {
      title: true,
      rate: true,
      qty: true,
      customerName: true
    },
    orderBy: {
      rate: 'asc'
    }
  });

  console.log(`All rates found for "${searchTerm}":`);
  records.forEach(r => {
    console.log(`Title: ${r.title}, Rate: ${r.rate}, Qty: ${r.qty}, Customer: ${r.customerName}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
