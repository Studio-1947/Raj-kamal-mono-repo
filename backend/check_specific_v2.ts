
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const searchTerm = 'RET KI MACHALI';
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
      amount: true
    }
  });

  console.log(`Found ${records.length} records matching "${searchTerm}":`);
  records.forEach(r => {
    console.log(`Title: ${r.title}, Rate: ${r.rate}, Qty: ${r.qty}, Amount: ${r.amount}`);
  });

  const searchTerm2 = 'RAMVILAS SHARMA';
  const records2 = await prisma.googleSheetOfflineSale.findMany({
    where: {
      title: {
        contains: searchTerm2,
        mode: 'insensitive'
      }
    },
    select: {
      title: true,
      rate: true,
      qty: true,
      amount: true
    }
  });

  console.log(`\nFound ${records2.length} records matching "${searchTerm2}":`);
  records2.forEach(r => {
    console.log(`Title: ${r.title}, Rate: ${r.rate}, Qty: ${r.qty}, Amount: ${r.amount}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
