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
function parseIsoInRow(row: Record<string, any> | null | undefined): Date | null {
  if (!row) return null;
  for (const v of Object.values(row)) {
    if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
      const d = new Date(v);
      if (!isNaN(+d)) return d;
    }
  }
  return null;
}
function monthNameToIndex(m?: string | null): number | null {
  if (!m) return null;
  const map: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11 };
  const i = map[m.toLowerCase()];
  return (i === undefined ? null : i);
}

// Best-effort date resolver used across handlers
function resolveRowDate(r: any): Date | null {
  let d: Date | null = r.date ? new Date(r.date) : null;
  if (!d) {
    const raw = r.rawJson as Record<string, any> | undefined;
    const d1 = pick(raw, ['Date', 'Txn Date', 'Transaction Date', '                                                          ']);
    if (d1) {
      const dd = new Date(d1);
      if (!isNaN(+dd)) d = dd;
    }
    if (!d) d = parseIsoInRow(raw);
    if (!d) {
      const mi = monthNameToIndex(r.month);
      if (mi != null && r.year && r.year > 0) d = new Date(Date.UTC(r.year, mi, 1));
    }
  }
  return d;
}

// GET /api/online-sales?limit=200&cursorId=<id>
router.get('/', async (req, res) => {
  const Q = z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default('200').pipe(z.number().min(1).max(1000)),
    cursorId: z.string().regex(/^\d+$/).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    paymentMode: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse({
    limit: req.query.limit ?? '200',
    cursorId: req.query.cursorId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    paymentMode: req.query.paymentMode,
    q: req.query.q,
  });
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid query' });
  const { limit, cursorId, startDate, endDate, paymentMode, q } = parsed.data;

  try {
    const where: any = {};
    if (paymentMode) where.paymentMode = paymentMode;
    if (q) {
      const contains = q.toString();
      where.OR = [
        { title: { contains, mode: 'insensitive' } },
        { customerName: { contains, mode: 'insensitive' } },
        { isbn: { contains, mode: 'insensitive' } },
        { orderNo: { contains, mode: 'insensitive' } },
      ];
    }

    // When date filters are provided, fetch many more rows since we filter by date post-query
    // (many rows have null dates and we need to parse dates from rawJson)
    const fetchLimit = (startDate || endDate) ? Math.min(limit * 10, 5000) : limit;

    const args: any = { 
      take: fetchLimit,
      orderBy: { id: 'desc' as const }, 
      where 
    };
    if (cursorId) {
      args.skip = 1;
      args.cursor = { id: BigInt(cursorId) };
    }
    const items = await prisma.onlineSale.findMany(args);
    const dataAll = items.map((it) => ({
      ...it,
      id: it.id.toString(),
      amount: it.amount != null ? round2(decToNumber(it.amount)) : null,
      rate: it.rate != null ? round2(decToNumber(it.rate)) : null,
    }));
    
    // Post-filter by resolved date (including rawJson fallback)
    const data = (startDate || endDate)
      ? dataAll.filter((r: any) => {
          const d = resolveRowDate(r);
          if (!d) return false;
          if (startDate && d < new Date(startDate)) return false;
          if (endDate && d > new Date(endDate)) return false;
          return true;
        }).slice(0, limit) // Limit to requested amount after filtering
      : dataAll;
    
    const last = (data as any[]).at(-1);
    return res.json({ ok: true, items: data, nextCursorId: last?.id ?? null });
  } catch (e: any) {
    console.error('online_sales_list_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to fetch online sales' });
  }
});

