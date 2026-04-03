import express from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { offlineSyncService } from "./offlineSyncService.js";
import { TtlCache } from "../../../lib/cache.js";

// 5-minute server-side cache for expensive aggregate endpoints
const summaryCache = new TtlCache<any>(5 * 60 * 1000);
const countsCache = new TtlCache<any>(5 * 60 * 1000);

// Periodic eviction every 10 minutes to prevent memory leaks
setInterval(() => {
  summaryCache.evictExpired();
  countsCache.evictExpired();
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

/**
 * @swagger
 * /api/offline-sales:
 *   get:
 *     summary: Get offline sales with pagination and filtering
 *     tags: [offline sales]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5000
 *           default: 200
 *         description: Number of items to return
 *       - in: query
 *         name: cursorId
 *         schema:
 *           type: string
 *         description: Pagination cursor
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for title, customer, state, city, or publisher
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: publisher
 *         schema:
 *           type: string
 *         description: Filter by publisher
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Filter by minimum amount
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Filter by maximum amount
 *     responses:
 *       200:
 *         description: List of offline sales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OfflineSale'
 *                 nextCursorId:
 *                   type: string
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
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    sept: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const i = map[m.toLowerCase()];
  return i === undefined ? null : i;
}

function resolveRowDate(r: any): Date | null {
  let d: Date | null = r.date ? new Date(r.date) : null;
  if (!d) {
    const raw = r.rawJson as Record<string, any> | undefined;
    if (raw) {
      // Normalize keys by trimming
      const normalizedRaw: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw)) {
        normalizedRaw[k.trim()] = v;
      }
      const d1 = pick(normalizedRaw, [
        "Date",
        "Txn Date",
        "Transaction Date",
        "Trnsdocdate",
      ]);
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
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .default("100")
      .pipe(z.number().min(1).max(5000)),
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
  });
  const parsed = Q.safeParse({
    limit: req.query.limit ?? "100",
    offset: req.query.offset,
    cursorId: req.query.cursorId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    q: req.query.q,
    state: req.query.state,
    city: req.query.city,
    publisher: req.query.publisher,
    author: req.query.author,
    minAmount: req.query.minAmount,
    maxAmount: req.query.maxAmount,
    isbn: req.query.isbn,
    customerName: req.query.customerName,
  });
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid query" });
  const { limit, offset, cursorId, startDate, endDate, q, state, city, publisher, author, minAmount, maxAmount, isbn, customerName } = parsed.data;

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
    if (minAmount != null || maxAmount != null) {
      where.amount = {};
      if (minAmount != null) where.amount.gte = minAmount;
      if (maxAmount != null) where.amount.lte = maxAmount;
    }

    const totalCount = await prisma.googleSheetOfflineSale.count({ where });

    const fetchLimit =
      startDate || endDate ? Math.min(limit * 10, 5000) : limit;
    const args: any = {
      take: fetchLimit,
      orderBy: { id: "desc" as const },
      where,
    };
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
      orderNo: it.docNo, // Alias for frontend compatibility
      amount: it.amount != null ? round2(decToNumber(it.amount)) : null,
      rate: it.rate != null ? round2(decToNumber(it.rate)) : null,
    }));

    const data =
      startDate || endDate
        ? dataAll
            .filter((r: any) => {
              const d = resolveRowDate(r);
              if (!d) return false;
              if (startDate && d < new Date(startDate)) return false;
              if (endDate && d > new Date(endDate)) return false;
              return true;
            })
            .slice(0, limit)
        : dataAll;

    const last = (data as any[]).at(-1);
    return res.json({ ok: true, items: data, nextCursorId: last?.id ?? null, totalCount });
  } catch (e: any) {
    console.error("offline_sales_list_failed", e);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to fetch offline sales" });
  }
});

/**
 * @swagger
 * /api/offline-sales/summary:
 *   get:
 *     summary: Get sales summary (time series and top items)
 *     tags: [offline sales]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 90
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 */
// GET /api/offline-sales/summary — uses SQL aggregates + server-side cache
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
  });
  const parsed = Q.safeParse({
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    state: req.query.state,
    city: req.query.city,
    publisher: req.query.publisher,
    author: req.query.author,
    isbn: req.query.isbn,
    customerName: req.query.customerName,
    minAmount: req.query.minAmount,
    maxAmount: req.query.maxAmount,
  });
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid query" });
  const days = parsed.data.days ?? 90;
  const startDate = parsed.data.startDate
    ? new Date(parsed.data.startDate)
    : undefined;
  const endDate = parsed.data.endDate
    ? new Date(parsed.data.endDate)
    : undefined;

  const { state, city, publisher, author, isbn, customerName, minAmount, maxAmount } = parsed.data;

  // Cache key based on parameters
  const cacheKey = `summary:${days}:${startDate?.toISOString() ?? ""}:${endDate?.toISOString() ?? ""}:${state ?? ""}:${city ?? ""}:${publisher ?? ""}:${author ?? ""}:${isbn ?? ""}:${customerName ?? ""}:${minAmount ?? ""}:${maxAmount ?? ""}`;
  const cached = summaryCache.get(cacheKey);
  if (cached) {
    res.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
    res.set("X-Cache", "HIT");
    return res.json(cached);
  }

  try {
    const since = startDate ?? new Date(Date.now() - days * 86400000);
    const until = endDate ?? new Date();

    const conditions = [Prisma.sql`"date" IS NOT NULL AND "date" >= ${since} AND "date" <= ${until}`];
    if (state)     conditions.push(Prisma.sql`"state" ILIKE ${'%' + state + '%'}`);
    if (city)      conditions.push(Prisma.sql`"city" ILIKE ${'%' + city + '%'}`);
    if (publisher) conditions.push(Prisma.sql`"publisher" ILIKE ${'%' + publisher + '%'}`);
    if (author)    conditions.push(Prisma.sql`"author" ILIKE ${'%' + author + '%'}`);
    if (isbn)      conditions.push(Prisma.sql`"isbn" ILIKE ${'%' + isbn + '%'}`);
    if (customerName) conditions.push(Prisma.sql`"customerName" ILIKE ${'%' + customerName + '%'}`);
    if (minAmount != null) conditions.push(Prisma.sql`"amount" >= ${minAmount}`);
    if (maxAmount != null) conditions.push(Prisma.sql`"amount" <= ${maxAmount}`);

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    // SQL aggregate: time series (daily totals)
    const timeSeriesRows = await prisma.$queryRaw<
      { day: string; total: number }[]
    >(Prisma.sql`
      SELECT
        to_char("date", 'YYYY-MM-DD') AS day,
        COALESCE(SUM(
          CASE
            WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
            WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
            ELSE 0
          END
        ), 0)::float AS total
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY to_char("date", 'YYYY-MM-DD')
      ORDER BY day ASC
    `);

    // Separate WHERE clause for topItems / bottomItems: does NOT require "date IS NOT NULL"
    // so ALL book records with title data are included (not just dated rows).
    // Dimension filters (state, publisher, etc.) are still applied if active.
    const itemConditions: any[] = [];
    if (state)     itemConditions.push(Prisma.sql`"state" ILIKE ${'%' + state + '%'}`);
    if (city)      itemConditions.push(Prisma.sql`"city" ILIKE ${'%' + city + '%'}`);
    if (publisher) itemConditions.push(Prisma.sql`"publisher" ILIKE ${'%' + publisher + '%'}`);
    if (author)    itemConditions.push(Prisma.sql`"author" ILIKE ${'%' + author + '%'}`);
    if (isbn)      itemConditions.push(Prisma.sql`"isbn" ILIKE ${'%' + isbn + '%'}`);
    if (customerName) itemConditions.push(Prisma.sql`"customerName" ILIKE ${'%' + customerName + '%'}`);
    if (minAmount != null) itemConditions.push(Prisma.sql`"amount" >= ${minAmount}`);
    if (maxAmount != null) itemConditions.push(Prisma.sql`"amount" <= ${maxAmount}`);
    const itemsWhereClause = itemConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(itemConditions, ' AND ')}`
      : Prisma.sql``;

    // SQL aggregate: top 10 items by total amount
    const topItemsRows = await prisma.$queryRaw<
      { title: string; total: number; qty: number }[]
    >(Prisma.sql`
      SELECT
        COALESCE(NULLIF(TRIM("title"), ''), 'Untitled Item') AS title,
        COALESCE(SUM(
          CASE
            WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
            WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
            ELSE 0
          END
        ), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty
      FROM "google_sheet_offline_sales"
      ${itemsWhereClause}
      GROUP BY COALESCE(NULLIF(TRIM("title"), ''), 'Untitled Item')
      HAVING SUM(
        CASE
          WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
          ELSE 0
        END
      ) > 0 OR SUM("qty") > 0
      ORDER BY total DESC
      LIMIT 10
    `);

    const timeSeries = timeSeriesRows.map((r) => ({
      date: r.day,
      total: round2(Number(r.total)),
    }));

    const topItems = topItemsRows.map((r) => {
      const total = Number(r.total) || 0;
      const qty = Number(r.qty) || 0;
      return {
        title: r.title || "Untitled",
        total: round2(total),
        qty,
        avgCost: qty > 0 ? round2(total / qty) : 0,
      };
    });

    // SQL aggregate: bottom 10 items by total amount (worst performing, titled books only)
    // Note: filter out empty/null titles in WHERE (not HAVING) to avoid PostgreSQL
    // "column must appear in GROUP BY or aggregate" error.
    const bottomItemsTitleFilter = itemConditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(itemConditions, ' AND ')} AND TRIM("title") IS NOT NULL AND TRIM("title") != ''`
      : Prisma.sql`WHERE TRIM("title") IS NOT NULL AND TRIM("title") != ''`;

    const bottomItemsRows = await prisma.$queryRaw<
      { title: string; total: number; qty: number }[]
    >(Prisma.sql`
      SELECT
        TRIM("title") AS title,
        COALESCE(SUM(
          CASE
            WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
            WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
            ELSE 0
          END
        ), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty
      FROM "google_sheet_offline_sales"
      ${bottomItemsTitleFilter}
      GROUP BY TRIM("title")
      HAVING (
        SUM(
          CASE
            WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
            WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
            ELSE 0
          END
        ) > 0 OR SUM("qty") > 0
      )
      ORDER BY total ASC
      LIMIT 10
    `);

    const bottomItems = bottomItemsRows.map((r) => {
      const total = Number(r.total) || 0;
      const qty = Number(r.qty) || 0;
      return {
        title: r.title || "Untitled",
        total: round2(total),
        qty,
        avgCost: qty > 0 ? round2(total / qty) : 0,
      };
    });

    const result = { ok: true, timeSeries, topItems, bottomItems };

    // --- NEW: Revenue by State ---
    const revenueByStateRows = await prisma.$queryRaw<
      { state: string; total: number }[]
    >(Prisma.sql`
      SELECT
        COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State') AS state,
        COALESCE(SUM(
          CASE
            WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
            WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
            ELSE 0
          END
        ), 0)::float AS total
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State')
      ORDER BY total DESC
      LIMIT 10
    `);
    (result as any).revenueByState = revenueByStateRows.map(r => ({
      state: r.state,
      total: round2(Number(r.total))
    }));

    // --- NEW: Revenue by Publisher ---
    const revenueByPubRows = await prisma.$queryRaw<
      { publisher: string; total: number }[]
    >(Prisma.sql`
      SELECT
        COALESCE(NULLIF(TRIM("publisher"), ''), 'Unknown Publisher') AS publisher,
        COALESCE(SUM(
          CASE
            WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
            WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
            ELSE 0
          END
        ), 0)::float AS total
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM("publisher"), ''), 'Unknown Publisher')
      ORDER BY total DESC
      LIMIT 10
    `);
    (result as any).revenueByPublisher = revenueByPubRows.map(r => ({
      publisher: r.publisher,
      total: round2(Number(r.total))
    }));

    // --- NEW: Top Customers by Revenue ---
    const topCustomerRows = await prisma.$queryRaw<
      { customerName: string; total: number }[]
    >(Prisma.sql`
      SELECT
        COALESCE(NULLIF(TRIM("customerName"), ''), 'Unnamed Customer') AS customer_name,
        COALESCE(SUM(
          CASE
            WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
            WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
            ELSE 0
          END
        ), 0)::float AS total
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM("customerName"), ''), 'Unnamed Customer')
      ORDER BY total DESC
      LIMIT 10
    `);
    (result as any).topCustomers = topCustomerRows.map(r => ({
      customerName: (r as any).customer_name,
      total: round2(Number(r.total))
    }));

    summaryCache.set(cacheKey, result);

    res.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
    res.set("X-Cache", "MISS");
    return res.json(result);
  } catch (e: any) {
    console.error("offline_sales_summary_failed", e);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to compute summary" });
  }
});

