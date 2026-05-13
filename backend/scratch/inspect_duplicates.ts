
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const docNo = "RJ/BR/509";
  const isbn = "9788126704804";

  const rows = await prisma.googleSheetOfflineSale.findMany({
    where: { docNo, isbn },
    take: 5
  });

  console.log("Sample rows for docNo RJ/BR/509 and isbn 9788126704804:");
  console.log(JSON.stringify(rows, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

main().finally(() => prisma.$disconnect());
