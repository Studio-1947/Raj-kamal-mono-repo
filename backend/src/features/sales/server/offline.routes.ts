import express from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { offlineSyncService } from "./offlineSyncService.js";
import { TtlCache } from "../../../lib/cache.js";
import { authenticateToken } from "../../../middleware/authPrisma.js";

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

function clearCaches() {
  summaryCache.clear();
  countsCache.clear();
  optionsCache.clear();
}

const router = express.Router();

// Apply auth to all routes by default
router.use((req, res, next) => {
  // Exclude /push from standard JWT auth as it uses x-sync-token
  if (req.path === "/push" && req.method === "POST") return next();
  return (authenticateToken as any)(req, res, next);
});

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
/**
 * Splits a query into tokens (words) for robust searching.
 * Ignores small characters and splits on spaces and punctuation.
 */
function getSearchTokens(q: string): string[] {
  if (!q) return [];
  // Split by whitespace and common separators like (), [], {}, -, /
  return q.split(/[\s()\[\]{}\-\/.,]+/).filter(t => t.length > 0);
}
/**
 * Returns a Postgres regex for a single token.
 * Prevents regex injection and allows flexible matching.
 */
function toTokenRegex(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    type: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const { limit, offset, cursorId, startDate, endDate, q, state, city, publisher, author, minAmount, maxAmount, isbn, customerName, binding, title } = parsed.data;

  try {
    const where: any = {};
    const andConditions: any[] = [];

    if (q) {
      const tokens = getSearchTokens(q);
      if (tokens.length > 0) {
        andConditions.push({
          AND: tokens.map(t => ({
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
          }))
        });
      }
    }

    if (state)     where.state = { contains: state.trim().replace(/\s+/g, " "), mode: "insensitive" };
    if (city)      where.city = { contains: city.trim().replace(/\s+/g, " "), mode: "insensitive" };
    if (publisher) where.publisher = { contains: publisher.trim().replace(/\s+/g, " "), mode: "insensitive" };
    if (author)    where.author = { contains: author.trim().replace(/\s+/g, " "), mode: "insensitive" };
    if (isbn)      where.isbn = { contains: isbn.trim().replace(/\s+/g, " "), mode: "insensitive" };
    if (customerName) where.customerName = { contains: customerName.trim().replace(/\s+/g, " "), mode: "insensitive" };

    if (binding) {
      const bts = binding.split(',').map(b => b.trim()).filter(Boolean);
      if (bts.length > 1) {
        where.OR = bts.map(b => ({ binding: { contains: b, mode: "insensitive" } }));
      } else if (bts.length === 1) {
        where.binding = { contains: bts[0], mode: "insensitive" };
      }
    }

    if (title) {
      const match = title.match(/^(.*)\s\(([^)]+)\)$/);
      if (match) {
        const [_, t, b] = match;
        where.title = { contains: (t ?? "").trim().replace(/\s+/g, " "), mode: "insensitive" };
        where.binding = { contains: (b ?? "").trim().replace(/\s+/g, " "), mode: "insensitive" };
      } else {
        where.title = { contains: title.trim().replace(/\s+/g, " "), mode: "insensitive" };
      }
    }

    if (parsed.data.type) where.type = { contains: parsed.data.type.trim().replace(/\s+/g, " "), mode: "insensitive" };

    if (minAmount != null || maxAmount != null) {
      const amountCond: any = {};
      if (minAmount != null) amountCond.gte = minAmount;
      if (maxAmount != null) amountCond.lte = maxAmount;
      andConditions.push({ amount: amountCond });
    }

    where.AND = andConditions;

    const totalCount = await prisma.googleSheetOfflineSale.count({ where });

    const fetchLimit = startDate || endDate ? Math.min(limit * 10, 5000) : limit;
    const args: any = {
      take: fetchLimit,
      orderBy: [
        { date: { sort: "desc" as const, nulls: "last" as const } },
        { id: "desc" as const },
      ],
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
      orderNo: it.docNo,
      amount: it.amount != null ? round2(decToNumber(it.amount)) : null,
      rate: it.rate != null ? round2(decToNumber(it.rate)) : null,
    }));

    const data = startDate || endDate
        ? dataAll.filter((r: any) => {
              const d = resolveRowDate(r);
              if (!d) return false;
              if (startDate) {
                const s = new Date(startDate);
                s.setUTCHours(0,0,0,0);
                if (d < s) return false;
              }
              if (endDate) {
                const e = new Date(endDate);
                e.setUTCHours(23,59,59,999);
                if (d > e) return false;
              }
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
    type: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const days = parsed.data.days;
  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : undefined;
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : undefined;
  const { state, city, publisher, author, isbn, customerName, minAmount, maxAmount, binding, title, type, q } = parsed.data;

  const cacheKey = `summary:${days ?? "all"}:${startDate?.toISOString() ?? ""}:${endDate?.toISOString() ?? ""}:${state ?? ""}:${city ?? ""}:${publisher ?? ""}:${author ?? ""}:${isbn ?? ""}:${customerName ?? ""}:${minAmount ?? ""}:${maxAmount ?? ""}:${binding ?? ""}:${title ?? ""}:${type ?? ""}:${q ?? ""}`;
  const cached = summaryCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const since = startDate ?? (days != null ? new Date(Date.now() - days * 86400000) : null);
    if (since) since.setUTCHours(0,0,0,0);

    const conditions = [
      Prisma.sql`"date" IS NOT NULL`
    ];

    if (since) conditions.push(Prisma.sql`"date" >= ${since}`);
    if (endDate) {
      const until = new Date(endDate);
      until.setUTCHours(23,59,59,999);
      conditions.push(Prisma.sql`"date" <= ${until}`);
    }
    if (q) {
      const tokens = getSearchTokens(q);
        tokens.forEach(t => {
          const tr = toTokenRegex(t);
          conditions.push(Prisma.sql`("title" ~* ${tr} OR "customerName" ~* ${tr} OR "state" ~* ${tr} OR "city" ~* ${tr} OR "publisher" ~* ${tr} OR "author" ~* ${tr} OR "binding" ~* ${tr})`);
        });
    }
    if (state)     conditions.push(Prisma.sql`"state" ~* ${toTokenRegex(state)}`);
    if (city)      conditions.push(Prisma.sql`"city" ~* ${toTokenRegex(city)}`);
    if (publisher) conditions.push(Prisma.sql`"publisher" ~* ${toTokenRegex(publisher)}`);
    if (author)    conditions.push(Prisma.sql`"author" ~* ${toTokenRegex(author)}`);
    if (isbn)      conditions.push(Prisma.sql`"isbn" ~* ${toTokenRegex(isbn)}`);
    if (customerName) conditions.push(Prisma.sql`"customerName" ~* ${toTokenRegex(customerName)}`);
    if (binding) {
      const bts = binding.split(',').map(b => b.trim()).filter(Boolean);
      if (bts.length > 0) {
        const bConditions = bts.map(b => Prisma.sql`"binding" ~* ${toTokenRegex(b)}`);
        conditions.push(Prisma.sql`(${Prisma.join(bConditions, ' OR ')})`);
      }
    }
    if (title) {
      const match = title.match(/^(.*)\s\(([^)]+)\)$/);
      if (match) {
        const [_, t, b] = match;
        conditions.push(Prisma.sql`"title" ~* ${toTokenRegex((t ?? "").trim())}`);
        conditions.push(Prisma.sql`"binding" ~* ${toTokenRegex((b ?? "").trim())}`);
      } else {
        conditions.push(Prisma.sql`"title" ~* ${toTokenRegex(title)}`);
      }
    }
    if (parsed.data.type) conditions.push(Prisma.sql`"type" ~* ${toTokenRegex(parsed.data.type)}`);
    if (minAmount != null) conditions.push(Prisma.sql`"amount" >= ${minAmount}`);
    if (maxAmount != null) conditions.push(Prisma.sql`"amount" <= ${maxAmount}`);

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const timeSeriesRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        to_char("date", 'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY to_char("date", 'YYYY-MM-DD')
      ORDER BY day ASC
    `);

    const itemConditions: any[] = [
      Prisma.sql`("amount" IS NULL OR "amount" >= 0)`,
      Prisma.sql`("rate" IS NULL OR "rate" >= 0)`,
      Prisma.sql`("qty" IS NULL OR "qty" >= 0)`,
      Prisma.sql`("title" IS NULL OR "title" !~* '^E-')`
    ];
    if (state)     itemConditions.push(Prisma.sql`"state" ~* ${toTokenRegex(state)}`);
    if (city)      itemConditions.push(Prisma.sql`"city" ~* ${toTokenRegex(city)}`);
    if (publisher) itemConditions.push(Prisma.sql`"publisher" ~* ${toTokenRegex(publisher)}`);
    if (author)    itemConditions.push(Prisma.sql`"author" ~* ${toTokenRegex(author)}`);
    if (isbn)      itemConditions.push(Prisma.sql`"isbn" ~* ${toTokenRegex(isbn)}`);
    if (customerName) itemConditions.push(Prisma.sql`"customerName" ~* ${toTokenRegex(customerName)}`);
    if (binding) {
      const bts = binding.split(',').map(b => b.trim()).filter(Boolean);
      if (bts.length > 0) {
        const bConditions = bts.map(b => Prisma.sql`"binding" ~* ${toTokenRegex(b)}`);
        itemConditions.push(Prisma.sql`(${Prisma.join(bConditions, ' OR ')})`);
      }
    }
    if (title) {
      const match = title.match(/^(.*)\s\(([^)]+)\)$/);
      if (match) {
        const [_, t, b] = match;
        itemConditions.push(Prisma.sql`"title" ~* ${toTokenRegex((t ?? "").trim())}`);
        itemConditions.push(Prisma.sql`"binding" ~* ${toTokenRegex((b ?? "").trim())}`);
      } else {
        itemConditions.push(Prisma.sql`"title" ~* ${toTokenRegex(title)}`);
      }
    }
    if (minAmount != null) itemConditions.push(Prisma.sql`"amount" >= ${minAmount}`);
    if (maxAmount != null) itemConditions.push(Prisma.sql`"amount" <= ${maxAmount}`);
    const itemsWhereClause = itemConditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(itemConditions, ' AND ')}` : Prisma.sql``;

    const topItemsRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") WHEN "isbn" IS NOT NULL AND "isbn" != '' THEN '[No Title] ISBN: ' || "isbn" ELSE 'Untitled Item (Doc: ' || COALESCE("docNo", 'Unknown') || ')' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty,
        COALESCE(MAX("rate"), 0)::float AS rate
      FROM "google_sheet_offline_sales"
      ${itemsWhereClause}
      GROUP BY 1 HAVING (SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END) > 0 OR SUM("qty") > 0)
      ORDER BY total DESC LIMIT 10
    `);

    const topItemsRowsByQty = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") WHEN "isbn" IS NOT NULL AND "isbn" != '' THEN '[No Title] ISBN: ' || "isbn" ELSE 'Untitled Item (Doc: ' || COALESCE("docNo", 'Unknown') || ')' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty,
        COALESCE(MAX("rate"), 0)::float AS rate
      FROM "google_sheet_offline_sales"
      ${itemsWhereClause}
      GROUP BY 1 HAVING (SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END) > 0 OR SUM("qty") > 0)
      ORDER BY qty DESC LIMIT 10
    `);

    const result: any = {
      ok: true,
      timeSeries: timeSeriesRows.map(r => ({ date: r.day, total: round2(Number(r.total)), qty: Number(r.qty) || 0 })),
      topItems: topItemsRows.map(r => ({ title: r.title, total: round2(Number(r.total)), qty: r.qty, rate: round2(Number(r.rate)) })),
      topItemsByQty: topItemsRowsByQty.map(r => ({ title: r.title, total: round2(Number(r.total)), qty: r.qty, rate: round2(Number(r.rate)) })),
    };

    // --- BOTTOM ITEMS ---
    const bottomItemsRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") WHEN "isbn" IS NOT NULL AND "isbn" != '' THEN '[No Title] ISBN: ' || "isbn" ELSE 'Untitled Item (Doc: ' || COALESCE("docNo", 'Unknown') || ')' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty,
        COALESCE(MAX("rate"), 0)::float AS rate
      FROM "google_sheet_offline_sales"
      ${itemsWhereClause}
      GROUP BY 1 HAVING (SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END) > 0 OR SUM("qty") > 0)
      ORDER BY total ASC LIMIT 10
    `);
    result.bottomItems = bottomItemsRows.map(r => ({ title: r.title, total: round2(Number(r.total)), qty: r.qty, rate: round2(Number(r.rate)) }));

    // --- REVENUE BY STATE ---
    const revenueByStateRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State') AS state, COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC LIMIT 10
    `);
    result.revenueByState = revenueByStateRows.map(r => ({ state: r.state, total: round2(Number(r.total)) }));

    // --- REVENUE BY CITY ---
    const revenueByCityRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 
        COALESCE(NULLIF(TRIM("city"), ''), 'Unknown City') AS city, 
        MAX(COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State')) AS state,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC LIMIT 10
    `);
    result.revenueByCity = revenueByCityRows.map(r => ({ city: r.city, state: r.state, total: round2(Number(r.total)) }));

    // --- REVENUE BY PUBLISHER ---
    const revenueByPubRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("publisher"), ''), 'Unknown Publisher') AS publisher, COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC LIMIT 10
    `);
    result.revenueByPublisher = revenueByPubRows.map(r => ({ publisher: r.publisher, total: round2(Number(r.total)) }));

    // --- TOP CUSTOMERS ---
    const topCustomerRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("customerName"), ''), 'Unnamed Customer') AS customer_name, COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC LIMIT 10
    `);
    result.topCustomers = topCustomerRows.map(r => ({ customerName: r.customer_name, total: round2(Number(r.total)) }));

    // --- REVENUE BY BINDING ---
    const revenueByBindingRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("binding"), ''), 'Unknown Binding') AS binding, COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total, COALESCE(SUM("qty"), 0)::int AS qty
      FROM "google_sheet_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC
    `);
    result.revenueByBinding = revenueByBindingRows.map(r => ({ binding: r.binding, total: round2(Number(r.total)), qty: Number(r.qty) || 0 }));
    
    // --- REVENUE BY TYPE ---
    const revenueByTypeRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("type"), ''), 'Unknown Type') AS type, COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total
      FROM "google_sheet_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC
    `);
    result.revenueByType = revenueByTypeRows.map(r => ({ type: r.type, total: round2(Number(r.total)) }));

    // --- Projection Logic (Year 2026) — month-wise weighted ---
    const currentYear = 2026;
    const yearStart = new Date(`${currentYear}-01-01T00:00:00Z`);
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1; // 1–12

    // Monthly totals for all 2026 data recorded so far
    const monthlyRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        EXTRACT(MONTH FROM "date")::int AS month,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
                          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
                          ELSE 0 END), 0)::float AS total,
        COUNT(*)::int AS txn_count
      FROM "google_sheet_offline_sales"
      WHERE "date" IS NOT NULL
        AND "date" >= ${yearStart}
        AND "date" <= ${now}
        AND ("amount" IS NULL OR "amount" >= 0)
        AND ("title" IS NULL OR "title" !~* '^E-')
      GROUP BY 1
      ORDER BY 1
    `);

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Split into complete months vs current month
    const completeMonths = monthlyRows.filter((r: any) => Number(r.month) < currentMonth);
    const currentMonthRow = monthlyRows.find((r: any) => Number(r.month) === currentMonth);

    // Days elapsed in current month and total days in current month
    const daysInCurrentMonth = new Date(Date.UTC(currentYear, now.getUTCMonth() + 1, 0)).getUTCDate();
    const daysElapsedInCurrentMonth = Math.max(1, now.getUTCDate());
    const currentMonthActual = currentMonthRow ? Number(currentMonthRow.total) : 0;
    const currentMonthProjected = (currentMonthActual / daysElapsedInCurrentMonth) * daysInCurrentMonth;

    // Weighted average of up to last 3 complete months (newest = highest weight)
    const recentComplete = completeMonths.slice(-3);
    let weightedMonthlyAvg: number;
    if (recentComplete.length > 0) {
      const weights = recentComplete.map((_: any, i: number) => i + 1); // 1,2,3
      const totalWeight = weights.reduce((a: number, b: number) => a + b, 0);
      weightedMonthlyAvg = recentComplete.reduce(
        (acc: number, m: any, i: number) => acc + Number(m.total) * (weights[i] ?? 1), 0
      ) / totalWeight;
    } else {
      weightedMonthlyAvg = currentMonthProjected;
    }

    // Build full year monthly breakdown (Jan–Dec)
    const monthlyBreakdown = Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1;
      const isComplete = m < currentMonth;
      const isCurrent  = m === currentMonth;
      const row = monthlyRows.find((r: any) => Number(r.month) === m);
      if (isComplete) {
        return { month: m, name: MONTH_NAMES[idx], actual: round2(row ? Number(row.total) : 0), projected: null, isComplete: true, isCurrent: false };
      }
      if (isCurrent) {
        return { month: m, name: MONTH_NAMES[idx], actual: round2(currentMonthActual), projected: round2(currentMonthProjected), isComplete: false, isCurrent: true, daysElapsed: daysElapsedInCurrentMonth, totalDays: daysInCurrentMonth };
      }
      return { month: m, name: MONTH_NAMES[idx], actual: null, projected: round2(weightedMonthlyAvg), isComplete: false, isCurrent: false };
    });

    const totalSoFar = completeMonths.reduce((acc: number, m: any) => acc + Number(m.total), 0) + currentMonthActual;
    const daysElapsed = Math.ceil(Math.max(1, now.getTime() - yearStart.getTime()) / 86400000);
    const dailyAvg = totalSoFar / daysElapsed;
    const remainingDays = Math.ceil((new Date(`${currentYear}-12-31T23:59:59Z`).getTime() - now.getTime()) / 86400000);
    const projectedRemaining = round2((currentMonthProjected - currentMonthActual) + (12 - currentMonth) * weightedMonthlyAvg);
    const totalProjected = round2(totalSoFar + projectedRemaining);

    (result as any).projection = {
      year: currentYear,
      totalSoFar: round2(totalSoFar),
      daysElapsed,
      dailyAvg: round2(dailyAvg),
      remainingDays,
      projectedRemaining,
      totalProjected,
      weightedMonthlyAvg: round2(weightedMonthlyAvg),
      currentMonth,
      monthlyBreakdown,
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
    type: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const { days, startDate, endDate, state, city, publisher, author, isbn, customerName, binding, title, type, q } = parsed.data;

  const start = startDate ? new Date(startDate) : (days ? new Date(Date.now() - days * 86400000) : null);
  if (start) start.setUTCHours(0,0,0,0);
  // Removed end date default filter to allow future records

  try {
    const conditions = [];
    if (start && endDate) {
      const until = new Date(endDate);
      until.setUTCHours(23,59,59,999);
      conditions.push(Prisma.sql`("date" IS NULL OR ("date" >= ${start} AND "date" <= ${until}))`);
    } else if (start) {
      conditions.push(Prisma.sql`("date" IS NULL OR "date" >= ${start})`);
    } else if (endDate) {
      const until = new Date(endDate);
      until.setUTCHours(23,59,59,999);
      conditions.push(Prisma.sql`("date" IS NULL OR "date" <= ${until})`);
    }
    if (state)     conditions.push(Prisma.sql`"state" ~* ${toTokenRegex(state)}`);
    if (city)      conditions.push(Prisma.sql`"city" ~* ${toTokenRegex(city)}`);
    if (publisher) conditions.push(Prisma.sql`"publisher" ~* ${toTokenRegex(publisher)}`);
    if (author)    conditions.push(Prisma.sql`"author" ~* ${toTokenRegex(author)}`);
    if (customerName) conditions.push(Prisma.sql`"customerName" ~* ${toTokenRegex(customerName)}`);
    if (binding) {
      const bts = binding.split(',').map(b => b.trim()).filter(Boolean);
      if (bts.length > 0) {
        const bConditions = bts.map(b => Prisma.sql`"binding" ~* ${toTokenRegex(b)}`);
        conditions.push(Prisma.sql`(${Prisma.join(bConditions, ' OR ')})`);
      }
    }
    if (title) {
      const match = title.match(/^(.*)\s\(([^)]+)\)$/);
      if (match) {
        const [_, t, b] = match;
        conditions.push(Prisma.sql`"title" ~* ${toTokenRegex((t ?? "").trim())}`);
        conditions.push(Prisma.sql`"binding" ~* ${toTokenRegex((b ?? "").trim())}`);
      } else {
        conditions.push(Prisma.sql`"title" ~* ${toTokenRegex(title)}`);
      }
    }
    if (type)      conditions.push(Prisma.sql`"type" ~* ${toTokenRegex(type)}`);
    if (q) {
      const tokens = getSearchTokens(q);
      tokens.forEach(t => {
        const tr = toTokenRegex(t);
        conditions.push(Prisma.sql`("title" ~* ${tr} OR "customerName" ~* ${tr} OR "state" ~* ${tr} OR "city" ~* ${tr} OR "publisher" ~* ${tr} OR "author" ~* ${tr} OR "binding" ~* ${tr})`);
      });
    }

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

// GET /api/offline-sales/daily-details
router.get("/daily-details", async (req, res) => {
  const Q = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/).optional(),
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
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
    type: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query parameters" });
  
  const { date, days, startDate, endDate, state, city, publisher, author, isbn, customerName, minAmount, maxAmount, binding, title, type, q } = parsed.data;

  try {
    const conditions = [
      Prisma.sql`("title" IS NULL OR "title" !~* '^E-')`
    ];

    if (date) {
      const targetDate = new Date(date);
      conditions.push(Prisma.sql`"date" IS NOT NULL AND date_trunc('day', "date") = date_trunc('day', ${targetDate}::timestamp)`);
    } else {
      const start = startDate ? new Date(startDate) : (days ? new Date(Date.now() - days * 86400000) : null);
      if (start) start.setUTCHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date();
      if (end) end.setUTCHours(23, 59, 59, 999);
      if (start && end) conditions.push(Prisma.sql`"date" >= ${start} AND "date" <= ${end}`);
    }

    if (q) {
      const tokens = getSearchTokens(q);
      tokens.forEach(t => {
        const tr = toTokenRegex(t);
        conditions.push(Prisma.sql`("title" ~* ${tr} OR "customerName" ~* ${tr} OR "state" ~* ${tr} OR "city" ~* ${tr} OR "publisher" ~* ${tr} OR "author" ~* ${tr} OR "binding" ~* ${tr})`);
      });
    }
    if (state)     conditions.push(Prisma.sql`"state" ~* ${toTokenRegex(state)}`);
    if (city)      conditions.push(Prisma.sql`"city" ~* ${toTokenRegex(city)}`);
    if (publisher) conditions.push(Prisma.sql`"publisher" ~* ${toTokenRegex(publisher)}`);
    if (author)    conditions.push(Prisma.sql`"author" ~* ${toTokenRegex(author)}`);
    if (isbn)      conditions.push(Prisma.sql`"isbn" ~* ${toTokenRegex(isbn)}`);
    if (customerName) conditions.push(Prisma.sql`"customerName" ~* ${toTokenRegex(customerName)}`);
    if (binding) {
      const bts = binding.split(',').map(b => b.trim()).filter(Boolean);
      if (bts.length > 0) {
        const bConditions = bts.map(b => Prisma.sql`"binding" ~* ${toTokenRegex(b)}`);
        conditions.push(Prisma.sql`(${Prisma.join(bConditions, ' OR ')})`);
      }
    }
    if (type)      conditions.push(Prisma.sql`"type" ~* ${toTokenRegex(type)}`);
    if (title) {
      const match = title.match(/^(.*)\s\(([^)]+)\)$/);
      if (match) {
        const [_, t, b] = match;
        conditions.push(Prisma.sql`"title" ~* ${toTokenRegex((t ?? "").trim())}`);
        conditions.push(Prisma.sql`"binding" ~* ${toTokenRegex((b ?? "").trim())}`);
      } else {
        conditions.push(Prisma.sql`"title" ~* ${toTokenRegex(title)}`);
      }
    }
    if (minAmount != null) conditions.push(Prisma.sql`"amount" >= ${minAmount}`);
    if (maxAmount != null) conditions.push(Prisma.sql`"amount" <= ${maxAmount}`);

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    console.log("DAILY-DETAILS-RANGE:", { startDate, endDate, days, date, parsed: parsed.data });

    const details = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") ELSE '[No Title]' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
        COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS total,
        COALESCE(SUM("qty"), 0)::int AS qty,
        COALESCE(MAX("publisher"), 'N/A') AS publisher
      FROM "google_sheet_offline_sales"
      ${whereClause}
      GROUP BY 1
      ORDER BY total DESC
    `);

    return res.json({
      ok: true,
      items: details.map(r => ({
        title: r.title,
        total: round2(Number(r.total)),
        qty: Number(r.qty) || 0,
        publisher: r.publisher
      }))
    });
  } catch (e: any) {
    console.error("offline_daily_details_failed", e);
    return res.status(500).json({ ok: false, error: "Daily details failed" });
  }
});

// GET /api/offline-sales/google-sheets
router.get("/google-sheets", async (req, res) => {
  try {
    const result = await offlineSyncService.syncOfflineSales();
    clearCaches();
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
    clearCaches();
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
    const [states, publishers, bindings, customerNames, authors, cities, bookTitlesRaw, types] = await Promise.all([
      prisma.googleSheetOfflineSale.groupBy({ by: ['state'], where: { state: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { state: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['publisher'], where: { publisher: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { publisher: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['binding'], where: { binding: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { binding: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['customerName'], where: { customerName: { not: null, notIn: [''] } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 100 }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['author'], where: { author: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { author: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['city'], where: { city: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { city: 'asc' } }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['title', 'binding'], where: { title: { not: null, notIn: [''] } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 200 }),
      prisma.googleSheetOfflineSale.groupBy({ by: ['type'], where: { type: { not: null, notIn: [''] } }, _count: { _all: true }, orderBy: { type: 'asc' } })
    ]);

    const bookTitles = bookTitlesRaw.map(b => {
      const title = b.title?.trim() || '';
      const binding = b.binding?.trim() || '';
      return binding ? `${title} (${binding})` : title;
    }).sort();

    const result = {
      ok: true,
      states: states.map(s => s.state),
      publishers: publishers.map(p => p.publisher),
      bindings: bindings.map(b => b.binding),
      customerNames: customerNames.map(c => c.customerName).sort(),
      authors: authors.map(a => a.author),
      cities: cities.map(c => c.city),
      bookTitles,
      types: types.map(t => t.type),
    };
    optionsCache.set("all", result);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Options failed" });
  }
});

export default router;
