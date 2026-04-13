import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Deleting all rows from GoogleSheetOfflineSale...');
  try {
    const res = await prisma.googleSheetOfflineSale.deleteMany({});
    console.log('Successfully deleted rows:', res.count);
  } catch (err) {
    console.error('Failed to delete rows:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
