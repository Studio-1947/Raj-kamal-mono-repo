/**
 * Website abandoned-carts API.
 *
 * Same shape as the website-orders proxy: guarded by the dashboard's own auth, the
 * upstream credential stays server-side, and the wide upstream payload is flattened
 * once in the service. The service keeps the full cart set in memory, so filtering
 * and analytics are computed here rather than upstream.
 *
 * Outreach notes (who contacted which cart, and what came of it) live in OUR
 * database — upstream knows nothing about them — and are joined onto the carts here.
 */

import { Router, Response } from "express";
import { randomUUID } from "crypto";
import { authenticateToken, AuthRequest } from "../middleware/authPrisma.js";
import { prisma } from "../lib/prisma.js";
import { WebsiteApiError } from "../config/websiteApi.js";
import {
  AGE_KEYS,
  OUTREACH_STATUSES,
  fetchCarts,
  fetchCartsConversion,
  fetchCartsSummary,
  type AgeBucketKey,
  type CartFilters,
  type CartSort,
  type ContactFilter,
  type OutreachInfo,
  type StockFilter,
} from "../services/websiteCartsService.js";

const router = Router();

const CHANNELS = ["WHATSAPP", "CALL", "EMAIL", "OTHER"] as const;
const MAX_NOTE_LENGTH = 500;

// ---------------------------------------------------------------------------
// Outreach storage (raw SQL, self-creating table — same approach as filter-locks, so
// it works before migrations / `prisma generate` have run on a given server)
// ---------------------------------------------------------------------------

let outreachTableReady = false;

async function ensureOutreachTable(): Promise<void> {
  if (outreachTableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "cart_outreach" (
      "id" TEXT NOT NULL,
      "cartId" TEXT NOT NULL,
      "customerId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'CONTACTED',
      "channel" TEXT,
      "note" TEXT,
      "contactedById" TEXT,
      "contactedByName" TEXT,
      "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "cart_outreach_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "cart_outreach_cartId_key" ON "cart_outreach"("cartId");`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "cart_outreach_status_idx" ON "cart_outreach"("status");`,
  );
  outreachTableReady = true;
}

type OutreachRow = {
  cartId: string;
  status: string;
  channel: string | null;
  note: string | null;
  contactedAt: Date;
  contactedByName: string | null;
};

/** Every logged cart. The set is tiny (one row per contacted cart), so load it whole. */
async function loadOutreachMap(): Promise<Map<string, OutreachInfo>> {
  const map = new Map<string, OutreachInfo>();
  try {
    await ensureOutreachTable();
    const rows = await prisma.$queryRaw<OutreachRow[]>`
      SELECT "cartId", "status", "channel", "note", "contactedAt", "contactedByName" FROM "cart_outreach"
    `;
    for (const r of rows) {
      map.set(r.cartId, {
        status: r.status,
        channel: r.channel,
        note: r.note,
        contactedAt: new Date(r.contactedAt).toISOString(),
        contactedByName: r.contactedByName,
      });
    }
  } catch (error: any) {
    // Cart analytics must keep working if our own DB is unreachable.
    console.error("[website-carts] could not load outreach notes:", error?.message ?? error);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

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
  const outreach = asString(q.outreach);
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
    includeOrdered: q.includeOrdered === "true" ? true : undefined,
    outreach:
      outreach === "none" || outreach === "any" || (OUTREACH_STATUSES as readonly string[]).includes(outreach ?? "")
        ? outreach
        : undefined,
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

/** Filters plus the outreach notes, loaded fresh so a just-logged contact shows up at once. */
async function withOutreach(filters: CartFilters): Promise<CartFilters> {
  return { ...filters, outreachMap: await loadOutreachMap() };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET /api/website-carts — filtered, sorted, paginated carts */
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const filters = readFilters(req);
  await respond(res, async () => fetchCarts(await withOutreach(filters)));
});

/** GET /api/website-carts/summary — analytics for the filtered set */
router.get("/summary", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { page: _page, pageSize: _pageSize, ...filters } = readFilters(req);
  await respond(res, async () => fetchCartsSummary(await withOutreach(filters)));
});

/**
 * GET /api/website-carts/conversion — how many cart owners went on to order.
 * Slow on a cold cache (it pages through recent orders), so it is its own endpoint.
 */
router.get("/conversion", authenticateToken, async (req: AuthRequest, res: Response) => {
  const { page: _page, pageSize: _pageSize, ...filters } = readFilters(req);
  await respond(res, async () => fetchCartsConversion(await withOutreach(filters)));
});

/**
 * PUT /api/website-carts/outreach/:cartId — log (or update) contact with a cart's owner.
 * The first call fixes `contactedAt`; later updates change status / note but keep it,
 * so any order placed after first contact is what gets credited to the outreach.
 */
router.put("/outreach/:cartId", authenticateToken, async (req: AuthRequest, res: Response) => {
  const cartId = String(req.params.cartId ?? "").trim();
  if (!cartId || cartId.length > 64) {
    res.status(400).json({ success: false, error: "A valid cart id is required." });
    return;
  }

  const status = asOneOf(req.body?.status, OUTREACH_STATUSES) ?? "CONTACTED";
  const channel = asOneOf(req.body?.channel, CHANNELS) ?? null;
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, MAX_NOTE_LENGTH) : null;
  const customerId = asString(req.body?.customerId) ?? null;

  try {
    await ensureOutreachTable();
    const userId = req.user?.id ?? null;
    const me = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
      : null;
    const who = me?.name || me?.email || req.user?.email || null;
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "cart_outreach"
        ("id", "cartId", "customerId", "status", "channel", "note", "contactedById", "contactedByName", "contactedAt", "updatedAt")
      VALUES
        (${randomUUID()}, ${cartId}, ${customerId}, ${status}, ${channel}, ${note}, ${userId}, ${who}, ${now}, ${now})
      ON CONFLICT ("cartId") DO UPDATE SET
        "status" = EXCLUDED."status",
        "channel" = COALESCE(EXCLUDED."channel", "cart_outreach"."channel"),
        "note" = COALESCE(EXCLUDED."note", "cart_outreach"."note"),
        "contactedById" = EXCLUDED."contactedById",
        "contactedByName" = EXCLUDED."contactedByName",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[website-carts] could not save outreach:", error?.message ?? error);
    res.status(500).json({ success: false, error: "Could not save that note." });
  }
});

/** DELETE /api/website-carts/outreach/:cartId — clear a logged contact (logged by mistake). */
router.delete("/outreach/:cartId", authenticateToken, async (req: AuthRequest, res: Response) => {
  const cartId = String(req.params.cartId ?? "").trim();
  if (!cartId || cartId.length > 64) {
    res.status(400).json({ success: false, error: "A valid cart id is required." });
    return;
  }
  try {
    await ensureOutreachTable();
    await prisma.$executeRaw`DELETE FROM "cart_outreach" WHERE "cartId" = ${cartId}`;
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[website-carts] could not clear outreach:", error?.message ?? error);
    res.status(500).json({ success: false, error: "Could not clear that note." });
  }
});

export default router;
