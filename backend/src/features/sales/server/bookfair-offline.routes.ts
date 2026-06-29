import express from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { offlineSyncService } from "./offlineSyncService.js";
import { TtlCache } from "../../../lib/cache.js";
import { registerSalesCacheClear } from "./salesCacheRegistry.js";
import { authenticateToken } from "../../../middleware/authPrisma.js";
import { parseFictionParam, fictionWhere, fictionSql, fictionBucketSql } from "./fictionFilter.js";
import { latestArchiveFy } from "./fyConfig.js";

const summaryCache = new TtlCache<any>(24 * 60 * 60 * 1000); // 24h — data changes only on sync; invalidated explicitly via the cache registry
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
registerSalesCacheClear(clearCaches);

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

// Source selector for the per-fair breakdown. The current (live) FY lives in
// bookfair_offline_sales; completed years live in offline_sales_history
// (channel = 'BookFair'). Returns the table reference + base scope predicate,
// both as Prisma.Sql fragments to inline into the breakdown queries.
type FairSource = 'live' | 'history';
function bookfairScope(source: FairSource, fy: string): { table: Prisma.Sql; scope: Prisma.Sql } {
  if (source === 'live') {
    return { table: Prisma.sql`"bookfair_offline_sales"`, scope: Prisma.sql`TRUE` };
  }
  return {
    table: Prisma.sql`"offline_sales_history"`,
    scope: Prisma.sql`"channel" = 'BookFair' AND "financialYear" = ${fy}`,
  };
}

// GET /api/bookfair-offline-sales
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
    fictionType: z.string().optional(),
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

    const fictionCond = fictionWhere(parseFictionParam(parsed.data.fictionType));
    if (fictionCond) where.AND = [...(Array.isArray(where.AND) ? where.AND : []), fictionCond];

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

    const items = await prisma.bookFairOfflineSale.findMany(args);
    const data = items.map((it: any) => ({
      ...it,
      id: it.id.toString(),
      qty: it.qty != null ? decToNumber(it.qty) - decToNumber(it.inQty) : null,
      amount: it.amount != null ? round2(decToNumber(it.amount) - decToNumber(it.inAmount)) : null,
      rate: it.rate != null ? round2(decToNumber(it.rate)) : null,
    }));

    const totalCount = await prisma.bookFairOfflineSale.count({ where });
    const last = (data as any[]).at(-1);
    return res.json({ ok: true, items: data, nextCursorId: last?.id ?? null, totalCount });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "Failed to fetch BookFair sales" });
  }
});

