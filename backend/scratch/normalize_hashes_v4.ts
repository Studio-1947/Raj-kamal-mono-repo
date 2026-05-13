
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
const prisma = new PrismaClient({
  log: ['error']
});

async function main() {
  console.log("Normalizing hashes for GoogleSheetOfflineSale (Sequential Batches)...");

  let skip = 0;
  const take = 1000;
  let updated = 0;
  let conflicts = 0;

  while (true) {
    const rows = await prisma.googleSheetOfflineSale.findMany({
      skip,
      take,
      orderBy: { id: 'asc' }
    });

    if (rows.length === 0) break;

    // Process rows in smaller sub-batches to avoid pool exhaustion
    const subBatchSize = 20;
    for (let i = 0; i < rows.length; i += subBatchSize) {
      const subBatch = rows.slice(i, i + subBatchSize);
      await Promise.all(subBatch.map(async (row) => {
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
    }

    skip += take;
    console.log(`Processed up to ${skip} rows... (Updated: ${updated}, Conflicts: ${conflicts})`);
  }

  console.log(`Normalization complete. Total Updated: ${updated}, Total Removed: ${conflicts}`);
}

main().catch(err => {
  console.error("Normalization failed:", err);
}).finally(() => prisma.$disconnect());
