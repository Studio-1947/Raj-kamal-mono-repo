
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.googleSheetOfflineSale.count();
  
  const minDate = await prisma.googleSheetOfflineSale.findFirst({
    where: { date: { not: null } },
    orderBy: { date: 'asc' },
    select: { date: true }
  });
  
  const maxDate = await prisma.googleSheetOfflineSale.findFirst({
    where: { date: { not: null } },
    orderBy: { date: 'desc' },
    select: { date: true }
  });

  const year2026 = await prisma.googleSheetOfflineSale.count({
    where: { date: { gte: new Date('2026-01-01'), lte: new Date('2026-12-31') } }
  });
  const year2025 = await prisma.googleSheetOfflineSale.count({
    where: { date: { gte: new Date('2025-01-01'), lte: new Date('2025-12-31') } }
  });
  const year2024 = await prisma.googleSheetOfflineSale.count({
    where: { date: { gte: new Date('2024-01-01'), lte: new Date('2024-12-31') } }
  });
  const older = await prisma.googleSheetOfflineSale.count({
    where: { date: { lt: new Date('2024-01-01') } }
  });

  console.log({
    total,
    minDate: minDate?.date,
    maxDate: maxDate?.date,
    year2026,
    year2025,
    year2024,
    older
  });
}

main().finally(() => prisma.$disconnect());
