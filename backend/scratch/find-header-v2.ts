import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const all = await p.googleSheetOfflineSale.findMany({
    take: 10000,
    orderBy: { id: 'asc' }
  });
  for (const r of all) {
    const raw = r.rawJson as any[];
    if (String(raw[19]).toLowerCase().includes('city') || String(raw[20]).toLowerCase().includes('type')) {
      console.log('FOUND HEADER ROW AT ID:', r.id.toString());
      console.log('RAW:', JSON.stringify(raw, null, 2));
      return;
    }
  }
  console.log('Header row not found');
}
main().finally(() => p.$disconnect());
