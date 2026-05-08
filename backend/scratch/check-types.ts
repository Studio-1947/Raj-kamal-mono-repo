import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const types = await p.googleSheetOfflineSale.groupBy({
    by: ['type'],
    _count: { _all: true }
  });
  console.log('UNIQUE TYPES IN DB:', JSON.stringify(types, null, 2));
}
main().finally(() => p.$disconnect());
