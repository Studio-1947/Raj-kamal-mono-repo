import express from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { offlineSyncService } from "./offlineSyncService.js";
import { TtlCache } from "../../../lib/cache.js";

// 5-minute server-side cache for expensive aggregate endpoints
const summaryCache = new TtlCache<any>(5 * 60 * 1000);
const countsCache = new TtlCache<any>(5 * 60 * 1000);
const optionsCache = new TtlCache<any>(30 * 60 * 1000); // 30 minutes

// Periodic eviction every 10 minutes to prevent memory leaks
setInterval(() => {
  summaryCache.evictExpired();
  countsCache.evictExpired();
  optionsCache.evictExpired();
}, 10 * 60 * 1000);

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: offline sales
 *     description: General offline sales data management
 *   - name: google sheet offline sales
 *     description: Google Sheets offline sales data management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OfflineSale:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         docNo:
 *           type: string
 *         orderNo:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         title:
 *           type: string
 *         customerName:
 *           type: string
 *         amount:
 *           type: number
 *         qty:
 *           type: number
 *         rate:
 *           type: number
 *         rawJson:
 *           type: object
 */

// Utilities for resilient aggregation when DB fields are missing
function decToNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  try {
    return Number(v.toString());
  } catch {
    return Number(v) || 0;
  }
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function numSafe(v: any): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace(/[\s,]/g, "")) : Number(v);
  return Number.isFinite(n) ? n : null;
}
function normalizeText(raw?: any): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.replace(/\s+/g, " ");
}
function pick(
  row: Record<string, any> | null | undefined,
  names: string[],
): any {
  if (!row) return undefined;
  for (const k of Object.keys(row))
    if (names.some((n) => n.toLowerCase() === k.toLowerCase()))
      return (row as any)[k];
  return undefined;
}
function monthNameToIndex(m?: string | null): number | null {
  if (!m) return null;
  const map: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  };
  const i = map[m.toLowerCase()];
  return i === undefined ? null : i;
}

function resolveRowDate(r: any): Date | null {
  let d: Date | null = r.date ? new Date(r.date) : null;
  if (!d) {
    const raw = r.rawJson as Record<string, any> | undefined;
    if (raw) {
      const normalizedRaw: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw)) {
        normalizedRaw[k.trim()] = v;
      }
      const d1 = pick(normalizedRaw, ["Date", "Txn Date", "Transaction Date", "Trnsdocdate"]);
      if (d1) {
        const dd = new Date(d1);
        if (!isNaN(+dd)) d = dd;
      }
      if (!d) {
        const mi = monthNameToIndex(r.month);
        if (mi != null && r.year && r.year > 0)
          d = new Date(Date.UTC(r.year, mi, 1));
      }
    }
  }
  return d;
}

