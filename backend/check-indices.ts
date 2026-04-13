
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.googleSheetOfflineSale.findFirst({
    select: { rawJson: true }
  });
  if (!row) return;
  
  // We don't have the header row in the DB, but we have the first sync's result if we knew where it was.
  // Actually, I can guess them from the sync logic and index mapping.
  console.log('Raw row sample:', row.rawJson);
}
main().finally(() => prisma.$disconnect());
