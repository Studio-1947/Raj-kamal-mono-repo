
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allCount = await prisma.googleSheetOfflineSale.count();
  const bindingCount = await prisma.googleSheetOfflineSale.count({
    where: {
      binding: { not: null, not: '' }
    }
  });
  const datedCount = await prisma.googleSheetOfflineSale.count({
    where: {
      date: { not: null }
    }
  });
  const datedBindingCount = await prisma.googleSheetOfflineSale.count({
    where: {
      date: { not: null },
      binding: { not: null, not: '' }
    }
  });

  console.log({ allCount, bindingCount, datedCount, datedBindingCount });
  
  const sample = await prisma.googleSheetOfflineSale.findFirst({
    where: { binding: { not: null, not: '' } },
    select: { binding: true }
  });
  console.log('Sample binding:', sample);

  const topBindings = await prisma.googleSheetOfflineSale.groupBy({
    by: ['binding'],
    _count: { _all: true },
    orderBy: { _count: { binding: 'desc' } },
    take: 5
  });
  console.log('Top bindings:', topBindings);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
