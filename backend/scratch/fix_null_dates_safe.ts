
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting safe migration to fix null dates...");
  
  const records = await prisma.googleSheetOfflineSale.findMany({
    where: { date: null },
    select: { id: true, dateStr: true }
  });
  
  console.log(`Found ${records.length} records to fix.`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  // Process in chunks to avoid connection pool issues
  const CHUNK_SIZE = 50;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const updates = chunk.map(record => {
      if (!record.dateStr) return null;
      
      let parsedDate = new Date(record.dateStr);
      
      // Handle DD/MM/YYYY if it failed (often happens if JS assumes MM/DD/YYYY)
      if (isNaN(parsedDate.getTime()) || (parsedDate.getFullYear() > 2100) || (parsedDate.getFullYear() < 1900)) {
        const parts = record.dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
            // Try assuming DD/MM/YYYY
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const y = parseInt(parts[2]);
            const d2 = new Date(y, m, d);
            if (!isNaN(d2.getTime())) parsedDate = d2;
        }
      }

      if (!isNaN(parsedDate.getTime())) {
        return prisma.googleSheetOfflineSale.update({
          where: { id: record.id },
          data: { date: parsedDate }
        });
      }
      return null;
    }).filter(Boolean);

    if (updates.length > 0) {
      await Promise.all(updates);
      fixedCount += updates.length;
    }
    
    if (i % 1000 === 0) {
        console.log(`Processed ${i}/${records.length}...`);
    }
  }
  
  console.log(`Migration complete. Fixed ${fixedCount} records.`);
}

main().finally(() => prisma.$disconnect());
