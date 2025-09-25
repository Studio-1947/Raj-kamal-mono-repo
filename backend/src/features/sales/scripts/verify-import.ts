#!/usr/bin/env node
/** Quick verification script for the Sales dataset. */
import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

(async () => {
  const bySource = await prisma.sale.groupBy({ by: ['source'], _count: true });
  console.log('Counts by source:', bySource);

  const dupHashes = await prisma.sale.groupBy({ by: ['rowHash'], _count: true, having: { rowHash: { not: null } as any, _count: { _all: { gt: 1 } } as any } as any });
  console.log('Duplicate rowHash groups (should be empty):', dupHashes);

  const extremes = await prisma.sale.findMany({ orderBy: { amount: 'desc' }, take: 3 });
  const dates = await prisma.sale.findMany({ orderBy: { date: 'asc' }, take: 1 });
  const latest = await prisma.sale.findMany({ orderBy: { date: 'desc' }, take: 1 });
  console.log('Top 3 amounts:', extremes.map(x => ({ id: x.id.toString(), amount: x.amount?.toString() })));
  console.log('Earliest date:', dates[0]?.date);
  console.log('Latest date:', latest[0]?.date);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });

