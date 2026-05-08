import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const count = await p.googleSheetOfflineSale.count({
    where: { type: '' }
  });
  console.log('COUNT OF EMPTY STRING TYPES:', count);
}
main().finally(() => p.$disconnect());
