import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const nullDateRows = await prisma.googleSheetOfflineSale.findMany({
    where: { date: null },
    take: 10,
    select: {
      id: true,
      slNo: true,
      docNo: true,
      dateStr: true,
      qty: true,
      amount: true,
      rawJson: true
    }
  });

  console.log(`Found ${nullDateRows.length} sample null date rows:`);
  for (const row of nullDateRows) {
    console.log(`ID: ${row.id}`);
    console.log(`slNo: ${row.slNo}`);
    console.log(`docNo: ${row.docNo}`);
    console.log(`dateStr: ${row.dateStr}`);
    console.log(`qty: ${row.qty}, amount: ${row.amount}`);
    if (row.rawJson) {
      console.log(`rawJson:`, JSON.stringify(row.rawJson));
    }
    console.log("---");
  }

  // Let's also check one row that HAS a valid date, to compare
  const validDateRow = await prisma.googleSheetOfflineSale.findFirst({
    where: { date: { not: null } },
    select: {
      id: true,
      slNo: true,
      docNo: true,
      date: true,
      dateStr: true,
      rawJson: true
    }
  });
  console.log("Valid date sample:");
  console.log(JSON.stringify(validDateRow, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
