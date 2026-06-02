import express from 'express';
import { prisma } from '../../../lib/prisma.js';

const router = express.Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelKey = 'Delhi' | 'Mumbai' | 'Patna' | 'Online' | 'BookFair' | 'Lokbharti';

const ALL_CHANNELS: ChannelKey[] = ['Delhi', 'Mumbai', 'Patna', 'Online', 'BookFair', 'Lokbharti'];

const REGION_LABEL: Record<ChannelKey, string> = {
  Delhi:     'Delhi Offline',
  Mumbai:    'Mumbai Offline',
  Patna:     'Patna Offline',
  Online:    'Online - Website',
  BookFair:  'BookFair Offline',
  Lokbharti: 'Lokbharti - Allahabad',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toNum = (v: any): number => Number(v?.toString() ?? '0');

function getFinancialYearStart(): Date {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dec
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  return new Date(`${startYear}-04-01T00:00:00.000Z`);
}

function buildDateFilter(range: string): Record<string, Date> | undefined {
  const ago = (d: number) => new Date(Date.now() - d * 86_400_000);
  if (range === '7')   return { gte: ago(7) };
  if (range === '30')  return { gte: ago(30) };
  if (range === '90')  return { gte: ago(90) };
  if (range === '180') return { gte: ago(180) };
  if (range === '365') return { gte: ago(365) };
  if (range === 'fytd') return {
    gte: getFinancialYearStart(),
    lte: new Date(),
  };
  if (range === 'ytd') return {
    gte: new Date('2026-01-01T00:00:00.000Z'),
    lte: new Date('2026-12-31T23:59:59.999Z'),
  };
  return undefined; // 'all'
}

function resolveChannels(param: string): ChannelKey[] {
  if (param === 'all') return ALL_CHANNELS;
  return ALL_CHANNELS.includes(param as ChannelKey) ? [param as ChannelKey] : [];
}

function getModel(ch: ChannelKey): any {
  switch (ch) {
    case 'Delhi':     return prisma.googleSheetOfflineSale;
    case 'Mumbai':    return prisma.mumbaiOfflineSale;
    case 'Patna':     return prisma.patnaOfflineSale;
    case 'Online':    return prisma.onlineOfflineSale;
    case 'BookFair':  return prisma.bookFairOfflineSale;
    case 'Lokbharti': return prisma.lokbhartiOfflineSale;
  }
}

/**
 * Fetch all analytics for one channel in a single parallel burst:
 * count · agg · topBooks · timeSeries rows · state breakdown
 */
async function fetchChannelData(ch: ChannelKey, where: any, bookWhere: any) {
  const model = getModel(ch);
  const stateWhere = { ...where, state: { not: null } };
  const publisherWhere = { ...where, publisher: { not: null } };

  const [count, agg, topBooks, tsRows, stateRows, publisherRows] = await Promise.all([
    model.count({ where }),
    model.aggregate({ _sum: { amount: true, qty: true }, where }),
    model.groupBy({
      by: ['title'],
      _sum: { amount: true, qty: true },
      where: bookWhere,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    }),
    model.findMany({ where, select: { date: true, amount: true, qty: true } }),
    model.groupBy({
      by: ['state'],
      _sum: { amount: true, qty: true },
      where: stateWhere,
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
    model.groupBy({
      by: ['publisher'],
      _sum: { amount: true, qty: true },
      where: publisherWhere,
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
  ]);

  const revenue = toNum(agg._sum.amount);
  const qty     = toNum(agg._sum.qty);

  return { ch, count, revenue, qty, avgTicket: qty > 0 ? revenue / qty : 0, topBooks, tsRows, stateRows, publisherRows };
}

// ─── GET /api/total-offline-sales/summary ─────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const range   = (req.query.range   as string) || '30';
    const channel = (req.query.channel as string) || 'all';

    const dateFilter = buildDateFilter(range);
    const where      = dateFilter ? { date: dateFilter } : {};
    const bookWhere  = dateFilter
      ? { date: dateFilter, title: { not: '' } }
      : { title: { not: '' } };

    const channels = resolveChannels(channel);
    if (channels.length === 0) {
      return res.status(400).json({ ok: false, error: 'Invalid channel value' });
    }

    // All channel data fetched in one parallel burst
    const results = await Promise.all(channels.map(ch => fetchChannelData(ch, where, bookWhere)));

    // ── Grand totals ──────────────────────────────────────────────────────────
    const totalRevenue = results.reduce((s, r) => s + r.revenue, 0);
    const totalQty     = results.reduce((s, r) => s + r.qty,     0);
    const totalCount   = results.reduce((s, r) => s + r.count,   0);

    // ── Regional breakdown (per channel) ─────────────────────────────────────
    const regionalBreakdown = results.map(r => ({
      region:       REGION_LABEL[r.ch],
      channel:      r.ch,
      count:        r.count,
      revenue:      r.revenue,
      qty:          r.qty,
      avgTicket:    r.avgTicket,
      shareRevenue: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0,
      shareQty:     totalQty     > 0 ? (r.qty     / totalQty)     * 100 : 0,
    }));

    // ── Merged top-10 bestsellers ─────────────────────────────────────────────
    const bookMap = new Map<string, { revenue: number; qty: number }>();
    for (const r of results) {
      for (const b of r.topBooks) {
        if (!b.title) continue;
        const title    = b.title.trim();
        const existing = bookMap.get(title) ?? { revenue: 0, qty: 0 };
        bookMap.set(title, {
          revenue: existing.revenue + toNum(b._sum?.amount),
          qty:     existing.qty     + toNum(b._sum?.qty),
        });
      }
    }
    const topItems = Array.from(bookMap.entries())
      .map(([title, v]) => ({ title, total: v.revenue, qty: v.qty }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // ── Top Publishers by channel ─────────────────────────────────────────────
    const topPublishersByChannel: Record<string, { publisher: string; revenue: number; qty: number }[]> = {};
    for (const r of results) {
      topPublishersByChannel[r.ch] = r.publisherRows.map((p: any) => ({
        publisher: p.publisher || 'Unknown Publisher',
        revenue: toNum(p._sum?.amount),
        qty:     toNum(p._sum?.qty),
      }));
    }

    // ── Daily time series (channel-keyed) ─────────────────────────────────────
    const dailyMap = new Map<string, { Delhi: number; Mumbai: number; Patna: number; Online: number; BookFair: number; Lokbharti: number; total: number }>();
    for (const r of results) {
      for (const row of r.tsRows) {
        if (!row.date) continue;
        const dateStr = new Date(row.date).toISOString().slice(0, 10);
        const amount  = toNum(row.amount);
        const entry   = dailyMap.get(dateStr) ?? {
          Delhi: 0, Mumbai: 0, Patna: 0, Online: 0, BookFair: 0, Lokbharti: 0, total: 0,
        };
        (entry as any)[r.ch] = ((entry as any)[r.ch] ?? 0) + amount;
        entry.total  += amount;
        dailyMap.set(dateStr, entry);
      }
    }
    const timeSeries = Array.from(dailyMap.entries())
      .map(([date, val]) => ({ date, ...val }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Monthly breakdown by channel ──────────────────────────────────────────
    // monthlyByChannel[channelKey][0..11] = { revenue, qty }
    const monthlyByChannel: Record<string, { revenue: number; qty: number }[]> = {};
    for (const r of results) {
      const monthly = Array.from({ length: 12 }, () => ({ revenue: 0, qty: 0 }));
      for (const row of r.tsRows) {
        if (!row.date) continue;
        const m = new Date(row.date).getMonth(); // 0-11
        (monthly[m] as { revenue: number; qty: number }).revenue += toNum(row.amount);
        (monthly[m] as { revenue: number; qty: number }).qty     += toNum(row.qty);
      }
      monthlyByChannel[r.ch] = monthly;
    }

    // ── Top states per channel ────────────────────────────────────────────────
    const topStatesByChannel: Record<string, { state: string; revenue: number; qty: number }[]> = {};
    for (const r of results) {
      topStatesByChannel[r.ch] = r.stateRows
        .filter((s: any) => s.state && s.state.trim())
        .map((s: any) => ({
          state:   s.state.trim(),
          revenue: toNum(s._sum.amount),
          qty:     toNum(s._sum.qty),
        }));
    }

    return res.json({
      ok: true,
      channel,
      counts: { totalCount, totalRevenue, totalQty },
      regionalBreakdown,
      timeSeries,
      topItems,
      monthlyByChannel,
      topStatesByChannel,
      topPublishersByChannel,
    });
  } catch (err: any) {
    console.error('Total Sales Summary Failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to compute total sales summary' });
  }
});

// ─── GET /api/total-offline-sales/transactions ────────────────────────────────

router.get('/transactions', async (req, res) => {
  try {
    const channel = (req.query.channel as string) || 'all';
    const range   = (req.query.range   as string) || '30';
    const limit   = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);

    const dateFilter = buildDateFilter(range);
    const where      = dateFilter ? { date: dateFilter } : {};

    const channels   = resolveChannels(channel);
    if (channels.length === 0) {
      return res.status(400).json({ ok: false, error: 'Invalid channel value' });
    }

    // When one channel selected fetch `limit` rows; when all channels fetch ceil(limit/6)+2 each
    const perLimit = channel === 'all' ? Math.ceil(limit / channels.length) + 2 : limit;

    const fetchers = channels.map(async (ch) => {
      const model = getModel(ch);
      const rows  = await model.findMany({
        where,
        take: perLimit,
        orderBy: { date: 'desc' },
      });
      return rows.map((row: any) => ({
        id:           `${ch}-${row.id}`,
        docNo:        row.docNo        || 'N/A',
        date:         row.date ? new Date(row.date).toISOString().slice(0, 10) : 'N/A',
        title:        row.title        || 'Untitled Book',
        author:       row.author       || null,
        qty:          row.qty          || 0,
        rate:         toNum(row.rate),
        discount:     toNum(row.discount),
        amount:       toNum(row.amount),
        customerName: row.customerName || 'Walk-in Customer',
        state:        row.state        || null,
        city:         row.city         || null,
        region:       REGION_LABEL[ch],
        channel:      ch,
      }));
    });

    const merged = (await Promise.all(fetchers))
      .flat()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);

    return res.json({ ok: true, items: merged, total: merged.length });
  } catch (err: any) {
    console.error('Total Sales Transactions Failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch transactions' });
  }
});

// ─── GET /api/total-offline-sales/projections (unchanged) ─────────────────────

router.get('/projections', async (req, res) => {
  try {
    const year        = 2026;
    const whereClause = {
      date: { gte: new Date(`${year}-01-01T00:00:00.000Z`), lte: new Date(`${year}-12-31T23:59:59.999Z`) },
    };

    const [delhiD, mumbaiD, patnaD, onlineD, bookFairD, lokbhartiD] = await Promise.all([
      prisma.googleSheetOfflineSale.groupBy({ by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.mumbaiOfflineSale.groupBy(      { by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.patnaOfflineSale.groupBy(       { by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.onlineOfflineSale.groupBy(      { by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.bookFairOfflineSale.groupBy(    { by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.lokbhartiOfflineSale.groupBy(   { by: ['date'], _sum: { amount: true }, where: whereClause }),
    ]);

    const monthlyActuals = Array(12).fill(0);
    const processDaily   = (rows: any[]) => {
      for (const r of rows) {
        if (!r.date) continue;
        monthlyActuals[new Date(r.date).getMonth()] += toNum(r._sum.amount);
      }
    };
    [delhiD, mumbaiD, patnaD, onlineD, bookFairD, lokbhartiD].forEach(processDaily);

    const daysInMonths: number[]  = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const currentMonthIndex = new Date().getMonth();
    const currentDayInMonth = new Date().getDate();

    let daysElapsed = 0;
    for (let i = 0; i < currentMonthIndex; i++) daysElapsed += (daysInMonths[i] ?? 30);
    daysElapsed += currentDayInMonth;
    const daysLeft = 365 - daysElapsed;

    const actualSoFar        = monthlyActuals.slice(0, currentMonthIndex + 1).reduce((a, b) => a + b, 0);
    const V                  = actualSoFar / Math.max(1, daysElapsed);
    const projectedRemaining = V * daysLeft;
    const yearlyEstimate     = actualSoFar + projectedRemaining;
    const achievementPercent = (actualSoFar / Math.max(1, yearlyEstimate)) * 100;
    const timeElapsedPercent = (daysElapsed / 365) * 100;
    const weightedMonthlyAvg = V * (365 / 12);

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const chartData = MONTH_NAMES.map((name, i) => {
      const act = monthlyActuals[i] ?? 0;
      const dim = daysInMonths[i]    ?? 30;
      if (i < currentMonthIndex) return { name, type: 'actual',    value: act, actual: act,   projected: 0 };
      if (i === currentMonthIndex) {
        const rem       = Math.max(0, dim - currentDayInMonth);
        const projPart  = V * rem;
        return { name, type: 'current', value: act + projPart, actual: act, projected: projPart };
      }
      return { name, type: 'projected', value: V * dim, actual: 0, projected: V * dim };
    });

    // Pass current month actual separately for easy access in tooltips
    const currentMonthActual = monthlyActuals[currentMonthIndex] ?? 0;

    return res.json({
      ok: true, year, yearlyEstimate, weightedMonthlyAvg, actualSoFar,
      projectedRemaining, achievementPercent, timeElapsedPercent,
      daysElapsed, daysLeft, currentDayInMonth,
      currentMonthActual, chartData,
    });
  } catch (err: any) {
    console.error('Projections Aggregation Failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to compute yearly projection' });
  }
});

// ─── GET /api/total-offline-sales/publisher-details ───────────────────────────

router.get('/publisher-details', async (req, res) => {
  try {
    const channel   = req.query.channel as string;
    const publisher = req.query.publisher as string;
    const range     = (req.query.range as string) || '30';

    if (!channel || !publisher) {
      return res.status(400).json({ ok: false, error: 'Missing channel or publisher parameters' });
    }

    const dateFilter = buildDateFilter(range);
    const where: any = {
      publisher: { equals: publisher },
      title: { not: '' },
    };
    if (dateFilter) {
      where.date = dateFilter;
    }

    const model = getModel(channel as ChannelKey);
    if (!model) {
      return res.status(400).json({ ok: false, error: 'Invalid channel parameter' });
    }

    // Query top 10 books by amount (revenue) desc
    const topBooks = await model.groupBy({
      by: ['title'],
      _sum: { amount: true, qty: true },
      where,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    // Query bottom 10 books by amount (revenue) asc (but amount > 0 to filter out invalid records)
    const bottomBooks = await model.groupBy({
      by: ['title'],
      _sum: { amount: true, qty: true },
      where: { ...where, amount: { gt: 0 } },
      orderBy: { _sum: { amount: 'asc' } },
      take: 10,
    });

    return res.json({
      ok: true,
      topBooks: topBooks.map((b: any) => ({
        title: b.title || 'Unknown Title',
        revenue: toNum(b._sum?.amount),
        qty: toNum(b._sum?.qty),
      })),
      bottomBooks: bottomBooks.map((b: any) => ({
        title: b.title || 'Unknown Title',
        revenue: toNum(b._sum?.amount),
        qty: toNum(b._sum?.qty),
      })),
    });
  } catch (err: any) {
    console.error('Failed to get publisher details:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch publisher details' });
  }
});

export default router;
