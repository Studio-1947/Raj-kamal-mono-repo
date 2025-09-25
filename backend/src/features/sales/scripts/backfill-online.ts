#!/usr/bin/env node
/**
 * Backfill OnlineSale rows (amount/date/qty/rate) from rawJson when missing.
 * Usage: npx tsx backend/src/features/sales/scripts/backfill-online.ts [--limit 500]
 */
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toNumber(v: any): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(/[\s,]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
}
function toDecimal(n: number | null): Prisma.Decimal | null { return n == null ? null : new Prisma.Decimal(n.toString()); }
function toDate(v: any): Date | null {
  if (v instanceof Date && !isNaN(+v)) return v;
  if (typeof v === 'string') { const d = new Date(v); return isNaN(+d) ? null : d; }
  return null;
}

function pick(row: Record<string, any>, names: string[]): any {
  for (const k of Object.keys(row)) if (names.some(n => n.toLowerCase() === k.toLowerCase())) return row[k];
  return undefined;
}

async function main() {
  const limit = Number(process.env.BACKFILL_LIMIT || 1000);
  let processed = 0, updated = 0;
  while (true) {
    const batch = await prisma.onlineSale.findMany({
      where: { OR: [ { amount: null }, { date: null } ] },
      take: limit,
      orderBy: { id: 'asc' },
    });
    if (batch.length === 0) break;
    for (const row of batch) {
      processed++;
      const rj: any = row.rawJson || {};
      const amount = toDecimal(toNumber(pick(rj, ['Selling Price', 'Amount', 'Total', 'amount'])));
      const rate = toDecimal(toNumber(pick(rj, ['Rate', 'Price', 'MRP', 'rate'])));
      const qty = toNumber(pick(rj, ['Qty', 'Quantity'])) ?? undefined;
      let date = toDate(pick(rj, ['Date', 'Txn Date', 'Transaction Date']));
      if (!date) {
        for (const v of Object.values(rj)) {
          if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}T/.test(v)) { const d = new Date(v); if (!isNaN(+d)) { date = d; break; } }
        }
      }
      if (amount || date || rate || typeof qty === 'number') {
        const data: any = {};
        if (amount) data.amount = amount;
        if (date) data.date = date;
        if (rate) data.rate = rate;
        if (typeof qty === 'number') data.qty = qty;
        await prisma.onlineSale.update({ where: { id: row.id }, data });
        updated++;
      }
    }
    console.log(JSON.stringify({ msg: 'backfill_online_batch', processed, updated, lastId: batch[batch.length-1]?.id?.toString() }));
  }
  console.log(JSON.stringify({ msg: 'backfill_online_done', processed, updated }));
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
