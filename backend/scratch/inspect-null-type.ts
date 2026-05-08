import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const r = await p.googleSheetOfflineSale.findFirst({
    where: {
      type: null,
      city: { not: null }
    },
    orderBy: { id: 'desc' }
  });
  if (r) {
    console.log('ID:', r.id.toString());
    console.log('CITY:', r.city);
    // Since rawJson might be huge, let's just log the keys of the first row (headers) if we can find them
    // or just the rawJson itself
    console.log('RAW_JSON:', JSON.stringify(r.rawJson, null, 2));
  } else {
    console.log('No such record found');
  }
}
main().finally(() => p.$disconnect());
