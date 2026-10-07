/**
 * Website abandoned carts — fetch, normalise, filter and analyse.
 *
 * Upstream `/api/v1/admin/carts` returns every open cart (verified Oct 2026: all carts
 * have `order: null`, so a cart in this list IS an abandoned cart) but only supports
 * page / pageSize / search / dateFrom / dateTo. The whole set is ~1k carts, so rather
 * than proxy each request we pull it once, keep it in memory for a couple of minutes,
 * and do the rest here: value / size / age / stock / reachability filters, sorting,
 * pagination and every analytic. That is what makes custom filters possible at all.
 */

import { websiteApiGet, WebsiteApiError } from "../config/websiteApi.js";

const CARTS_PATH = "/api/v1/admin/carts";
const UPSTREAM_PAGE_SIZE = 100;
/** Safety valve: stop paging upstream past this many carts. */
const MAX_CARTS = 10_000;
const DATASET_TTL_MS = 2 * 60_000;
/** Dashboard users are in India; bucket "time of day" in IST, not server time. */
const IST_OFFSET_MS = 5.5 * 3_600_000;
const MAX_EXPORT_PAGE_SIZE = 5000;

export const AGE_KEYS = ["today", "week", "month", "older"] as const;
export type AgeBucketKey = (typeof AGE_KEYS)[number];
export type ContactFilter = "reachable" | "phone" | "email" | "unreachable";
export type StockFilter = "issues" | "clean";
export type CartSort = "recent" | "oldest" | "value" | "value_asc" | "items";

export type CartFilters = {
  page?: number | undefined;
  pageSize?: number | undefined;
  search?: string | undefined;
  /** Match any book in the cart by title or SKU/ISBN. */
  product?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  ages?: AgeBucketKey[] | undefined;
  minValue?: number | undefined;
  maxValue?: number | undefined;
  minItems?: number | undefined;
  maxItems?: number | undefined;
  groups?: string[] | undefined;
  contact?: ContactFilter | undefined;
  stock?: StockFilter | undefined;
  hasDiscount?: boolean | undefined;
  sort?: CartSort | undefined;
  /** Bypass the in-memory dataset and re-pull from upstream. */
  refresh?: boolean | undefined;
};

export type CartItem = {
  id: string;
  name: string;
  sku: string | null;
  variant: string | null;
  coverImage: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  addedAt: string | null;
  inStock: boolean | null;
};

export type WebsiteCart = {
  id: string;
  currency: string;
  createdAt: string | null;
  /** Last activity on the cart — what "how long has it been abandoned" is measured from. */
  updatedAt: string | null;
  customer: {
    id: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
    group: string | null;
    lastLoginAt: string | null;
  };
  amounts: { subtotal: number; discount: number; tax: number; grandTotal: number };
  itemCount: number;
  totalQuantity: number;
  hasStockIssue: boolean;
  items: CartItem[];
};

export type CartsPage = {
  carts: WebsiteCart[];
  meta: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean };
  /** When the underlying dataset was pulled from upstream. */
  fetchedAt: string;
};

type Bucket = { count: number; value: number };

export type CartsSummary = {
  cartCount: number;
  totalValue: number;
  averageCartValue: number;
  medianCartValue: number;
  totalItems: number;
  uniqueCustomers: number;
  /** Value sitting in carts that have gone quiet for more than a week. */
  staleValue: number;
  /** In-stock, contactable, touched in the last 30 days: the realistic win-back pool. */
  recoverable: Bucket;
  discounted: Bucket & { discountTotal: number };
  stockIssues: Bucket;
  reachability: { both: Bucket; phoneOnly: Bucket; emailOnly: Bucket; none: Bucket };
  byAge: Record<AgeBucketKey, Bucket>;
  byGroup: Record<string, Bucket>;
  valueBands: ({ label: string } & Bucket)[];
  sizeBands: ({ label: string } & Bucket)[];
  daily: { date: string; carts: number; value: number }[];
  byHour: { hour: number; carts: number }[];
  byWeekday: { day: number; label: string; carts: number; value: number }[];
  topProducts: {
    name: string;
    sku: string | null;
    carts: number;
    quantity: number;
    value: number;
    inStock: boolean | null;
  }[];
  topCustomers: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    value: number;
    books: number;
    updatedAt: string | null;
  }[];
};