// GET /api/offline-sales?limit=200&cursorId=<id>
router.get("/", async (req, res) => {
  const Q = z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default("100").pipe(z.number().min(1).max(5000)),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
    cursorId: z.string().regex(/^\d+$/).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
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
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const { limit, offset, cursorId, startDate, endDate, q, state, city, publisher, author, minAmount, maxAmount, isbn, customerName, binding, title } = parsed.data;

  try {
    const where: any = {};
    if (q) {
      const contains = q.toString();
      where.OR = [
        { title: { contains, mode: "insensitive" } },
        { customerName: { contains, mode: "insensitive" } },
        { state: { contains, mode: "insensitive" } },
        { city: { contains, mode: "insensitive" } },
        { publisher: { contains, mode: "insensitive" } },
      ];
    }
    if (state)     where.state = { contains: state, mode: "insensitive" };
    if (city)      where.city = { contains: city, mode: "insensitive" };
    if (publisher) where.publisher = { contains: publisher, mode: "insensitive" };
    if (author)    where.author = { contains: author, mode: "insensitive" };
    if (isbn)      where.isbn = { contains: isbn, mode: "insensitive" };
    if (customerName) where.customerName = { contains: customerName, mode: "insensitive" };
    if (binding)   where.binding = { contains: binding, mode: "insensitive" };
    if (title)     where.title = { contains: title, mode: "insensitive" };

    where.AND = [
      { OR: [{ amount: null }, { amount: { gte: 0 } }] },
      { OR: [{ rate: null }, { rate: { gte: 0 } }] },
      { OR: [{ qty: null }, { qty: { gte: 0 } }] },
    ];
    
    if (minAmount != null || maxAmount != null) {
      const amountCond: any = {};
      if (minAmount != null) amountCond.gte = minAmount;
      if (maxAmount != null) amountCond.lte = maxAmount;
      where.AND.push({ amount: amountCond });
    }

    const totalCount = await prisma.googleSheetOfflineSale.count({ where });

    const fetchLimit = startDate || endDate ? Math.min(limit * 10, 5000) : limit;
    const args: any = { take: fetchLimit, orderBy: { id: "desc" as const }, where };
    if (cursorId) {
      args.skip = 1;
      args.cursor = { id: BigInt(cursorId) };
    } else if (offset != null) {
      args.skip = offset;
    }

    const items = await prisma.googleSheetOfflineSale.findMany(args);
    const dataAll = items.map((it: any) => ({
      ...it,
      id: it.id?.toString?.() ?? String(it.id),
      orderNo: it.docNo,
      amount: it.amount != null ? round2(decToNumber(it.amount)) : null,
      rate: it.rate != null ? round2(decToNumber(it.rate)) : null,
    }));

    const data = startDate || endDate
        ? dataAll.filter((r: any) => {
              const d = resolveRowDate(r);
              if (!d) return false;
              if (startDate && d < new Date(startDate)) return false;
              if (endDate && d > new Date(endDate)) return false;
              return true;
            }).slice(0, limit)
        : dataAll;

    const last = (data as any[]).at(-1);
    return res.json({ ok: true, items: data, nextCursorId: last?.id ?? null, totalCount });
  } catch (e: any) {
    console.error("offline_sales_list_failed", e);
    return res.status(500).json({ ok: false, error: "Failed to fetch offline sales" });
  }
});

