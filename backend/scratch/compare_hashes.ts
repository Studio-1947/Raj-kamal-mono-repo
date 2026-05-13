
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const docNo = "RJ/BR/509";
  const isbn = "9788126704804";

  const rows = await prisma.googleSheetOfflineSale.findMany({
    where: { docNo, isbn },
    select: { id: true, rowHash: true, createdAt: true },
    take: 10
  });

  console.log(`Duplicate group: docNo=${docNo}, isbn=${isbn}`);
  rows.forEach(r => {
    console.log(`ID: ${r.id}, Hash: ${r.rowHash}, Created: ${r.createdAt.toISOString()}`);
  });
}

main().finally(() => prisma.$disconnect());
