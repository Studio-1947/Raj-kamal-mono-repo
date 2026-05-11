import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const r = await p.googleSheetOfflineSale.findFirst({ orderBy: { id: 'desc' } });
  if (r) {
    const raw = r.rawJson as any[];
    raw.forEach((v, i) => {
      console.log(`Index ${i}: "${v}"`);
    });
  }
}
main().finally(() => p.$disconnect());
