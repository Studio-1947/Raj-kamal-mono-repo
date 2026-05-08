import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const all = await p.googleSheetOfflineSale.findMany({
    take: 1000,
    orderBy: { id: 'asc' }
  });
  for (const r of all) {
    const raw = r.rawJson as any[];
    if (raw.includes('CityName') || raw.includes('City Name')) {
      console.log('FOUND HEADER ROW AT ID:', r.id.toString());
      console.log('RAW:', JSON.stringify(raw, null, 2));
      return;
    }
  }
  console.log('Header row not found in first 1000 records');
}
main().finally(() => p.$disconnect());