// GET /api/bookfair-offline-sales/summary
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
    fictionType: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const days = parsed.data.days;
  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : undefined;
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : undefined;
  const { state, city, publisher, author, isbn, customerName, minAmount, maxAmount, binding, title, type, q } = parsed.data;

  const cacheKey = `summary:${days ?? "all"}:${startDate ? startDate.toISOString().slice(0, 10) : ""}:${endDate ? endDate.toISOString().slice(0, 10) : ""}:${state ?? ""}:${city ?? ""}:${publisher ?? ""}:${author ?? ""}:${isbn ?? ""}:${customerName ?? ""}:${minAmount ?? ""}:${maxAmount ?? ""}:${binding ?? ""}:${title ?? ""}:${type ?? ""}:fic=${parseFictionParam(parsed.data.fictionType).join("|")}:${q ?? ""}`;
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

    { const fc = fictionSql(parseFictionParam(parsed.data.fictionType)); if (fc) conditions.push(fc); }
    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

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
    { const fc = fictionSql(parseFictionParam(parsed.data.fictionType)); if (fc) itemConditions.push(fc); }
    const itemsWhereClause = itemConditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(itemConditions, ' AND ')}` : Prisma.sql``;

    // Financial-year bounds (Indian FY: Apr–Mar) used by the monthly projection query below.
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthCalendar = now.getMonth(); // 0-indexed: April = 3
    const fyStartYear = currentMonthCalendar >= 3 ? currentYear : currentYear - 1;
    const yearStart = new Date(`${fyStartYear}-04-01T00:00:00Z`);
    const yearEnd = new Date(`${fyStartYear + 1}-03-31T23:59:59Z`);
    const currentMonth = (currentMonthCalendar >= 3) ? (currentMonthCalendar - 2) : (currentMonthCalendar + 10);

    // Run every independent aggregation concurrently instead of sequentially.
    // Prisma's connection pool naturally caps how many actually execute at once.
    const [
      timeSeriesRows,
      topItemsRows,
      topItemsRowsByQty,
      bottomItemsRows,
      revenueByStateRows,
      revenueByCityRows,
      revenueByPubRows,
      topCustomerRows,
      revenueByBindingRows,
      revenueByTypeRows,
      monthlyRows,
    ] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        to_char("date", 'YYYY-MM-DD') AS day,
        (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total,
        (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0))::int AS qty
      FROM "bookfair_offline_sales"
      ${whereClause}
      GROUP BY to_char("date", 'YYYY-MM-DD')
      ORDER BY day ASC
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") WHEN "isbn" IS NOT NULL AND "isbn" != '' THEN '[No Title] ISBN: ' || "isbn" ELSE 'Untitled Item (Doc: ' || COALESCE("docNo", 'Unknown') || ')' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
        (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total,
        (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0))::int AS qty,
        COALESCE(MAX("rate"), 0)::float AS rate
      FROM "bookfair_offline_sales"
      ${itemsWhereClause}
      GROUP BY 1 HAVING ((COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0)) > 0 OR (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0)) > 0)
      ORDER BY total DESC LIMIT 10
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") WHEN "isbn" IS NOT NULL AND "isbn" != '' THEN '[No Title] ISBN: ' || "isbn" ELSE 'Untitled Item (Doc: ' || COALESCE("docNo", 'Unknown') || ')' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
        (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total,
        (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0))::int AS qty,
        COALESCE(MAX("rate"), 0)::float AS rate
      FROM "bookfair_offline_sales"
      ${itemsWhereClause}
      GROUP BY 1 HAVING ((COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0)) > 0 OR (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0)) > 0)
      ORDER BY qty DESC LIMIT 10
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") WHEN "isbn" IS NOT NULL AND "isbn" != '' THEN '[No Title] ISBN: ' || "isbn" ELSE 'Untitled Item (Doc: ' || COALESCE("docNo", 'Unknown') || ')' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
        (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total,
        (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0))::int AS qty,
        COALESCE(MAX("rate"), 0)::float AS rate
      FROM "bookfair_offline_sales"
      ${itemsWhereClause}
      GROUP BY 1 HAVING ((COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0)) > 0 OR (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0)) > 0)
      ORDER BY total ASC LIMIT 10
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State') AS state, (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total
      FROM "bookfair_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC LIMIT 10
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        COALESCE(NULLIF(TRIM("city"), ''), 'Unknown City') AS city,
        MAX(COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State')) AS state,
        (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total
      FROM "bookfair_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC LIMIT 10
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("publisher"), ''), 'Unknown Publisher') AS publisher, (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total
      FROM "bookfair_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC LIMIT 10
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("customerName"), ''), 'Unnamed Customer') AS customer_name, (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total
      FROM "bookfair_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC LIMIT 10
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("binding"), ''), 'Unknown Binding') AS binding, (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total, (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0))::int AS qty
      FROM "bookfair_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM("type"), ''), 'Unknown Type') AS type, (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total
      FROM "bookfair_offline_sales" ${whereClause}
      GROUP BY 1 ORDER BY total DESC
    `),
      prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        EXTRACT(MONTH FROM "date")::int AS month,
        (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount"
                          WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty"
                          ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount"
                          WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty"
                          ELSE 0 END), 0))::float AS total,
        COUNT(*)::int AS txn_count
      FROM "bookfair_offline_sales"
      WHERE "date" IS NOT NULL
        AND "date" >= ${yearStart}
        AND "date" <= ${now}
        AND ("amount" IS NULL OR "amount" >= 0)
        AND ("title" IS NULL OR "title" !~* '^E-')
      GROUP BY 1
      ORDER BY 1
    `),
    ]);

    const result: any = {
      ok: true,
      timeSeries: timeSeriesRows.map(r => ({ date: r.day, total: round2(Number(r.total)), qty: Number(r.qty) || 0 })),
      topItems: topItemsRows.map(r => ({ title: r.title, total: round2(Number(r.total)), qty: r.qty, rate: round2(Number(r.rate)) })),
      topItemsByQty: topItemsRowsByQty.map(r => ({ title: r.title, total: round2(Number(r.total)), qty: r.qty, rate: round2(Number(r.rate)) })),
    };

    result.bottomItems = bottomItemsRows.map(r => ({ title: r.title, total: round2(Number(r.total)), qty: r.qty, rate: round2(Number(r.rate)) }));
    result.revenueByState = revenueByStateRows.map(r => ({ state: r.state, total: round2(Number(r.total)) }));
    result.revenueByCity = revenueByCityRows.map(r => ({ city: r.city, state: r.state, total: round2(Number(r.total)) }));
    result.revenueByPublisher = revenueByPubRows.map(r => ({ publisher: r.publisher, total: round2(Number(r.total)) }));
    result.topCustomers = topCustomerRows.map(r => ({ customerName: r.customer_name, total: round2(Number(r.total)) }));
    result.revenueByBinding = revenueByBindingRows.map(r => ({ binding: r.binding, total: round2(Number(r.total)), qty: Number(r.qty) || 0 }));
    result.revenueByType = revenueByTypeRows.map(r => ({ type: r.type, total: round2(Number(r.total)) }));

    // --- Projection Logic (Indian Financial Year) — month-wise weighted ---
    const getRelativeMonth = (calMonth: number) => (calMonth >= 4) ? (calMonth - 3) : (calMonth + 9);

    // Split into complete months vs current month
    const completeMonths = monthlyRows.filter((r: any) => getRelativeMonth(Number(r.month)) < currentMonth);
    const currentMonthRow = monthlyRows.find((r: any) => getRelativeMonth(Number(r.month)) === currentMonth);

    // Days elapsed in current month and total days in current month
    const daysInCurrentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).getUTCDate();
    const daysElapsedInCurrentMonth = Math.max(1, now.getDate());
    const currentMonthActual = currentMonthRow ? decToNumber(currentMonthRow.total) : 0;
    const currentMonthProjected = (currentMonthActual / daysElapsedInCurrentMonth) * daysInCurrentMonth;

    // Weighted average of up to last 3 complete months (newest = highest weight)
    const recentComplete = completeMonths
      .map((r: any) => ({ ...r, relMonth: getRelativeMonth(Number(r.month)) }))
      .sort((a: any, b: any) => a.relMonth - b.relMonth)
      .slice(-3);

    let weightedMonthlyAvg: number;
    if (recentComplete.length > 0) {
      const weights = recentComplete.map((_, i) => i + 1); // 1,2,3
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      weightedMonthlyAvg = recentComplete.reduce(
        (acc: number, m: any, i: number) => acc + Number(m.total) * (weights[i] ?? 1), 0
      ) / totalWeight;
    } else {
      weightedMonthlyAvg = currentMonthProjected;
    }

    const MONTH_NAMES = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

    // Build full year monthly breakdown (Apr–Mar)
    const monthlyBreakdown = Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1; // 1-indexed relative month (1 = April, 12 = March)
      const isComplete = m < currentMonth;
      const isCurrent  = m === currentMonth;
      
      const calMonth = (m + 2) % 12 + 1;
      const row = monthlyRows.find((r: any) => Number(r.month) === calMonth);

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
    const remainingDays = Math.ceil((yearEnd.getTime() - now.getTime()) / 86400000);
    const projectedRemaining = round2((currentMonthProjected - currentMonthActual) + (12 - currentMonth) * weightedMonthlyAvg);
    const totalProjected = round2(totalSoFar + projectedRemaining);

    const yearLabel = `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;

    result.projection = {
      year: yearLabel,
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
    console.error("bookfair_summary_failed", e);
    return res.status(500).json({ ok: false, error: "Summary failed" });
  }
});

