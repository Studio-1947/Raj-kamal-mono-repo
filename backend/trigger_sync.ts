import { offlineSyncService } from './src/features/sales/server/offlineSyncService';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting sync...");
  const result = await offlineSyncService.syncOfflineSales();
  console.log("Sync Result:", result);

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
}

main().catch(console.error).finally(() => prisma.$disconnect());
