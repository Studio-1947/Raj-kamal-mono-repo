import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const samples = await prisma.googleSheetOfflineSale.findMany({
    take: 15,
    select: {
      id: true,
      docNo: true,
      date: true,
      dateStr: true,
      qty: true,
      amount: true,
    }
  });

  console.log("First 15 records in google_sheet_offline_sales:");
  for (const s of samples) {
    console.log(`ID: ${s.id} | docNo: ${s.docNo} | Date in DB: ${s.date?.toISOString()} | DateStr in Sheet: ${s.dateStr} | Qty: ${s.qty} | Amount: ${s.amount}`);
  }

  // Find a few records with date in April (2026-04) to see what their original dateStr was
  const aprilSamples = await prisma.googleSheetOfflineSale.findMany({
    where: {
      date: {
        gte: new Date(Date.UTC(2026, 3, 1)),
        lt: new Date(Date.UTC(2026, 4, 1))
      }
    },
    take: 10,
    select: {
      id: true,
      docNo: true,
      date: true,
      dateStr: true,
      qty: true,
      amount: true,
    }
  });

  console.log("\nSample April records in DB:");
  for (const s of aprilSamples) {
    console.log(`ID: ${s.id} | docNo: ${s.docNo} | Date in DB: ${s.date?.toISOString()} | DateStr in Sheet: ${s.dateStr} | Qty: ${s.qty} | Amount: ${s.amount}`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
