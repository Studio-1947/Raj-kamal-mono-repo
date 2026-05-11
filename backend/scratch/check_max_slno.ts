
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const maxSlNo = await prisma.googleSheetOfflineSale.aggregate({
    _max: { slNo: true }
  });
  
  console.log({ maxSlNo: maxSlNo._max.slNo });
}

main().finally(() => prisma.$disconnect());
