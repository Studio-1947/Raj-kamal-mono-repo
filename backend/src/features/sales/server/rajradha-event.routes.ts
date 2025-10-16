import express from 'express';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

const router = express.Router();

// Utilities for resilient aggregation when DB fields are missing
function decToNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  try { return Number(v.toString()); } catch { return Number(v) || 0; }
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function numSafe(v: any): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(/[\s,]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
}
function pick(row: Record<string, any> | null | undefined, names: string[]): any {
  if (!row) return undefined;
  for (const k of Object.keys(row)) if (names.some(n => n.toLowerCase() === k.toLowerCase())) return (row as any)[k];
  return undefined;
}
function monthNameToIndex(m?: string | null): number | null {
  if (!m) return null;
  const map: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11 };
  const i = map[m.toLowerCase()];
  return (i === undefined ? null : i);
}

function resolveRowDate(r: any): Date | null {
  let d: Date | null = r.date ? new Date(r.date) : null;
  if (!d) {
    const raw = r.rawJson as Record<string, any> | undefined;
    const d1 = pick(raw, ['Date', 'Txn Date', 'Transaction Date']);
    if (d1) {
      const dd = new Date(d1);
      if (!isNaN(+dd)) d = dd;
    }
    if (!d) {
      const mi = monthNameToIndex(r.month);
      if (mi != null && r.year && r.year > 0) d = new Date(Date.UTC(r.year, mi, 1));
    }
  }
  return d;
}

// GET /api/rajradha-event-sales/counts
router.get('/counts', async (req, res) => {
  const Q = z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  });
  const parsed = Q.safeParse({
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid query' });
  const { days } = parsed.data;
  let { startDate, endDate } = parsed.data;

  if (days && (!startDate && !endDate)) {
    const now = new Date();
    const since = new Date(now.getTime() - days * 86400000);
    startDate = since.toISOString();
    endDate = now.toISOString();
  }

  try {
    const items = await prisma.rajRadhaEventSale.findMany({
      select: { amount: true, qty: true, rate: true, rawJson: true, customerName: true, email: true, mobile: true, orderStatus: true, date: true, month: true, year: true, title: true },
      take: 100000,
    });

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let totalAmount = 0;
    let count = 0;
    const customerSet = new Set<string>();
    let refundCount = 0;
    
    for (const r of items) {
      const d = resolveRowDate(r);
      
      // If date filters are provided and we have a date, apply the filter
      // If no date on record, include it (don't filter out)
      if (start && d && d < start) continue;
      if (end && d && d > end) continue;
      
      count++;
      
      // Calculate amount - RajRadha data often has NULL amount, use qty * rate
      let amt = decToNumber(r.amount);
      if (!amt) {
        const raw = r.rawJson as Record<string, any> | undefined;
        const v = numSafe(pick(raw, ['Selling Price', 'Amount', 'Total', 'amount']));
        if (v != null) amt = v;
        else {
          const rate = numSafe(r.rate as any) || numSafe(pick(raw, ['Rate'])) || 0;
          const qty = r.qty || numSafe(pick(raw, ['Qty'])) || 0;
          amt = rate * qty;
        }
      }
      totalAmount += amt;

      const st = (r.orderStatus as any as string) || String(pick(r.rawJson as any, ['Order Status', 'Status']) || '').toLowerCase();
      if (st && st.toLowerCase() === 'refunded') refundCount++;

      const name = (r.customerName || '').trim().toLowerCase();
      const email = (r.email || '').trim().toLowerCase();
      const mobile = (r.mobile || '').trim();
      const key = [email || null, mobile || null, name || null].filter(Boolean).join('|');
      if (key) customerSet.add(key);
    }

    return res.json({
      ok: true,
      totalCount: count,
      totalAmount: round2(totalAmount),
      uniqueCustomers: customerSet.size,
      refundCount,
    });
  } catch (e: any) {
    console.error('rajradha_event_sales_counts_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to fetch counts' });
  }
});

export default router;
