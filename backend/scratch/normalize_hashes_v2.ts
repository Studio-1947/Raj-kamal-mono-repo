
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const prisma = new PrismaClient();

async function main() {
  console.log("Normalizing hashes for GoogleSheetOfflineSale (Fast Batch Mode)...");

  const allRows = await prisma.googleSheetOfflineSale.findMany();
  console.log(`Found ${allRows.length} rows to process.`);

  let updated = 0;
  let conflicts = 0;
  const chunkSize = 100;

  for (let i = 0; i < allRows.length; i += chunkSize) {
    const chunk = allRows.slice(i, i + chunkSize);
    
    await Promise.all(chunk.map(async (row) => {
      const businessData = {
        slNo: row.slNo,
        docNo: row.docNo,
        date: row.date?.toISOString() || null,
        isbn: row.isbn,
        qty: row.qty,
        amount: row.amount ? row.amount.toString() : null,
        customerName: row.customerName,
        type: row.type
      };
      
      const cleanHash = crypto.createHash('md5').update(JSON.stringify(businessData)).digest('hex');

      if (row.rowHash === cleanHash) return;

      try {
        await prisma.googleSheetOfflineSale.update({
          where: { id: row.id },
          data: { rowHash: cleanHash }
        });
        updated++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          conflicts++;
          await prisma.googleSheetOfflineSale.delete({ where: { id: row.id } });
        } else {
          console.error(`Error updating row ${row.id}:`, err.message);
        }
      }
    }));

    if (i % 1000 === 0) {
      console.log(`Processed ${i} rows...`);
    }
  }

  console.log(`Normalization complete. Updated: ${updated}, Removed duplicates: ${conflicts}`);
}

main().catch(err => {
  console.error("Normalization failed:", err);
}).finally(() => prisma.$disconnect());
