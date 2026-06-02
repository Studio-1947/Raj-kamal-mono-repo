import { offlineSyncService } from "../src/features/sales/server/offlineSyncService.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  console.log("Wiping googleSheetOfflineSale first...");
  await prisma.googleSheetOfflineSale.deleteMany({});
  console.log("Current count in DB (should be 0):", await prisma.googleSheetOfflineSale.count());

  console.log("\nStarting Delhi Offline Sales Sync from Google Sheet...");
  const result = await offlineSyncService.syncOfflineSales();
  console.log("Sync Complete Result:", result);

  const finalCount = await prisma.googleSheetOfflineSale.count();
  console.log("Final count in DB:", finalCount);
}

run().catch(console.error).finally(() => prisma.$disconnect());