// GET /api/offline-sales/summary
router.get("/summary", async (req, res) => {
  const Q = z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    publisher: z.string().optional(),
    author: z.string().optional(),
    isbn: z.string().optional(),
    customerName: z.string().optional(),
    minAmount: z.string().transform(v => v ? Number(v) : undefined).optional(),
    maxAmount: z.string().transform(v => v ? Number(v) : undefined).optional(),
    binding: z.string().optional(),
    title: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const days = parsed.data.days ?? 90;
  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : undefined;
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : undefined;
  const { state, city, publisher, author, isbn, customerName, minAmount, maxAmount, binding, title } = parsed.data;

  const cacheKey = `summary:${days}:${startDate?.toISOString() ?? ""}:${endDate?.toISOString() ?? ""}:${state ?? ""}:${city ?? ""}:${publisher ?? ""}:${author ?? ""}:${isbn ?? ""}:${customerName ?? ""}:${minAmount ?? ""}:${maxAmount ?? ""}:${binding ?? ""}:${title ?? ""}`;
  const cached = summaryCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const since = startDate ?? new Date(Date.now() - days * 86400000);
    const until = endDate ?? new Date();

    const conditions = [
      Prisma.sql`"date" IS NOT NULL AND "date" >= ${since} AND "date" <= ${until}`,
      Prisma.sql`("amount" IS NULL OR "amount" >= 0)`,
      Prisma.sql`("rate" IS NULL OR "rate" >= 0)`,
      Prisma.sql`("qty" IS NULL OR "qty" >= 0)`
    ];
    if (state)     conditions.push(Prisma.sql`"state" ILIKE ${'%' + state + '%'}`);
    if (city)      conditions.push(Prisma.sql`"city" ILIKE ${'%' + city + '%'}`);
    if (publisher) conditions.push(Prisma.sql`"publisher" ILIKE ${'%' + publisher + '%'}`);
    if (author)    conditions.push(Prisma.sql`"author" ILIKE ${'%' + author + '%'}`);
    if (isbn)      conditions.push(Prisma.sql`"isbn" ILIKE ${'%' + isbn + '%'}`);
    if (customerName) conditions.push(Prisma.sql`"customerName" ILIKE ${'%' + customerName + '%'}`);
    if (binding)   conditions.push(Prisma.sql`"binding" ILIKE ${'%' + binding + '%'}`);
    if (title)     conditions.push(Prisma.sql`"title" ILIKE ${'%' + title + '%'}`);
    if (minAmount != null) conditions.push(Prisma.sql`"amount" >= ${minAmount}`);
    if (maxAmount != null) conditions.push(Prisma.sql`"amount" <= ${maxAmount}`);

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const timeSeriesRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        to_char("date", 'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY to_char("date", 'YYYY-MM-DD')
      ORDER BY day ASC
    `);

    const itemConditions: any[] = [
      Prisma.sql`("amount" IS NULL OR "amount" >= 0)`,
      Prisma.sql`("rate" IS NULL OR "rate" >= 0)`,
      Prisma.sql`("qty" IS NULL OR "qty" >= 0)`
    ];
    if (state)     itemConditions.push(Prisma.sql`"state" ILIKE ${'%' + state + '%'}`);
    if (city)      itemConditions.push(Prisma.sql`"city" ILIKE ${'%' + city + '%'}`);
    if (publisher) itemConditions.push(Prisma.sql`"publisher" ILIKE ${'%' + publisher + '%'}`);
    if (author)    itemConditions.push(Prisma.sql`"author" ILIKE ${'%' + author + '%'}`);
    if (isbn)      itemConditions.push(Prisma.sql`"isbn" ILIKE ${'%' + isbn + '%'}`);
    if (customerName) itemConditions.push(Prisma.sql`"customerName" ILIKE ${'%' + customerName + '%'}`);
    if (binding)   itemConditions.push(Prisma.sql`"binding" ILIKE ${'%' + binding + '%'}`);
    if (title)     itemConditions.push(Prisma.sql`"title" ILIKE ${'%' + title + '%'}`);
    if (minAmount != null) itemConditions.push(Prisma.sql`"amount" >= ${minAmount}`);
    if (maxAmount != null) itemConditions.push(Prisma.sql`"amount" <= ${maxAmount}`);
    const itemsWhereClause = itemConditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(itemConditions, ' AND ')}` : Prisma.sql``;

    const topItemsRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") WHEN "isbn" IS NOT NULL AND "isbn" != '' THEN '[No Title] ISBN: ' || "isbn" ELSE 'Untitled Item (Doc: ' || COALESCE("docNo", 'Unknown') || ')' END AS title,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty,
        COALESCE(MAX("rate"), 0)::float AS rate
      FROM "google_sheet_offline_sales"
      ${itemsWhereClause}
      GROUP BY 1 HAVING (SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END) > 0 OR SUM("qty") > 0)
      ORDER BY total DESC LIMIT 10
    `);

    const result = {
      ok: true,
      timeSeries: timeSeriesRows.map(r => ({ date: r.day, total: round2(Number(r.total)) })),
      topItems: topItemsRows.map(r => ({ title: r.title, total: round2(Number(r.total)), qty: r.qty, rate: round2(Number(r.rate)) })),
    };

    // --- Projection Logic (Year 2026) ---
    const currentYear = 2026;
    const yearStart = new Date(`${currentYear}-01-01T00:00:00Z`);
    const now = new Date(); 
    const yearSoFarConditions = [
      Prisma.sql`"date" IS NOT NULL AND "date" >= ${yearStart} AND "date" <= ${now}`,
      Prisma.sql`("amount" IS NULL OR "amount" >= 0)`,
    ];
    const [yearStats] = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float as total
      FROM "google_sheet_offline_sales"
      WHERE ${Prisma.join(yearSoFarConditions, ' AND ')}
    `);
    const totalSoFar = Number(yearStats?.total ?? 0);
    const daysElapsed = Math.ceil(Math.max(1, now.getTime() - yearStart.getTime()) / 86400000);
    const dailyAvg = totalSoFar / daysElapsed;
    const remainingDays = Math.ceil((new Date(`${currentYear}-12-31T23:59:59Z`).getTime() - now.getTime()) / 86400000);
    (result as any).projection = {
      year: currentYear, 
      totalSoFar: round2(totalSoFar), 
      daysElapsed, 
      dailyAvg: round2(dailyAvg),
      remainingDays, 
      projectedRemaining: round2(dailyAvg * remainingDays),
      totalProjected: round2(totalSoFar + dailyAvg * remainingDays)
    };

    summaryCache.set(cacheKey, result);
    return res.json(result);
  } catch (e: any) {
    console.error("offline_summary_failed", e);
    return res.status(500).json({ ok: false, error: "Summary failed" });
  }
});

