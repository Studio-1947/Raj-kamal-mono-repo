
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.googleSheetOfflineSale.count({
    where: { rate: 5100 }
  });
  console.log(`Count of rows with rate 5100: ${count}`);
  
  const sample = await prisma.googleSheetOfflineSale.findFirst({
    where: { rate: 5100 }
  });
  if (sample) {
      console.log('Sample row with 5100:');
      console.log(sample.title);
  }
}
main().finally(() => prisma.$disconnect());
