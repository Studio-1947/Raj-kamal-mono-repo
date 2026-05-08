import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const total = await p.googleSheetOfflineSale.count();
  const nullCity = await p.googleSheetOfflineSale.count({ where: { city: null } });
  const emptyCity = await p.googleSheetOfflineSale.count({ where: { city: '' } });
  console.log('TOTAL:', total);
  console.log('NULL CITY:', nullCity);
  console.log('EMPTY CITY:', emptyCity);
}
main().finally(() => p.$disconnect());
