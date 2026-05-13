
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const prisma = new PrismaClient();

async function main() {
  console.log("Normalizing hashes for GoogleSheetOfflineSale...");

  const allRows = await prisma.googleSheetOfflineSale.findMany({
    select: { id: true, rawJson: true }
  });

  console.log(`Found ${allRows.length} rows to process.`);

  let updated = 0;
  let conflicts = 0;

  for (const row of allRows) {
    const rowContent = JSON.stringify(row.rawJson);
    const cleanHash = crypto.createHash('md5').update(rowContent).digest('hex');

    try {
      await prisma.googleSheetOfflineSale.update({
        where: { id: row.id },
        data: { rowHash: cleanHash }
      });
      updated++;
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Unique constraint violation - this row is a duplicate of an already updated row!
        conflicts++;
        // We should delete this duplicate
        await prisma.googleSheetOfflineSale.delete({ where: { id: row.id } });
      } else {
        console.error(`Error updating row ${row.id}:`, err.message);
      }
    }

    if (updated % 5000 === 0) {
      console.log(`Processed ${updated} rows...`);
    }
  }

  console.log(`Normalization complete. Updated: ${updated}, Removed duplicates: ${conflicts}`);
}

main().catch(err => {
  console.error("Normalization failed:", err);
}).finally(() => prisma.$disconnect());
