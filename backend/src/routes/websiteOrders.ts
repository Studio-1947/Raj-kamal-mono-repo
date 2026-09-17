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
import {
  streamOrdersCsv,
  streamOrdersPdf,
  describeFilters,
  exportFilename,
  type CsvGranularity,
} from "../services/websiteOrdersExport.js";

const router = Router();

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
 * GET /api/website-orders
 * Paginated list of website orders
 */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const filters = readFilters(req);
  await respond(res, `list:${JSON.stringify(filters)}`, () => fetchOrders(filters));
});

/**
 * GET /api/website-orders/summary
 * Aggregated KPIs for filtered range
 */
router.get("/summary", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { page: _page, pageSize: _pageSize, ...filters } = readFilters(req);
  await respond(res, `summary:${JSON.stringify(filters)}`, () => fetchOrdersSummary(filters));
});

/**
 * GET /api/website-orders/health
 * Connection status
 */
router.get("/health", authenticateToken, (_req: AuthRequest, res: Response) => {
  res.status(200).json({ success: true, data: getWebsiteApiHealth() });
});

/**
 * GET /api/website-orders/export/csv
 * CSV export with customizable columns
 */
router.get("/export/csv", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page: _p, pageSize: _ps, ...filters } = readFilters(req);
    const granularity: CsvGranularity = req.query.granularity === "items" ? "items" : "orders";
    const rawCols = req.query.columns;
    const selectedColumns = typeof rawCols === "string" && rawCols.trim()
      ? rawCols.split(",").map((c) => c.trim()).filter(Boolean)
      : undefined;

    const filename = exportFilename(filters, granularity === "items" ? "line-items" : "", "csv");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await streamOrdersCsv(filters, granularity, res, selectedColumns);
  } catch (error: any) {
    console.error("[website-orders export/csv] failure:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Failed to export CSV." });
    }
  }
});

/**
 * GET /api/website-orders/export/pdf
 * PDF report export
 */
router.get("/export/pdf", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page: _p, pageSize: _ps, ...filters } = readFilters(req);
    const filterLabel = describeFilters(filters);
    const filename = exportFilename(filters, "report", "pdf");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await streamOrdersPdf({ filters, filterLabel }, res);
  } catch (error: any) {
    console.error("[website-orders export/pdf] failure:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Failed to export PDF." });
    }
  }
});

/**
 * GET /api/website-orders/:id
 * Single order details
 */
router.get("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  await respond(res, `order:${id}`, () => fetchOrderById(id));
});

export default router;