// GET /api/bookfair-offline-sales/counts
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
    fictionType: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const { days, startDate, endDate, state, city, publisher, author, isbn, customerName, binding, title, type, q } = parsed.data;

  const start = startDate ? new Date(startDate) : (days ? new Date(Date.now() - days * 86400000) : null);
  if (start) start.setUTCHours(0,0,0,0);

  try {
    const conditions: any[] = [Prisma.sql`TRUE`];
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

    { const fc = fictionSql(parseFictionParam(parsed.data.fictionType)); if (fc) conditions.push(fc); }
    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const [[agg], [topBindingRow]] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          COUNT(*)::bigint AS count,
          COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)::float AS gross_amount,
          COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0)::float AS in_amount,
          COALESCE(SUM("qty"), 0)::bigint AS gross_qty,
          COALESCE(SUM("inQty"), 0)::bigint AS in_qty,
          COUNT(CASE WHEN "inQty" > 0 OR "inAmount" > 0 THEN 1 END)::bigint AS refund_count,
          COUNT(DISTINCT NULLIF(TRIM(LOWER("customerName")), ''))::bigint AS unique_customers
        FROM "bookfair_offline_sales"
        ${whereClause}
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT TRIM("binding") AS top_binding
        FROM "bookfair_offline_sales"
        ${whereClause}
        AND "binding" IS NOT NULL AND TRIM("binding") != ''
        GROUP BY 1
        ORDER BY COUNT(*) DESC
        LIMIT 1
      `),
    ]);
  
    return res.json({
      ok: true,
      totalCount: Number(agg?.count ?? 0),
      totalAmount: round2(Number(agg?.gross_amount ?? 0) - Number(agg?.in_amount ?? 0)),
      grossAmount: round2(Number(agg?.gross_amount ?? 0)),
      inAmount: round2(Number(agg?.in_amount ?? 0)),
      grossQty: Number(agg?.gross_qty ?? 0),
      inQty: Number(agg?.in_qty ?? 0),
      uniqueCustomers: Number(agg?.unique_customers ?? 0),
      refundCount: Number(agg?.refund_count ?? 0),
      topBinding: topBindingRow?.top_binding ?? 'N/A'
    });
  } catch (e: any) {
    console.error("bookfair_counts_failed", e);
    return res.status(500).json({ ok: false, error: "Counts failed" });
  }
});

// GET /api/bookfair-offline-sales/options
router.get("/options", async (req, res) => {
  try {
    const [titles, customers, publishers, authors, states, cities, bindings, types] = await Promise.all([
      prisma.bookFairOfflineSale.findMany({ select: { title: true }, distinct: ['title'], take: 10000 }),
      prisma.bookFairOfflineSale.findMany({ select: { customerName: true }, distinct: ['customerName'], take: 10000 }),
      prisma.bookFairOfflineSale.findMany({ select: { publisher: true }, distinct: ['publisher'], take: 5000 }),
      prisma.bookFairOfflineSale.findMany({ select: { author: true }, distinct: ['author'], take: 5000 }),
      prisma.bookFairOfflineSale.findMany({ select: { state: true }, distinct: ['state'], take: 100 }),
      prisma.bookFairOfflineSale.findMany({ select: { city: true }, distinct: ['city'], take: 1000 }),
      prisma.bookFairOfflineSale.findMany({ select: { binding: true }, distinct: ['binding'], take: 100 }),
      prisma.bookFairOfflineSale.findMany({ select: { type: true }, distinct: ['type'], take: 100 }),
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

// GET /api/bookfair-offline-sales/daily-details
router.get("/daily-details", async (req, res) => {
  const Q = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/).optional(),
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).default("50"),
    offset: z.string().regex(/^\d+$/).transform(Number).default("0"),
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
    fictionType: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query parameters" });
  
  const { date, days, limit, offset, startDate, endDate, state, city, publisher, author, isbn, customerName, minAmount, maxAmount, binding, title, type, q } = parsed.data;

  try {
    const conditions: any[] = [Prisma.sql`TRUE`];

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
       conditions.push(Prisma.sql`"title" ~* ${toTokenRegex(title)}`);
    }
    if (minAmount != null) conditions.push(Prisma.sql`"amount" >= ${minAmount}`);
    if (maxAmount != null) conditions.push(Prisma.sql`"amount" <= ${maxAmount}`);

    { const fc = fictionSql(parseFictionParam(parsed.data.fictionType)); if (fc) conditions.push(fc); }
    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const details = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") ELSE '[No Title]' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
        (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total,
        (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0))::int AS qty,
        COALESCE(MAX("publisher"), 'N/A') AS publisher,
        COALESCE(MAX("author"), 'N/A') AS author,
        COALESCE(MAX("rate"), 0)::float AS rate
      FROM "bookfair_offline_sales"
      ${whereClause}
      GROUP BY 1
      ORDER BY total DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countRes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(DISTINCT (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") ELSE '[No Title]' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', ''))::int AS total_count
      FROM "bookfair_offline_sales"
      ${whereClause}
    `);

    return res.json({
      ok: true,
      items: details.map(r => ({
        title: r.title,
        total: round2(r.total),
        qty: r.qty,
        publisher: r.publisher,
        author: r.author,
        rate: r.rate > 0 ? round2(r.rate) : round2(r.total / (r.qty || 1))
      })),
      totalCount: countRes[0]?.total_count ?? 0
    });
  } catch (e: any) {
    console.error("bookfair_daily_details_failed", e);
    return res.status(500).json({ ok: false, error: "Daily details failed" });
  }
});

