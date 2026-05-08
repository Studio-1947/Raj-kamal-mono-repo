import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const all = await p.googleSheetOfflineSale.findMany({
    take: 10000,
    select: { rawJson: true }
  });
  for (const r of all) {
    const raw = r.rawJson as any[];
    // Search for a row that looks like headers
    if (raw.some(v => String(v).toLowerCase().includes('customername') || String(v).toLowerCase().includes('trnsdocno'))) {
      console.log('FOUND HEADER ROW!');
      raw.forEach((v, i) => {
        console.log(`Index ${i}: "${v}"`);
      });
      return;
    }
  }
  console.log('Header row not found');
}
main().finally(() => p.$disconnect());
