
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Starting title repair script...');
  
  // Fetch all rows where title is empty or null
  const rowsToFix = await prisma.googleSheetOfflineSale.findMany({
    where: { 
      OR: [
        { title: '' },
        { title: null }
      ]
    },
    select: { id: true, rawJson: true }
  });

  console.log(`Found ${rowsToFix.length} rows to repair.`);

  let fixedCount = 0;
  const BATCH_SIZE = 1000;

  for (let i = 0; i < rowsToFix.length; i += BATCH_SIZE) {
    const batch = rowsToFix.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (row: any) => {
      const raw = row.rawJson as any[];
      // We know from our debug analysis that BookName is at index 4
      const extractedTitle = raw[4] ? String(raw[4]).trim() : '';
      
      if (extractedTitle) {
        await prisma.googleSheetOfflineSale.update({
          where: { id: row.id },
          data: { title: extractedTitle }
        });
        fixedCount++;
      }
    }));
    
    console.log(`Processed ${Math.min(i + BATCH_SIZE, rowsToFix.length)} rows...`);
  }

  console.log(`Repair finished. Successfully fixed ${fixedCount} titles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