/**
 * @swagger
 * /api/offline-sales/counts:
 *   get:
 *     summary: Get aggregate counts and totals
 *     tags: [offline sales]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 */
// GET /api/offline-sales/counts — uses SQL aggregates + server-side cache
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
  });
  const parsed = Q.safeParse({
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    state: req.query.state,
    city: req.query.city,
    publisher: req.query.publisher,
    author: req.query.author,
    isbn: req.query.isbn,
    customerName: req.query.customerName,
    minAmount: req.query.minAmount,
    maxAmount: req.query.maxAmount,
  });
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid query" });
  const { days } = parsed.data;
  let { startDate, endDate } = parsed.data;

  if (days && !startDate && !endDate) {
    const now = new Date();
    const since = new Date(now.getTime() - days * 86400000);
    startDate = since.toISOString();
    endDate = now.toISOString();
  }

  // Cache key based on parameters
  const cacheKey = `counts:${days ?? ""}:${startDate ?? ""}:${endDate ?? ""}:${parsed.data.state ?? ""}:${parsed.data.city ?? ""}:${parsed.data.publisher ?? ""}:${parsed.data.author ?? ""}:${parsed.data.isbn ?? ""}:${parsed.data.customerName ?? ""}:${parsed.data.minAmount ?? ""}:${parsed.data.maxAmount ?? ""}`;
  const cached = countsCache.get(cacheKey);
  if (cached) {
    res.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
    res.set("X-Cache", "HIT");
    return res.json(cached);
  }

  try {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // Build dynamic WHERE clause for raw SQL
    const conditions = [Prisma.sql`"date" IS NOT NULL`];
    if (start && end) conditions.push(Prisma.sql`"date" >= ${start} AND "date" <= ${end}`);
    else if (start)   conditions.push(Prisma.sql`"date" >= ${start}`);
    
    if (parsed.data.state)     conditions.push(Prisma.sql`"state" ILIKE ${'%' + parsed.data.state + '%'}`);
    if (parsed.data.city)      conditions.push(Prisma.sql`"city" ILIKE ${'%' + parsed.data.city + '%'}`);
    if (parsed.data.publisher) conditions.push(Prisma.sql`"publisher" ILIKE ${'%' + parsed.data.publisher + '%'}`);
    if (parsed.data.author)    conditions.push(Prisma.sql`"author" ILIKE ${'%' + parsed.data.author + '%'}`);
    if (parsed.data.isbn)      conditions.push(Prisma.sql`"isbn" ILIKE ${'%' + parsed.data.isbn + '%'}`);
    if (parsed.data.customerName) conditions.push(Prisma.sql`"customerName" ILIKE ${'%' + parsed.data.customerName + '%'}`);
    
    const minA = parsed.data.minAmount;
    const maxA = parsed.data.maxAmount;
    if (minA != null) conditions.push(Prisma.sql`"amount" >= ${minA}`);
    if (maxA != null) conditions.push(Prisma.sql`"amount" <= ${maxA}`);

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    // Single SQL aggregate query for all counts
    const [agg] = await prisma.$queryRaw<
      { count: bigint; total_amount: number; unique_customers: bigint }[]
    >(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS count,
        COALESCE(SUM(
          CASE
            WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
            WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
            ELSE 0
          END
        ), 0)::float AS total_amount,
        COUNT(DISTINCT NULLIF(TRIM(LOWER("customerName")), ''))::bigint AS unique_customers
      FROM "google_sheet_offline_sales"
      ${whereClause}
    `);

    const result = {
      ok: true,
      totalCount: Number(agg?.count ?? 0),
      totalAmount: round2(Number(agg?.total_amount ?? 0)),
      uniqueCustomers: Number(agg?.unique_customers ?? 0),
      refundCount: 0,
    };
    countsCache.set(cacheKey, result);

    res.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
    res.set("X-Cache", "MISS");
    return res.json(result);
  } catch (e: any) {
    console.error("offline_sales_counts_failed", e);
    return res.status(500).json({ ok: false, error: "Failed to fetch counts" });
  }
});

// GET /api/offline-sales/google-sheets
router.get("/google-sheets", async (req, res) => {
  try {
    const result = await offlineSyncService.syncOfflineSales();
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("offline_get_sync_failed", e);
    return res.status(500).json({ ok: false, error: e.message || "Sync failed" });
  }
});

// POST /api/offline-sales/push
// Accepts { data: any[][] }
router.post("/push", async (req, res) => {
  const token = req.headers["x-sync-token"];
  const expectedToken = process.env.GOOGLE_SYNC_TOKEN || "rk_default_token_2026";

  if (!token || token !== expectedToken) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const { data, isFirstBatch } = req.body;
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ ok: false, error: "Invalid data format. Expected { data: any[][] }" });
  }

  try {
    if (isFirstBatch) {
      await prisma.googleSheetOfflineSale.deleteMany({});
      console.log("Wiped offline sales table for fresh sync since isFirstBatch=true");
    }
    const result = await offlineSyncService.processData(data);
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("offline_push_failed", e);
    return res.status(500).json({ ok: false, error: e.message || "Push processing failed" });
  }
});

export default router;
