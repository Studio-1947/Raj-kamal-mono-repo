/**
 * Website orders API.
 *
 * Proxies the bookstore admin API behind our own auth so the upstream credential
 * never reaches the browser, the frontend stays same-origin (no CORS), and the wide
 * upstream payload gets normalised once here instead of in every component.
 *
 * Routes are guarded by the dashboard's own `authenticateToken` — a dashboard user
 * signs in as themselves; the website credential is a server-side detail.
 */

import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/authPrisma.js";
import { WebsiteApiError, getWebsiteApiHealth } from "../config/websiteApi.js";
import {
  fetchOrders,
  fetchOrderById,
  fetchOrdersSummary,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderFilters,
} from "../services/websiteOrdersService.js";

const router = Router();

/**
 * Short-lived response cache. Orders change constantly, so this is only here to
 * absorb the burst of identical requests a dashboard makes when a user flips a
 * filter back and forth — 60s, not a real caching layer. It's per-process, so on
 * serverless it simply never hits; that's fine, it's an optimisation not a
 * correctness mechanism.
 */
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 100;
const cache = new Map<string, { at: number; payload: unknown }>();

function cacheGet(key: string): unknown | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.payload;
}

function cacheSet(key: string, payload: unknown): void {
  // Map preserves insertion order, so the first key is the oldest.
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), payload });
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asPositiveInt(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(n)));
}

/** Accept a comma-separated set while silently dropping unknown enum values. */
function asEnums(value: unknown, allowed: readonly string[]): string[] | undefined {
  const raw = asString(value);
  if (!raw || raw.toUpperCase() === "ALL") return undefined;
  const values = [...new Set(raw.split(",").map((item) => item.trim().toUpperCase()))].filter(
    (item) => allowed.includes(item),
  );
  return values.length > 0 ? values : undefined;
}

function readFilters(req: AuthRequest): OrderFilters {
  const q = req.query;
  return {
    page: asPositiveInt(q.page, 1, 100_000),
    pageSize: asPositiveInt(q.pageSize, 20, 100),
    status: asEnums(q.status, ORDER_STATUSES),
    paymentStatus: asEnums(q.paymentStatus, PAYMENT_STATUSES),
    channel: asString(q.channel)?.toUpperCase(),
    search: asString(q.search),
    dateFrom: asString(q.dateFrom),
    dateTo: asString(q.dateTo),
  };
}

/**
 * One handler shape for every route: run the work, cache the success, and translate
 * a WebsiteApiError into the status it already decided on (503 unconfigured, 504
 * timeout, 502 upstream fault) instead of a blanket 500.
 */
async function respond(
  res: Response,
  cacheKey: string,
  work: () => Promise<unknown>,
): Promise<void> {
  try {
    const cached = cacheGet(cacheKey);
    if (cached !== undefined) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json({ success: true, data: cached, cached: true });
      return;
    }

    const data = await work();
    cacheSet(cacheKey, data);
    res.setHeader("X-Cache", "MISS");
    res.status(200).json({ success: true, data, cached: false });
  } catch (error) {
    if (error instanceof WebsiteApiError) {
      console.error(`[website-orders] ${error.message}`);
      res.status(error.status).json({ success: false, error: error.message });
      return;
    }
    console.error("[website-orders] unexpected failure:", error);
    res.status(500).json({ success: false, error: "Failed to load website orders." });
  }
}

/**
 * @swagger
 * tags:
 *   name: WebsiteOrders
 *   description: Orders placed on the rajkamalprakashan.com website
 */

/**
 * @swagger
 * /api/website-orders:
 *   get:
 *     summary: Paginated list of website orders
 *     tags: [WebsiteOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated values, or ALL
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *         description: Comma-separated values, or ALL
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches order number, customer name, email or phone
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Normalised page of orders with pagination meta }
 *       503: { description: Website API credentials are not configured }
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const filters = readFilters(req);
  await respond(res, `list:${JSON.stringify(filters)}`, () => fetchOrders(filters));
});

/**
 * @swagger
 * /api/website-orders/summary:
 *   get:
 *     summary: Aggregated KPIs for the filtered order range
 *     description: >
 *       The upstream API has no stats endpoint, so this pages through the filtered
 *       range server-side. Ranges past 3000 orders come back with `truncated: true`.
 *     tags: [WebsiteOrders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Totals, per-status/payment breakdowns, daily series, top products and states }
 */
// Registered before `/:id` so "summary" isn't swallowed as an order id.
router.get("/summary", authenticateToken, async (req: AuthRequest, res: Response) => {
  // page/pageSize are meaningless for an aggregate and would only fragment the cache.
  const { page: _page, pageSize: _pageSize, ...filters } = readFilters(req);
  await respond(res, `summary:${JSON.stringify(filters)}`, () => fetchOrdersSummary(filters));
});

/**
 * @swagger
 * /api/website-orders/health:
 *   get:
 *     summary: Whether the website API connection is configured and live
 *     tags: [WebsiteOrders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Configuration mode, base URL and cached token expiry }
 */
router.get("/health", authenticateToken, (_req: AuthRequest, res: Response) => {
  res.status(200).json({ success: true, data: getWebsiteApiHealth() });
});

/**
 * @swagger
 * /api/website-orders/{id}:
 *   get:
 *     summary: A single website order
 *     tags: [WebsiteOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The normalised order }
 *       404: { description: Order not found }
 */
router.get("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  await respond(res, `order:${id}`, () => fetchOrderById(id));
});

export default router;