// GET /api/bookfair-offline-sales/sub-fairs
// Each individual book fair (Exhibition, World, Raipur…) is encoded in the "type"
// column as "Book Fair - <Name>". Live tables currently carry a single generic
// "Book Fair" type, so the per-fair breakdown is sourced from the archived
// FY history (offline_sales_history, channel = 'BookFair'), where these
// sub-types actually exist. Promotes each sub-type to a first-class category.
router.get("/sub-fairs", async (req, res) => {
  const Q = z.object({
    fy: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    source: z.enum(["live", "history"]).optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const fy = parsed.data.fy ?? latestArchiveFy();
  const source: FairSource = parsed.data.source ?? "history";
  const { table, scope } = bookfairScope(source, fy);

  const cacheKey = `sub-fairs:${source}:${fy}`;
  const cached = optionsCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        COALESCE(NULLIF(TRIM("type"), ''), 'Book Fair - Unknown') AS type,
        (COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))::float AS total,
        (COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0))::int AS qty,
        COUNT(*)::int AS txns
      FROM ${table}
      WHERE ${scope}
      GROUP BY 1
      ORDER BY total DESC
    `);

    const subFairs = rows.map(r => ({
      type: r.type,                                                  // full value, e.g. "Book Fair - Exhibition"
      label: String(r.type).replace(/^book\s*fair\s*-\s*/i, '').trim() || r.type, // "Exhibition"
      total: round2(Number(r.total)),
      qty: Number(r.qty) || 0,
      txns: Number(r.txns) || 0,
    }));

    const result = {
      ok: true,
      fy,
      source,
      grandTotal: round2(subFairs.reduce((a, s) => a + s.total, 0)),
      grandQty: subFairs.reduce((a, s) => a + s.qty, 0),
      subFairs,
    };
    optionsCache.set(cacheKey, result);
    return res.json(result);
  } catch (e: any) {
    console.error("bookfair_sub_fairs_failed", e);
    return res.status(500).json({ ok: false, error: "Sub-fairs breakdown failed" });
  }
});

// GET /api/bookfair-offline-sales/sub-fair-details?fy=2025-26&type=Book Fair - Exhibition
// Full drill-down analytics for ONE individual book fair (archived FY history).
router.get("/sub-fair-details", async (req, res) => {
  const Q = z.object({
    fy: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    type: z.string().min(1),
    source: z.enum(["live", "history"]).optional(),
  });
  const parsed = Q.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: "Invalid query" });
  const fy = parsed.data.fy ?? latestArchiveFy();
  const type = parsed.data.type;
  const source: FairSource = parsed.data.source ?? "history";
  const { table, scope } = bookfairScope(source, fy);

  const cacheKey = `sub-fair-details:${source}:${fy}:${type}`;
  const cached = summaryCache.get(cacheKey);
  if (cached) return res.json(cached);

  // Net revenue / qty expressions (OUT − IN), reused across every aggregation below.
  const netRev = Prisma.sql`(COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" WHEN "rate" IS NOT NULL AND "qty" IS NOT NULL THEN "rate" * "qty" ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" WHEN "rate" IS NOT NULL AND "inQty" IS NOT NULL THEN "rate" * "inQty" ELSE 0 END), 0))`;
  const netQty = Prisma.sql`(COALESCE(SUM("qty"), 0) - COALESCE(SUM("inQty"), 0))`;
  const base = Prisma.sql`FROM ${table} WHERE ${scope} AND "type" = ${type}`;
  const itemBase = Prisma.sql`${base} AND ("title" IS NULL OR "title" !~* '^E-')`;

  try {
    const [
      countRows,
      monthlyRows,
      topItemsRows,
      topItemsQtyRows,
      topPublisherRows,
      topAuthorRows,
      topStateRows,
      topCityRows,
      fictionRows,
    ] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          COUNT(*)::int AS txns,
          ${netRev}::float AS total,
          ${netQty}::int AS qty,
          COALESCE(SUM(CASE WHEN "amount" IS NOT NULL AND "amount" > 0 THEN "amount" ELSE 0 END), 0)::float AS gross,
          COALESCE(SUM(CASE WHEN "inAmount" IS NOT NULL AND "inAmount" > 0 THEN "inAmount" ELSE 0 END), 0)::float AS returns,
          COUNT(CASE WHEN "inQty" > 0 OR "inAmount" > 0 THEN 1 END)::int AS refund_count,
          COUNT(DISTINCT NULLIF(TRIM(LOWER("customerName")), ''))::int AS unique_customers,
          COUNT(DISTINCT NULLIF(TRIM("title"), ''))::int AS unique_titles
        ${base}
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT EXTRACT(MONTH FROM "date")::int AS month, ${netRev}::float AS total, ${netQty}::int AS qty
        ${base} AND "date" IS NOT NULL
        GROUP BY 1 ORDER BY 1
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") ELSE '[No Title]' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
          ${netRev}::float AS total, ${netQty}::int AS qty
        ${itemBase}
        GROUP BY 1 HAVING ${netRev} > 0 ORDER BY total DESC LIMIT 10
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          (CASE WHEN TRIM("title") IS NOT NULL AND TRIM("title") != '' THEN TRIM("title") ELSE '[No Title]' END) || COALESCE(' (' || NULLIF(TRIM("binding"), '') || ')', '') AS title,
          ${netRev}::float AS total, ${netQty}::int AS qty
        ${itemBase}
        GROUP BY 1 HAVING ${netQty} > 0 ORDER BY qty DESC LIMIT 10
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(TRIM("publisher"), ''), 'Unknown Publisher') AS publisher, ${netRev}::float AS total
        ${base} GROUP BY 1 ORDER BY total DESC LIMIT 8
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(TRIM("author"), ''), 'Unknown Author') AS author, ${netRev}::float AS total, ${netQty}::int AS qty
        ${base} GROUP BY 1 ORDER BY total DESC LIMIT 8
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(TRIM("state"), ''), 'Unknown State') AS state, ${netRev}::float AS total
        ${base} GROUP BY 1 ORDER BY total DESC LIMIT 8
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT COALESCE(NULLIF(TRIM("city"), ''), 'Unknown City') AS city, ${netRev}::float AS total
        ${base} GROUP BY 1 ORDER BY total DESC LIMIT 8
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT ${fictionBucketSql} AS fiction_type, ${netRev}::float AS total, ${netQty}::int AS qty
        ${base} GROUP BY 1 ORDER BY total DESC
      `),
    ]);

    const c = countRows[0] ?? {};
    const net = Number(c.total) || 0;
    const qty = Number(c.qty) || 0;

    // Re-base calendar months onto the Indian FY (Apr = index 0 … Mar = 11).
    const MONTH_NAMES = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
    const monthly = MONTH_NAMES.map((name, idx) => ({ month: name, total: 0, qty: 0 }));
    for (const r of monthlyRows) {
      const cal = Number(r.month);             // 1-12
      const fyIdx = cal >= 4 ? cal - 4 : cal + 8;
      if (fyIdx >= 0 && fyIdx < 12) {
        monthly[fyIdx]!.total = round2(Number(r.total));
        monthly[fyIdx]!.qty = Number(r.qty) || 0;
      }
    }

    const result = {
      ok: true,
      fy,
      type,
      label: String(type).replace(/^book\s*fair\s*-\s*/i, '').trim() || type,
      kpis: {
        total: round2(net),
        qty,
        txns: Number(c.txns) || 0,
        gross: round2(Number(c.gross) || 0),
        returns: round2(Number(c.returns) || 0),
        refundCount: Number(c.refund_count) || 0,
        uniqueCustomers: Number(c.unique_customers) || 0,
        uniqueTitles: Number(c.unique_titles) || 0,
        avgRate: qty > 0 ? round2(net / qty) : 0,
      },
      monthly,
      topItems: topItemsRows.map(r => ({ title: r.title, total: round2(Number(r.total)), qty: Number(r.qty) || 0 })),
      topItemsByQty: topItemsQtyRows.map(r => ({ title: r.title, total: round2(Number(r.total)), qty: Number(r.qty) || 0 })),
      topPublishers: topPublisherRows.map(r => ({ publisher: r.publisher, total: round2(Number(r.total)) })),
      topAuthors: topAuthorRows.map(r => ({ author: r.author, total: round2(Number(r.total)), qty: Number(r.qty) || 0 })),
      topStates: topStateRows.map(r => ({ state: r.state, total: round2(Number(r.total)) })),
      topCities: topCityRows.map(r => ({ city: r.city, total: round2(Number(r.total)) })),
      fictionSplit: fictionRows.map(r => ({ fictionType: r.fiction_type, total: round2(Number(r.total)), qty: Number(r.qty) || 0 })),
    };

    summaryCache.set(cacheKey, result);
    return res.json(result);
  } catch (e: any) {
    console.error("bookfair_sub_fair_details_failed", e);
    return res.status(500).json({ ok: false, error: "Sub-fair details failed" });
  }
});

router.get("/sync", async (req, res) => {
  try {
    const result = await offlineSyncService.syncBookFairSales();
    clearCaches();
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
