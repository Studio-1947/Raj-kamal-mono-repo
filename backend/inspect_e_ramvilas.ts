
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const record = await prisma.googleSheetOfflineSale.findFirst({
    where: {
      title: {
        contains: 'E-RAMVILAS SHARMA RACHANAWALI : VOLS. 1-19',
        mode: 'insensitive'
      }
    }
  });

  if (record && Array.isArray(record.rawJson)) {
    console.log(`Title: ${record.title}`);
    console.log(`DB Rate: ${record.rate}`);
    console.log('Full Raw JSON Array:');
    record.rawJson.forEach((val, i) => {
      console.log(`[${i}]: ${val}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
