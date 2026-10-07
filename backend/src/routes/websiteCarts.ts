/**
 * Website abandoned-carts API.
 *
 * Same shape as the website-orders proxy: guarded by the dashboard's own auth, the
 * upstream credential stays server-side, and the wide upstream payload is flattened
 * once in the service. The service keeps the full cart set in memory, so filtering
 * and analytics are computed here rather than upstream.
 */

import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/authPrisma.js";
import { WebsiteApiError } from "../config/websiteApi.js";
import {
  AGE_KEYS,
  fetchCarts,
  fetchCartsConversion,
  fetchCartsSummary,
  type AgeBucketKey,
  type CartFilters,
  type CartSort,
  type ContactFilter,
  type StockFilter,
} from "../services/websiteCartsService.js";

const router = Router();

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asPositiveInt(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(n)));
}

function asNumber(value: unknown): number | undefined {
  const raw = asString(value);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function asList(value: unknown): string[] | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  const items = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  return items.length ? items : undefined;
}

function asOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  const raw = asString(value);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

function readFilters(req: AuthRequest): CartFilters {
  const q = req.query;
  const ages = asList(q.ages)?.filter((a): a is AgeBucketKey => (AGE_KEYS as readonly string[]).includes(a));
  return {
    page: asPositiveInt(q.page, 1, 100_000),
    pageSize: asPositiveInt(q.pageSize, 20, 5000),
    search: asString(q.search),
    product: asString(q.product),
    dateFrom: asString(q.dateFrom),
    dateTo: asString(q.dateTo),
    ages: ages?.length ? ages : undefined,
    minValue: asNumber(q.minValue),
    maxValue: asNumber(q.maxValue),
    minItems: asNumber(q.minItems),
    maxItems: asNumber(q.maxItems),
    groups: asList(q.groups)?.map((g) => g.toUpperCase()),
    contact: asOneOf<ContactFilter>(q.contact, ["reachable", "phone", "email", "unreachable"]),
    stock: asOneOf<StockFilter>(q.stock, ["issues", "clean"]),
    hasDiscount: q.hasDiscount === "true" ? true : undefined,
    sort: asOneOf<CartSort>(q.sort, ["recent", "oldest", "value", "value_asc", "items"]),
    refresh: q.refresh === "true" ? true : undefined,
  };
}

async function respond(res: Response, work: () => Promise<unknown>): Promise<void> {
  try {
    res.status(200).json({ success: true, data: await work() });
  } catch (error) {
    if (error instanceof WebsiteApiError) {
      console.error(`[website-carts] ${error.message}`);
      res.status(error.status).json({ success: false, error: error.message });
      return;
    }
    console.error("[website-carts] unexpected failure:", error);
    res.status(500).json({ success: false, error: "Failed to load abandoned carts." });
  }
}

/** GET /api/website-carts — filtered, sorted, paginated carts */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const filters = readFilters(req);
  await respond(res, () => fetchCarts(filters));
});

/** GET /api/website-carts/summary — analytics for the filtered set */
router.get("/summary", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { page: _page, pageSize: _pageSize, ...filters } = readFilters(req);
  await respond(res, () => fetchCartsSummary(filters));
});

/**
 * GET /api/website-carts/conversion — how many cart owners went on to order.
 * Slow on a cold cache (it pages through recent orders), so it is its own endpoint.
 */
router.get("/conversion", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { page: _page, pageSize: _pageSize, ...filters } = readFilters(req);
  await respond(res, () => fetchCartsConversion(filters));
});

export default router;
