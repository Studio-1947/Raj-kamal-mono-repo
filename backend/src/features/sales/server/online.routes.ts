import express from 'express';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

const router = express.Router();

// GET /api/online-sales?limit=200&cursorId=<id>
router.get('/', async (req, res) => {
  const Q = z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default('200').pipe(z.number().min(1).max(1000)),
    cursorId: z.string().regex(/^\d+$/).optional(),
  });
  const parsed = Q.safeParse({ limit: req.query.limit ?? '200', cursorId: req.query.cursorId });
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid query' });
  const { limit, cursorId } = parsed.data;

  try {
    const args: any = { take: limit, orderBy: { id: 'desc' as const } };
    if (cursorId) {
      args.skip = 1;
      args.cursor = { id: BigInt(cursorId) };
    }
    const items = await prisma.onlineSale.findMany(args);
    const data = items.map((it) => ({ ...it, id: it.id.toString() }));
    const last = (data as any[]).at(-1);
    return res.json({ ok: true, items: data, nextCursorId: last?.id ?? null });
  } catch (e: any) {
    console.error('online_sales_list_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to fetch online sales' });
  }
});

// GET /api/online-sales/summary?days=90
router.get('/summary', async (req, res) => {
  const Q = z.object({ days: z.string().regex(/^\d+$/).transform(Number).optional() });
  const parsed = Q.safeParse({ days: req.query.days });
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid query' });
  const days = parsed.data.days ?? 90;

  try {
    const byPayment = await prisma.onlineSale.groupBy({
      by: ['paymentMode'],
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const seriesRows = await prisma.onlineSale.findMany({
      where: { date: { gte: since } },
      select: { date: true, amount: true },
    });
    const ts = new Map<string, number>();
    for (const r of seriesRows) {
      if (!r.date) continue;
      const key = new Date(r.date).toISOString().slice(0, 10);
      const val = r.amount ? Number(r.amount.toString()) : 0;
      ts.set(key, (ts.get(key) || 0) + val);
    }
    const timeSeries = Array.from(ts.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, total]) => ({ date, total }));

    const topItems = await prisma.onlineSale.groupBy({
      by: ['title'],
      where: { title: { not: null } },
      _sum: { amount: true, qty: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    return res.json({
      ok: true,
      paymentMode: byPayment.map((x) => ({ paymentMode: x.paymentMode || 'Unknown', total: Number(x._sum.amount?.toString() || '0') })),
      timeSeries,
      topItems: topItems.map((x) => ({ title: x.title || 'Unknown', total: Number(x._sum.amount?.toString() || '0'), qty: x._sum.qty || 0 })),
    });
  } catch (e: any) {
    console.error('online_sales_summary_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to compute summary' });
  }
});

// GET /api/online-sales/counts
router.get('/counts', async (_req, res) => {
  try {
    const [count, sum] = await Promise.all([
      prisma.onlineSale.count(),
      prisma.onlineSale.aggregate({ _sum: { amount: true } }),
    ]);
    return res.json({ ok: true, totalCount: count, totalAmount: Number(sum._sum.amount?.toString() || '0') });
  } catch (e: any) {
    console.error('online_sales_counts_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to fetch counts' });
  }
});

export default router;

