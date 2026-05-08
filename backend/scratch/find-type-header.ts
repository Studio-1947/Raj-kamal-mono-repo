import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const all = await p.googleSheetOfflineSale.findMany({
    take: 5000, // Check first 5000
    orderBy: { id: 'asc' }
  });
  for (const r of all) {
    const raw = r.rawJson as any[];
    if (raw.some(v => String(v).toLowerCase() === 'type' || String(v).toLowerCase() === 'saletype' || String(v).toLowerCase() === 'sale type')) {
      console.log('FOUND ROW WITH TYPE KEYWORD AT ID:', r.id.toString());
      console.log('RAW:', JSON.stringify(raw, null, 2));
      return;
    }
  }
  console.log('No row with Type keyword found in first 5000');
}
main().finally(() => p.$disconnect());
