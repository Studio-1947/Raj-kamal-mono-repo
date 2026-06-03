import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  // Let's find rows with dateStr containing "01/06/2026" or "06/01/2026"
  const rows = await prisma.lokbhartiOfflineSale.findMany({
    where: {
      OR: [
        { dateStr: { contains: "01/06/2026" } },
        { dateStr: { contains: "06/01/2026" } },
        { dateStr: { contains: "46028" } }
      ]
    },
    take: 10,
    select: {
      id: true,
      docNo: true,
      date: true,
      dateStr: true,
      qty: true,
      amount: true,
      rawJson: true
    }
  });

  console.log(`Found ${rows.length} records:`);
  for (const r of rows) {
    console.log(`ID: ${r.id} | docNo: ${r.docNo} | Date in DB: ${r.date?.toISOString()} | DateStr: ${r.dateStr} | Qty: ${r.qty} | Amount: ${r.amount}`);
    if (r.rawJson) {
      console.log(`  RawJson: ${JSON.stringify(r.rawJson)}`);
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
