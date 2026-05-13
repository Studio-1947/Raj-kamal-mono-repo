import express from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { offlineSyncService } from "./offlineSyncService.js";
import { TtlCache } from "../../../lib/cache.js";
import { authenticateToken } from "../../../middleware/authPrisma.js";

const summaryCache = new TtlCache<any>(5 * 60 * 1000);
const countsCache = new TtlCache<any>(5 * 60 * 1000);
const optionsCache = new TtlCache<any>(30 * 60 * 1000);

setInterval(() => {
  summaryCache.evictExpired();
  countsCache.evictExpired();
  optionsCache.evictExpired();
}, 10 * 60 * 1000);

function clearCaches() {
  summaryCache.clear();
  countsCache.clear();
  optionsCache.clear();
}

const router = express.Router();
router.use(authenticateToken as any);

function decToNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  try { return Number(v.toString()); } catch { return Number(v) || 0; }
}
function round2(n: number): number { return Math.round(n * 100) / 100; }

function getSearchTokens(q: string): string[] {
  if (!q) return [];
  return q.split(/[\s()\[\]{}\-\/.,]+/).filter(t => t.length > 0);
}

// GET /api/patna-offline-sales
router.get("/", async (req, res) => {
  const Q = z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default("100").pipe(z.number().min(1).max(5000)),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    cursorId: z.string().regex(/^\d+$/).optional(),
    q: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    publisher: z.string().optional(),
    author: z.string().optional(),
    minAmount: z.string().transform(v => v ? Number(v) : undefined).optional(),
    maxAmount: z.string().transform(v => v ? Number(v) : undefined).optional(),
    isbn: z.string().optional(),
    customerName: z.string().optional(),
    binding: z.string().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const { limit, offset, cursorId, q, state, city, publisher, author, minAmount, maxAmount, isbn, customerName, binding, title, type } = parsed.data;

  try {
    const where: any = {};
    if (q) {
      const tokens = getSearchTokens(q);
      if (tokens.length > 0) {
        where.AND = tokens.map(t => ({
          OR: [
            { title: { contains: t, mode: "insensitive" } },
            { customerName: { contains: t, mode: "insensitive" } },
            { state: { contains: t, mode: "insensitive" } },
            { city: { contains: t, mode: "insensitive" } },
            { publisher: { contains: t, mode: "insensitive" } },
            { author: { contains: t, mode: "insensitive" } },
            { isbn: { contains: t, mode: "insensitive" } },
            { binding: { contains: t, mode: "insensitive" } },
          ]
        }));
      }
    }
    if (state) where.state = { contains: state, mode: "insensitive" };
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (publisher) where.publisher = { contains: publisher, mode: "insensitive" };
    if (author) where.author = { contains: author, mode: "insensitive" };
    if (isbn) where.isbn = { contains: isbn, mode: "insensitive" };
    if (customerName) where.customerName = { contains: customerName, mode: "insensitive" };
    if (binding) where.binding = { contains: binding, mode: "insensitive" };
    if (title) where.title = { contains: title, mode: "insensitive" };
    if (type) where.type = { contains: type, mode: "insensitive" };
    
    if (minAmount != null || maxAmount != null) {
      where.amount = {};
      if (minAmount != null) where.amount.gte = minAmount;
      if (maxAmount != null) where.amount.lte = maxAmount;
    }

    const args: any = {
      take: limit,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      where,
    };
    if (cursorId) {
      args.skip = 1;
      args.cursor = { id: BigInt(cursorId) };
    } else if (offset != null) {
      args.skip = offset;
    }

    const items = await prisma.patnaOfflineSale.findMany(args);
    const data = items.map((it: any) => ({
      ...it,
      id: it.id.toString(),
      amount: it.amount != null ? round2(decToNumber(it.amount)) : null,
      rate: it.rate != null ? round2(decToNumber(it.rate)) : null,
    }));

    const totalCount = await prisma.patnaOfflineSale.count({ where });
    const last = (data as any[]).at(-1);
    return res.json({ ok: true, items: data, nextCursorId: last?.id ?? null, totalCount });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Failed to fetch Patna sales" });
  }
});

// GET /api/patna-offline-sales/summary
router.get("/summary", async (req, res) => {
  try {
    const [agg, topItems] = await Promise.all([
      prisma.patnaOfflineSale.aggregate({
        _sum: { amount: true, qty: true },
        _count: { _all: true }
      }),
      prisma.patnaOfflineSale.groupBy({
        by: ['title'],
        _sum: { amount: true, qty: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10
      })
    ]);

    return res.json({
      ok: true,
      totalAmount: round2(decToNumber(agg._sum.amount)),
      totalQty: agg._sum.qty || 0,
      totalCount: agg._count._all,
      topItems: topItems.map(it => ({
        title: it.title,
        total: round2(decToNumber(it._sum.amount)),
        qty: it._sum.qty || 0
      }))
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Summary failed" });
  }
});

// GET /api/patna-offline-sales/counts
router.get("/counts", async (req, res) => {
  try {
    const agg = await prisma.patnaOfflineSale.aggregate({
      _count: { _all: true },
      _sum: { amount: true },
    });

    const uniqueCustomers = await prisma.patnaOfflineSale.groupBy({
      by: ['customerName'],
      _count: { _all: true },
    });

    return res.json({
      ok: true,
      totalCount: agg._count._all,
      totalAmount: round2(decToNumber(agg._sum.amount)),
      uniqueCustomers: uniqueCustomers.length,
      topBinding: 'N/A'
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Counts failed" });
  }
});

// GET /api/patna-offline-sales/options
router.get("/options", async (req, res) => {
  try {
    const [titles, customers, publishers, authors, states, cities, bindings, types] = await Promise.all([
      prisma.patnaOfflineSale.findMany({ select: { title: true }, distinct: ['title'], take: 100 }),
      prisma.patnaOfflineSale.findMany({ select: { customerName: true }, distinct: ['customerName'], take: 100 }),
      prisma.patnaOfflineSale.findMany({ select: { publisher: true }, distinct: ['publisher'], take: 100 }),
      prisma.patnaOfflineSale.findMany({ select: { author: true }, distinct: ['author'], take: 100 }),
      prisma.patnaOfflineSale.findMany({ select: { state: true }, distinct: ['state'], take: 100 }),
      prisma.patnaOfflineSale.findMany({ select: { city: true }, distinct: ['city'], take: 100 }),
      prisma.patnaOfflineSale.findMany({ select: { binding: true }, distinct: ['binding'], take: 100 }),
      prisma.patnaOfflineSale.findMany({ select: { type: true }, distinct: ['type'], take: 100 }),
    ]);

    return res.json({
      ok: true,
      bookTitles: titles.map(t => t.title).filter(Boolean),
      customerNames: customers.map(c => c.customerName).filter(Boolean),
      publishers: publishers.map(p => p.publisher).filter(Boolean),
      authors: authors.map(a => a.author).filter(Boolean),
      states: states.map(s => s.state).filter(Boolean),
      cities: cities.map(c => c.city).filter(Boolean),
      bindings: bindings.map(b => b.binding).filter(Boolean),
      types: types.map(t => t.type).filter(Boolean),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Options failed" });
  }
});

router.get("/sync", async (req, res) => {
  try {
    const result = await offlineSyncService.syncPatnaSales();
    clearCaches();
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