// GET /api/offline-sales/counts
router.get("/counts", async (req, res) => {
  const Q = z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    publisher: z.string().optional(),
    author: z.string().optional(),
    isbn: z.string().optional(),
    customerName: z.string().optional(),
    minAmount: z.string().transform(v => v ? Number(v) : undefined).optional(),
    maxAmount: z.string().transform(v => v ? Number(v) : undefined).optional(),
    binding: z.string().optional(),
    title: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const { days, startDate, endDate, state, city, publisher, author, isbn, customerName, binding, title } = parsed.data;

  const start = startDate ? new Date(startDate) : (days ? new Date(Date.now() - days * 86400000) : null);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    const conditions = [
      Prisma.sql`("amount" IS NULL OR "amount" >= 0)`,
    ];
    if (start && end) conditions.push(Prisma.sql`"date" >= ${start} AND "date" <= ${end}`);
    if (state)     conditions.push(Prisma.sql`"state" ILIKE ${'%' + state + '%'}`);
    if (city)      conditions.push(Prisma.sql`"city" ILIKE ${'%' + city + '%'}`);
    if (publisher) conditions.push(Prisma.sql`"publisher" ILIKE ${'%' + publisher + '%'}`);
    if (author)    conditions.push(Prisma.sql`"author" ILIKE ${'%' + author + '%'}`);
    if (customerName) conditions.push(Prisma.sql`"customerName" ILIKE ${'%' + customerName + '%'}`);
    if (binding)   conditions.push(Prisma.sql`"binding" ILIKE ${'%' + binding + '%'}`);
    if (title)     conditions.push(Prisma.sql`"title" ILIKE ${'%' + title + '%'}`);

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const [agg] = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS count,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total_amount,
        COUNT(DISTINCT NULLIF(TRIM(LOWER("customerName")), ''))::bigint AS unique_customers,
        (SELECT TRIM("binding") FROM "google_sheet_offline_sales" ${whereClause} AND "binding" IS NOT NULL AND TRIM("binding") != '' GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1) AS top_binding
      FROM "google_sheet_offline_sales"
      ${whereClause}
    `);

    return res.json({
      ok: true,
      totalCount: Number(agg?.count ?? 0),
      totalAmount: round2(Number(agg?.total_amount ?? 0)),
      uniqueCustomers: Number(agg?.unique_customers ?? 0),
      topBinding: agg?.top_binding ?? 'N/A'
    });
  } catch (e: any) {
    console.error("offline_counts_failed", e);
    return res.status(500).json({ ok: false, error: "Counts failed" });
  }
});

// GET /api/offline-sales/google-sheets
router.get("/google-sheets", async (req, res) => {
  try {
    const result = await offlineSyncService.syncOfflineSales();
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/offline-sales/push
router.post("/push", async (req, res) => {
  const token = req.headers["x-sync-token"];
  if (!token || token !== (process.env.GOOGLE_SYNC_TOKEN || "rk_default_token_2026")) return res.status(401).json({ ok: false });
  const { data, isFirstBatch } = req.body;
  try {
    if (isFirstBatch) await prisma.googleSheetOfflineSale.deleteMany({});
    const result = await offlineSyncService.processData(data);
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/offline-sales/options
router.get("/options", async (req, res) => {
  const cached = optionsCache.get("all");
  if (cached) return res.json(cached);

  try {
    const [states, publishers, bindings, customerNames, authors, cities, bookTitles] = await Promise.all([
      prisma.googleSheetOfflineSale.groupBy({ by: ['state'], where: { state: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { state: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['publisher'], where: { publisher: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { publisher: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['binding'], where: { binding: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { binding: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['customerName'], where: { customerName: { not: null, notIn: [''] } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 100 }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['author'], where: { author: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { author: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['city'], where: { city: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { city: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['title'], where: { title: { not: null, notIn: [''] } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 100 })
    ]);

    const result = {
      ok: true,
      states: states.map(s => s.state),
      publishers: publishers.map(p => p.publisher),
      bindings: bindings.map(b => b.binding),
      customerNames: customerNames.map(c => c.customerName).sort(),
      authors: authors.map(a => a.author),
      cities: cities.map(c => c.city),
      bookTitles: bookTitles.map(b => b.title).sort(),
    };
    optionsCache.set("all", result);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Options failed" });
  }
});

export default router;
