
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.googleSheetOfflineSale.findMany({
    where: {
      rowHash: { contains: '_' }
    },
    take: 5
  });

  console.log("Rows with underscore in rowHash:");
  rows.forEach(r => {
    console.log(`ID: ${r.id}, Hash: ${r.rowHash}`);
  });
}

main().finally(() => prisma.$disconnect());
