import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const all = await p.googleSheetOfflineSale.findMany({
    select: { id: true, rawJson: true }
  });
  console.log('SEARCHING ALL', all.length, 'RECORDS...');
  for (const r of all) {
    const raw = r.rawJson as any[];
    if (raw.some(v => String(v).toLowerCase() === 'type' || String(v).toLowerCase() === 'saletype')) {
      console.log('FOUND HEADER ROW AT ID:', r.id.toString());
      console.log('RAW:', JSON.stringify(raw, null, 2));
      return;
    }
  }
  console.log('Header row not found in any record');
}
main().finally(() => p.$disconnect());
