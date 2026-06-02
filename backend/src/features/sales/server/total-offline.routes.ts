import express from 'express';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';

const router = express.Router();

// GET /api/total-offline-sales/summary
router.get('/summary', async (req, res) => {
  try {
    const range = req.query.range as string || '30';
    let dateFilter: any = undefined;

    if (range === '7') {
      dateFilter = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (range === '30') {
      dateFilter = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (range === '90') {
      dateFilter = { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
    } else if (range === 'ytd') {
      dateFilter = {
        gte: new Date('2026-01-01T00:00:00.000Z'),
        lte: new Date('2026-12-31T23:59:59.999Z')
      };
    }

    const queryWhere = dateFilter ? { date: dateFilter } : {};
    const bookWhere = dateFilter ? { date: dateFilter, title: { not: '' } } : { title: { not: '' } };

    // 1. Fetch aggregations in parallel to minimize latency
    const [
      delhiMetrics,
      mumbaiMetrics,
      patnaMetrics,
      onlineMetrics,
      bookFairMetrics,
      lokbhartiMetrics
    ] = await Promise.all([
      // Delhi Offline
      prisma.$transaction([
        prisma.googleSheetOfflineSale.count({ where: queryWhere }),
        prisma.googleSheetOfflineSale.aggregate({ _sum: { amount: true, qty: true }, where: queryWhere }),
        prisma.googleSheetOfflineSale.groupBy({
          by: ['title'],
          _sum: { amount: true, qty: true },
          where: bookWhere,
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        })
      ]),
      // Mumbai Offline
      prisma.$transaction([
        prisma.mumbaiOfflineSale.count({ where: queryWhere }),
        prisma.mumbaiOfflineSale.aggregate({ _sum: { amount: true, qty: true }, where: queryWhere }),
        prisma.mumbaiOfflineSale.groupBy({
          by: ['title'],
          _sum: { amount: true, qty: true },
          where: bookWhere,
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        })
      ]),
      // Patna Offline
      prisma.$transaction([
        prisma.patnaOfflineSale.count({ where: queryWhere }),
        prisma.patnaOfflineSale.aggregate({ _sum: { amount: true, qty: true }, where: queryWhere }),
        prisma.patnaOfflineSale.groupBy({
          by: ['title'],
          _sum: { amount: true, qty: true },
          where: bookWhere,
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        })
      ]),
      // Online - Website
      prisma.$transaction([
        prisma.onlineOfflineSale.count({ where: queryWhere }),
        prisma.onlineOfflineSale.aggregate({ _sum: { amount: true, qty: true }, where: queryWhere }),
        prisma.onlineOfflineSale.groupBy({
          by: ['title'],
          _sum: { amount: true, qty: true },
          where: bookWhere,
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        })
      ]),
      // BookFair Offline
      prisma.$transaction([
        prisma.bookFairOfflineSale.count({ where: queryWhere }),
        prisma.bookFairOfflineSale.aggregate({ _sum: { amount: true, qty: true }, where: queryWhere }),
        prisma.bookFairOfflineSale.groupBy({
          by: ['title'],
          _sum: { amount: true, qty: true },
          where: bookWhere,
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        })
      ]),
      // Lokbharti - Allahabad
      prisma.$transaction([
        prisma.lokbhartiOfflineSale.count({ where: queryWhere }),
        prisma.lokbhartiOfflineSale.aggregate({ _sum: { amount: true, qty: true }, where: queryWhere }),
        prisma.lokbhartiOfflineSale.groupBy({
          by: ['title'],
          _sum: { amount: true, qty: true },
          where: bookWhere,
          orderBy: { _sum: { amount: 'desc' } },
          take: 10
        })
      ])
    ]);

    // Helper to format Decimal to Number
    const getSumAmount = (agg: any) => Number(agg._sum.amount?.toString() || '0');
    const getSumQty = (agg: any) => Number(agg._sum.qty?.toString() || '0');

    // 2. Compute Grand Totals
    const delhiCount = delhiMetrics[0];
    const delhiRevenue = getSumAmount(delhiMetrics[1]);
    const delhiQty = getSumQty(delhiMetrics[1]);

    const mumbaiCount = mumbaiMetrics[0];
    const mumbaiRevenue = getSumAmount(mumbaiMetrics[1]);
    const mumbaiQty = getSumQty(mumbaiMetrics[1]);

    const patnaCount = patnaMetrics[0];
    const patnaRevenue = getSumAmount(patnaMetrics[1]);
    const patnaQty = getSumQty(patnaMetrics[1]);

    const onlineCount = onlineMetrics[0];
    const onlineRevenue = getSumAmount(onlineMetrics[1]);
    const onlineQty = getSumQty(onlineMetrics[1]);

    const bookFairCount = bookFairMetrics[0];
    const bookFairRevenue = getSumAmount(bookFairMetrics[1]);
    const bookFairQty = getSumQty(bookFairMetrics[1]);

    const lokbhartiCount = lokbhartiMetrics[0];
    const lokbhartiRevenue = getSumAmount(lokbhartiMetrics[1]);
    const lokbhartiQty = getSumQty(lokbhartiMetrics[1]);

    const totalCount = delhiCount + mumbaiCount + patnaCount + onlineCount + bookFairCount + lokbhartiCount;
    const totalRevenue = delhiRevenue + mumbaiRevenue + patnaRevenue + onlineRevenue + bookFairRevenue + lokbhartiRevenue;
    const totalQty = delhiQty + mumbaiQty + patnaQty + onlineQty + bookFairQty + lokbhartiQty;

    // 3. Regional Breakdowns
    const regionalBreakdown = [
      { region: 'Delhi Offline', count: delhiCount, revenue: delhiRevenue, qty: delhiQty },
      { region: 'Mumbai Offline', count: mumbaiCount, revenue: mumbaiRevenue, qty: mumbaiQty },
      { region: 'Patna Offline', count: patnaCount, revenue: patnaRevenue, qty: patnaQty },
      { region: 'Online - Website', count: onlineCount, revenue: onlineRevenue, qty: onlineQty },
      { region: 'BookFair Offline', count: bookFairCount, revenue: bookFairRevenue, qty: bookFairQty },
      { region: 'Lokbharti - Allahabad', count: lokbhartiCount, revenue: lokbhartiRevenue, qty: lokbhartiQty }
    ];

    // 4. Merge and Aggregate Top 10 Best Sellers
    const mergedBooksMap = new Map<string, { revenue: number; qty: number }>();
    const allTopBooks = [
      ...delhiMetrics[2],
      ...mumbaiMetrics[2],
      ...patnaMetrics[2],
      ...onlineMetrics[2],
      ...bookFairMetrics[2],
      ...lokbhartiMetrics[2]
    ];

    for (const b of allTopBooks) {
      if (!b.title) continue;
      const title = b.title.trim();
      const revenue = Number(b._sum?.amount?.toString() || '0');
      const qty = Number(b._sum?.qty?.toString() || '0');
      const existing = mergedBooksMap.get(title) || { revenue: 0, qty: 0 };
      mergedBooksMap.set(title, {
        revenue: existing.revenue + revenue,
        qty: existing.qty + qty
      });
    }

    const topItems = Array.from(mergedBooksMap.entries())
      .map(([title, val]) => ({ title, total: val.revenue, qty: val.qty }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // 5. Gather Timeseries (Based on selected range filter)
    const [
      delhiTS,
      mumbaiTS,
      patnaTS,
      onlineTS,
      bookFairTS,
      lokbhartiTS
    ] = await Promise.all([
      prisma.googleSheetOfflineSale.findMany({
        where: queryWhere,
        select: { date: true, amount: true }
      }),
      prisma.mumbaiOfflineSale.findMany({
        where: queryWhere,
        select: { date: true, amount: true }
      }),
      prisma.patnaOfflineSale.findMany({
        where: queryWhere,
        select: { date: true, amount: true }
      }),
      prisma.onlineOfflineSale.findMany({
        where: queryWhere,
        select: { date: true, amount: true }
      }),
      prisma.bookFairOfflineSale.findMany({
        where: queryWhere,
        select: { date: true, amount: true }
      }),
      prisma.lokbhartiOfflineSale.findMany({
        where: queryWhere,
        select: { date: true, amount: true }
      })
    ]);

    // Aggregate daily totals by region
    const dailyMap = new Map<string, any>();

    const addTSData = (rows: any[], regionKey: string) => {
      for (const r of rows) {
        if (!r.date) continue;
        const dateStr = new Date(r.date).toISOString().slice(0, 10);
        const amount = Number(r.amount?.toString() || '0');
        const existing = dailyMap.get(dateStr) || {
          Delhi: 0,
          Mumbai: 0,
          Patna: 0,
          Online: 0,
          BookFair: 0,
          Lokbharti: 0,
          total: 0
        };
        existing[regionKey] = (existing[regionKey] || 0) + amount;
        existing.total += amount;
        dailyMap.set(dateStr, existing);
      }
    };

    addTSData(delhiTS, 'Delhi');
    addTSData(mumbaiTS, 'Mumbai');
    addTSData(patnaTS, 'Patna');
    addTSData(onlineTS, 'Online');
    addTSData(bookFairTS, 'BookFair');
    addTSData(lokbhartiTS, 'Lokbharti');

    const timeSeries = Array.from(dailyMap.entries())
      .map(([date, val]) => ({ date, ...val }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. Return response
    return res.json({
      ok: true,
      counts: {
        totalCount,
        totalRevenue,
        totalQty
      },
      regionalBreakdown,
      timeSeries,
      topItems
    });
  } catch (error: any) {
    console.error("Total Sales Summary Failed:", error);
    return res.status(500).json({ ok: false, error: 'Failed to compute total sales summary' });
  }
});

// GET /api/total-offline-sales/transactions
router.get('/transactions', async (req, res) => {
  try {
    const limit = 15;
    // Fetch top 5 recent transactions from each table, tag them, then merge and sort
    const [
      delhiRows,
      mumbaiRows,
      patnaRows,
      onlineRows,
      bookFairRows,
      lokbhartiRows
    ] = await Promise.all([
      prisma.googleSheetOfflineSale.findMany({ take: 5, orderBy: { id: 'desc' } }),
      prisma.mumbaiOfflineSale.findMany({ take: 5, orderBy: { id: 'desc' } }),
      prisma.patnaOfflineSale.findMany({ take: 5, orderBy: { id: 'desc' } }),
      prisma.onlineOfflineSale.findMany({ take: 5, orderBy: { id: 'desc' } }),
      prisma.bookFairOfflineSale.findMany({ take: 5, orderBy: { id: 'desc' } }),
      prisma.lokbhartiOfflineSale.findMany({ take: 5, orderBy: { id: 'desc' } })
    ]);

    const formatRow = (row: any, region: string) => ({
      id: `${region}-${row.id}`,
      docNo: row.docNo || 'N/A',
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : 'N/A',
      title: row.title || 'Untitled Book',
      qty: row.qty || 0,
      amount: Number(row.amount?.toString() || '0'),
      customerName: row.customerName || 'Walk-in Customer',
      region
    });

    const merged = [
      ...delhiRows.map(r => formatRow(r, 'Delhi Offline')),
      ...mumbaiRows.map(r => formatRow(r, 'Mumbai Offline')),
      ...patnaRows.map(r => formatRow(r, 'Patna Offline')),
      ...onlineRows.map(r => formatRow(r, 'Online - Website')),
      ...bookFairRows.map(r => formatRow(r, 'BookFair Offline')),
      ...lokbhartiRows.map(r => formatRow(r, 'Lokbharti - Allahabad'))
    ].sort((a, b) => b.date.localeCompare(a.date))
     .slice(0, limit);

    return res.json({ ok: true, items: merged });
  } catch (error: any) {
    console.error("Total Sales Transactions Failed:", error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch recent transactions' });
  }
});

// GET /api/total-offline-sales/projections
router.get('/projections', async (req, res) => {
  try {
    const year = 2026;
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const whereClause = {
      date: {
        gte: startOfYear,
        lte: endOfYear
      }
    };

    // 1. Fetch daily groupings for all 6 tables in parallel for max performance
    const [
      delhiDaily,
      mumbaiDaily,
      patnaDaily,
      onlineDaily,
      bookFairDaily,
      lokbhartiDaily
    ] = await Promise.all([
      prisma.googleSheetOfflineSale.groupBy({ by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.mumbaiOfflineSale.groupBy({ by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.patnaOfflineSale.groupBy({ by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.onlineOfflineSale.groupBy({ by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.bookFairOfflineSale.groupBy({ by: ['date'], _sum: { amount: true }, where: whereClause }),
      prisma.lokbhartiOfflineSale.groupBy({ by: ['date'], _sum: { amount: true }, where: whereClause })
    ]);

    // 2. Aggregate monthly actuals
    const monthlyActuals = Array(12).fill(0);
    const processDaily = (rows: any[]) => {
      for (const r of rows) {
        if (!r.date) continue;
        const m = new Date(r.date).getMonth(); // 0-11
        const amt = Number(r._sum.amount?.toString() || '0');
        monthlyActuals[m] += amt;
      }
    };

    processDaily(delhiDaily);
    processDaily(mumbaiDaily);
    processDaily(patnaDaily);
    processDaily(onlineDaily);
    processDaily(bookFairDaily);
    processDaily(lokbhartiDaily);

    // 3. Projection Calculations
    const currentMonthIndex = new Date().getMonth(); // 0-11 (June = 5)
    const currentDayInMonth = new Date().getDate();

    // Calculate days elapsed in the year
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let daysElapsed = 0;
    for (let i = 0; i < currentMonthIndex; i++) {
      daysElapsed += daysInMonths[i] || 0;
    }
    daysElapsed += currentDayInMonth;
    const daysLeft = 365 - daysElapsed;

    // Actual so far (includes all prior complete months + current month actuals)
    const actualSoFar = monthlyActuals.slice(0, currentMonthIndex).reduce((a, b) => a + b, 0) + monthlyActuals[currentMonthIndex];

    // Daily Velocity based on elapsed days YTD
    const V = actualSoFar / Math.max(1, daysElapsed);

    // Projected remaining (V * days left in the year)
    const projectedRemaining = V * daysLeft;

    const yearlyEstimate = actualSoFar + projectedRemaining;
    const achievementPercent = (actualSoFar / Math.max(1, yearlyEstimate)) * 100;
    const timeElapsedPercent = (daysElapsed / 365) * 100;

    // Weighted monthly average (calculated from daily velocity for UI representation)
    const weightedMonthlyAvg = V * (365 / 12);

    // Build the month-by-month chart data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = monthNames.map((name, i) => {
      let type: 'actual' | 'current' | 'projected' = 'actual';
      let val = 0;

      if (i < currentMonthIndex) {
        type = 'actual';
        val = monthlyActuals[i];
      } else if (i === currentMonthIndex) {
        type = 'current';
        const daysInCurrentMonth = daysInMonths[currentMonthIndex] || 30;
        const remainingDaysInMonth = Math.max(0, daysInCurrentMonth - currentDayInMonth);
        val = monthlyActuals[currentMonthIndex] + V * remainingDaysInMonth;
      } else {
        type = 'projected';
        val = V * (daysInMonths[i] || 30);
      }

      return {
        name,
        type,
        value: val
      };
    });

    return res.json({
      ok: true,
      year,
      yearlyEstimate,
      weightedMonthlyAvg,
      actualSoFar,
      projectedRemaining,
      achievementPercent,
      timeElapsedPercent,
      daysElapsed,
      daysLeft,
      chartData
    });
  } catch (error: any) {
    console.error("Projections Aggregation Failed:", error);
    return res.status(500).json({ ok: false, error: 'Failed to compute yearly projection sales' });
  }
});

export default router;
