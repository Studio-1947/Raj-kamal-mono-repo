
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const record = await prisma.googleSheetOfflineSale.findFirst({
    where: {
      title: {
        contains: 'RAMVILAS SHARMA',
        mode: 'insensitive'
      }
    }
  });

  if (record && Array.isArray(record.rawJson)) {
    console.log(`Title: ${record.title}`);
    console.log(`DB Rate: ${record.rate}`);
    console.log('Raw JSON Array with indices:');
    record.rawJson.forEach((val, i) => {
      console.log(`[${i}]: ${val}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
