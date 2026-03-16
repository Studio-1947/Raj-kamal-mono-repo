import express from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.js";
import { offlineSyncService } from "./offlineSyncService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: OfflineSales
 *   description: Google Sheets offline sales data management
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
 *     tags: [OfflineSales]
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
 *         description: Search query for title or customer name
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
      .default("200")
      .pipe(z.number().min(1).max(5000)),
    cursorId: z.string().regex(/^\d+$/).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse({
    limit: req.query.limit ?? "200",
    cursorId: req.query.cursorId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    q: req.query.q,
  });
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid query" });
  const { limit, cursorId, startDate, endDate, q } = parsed.data;

  try {
    const where: any = {};
    if (q) {
      const contains = q.toString();
      where.OR = [
        { title: { contains, mode: "insensitive" } },
        { customerName: { contains, mode: "insensitive" } },
      ];
    }

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
    return res.json({ ok: true, items: data, nextCursorId: last?.id ?? null });
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
 *     tags: [OfflineSales]
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
 *     responses:
 *       200:
 *         description: Sales summary data
 */
// GET /api/offline-sales/summary
router.get("/summary", async (req, res) => {
  const Q = z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  });
  const parsed = Q.safeParse({
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
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

  try {
    const since = startDate ?? new Date(Date.now() - days * 86400000);

    const rows = await prisma.googleSheetOfflineSale.findMany({
      select: {
        date: true,
        amount: true,
        qty: true,
        rate: true,
        title: true,
        rawJson: true,
      },
      take: 100000,
    });

    const ts = new Map<string, number>();
    const top = new Map<string, { total: number; qty: number }>();

    for (const r of rows) {
      const d = resolveRowDate(r);
      if (d && d < since) continue;
      if (endDate && d && d > endDate) continue;

      // Calculate amount
      let amt = decToNumber(r.amount);
      if (!amt) {
        const raw = r.rawJson as Record<string, any> | undefined;
        const v = numSafe(
          pick(raw, ["Selling Price", "Amount", "Total", "amount", "BOOKRATE"]),
        );
        if (v != null) amt = v;
        else {
          const rate =
            numSafe(r.rate as any) ||
            numSafe(pick(raw, ["Rate", "BOOKRATE"])) ||
            0;
          const qty = r.qty || numSafe(pick(raw, ["Qty", "OUT"])) || 0;
          amt = rate * qty;
        }
      }

      // Time series - only add if we have a valid date
      if (d) {
        const key = d.toISOString().slice(0, 10);
        ts.set(key, (ts.get(key) || 0) + amt);
      }

      // Top items
      const raw = r.rawJson as Record<string, any> | undefined;
      let title = r.title as string | null | undefined;
      if (!title || (typeof title === "string" && title.trim() === "")) {
        const rawTitle = pick(raw, [
          "Title",
          "title",
          "BookName",
          "Book",
          "book",
          "Product",
          "Item",
        ]);
        title =
          typeof rawTitle === "string" && rawTitle.trim() ? rawTitle : null;
      }
      const tkey =
        title && typeof title === "string" && title.trim()
          ? title.trim()
          : "Untitled Item";
      const cur = top.get(tkey) || { total: 0, qty: 0 };
      cur.total += amt;
      cur.qty += r.qty || numSafe(pick(raw, ["Qty", "OUT"])) || 0;
      top.set(tkey, cur);
    }

    const timeSeries = Array.from(ts.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, total]) => ({ date, total: round2(total) }));

    const topItems = Array.from(top.entries())
      .filter(([_, v]) => v && (v.total > 0 || v.qty > 0))
      .map(([title, v]) => ({
        title: title || "Untitled",
        total: round2(v.total || 0),
        qty: v.qty || 0,
      }))
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 10);

    return res.json({ ok: true, timeSeries, topItems });
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
 *     tags: [OfflineSales]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
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
 *     responses:
 *       200:
 *         description: Aggregate sales metrics
 */
// GET /api/offline-sales/counts
router.get("/counts", async (req, res) => {
  const Q = z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  });
  const parsed = Q.safeParse({
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
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

  try {
    const items = await prisma.googleSheetOfflineSale.findMany({
      select: {
        amount: true,
        qty: true,
        rate: true,
        rawJson: true,
        customerName: true,
        date: true,
        title: true,
      },
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

      // If date filters are provided and we have a date, apply the filter
      // If no date on record, include it (don't filter out)
      if (start && d && d < start) continue;
      if (end && d && d > end) continue;

      count++;

      // Calculate amount from available fields
      let amt = decToNumber(r.amount);
      if (!amt) {
        const raw = r.rawJson as Record<string, any> | undefined;
        const v = numSafe(
          pick(raw, ["Selling Price", "Amount", "Total", "amount", "BOOKRATE"]),
        );
        if (v != null) amt = v;
        else {
          const rate =
            numSafe(r.rate as any) ||
            numSafe(pick(raw, ["Rate", "BOOKRATE"])) ||
            0;
          const qty = r.qty || numSafe(pick(raw, ["Qty", "OUT"])) || 0;
          amt = rate * qty;
        }
      }
      totalAmount += amt;

      const st = String(
        pick(r.rawJson as any, ["Order Status", "Status"]) || "",
      ).toLowerCase();
      if (st && st.toLowerCase() === "refunded") refundCount++;

      const name = (r.customerName || "").trim().toLowerCase();
      const raw = r.rawJson as Record<string, any> | undefined;
      const email = normalizeText(pick(raw, ["Email", "email"])) || "";
      const mobile = normalizeText(pick(raw, ["Mobile", "mobile", "Phone", "phone"])) || "";
      const key = [email || null, mobile || null, name || null]
        .filter(Boolean)
        .join("|");
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
    console.error("offline_sales_counts_failed", e);
    return res.status(500).json({ ok: false, error: "Failed to fetch counts" });
  }
});

/**
 * @swagger
 * /api/offline-sales/push:
 *   post:
 *     summary: Push new sales data from Google Sheets
 *     tags: [OfflineSales]
 *     security: []
 *     parameters:
 *       - in: header
 *         name: x-sync-token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: array
 *                   items: {}
 *     responses:
 *       200:
 *         description: Data processed successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid data format
 */
// POST /api/offline-sales/push
// Accepts { data: any[][] }
router.post("/push", async (req, res) => {
  const token = req.headers["x-sync-token"];
  const expectedToken = process.env.GOOGLE_SYNC_TOKEN || "rk_default_token_2026";

  if (!token || token !== expectedToken) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const { data } = req.body;
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ ok: false, error: "Invalid data format. Expected { data: any[][] }" });
  }

  try {
    const result = await offlineSyncService.processData(data);
    return res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("offline_push_failed", e);
    return res.status(500).json({ ok: false, error: e.message || "Push processing failed" });
  }
});

export default router;
