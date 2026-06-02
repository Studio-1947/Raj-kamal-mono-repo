import { offlineSyncService } from "../src/features/sales/server/offlineSyncService.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  console.log("Starting Delhi Offline Sales Sync from Google Sheet...");
  try {
    const result = await offlineSyncService.syncOfflineSales();
    console.log("Sync Complete:", result);

    console.log("\nChecking for Untitled Items...");
    const untitledCount = await prisma.googleSheetOfflineSale.count({
      where: { OR: [{ title: null }, { title: '' }, { title: 'Untitled' }, { title: 'Untitled Item' }] }
    });
    console.log(`Untitled items remaining: ${untitledCount}`);

    const sample = await prisma.googleSheetOfflineSale.findFirst({
      where: { title: { not: null, not: 'Untitled Item', not: '' } },
      orderBy: { id: 'desc' }
    });
    if (sample) {
      console.log("Sample recognized title:", sample.title);
    }
    process.exit(0);
  } catch (err) {
    console.error("Sync Failed:", err);
    process.exit(1);
  }
}

run().finally(() => prisma.$disconnect());
