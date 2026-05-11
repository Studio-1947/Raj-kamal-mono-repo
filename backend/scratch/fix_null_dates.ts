
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration to fix null dates...");
  
  const records = await prisma.googleSheetOfflineSale.findMany({
    where: { date: null },
    select: { id: true, dateStr: true }
  });
  
  console.log(`Found ${records.length} records to fix.`);
  
  let fixedCount = 0;
  let batch = [];
  const BATCH_SIZE = 1000;
  
  for (const record of records) {
    if (record.dateStr) {
      const parsedDate = new Date(record.dateStr);
      if (!isNaN(parsedDate.getTime())) {
        batch.push(
          prisma.googleSheetOfflineSale.update({
            where: { id: record.id },
            data: { date: parsedDate }
          })
        );
      }
    }
    
    if (batch.length >= BATCH_SIZE) {
      await Promise.all(batch);
      fixedCount += batch.length;
      console.log(`Fixed ${fixedCount}/${records.length}...`);
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    await Promise.all(batch);
    fixedCount += batch.length;
  }
  
  console.log(`Migration complete. Fixed ${fixedCount} records.`);
}

main().finally(() => prisma.$disconnect());