// GET /api/online-sales/summary?days=90
router.get('/summary', async (req, res) => {
  const Q = z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    paymentMode: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse({
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    paymentMode: req.query.paymentMode,
    q: req.query.q,
  });
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid query' });
  const days = parsed.data.days ?? 90;
  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : undefined;
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : undefined;
  const paymentMode = parsed.data.paymentMode;
  const q = parsed.data.q;

  try {
    const since = startDate ?? new Date(Date.now() - (days * 86400000));

    // Pull candidates; include null dates to compute fallback from rawJson/month/year
    const andFilters: any[] = [];
    if (paymentMode) andFilters.push({ paymentMode });
    if (q) andFilters.push({ OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { isbn: { contains: q, mode: 'insensitive' } },
      { orderNo: { contains: q, mode: 'insensitive' } },
    ] });
    const rows = await prisma.onlineSale.findMany({
      where: andFilters.length ? ({ AND: andFilters } as any) : undefined,
      select: { date: true, amount: true, paymentMode: true, title: true, qty: true, rate: true, month: true, year: true, rawJson: true },
      take: 100000,
    });

    const payment = new Map<string, number>();
    const ts = new Map<string, number>();
    const top = new Map<string, { total: number; qty: number; isbn?: string; author?: string; language?: string; sampleRaw?: any }>();

    for (const r of rows) {
      // Date resolution
      let d: Date | null = r.date ? new Date(r.date) : null;
      if (!d) {
        const raw = r.rawJson as Record<string, any> | undefined;
        const d1 = pick(raw, ['Date', 'Txn Date', 'Transaction Date']);
        if (d1) {
          const dd = new Date(d1);
          if (!isNaN(+dd)) d = dd;
        }
        if (!d) d = parseIsoInRow(raw);
        if (!d) {
          const mi = monthNameToIndex(r.month);
          if (mi != null && r.year && r.year > 0) d = new Date(Date.UTC(r.year, mi, 1));
        }
      }
      if (d && d < since) continue;
      if (endDate && d && d > endDate) continue;

      // Amount resolution
      let amt = decToNumber(r.amount);
      if (!amt) {
        const raw = r.rawJson as Record<string, any> | undefined;
        const v = pick(raw, ['Selling Price', 'Amount', 'Total', 'amount', 'SellingPrice', 'Selling_Price']);
        const n = numSafe(v);
        if (n != null) amt = n;
        else amt = (numSafe(r.rate as any) || 0) * (r.qty ?? 0);
      }

      let pm = r.paymentMode as any as string | undefined;
      if (!pm) {
        const raw = r.rawJson as Record<string, any> | undefined;
        const v = pick(raw, ['Payment Mode', 'paymentMode', 'Mode', 'Payment']);
        if (typeof v === 'string' && v.trim()) pm = v.trim();
      }
      pm = pm || 'Unknown';
      payment.set(pm, (payment.get(pm) || 0) + amt);

      if (d) {
        const key = d.toISOString().slice(0, 10);
        ts.set(key, (ts.get(key) || 0) + amt);
      }

      // Better title extraction - try multiple fields
      const raw = r.rawJson as Record<string, any> | undefined;
      let title = r.title as string | null | undefined;
      if (!title || title.trim() === '') {
        title = pick(raw, ['Title', 'title', 'Book', 'book', 'Product', 'Item', 'Title ']) as string | undefined;
      }
      
      // Skip items without a valid title
      if (!title || title.trim() === '' || title.toLowerCase() === 'unknown') {
        continue;
      }
      
      const tkey = title.trim();
      const cur = top.get(tkey) || { total: 0, qty: 0 };
      cur.total += amt;
      cur.qty += r.qty ?? 0;
      
      // Extract additional book details from rawJson
      if (raw && !cur.isbn) {
        cur.isbn = pick(raw, ['ISBN', 'isbn', 'ISBN13', 'Isbn']) || undefined;
        cur.author = pick(raw, ['Author', 'author', 'Writer', 'writer']) || undefined;
        cur.language = pick(raw, ['Language', 'language', 'Lang']) || undefined;
        cur.sampleRaw = raw; // Keep a sample for potential future use
      }
      
      top.set(tkey, cur);
    }

    const byPayment = Array.from(payment.entries()).map(([paymentMode, total]) => ({ paymentMode, total: round2(total) }));
    const timeSeries = Array.from(ts.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, total]) => ({ date, total: round2(total) }));
    const topItems = Array.from(top.entries())
      .filter(([title, v]) => {
        // Filter out items with no sales or invalid data
        return v.total > 0 && v.qty > 0 && title && title.trim() !== '';
      })
      .map(([title, v]) => ({ 
        title, 
        total: round2(v.total), 
        qty: v.qty,
        isbn: v.isbn,
        author: v.author,
        language: v.language,
      }))
      .sort((a, b) => b.total - a.total) // Sort by revenue (primary)
      .slice(0, 10);

    return res.json({ ok: true, paymentMode: byPayment, timeSeries, topItems });
  } catch (e: any) {
    console.error('online_sales_summary_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to compute summary' });
  }
});

// GET /api/online-sales/counts
router.get('/counts', async (req, res) => {
  const Q = z.object({
    // New optional convenience param to mirror /summary
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    paymentMode: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse({
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    paymentMode: req.query.paymentMode,
    q: req.query.q,
  });
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid query' });
  const { days, paymentMode, q } = parsed.data;
  let { startDate, endDate } = parsed.data;

  // If days is provided, derive a [start, end] window ending at now
  if (days && (!startDate && !endDate)) {
    const now = new Date();
    const since = new Date(now.getTime() - days * 86400000);
    startDate = since.toISOString();
    endDate = now.toISOString();
  }

  try {
    const where: any = {};
    // Don't filter by DB date; many rows lack a stored date.
    if (paymentMode) where.paymentMode = paymentMode;
    if (q) {
      const contains = q.toString();
      where.OR = [
        { title: { contains, mode: 'insensitive' } },
        { customerName: { contains, mode: 'insensitive' } },
        { isbn: { contains, mode: 'insensitive' } },
        { orderNo: { contains, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.onlineSale.findMany({
      where,
      select: { amount: true, qty: true, rate: true, rawJson: true, customerName: true, email: true, mobile: true, orderStatus: true, date: true, month: true, year: true },
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
      if (start && (!d || d < start)) continue;
      if (end && (!d || d > end)) continue;
      count++;
      // amount aggregation
      const v = decToNumber(r.amount);
      if (v) { totalAmount += v; } else {
        const raw = r.rawJson as Record<string, any> | undefined;
        const y = numSafe(pick(raw, ['Selling Price', 'Amount', 'Total', 'amount', 'SellingPrice', 'Selling_Price']));
        if (y != null) totalAmount += y; else totalAmount += (numSafe(r.rate as any) || 0) * (r.qty ?? 0);
      }

      // refunds
      const st = (r.orderStatus as any as string) || String(pick(r.rawJson as any, ['Order Status', 'Status']) || '').toLowerCase();
      if (st && st.toLowerCase() === 'refunded') refundCount++;

      // customer uniqueness heuristic
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
    console.error('online_sales_counts_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to fetch counts' });
  }
});

export default router;
