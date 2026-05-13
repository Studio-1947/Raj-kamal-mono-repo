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
function toTokenRegex(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get("/", async (req, res) => {
  const Q = z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default("100").pipe(z.number().min(1).max(5000)),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    cursorId: z.string().regex(/^\d+$/).optional(),
    q: z.string().optional(),
    customerName: z.string().optional(),
    title: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const { limit, offset, cursorId, q, customerName, title } = parsed.data;

  try {
    const where: any = {};
    if (q) {
      const tokens = getSearchTokens(q);
      if (tokens.length > 0) {
        where.AND = tokens.map(t => ({
          OR: [
            { title: { contains: t, mode: "insensitive" } },
            { customerName: { contains: t, mode: "insensitive" } },
            { city: { contains: t, mode: "insensitive" } },
            { publisher: { contains: t, mode: "insensitive" } },
          ]
        }));
      }
    }
    if (customerName) where.customerName = { contains: customerName, mode: "insensitive" };
    if (title) where.title = { contains: title, mode: "insensitive" };

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

    const items = await prisma.mumbaiOfflineSale.findMany(args);
    const data = items.map((it: any) => ({
      ...it,
      id: it.id.toString(),
      amount: it.amount != null ? round2(decToNumber(it.amount)) : null,
      rate: it.rate != null ? round2(decToNumber(it.rate)) : null,
    }));

    const totalCount = await prisma.mumbaiOfflineSale.count({ where });
    const last = (data as any[]).at(-1);
    return res.json({ ok: true, items: data, nextCursorId: last?.id ?? null, totalCount });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Failed to fetch Mumbai sales" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const [agg, topItems] = await Promise.all([
      prisma.mumbaiOfflineSale.aggregate({
        _sum: { amount: true, qty: true },
        _count: { _all: true }
      }),
      prisma.mumbaiOfflineSale.groupBy({
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

router.get("/sync", async (req, res) => {
  try {
    const result = await offlineSyncService.syncMumbaiSales();
    clearCaches();
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