function money(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function trimmed(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s : null;
}

/**
 * OTP sign-ups get a synthetic `otp-<phone>@otp.rajkamal.local` login and a
 * "Guest User" profile — neither is a real contact detail, so drop them and let the
 * phone number stand as the identity.
 */
function extractCustomer(user: any): WebsiteCart["customer"] {
  const profile = user?.profile ?? {};
  const name = [trimmed(profile.firstName), trimmed(profile.lastName)].filter(Boolean).join(" ");
  const email = trimmed(user?.email);
  const phone = trimmed(user?.phone);
  const code = trimmed(user?.phoneCountryCode);

  return {
    id: trimmed(user?.id),
    name: name && name.toLowerCase() !== "guest user" ? name : null,
    email: email && !email.endsWith("@otp.rajkamal.local") ? email : null,
    phone: phone ? (code ? `${code} ${phone}` : phone) : null,
    group: trimmed(user?.customerGroup),
    lastLoginAt: trimmed(user?.lastLoginAt),
  };
}

function normalizeCart(cart: any): WebsiteCart {
  const rawItems: any[] = Array.isArray(cart?.items) ? cart.items : [];
  const items: CartItem[] = rawItems.map((item) => {
    const quantity = Number(item?.quantity) || 0;
    const unitPrice = money(item?.unitPrice);
    const stock = item?.variant?.stock;
    return {
      id: String(item?.id ?? ""),
      name: trimmed(item?.product?.name) ?? "—",
      sku: trimmed(item?.variant?.sku),
      variant: trimmed(item?.variant?.title),
      coverImage: trimmed(item?.variant?.coverImage),
      quantity,
      unitPrice,
      lineTotal: item?.lineTotal !== undefined ? money(item.lineTotal) : round2(unitPrice * quantity),
      addedAt: trimmed(item?.createdAt),
      inStock: typeof stock === "number" ? stock > 0 : null,
    };
  });

  return {
    id: String(cart?.id ?? ""),
    currency: trimmed(cart?.currency) ?? "INR",
    createdAt: trimmed(cart?.createdAt),
    updatedAt: trimmed(cart?.updatedAt),
    customer: extractCustomer(cart?.user),
    amounts: {
      subtotal: money(cart?.subtotal),
      discount: money(cart?.discountTotal),
      tax: money(cart?.taxTotal),
      grandTotal: money(cart?.grandTotal),
    },
    itemCount: Number(cart?.itemCount) || items.length,
    totalQuantity: Number(cart?.totalQuantity) || items.reduce((s, i) => s + i.quantity, 0),
    hasStockIssue: items.some((i) => i.inStock === false),
    items,
  };
}

// ---------------------------------------------------------------------------
// Dataset: one pull from upstream, shared by every request for a couple of minutes
// ---------------------------------------------------------------------------

let dataset: { at: number; carts: WebsiteCart[] } | null = null;
let inFlight: Promise<{ at: number; carts: WebsiteCart[] }> | null = null;

async function pullAll(): Promise<{ at: number; carts: WebsiteCart[] }> {
  const carts: WebsiteCart[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const body = await websiteApiGet<{ data: any[]; meta: any }>(
      CARTS_PATH,
      new URLSearchParams({ page: String(page), pageSize: String(UPSTREAM_PAGE_SIZE) }),
    );
    if (!Array.isArray(body?.data)) {
      throw new WebsiteApiError("Website API returned an unexpected carts payload.", 502);
    }
    totalPages = Number(body.meta?.totalPages) || 1;
    for (const raw of body.data) {
      if (carts.length >= MAX_CARTS) return { at: Date.now(), carts };
      carts.push(normalizeCart(raw));
    }
    page += 1;
  } while (page <= totalPages);
  return { at: Date.now(), carts };
}

async function loadAll(refresh = false) {
  if (!refresh && dataset && Date.now() - dataset.at < DATASET_TTL_MS) return dataset;
  // Concurrent requests (list + summary fire together) must share one upstream pull.
  inFlight ??= pullAll()
    .then((d) => (dataset = d))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function ageBucket(updatedAt: string | null, now: number): AgeBucketKey {
  if (!updatedAt) return "older";
  const days = (now - new Date(updatedAt).getTime()) / 86_400_000;
  if (days < 1) return "today";
  if (days < 7) return "week";
  if (days < 30) return "month";
  return "older";
}

function bound(value: string | undefined, edge: "from" | "to"): number | null {
  const raw = value?.trim();
  if (!raw) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? edge === "from"
      ? `${raw}T00:00:00.000+05:30`
      : `${raw}T23:59:59.999+05:30`
    : raw;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

function matchesFilters(cart: WebsiteCart, f: CartFilters, now: number, from: number | null, to: number | null): boolean {
  const updated = cart.updatedAt ? new Date(cart.updatedAt).getTime() : null;
  if (from !== null && (updated === null || updated < from)) return false;
  if (to !== null && (updated === null || updated > to)) return false;

  if (f.ages?.length && !f.ages.includes(ageBucket(cart.updatedAt, now))) return false;

  const value = cart.amounts.grandTotal;
  if (f.minValue !== undefined && value < f.minValue) return false;
  if (f.maxValue !== undefined && value > f.maxValue) return false;
  if (f.minItems !== undefined && cart.totalQuantity < f.minItems) return false;
  if (f.maxItems !== undefined && cart.totalQuantity > f.maxItems) return false;

  if (f.groups?.length && !f.groups.includes(cart.customer.group ?? "UNKNOWN")) return false;

  const c = cart.customer;
  if (f.contact === "reachable" && !c.phone && !c.email) return false;
  if (f.contact === "phone" && !c.phone) return false;
  if (f.contact === "email" && !c.email) return false;
  if (f.contact === "unreachable" && (c.phone || c.email)) return false;

  if (f.stock === "issues" && !cart.hasStockIssue) return false;
  if (f.stock === "clean" && cart.hasStockIssue) return false;
  if (f.hasDiscount && cart.amounts.discount <= 0) return false;

  if (f.search) {
    const q = f.search.toLowerCase();
    const qd = digits(f.search);
    const hay = [c.name, c.email].filter(Boolean).join(" ").toLowerCase();
    const phoneHit = qd.length >= 3 && digits(c.phone ?? "").includes(qd);
    if (!hay.includes(q) && !phoneHit) return false;
  }

  if (f.product) {
    const q = f.product.toLowerCase();
    if (!cart.items.some((i) => i.name.toLowerCase().includes(q) || (i.sku ?? "").toLowerCase().includes(q))) {
      return false;
    }
  }
  return true;
}

function sortCarts(carts: WebsiteCart[], sort: CartSort | undefined): WebsiteCart[] {
  const t = (c: WebsiteCart) => (c.updatedAt ? new Date(c.updatedAt).getTime() : 0);
  const sorted = [...carts];
  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => t(a) - t(b));
    case "value":
      return sorted.sort((a, b) => b.amounts.grandTotal - a.amounts.grandTotal);
    case "value_asc":
      return sorted.sort((a, b) => a.amounts.grandTotal - b.amounts.grandTotal);
    case "items":
      return sorted.sort((a, b) => b.totalQuantity - a.totalQuantity);
    default:
      return sorted.sort((a, b) => t(b) - t(a));
  }
}

async function filtered(f: CartFilters) {
  const { at, carts } = await loadAll(f.refresh);
  const now = Date.now();
  const from = bound(f.dateFrom, "from");
  const to = bound(f.dateTo, "to");
  return { at, now, carts: carts.filter((c) => matchesFilters(c, f, now, from, to)) };
}

/** One page of carts matching the filters. */
export async function fetchCarts(f: CartFilters): Promise<CartsPage> {
  const { at, now: _now, carts } = await filtered(f);
  const pageSize = Math.min(MAX_EXPORT_PAGE_SIZE, Math.max(1, Math.trunc(f.pageSize ?? 20)));
  const total = carts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Math.trunc(f.page ?? 1)));
  const slice = sortCarts(carts, f.sort).slice((page - 1) * pageSize, page * pageSize);
  return {
    carts: slice,
    meta: { page, pageSize, total, totalPages, hasNextPage: page < totalPages },
    fetchedAt: new Date(at).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

const VALUE_BANDS: { label: string; max: number }[] = [
  { label: "Under ₹500", max: 500 },
  { label: "₹500–1k", max: 1000 },
  { label: "₹1k–2.5k", max: 2500 },
  { label: "₹2.5k–5k", max: 5000 },
  { label: "₹5k+", max: Infinity },
];

const SIZE_BANDS: { label: string; max: number }[] = [
  { label: "1 book", max: 1 },
  { label: "2 books", max: 2 },
  { label: "3–5", max: 5 },
  { label: "6–10", max: 10 },
  { label: "11+", max: Infinity },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function add(b: Bucket, value: number) {
  b.count += 1;
  b.value += value;
}

function finish<T extends Bucket>(b: T): T {
  b.value = round2(b.value);
  return b;
}

function displayName(c: WebsiteCart["customer"]): string {
  return c.name ?? c.phone ?? c.email ?? "Unknown";
}

/** Aggregates over the carts matching the filters. */
export async function fetchCartsSummary(f: CartFilters): Promise<CartsSummary> {
  const { now, carts } = await filtered(f);
  const zero = (): Bucket => ({ count: 0, value: 0 });

  const byAge: CartsSummary["byAge"] = { today: zero(), week: zero(), month: zero(), older: zero() };
  const byGroup: CartsSummary["byGroup"] = {};
  const valueBands = VALUE_BANDS.map((b) => ({ label: b.label, ...zero() }));
  const sizeBands = SIZE_BANDS.map((b) => ({ label: b.label, ...zero() }));
  const reachability = { both: zero(), phoneOnly: zero(), emailOnly: zero(), none: zero() };
  const recoverable = zero();
  const stockIssues = zero();
  const discounted = { ...zero(), discountTotal: 0 };
  const dailyMap = new Map<string, { carts: number; value: number }>();
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, carts: 0 }));
  const weekdays = WEEKDAYS.map((label, day) => ({ day, label, carts: 0, value: 0 }));
  const productMap = new Map<string, CartsSummary["topProducts"][number]>();
  const customers = new Map<string, CartsSummary["topCustomers"][number]>();
  const values: number[] = [];

  let totalValue = 0;
  let totalItems = 0;

  for (const cart of carts) {
    const value = cart.amounts.grandTotal;
    const c = cart.customer;
    const age = ageBucket(cart.updatedAt, now);
    totalValue += value;
    totalItems += cart.totalQuantity;
    values.push(value);

    add(byAge[age], value);
    add((byGroup[c.group ?? "UNKNOWN"] ??= zero()), value);
    add(valueBands[VALUE_BANDS.findIndex((b) => value < b.max)]!, value);
    add(sizeBands[SIZE_BANDS.findIndex((b) => cart.totalQuantity <= b.max)]!, value);

    const reachable = Boolean(c.phone || c.email);
    add(c.phone && c.email ? reachability.both : c.phone ? reachability.phoneOnly : c.email ? reachability.emailOnly : reachability.none, value);
    if (reachable && !cart.hasStockIssue && (age === "today" || age === "week" || age === "month")) {
      add(recoverable, value);
    }
    if (cart.hasStockIssue) add(stockIssues, value);
    if (cart.amounts.discount > 0) {
      add(discounted, value);
      discounted.discountTotal += cart.amounts.discount;
    }

    if (cart.updatedAt) {
      const ist = new Date(new Date(cart.updatedAt).getTime() + IST_OFFSET_MS);
      const day = ist.toISOString().slice(0, 10);
      const d = dailyMap.get(day) ?? { carts: 0, value: 0 };
      d.carts += 1;
      d.value += value;
      dailyMap.set(day, d);
      hours[ist.getUTCHours()]!.carts += 1;
      const w = weekdays[ist.getUTCDay()]!;
      w.carts += 1;
      w.value += value;
    }

    for (const item of cart.items) {
      const key = item.sku ?? item.name;
      const p = productMap.get(key) ?? {
        name: item.name,
        sku: item.sku,
        carts: 0,
        quantity: 0,
        value: 0,
        inStock: item.inStock,
      };
      p.carts += 1;
      p.quantity += item.quantity;
      p.value += item.lineTotal;
      productMap.set(key, p);
    }

    const cid = c.id ?? cart.id;
    const existing = customers.get(cid);
    if (existing) {
      existing.value += value;
      existing.books += cart.totalQuantity;
    } else {
      customers.set(cid, {
        id: cid,
        name: displayName(c),
        phone: c.phone,
        email: c.email,
        value,
        books: cart.totalQuantity,
        updatedAt: cart.updatedAt,
      });
    }
  }

  values.sort((a, b) => a - b);
  const median = values.length
    ? values.length % 2
      ? values[(values.length - 1) / 2]!
      : (values[values.length / 2 - 1]! + values[values.length / 2]!) / 2
    : 0;

  Object.values(byAge).forEach(finish);
  Object.values(byGroup).forEach(finish);
  [...valueBands, ...sizeBands].forEach(finish);
  Object.values(reachability).forEach(finish);
  finish(recoverable);
  finish(stockIssues);
  finish(discounted);
  discounted.discountTotal = round2(discounted.discountTotal);

  return {
    cartCount: carts.length,
    totalValue: round2(totalValue),
    averageCartValue: carts.length ? round2(totalValue / carts.length) : 0,
    medianCartValue: round2(median),
    totalItems,
    uniqueCustomers: customers.size,
    staleValue: round2(byAge.month.value + byAge.older.value),
    recoverable,
    discounted,
    stockIssues,
    reachability,
    byAge,
    byGroup,
    valueBands,
    sizeBands,
    daily: [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, carts: v.carts, value: round2(v.value) })),
    byHour: hours,
    byWeekday: weekdays.map((w) => ({ ...w, value: round2(w.value) })),
    topProducts: [...productMap.values()]
      .map((p) => ({ ...p, value: round2(p.value) }))
      .sort((a, b) => b.carts - a.carts || b.value - a.value)
      .slice(0, 10),
    topCustomers: [...customers.values()]
      .map((c) => ({ ...c, value: round2(c.value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
  };
}
