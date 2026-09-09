/**
 * Website orders — fetch + normalisation layer over the bookstore admin API.
 *
 * The upstream `/api/v1/admin/orders` payload is very wide: every order carries the
 * full user record, address, line items with nested product variants, payments with
 * refunds, shipments, notes and parent/child links. A single page of 100 is ~1MB.
 * Nothing in the dashboard needs that, so we flatten each order to the fields the UI
 * actually renders before it crosses the wire — the page-100 response drops to a few
 * dozen KB and the client never has to know the upstream schema.
 *
 * Upstream query support (verified against the live API, Sep 2026):
 *   page, pageSize, status, paymentStatus, channel, search, dateFrom, dateTo
 *   - `limit` is NOT honoured (it silently falls back to pageSize=20) — use pageSize.
 *   - date params are timestamps, not dates: `dateTo=2026-09-09` means midnight and
 *     excludes that whole day, so we widen a bare date to end-of-day ourselves.
 *   - there is no sort parameter; results come back newest-placed first.
 *   - there is no stats/summary endpoint, hence `fetchOrdersSummary` below.
 */

import { websiteApiGet, WebsiteApiError } from "../config/websiteApi.js";

const ORDERS_PATH = "/api/v1/admin/orders";

/** Upstream caps out around 100 per page; larger values are clamped there anyway. */
const MAX_PAGE_SIZE = 100;

/**
 * Ceiling on how many orders the summary will aggregate. The API has no totals
 * endpoint, so a summary means paging through the range; without a cap a request for
 * "all time" would pull 27k orders. Past the cap we return what we have and flag it.
 */
const SUMMARY_MAX_ORDERS = 3000;

export const ORDER_STATUSES = [
  "PENDING",
  "PENDING_LABEL",
  "PENDING_DISPATCH",
  "COMPLETED",
  "CANCELLED",
] as const;

export const PAYMENT_STATUSES = ["PENDING", "CAPTURED", "FAILED", "REFUNDED"] as const;

// `| undefined` on each member is required by the project's exactOptionalPropertyTypes:
// the route builds this object with every key present, some of them undefined.
export type OrderFilters = {
  page?: number | undefined;
  pageSize?: number | undefined;
  status?: string | undefined;
  paymentStatus?: string | undefined;
  channel?: string | undefined;
  search?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
};

export type WebsiteOrderItem = {
  id: string;
  name: string;
  sku: string | null;
  variant: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type WebsiteOrder = {
  id: string;
  orderNumber: string;
  placedAt: string | null;
  updatedAt: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  channel: string;
  currency: string;
  customer: { name: string; email: string | null; phone: string | null; group: string | null };
  shipTo: { city: string | null; state: string | null; postalCode: string | null; country: string | null };
  amounts: {
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    codFee: number;
    grandTotal: number;
  };
  itemCount: number;
  totalQuantity: number;
  items: WebsiteOrderItem[];
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    status: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  tags: string[];
  isSplitOrder: boolean;
};

export type OrdersPage = {
  orders: WebsiteOrder[];
  meta: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean };
};

export type OrdersSummary = {
  orderCount: number;
  revenue: number;
  itemsSold: number;
  averageOrderValue: number;
  byStatus: Record<string, { count: number; revenue: number }>;
  byPaymentMethod: Record<string, { count: number; revenue: number }>;
  daily: { date: string; orders: number; revenue: number }[];
  topProducts: { name: string; sku: string | null; quantity: number; revenue: number }[];
  topStates: { state: string; orders: number; revenue: number }[];
  /** True when the range held more orders than SUMMARY_MAX_ORDERS, so figures are partial. */
  truncated: boolean;
  scannedOrders: number;
};

/** Upstream money fields are decimal strings ("629.10") or null. */
function money(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function trimmed(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s : null;
}

/**
 * A bare `YYYY-MM-DD` in `dateTo` is read upstream as that day's midnight, which drops
 * the whole day from the range. Widen bare dates to cover the full day at both ends;
 * pass full timestamps through untouched.
 */
function normalizeDateBound(value: string | undefined, edge: "from" | "to"): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return edge === "from" ? `${raw}T00:00:00.000Z` : `${raw}T23:59:59.999Z`;
}

function buildQuery(filters: OrderFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, Math.trunc(filters.page ?? 1))));
  params.set(
    "pageSize",
    String(Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(filters.pageSize ?? 20)))),
  );

  const status = trimmed(filters.status);
  const paymentStatus = trimmed(filters.paymentStatus);
  const channel = trimmed(filters.channel);
  const search = trimmed(filters.search);
  const dateFrom = normalizeDateBound(filters.dateFrom, "from");
  const dateTo = normalizeDateBound(filters.dateTo, "to");

  if (status && status !== "ALL") params.set("status", status);
  if (paymentStatus && paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);
  if (channel && channel !== "ALL") params.set("channel", channel);
  if (search) params.set("search", search);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  return params;
}

/**
 * Customer identity lives in three places and only `metadata` is reliable: OTP
 * sign-ups get a synthetic `otp-<phone>@otp.rajkamal.local` login and a "Guest User"
 * profile, while the checkout form's real name/email/phone land in `metadata`.
 * Prefer metadata, then the shipping contact, then the account itself.
 */
function extractCustomer(order: any): WebsiteOrder["customer"] {
  const meta = order?.metadata ?? {};
  const address = order?.address ?? {};
  const profile = order?.user?.profile ?? {};

  const name =
    [trimmed(meta.firstName), trimmed(meta.lastName)].filter(Boolean).join(" ") ||
    [trimmed(address.contactFirstName), trimmed(address.contactLastName)].filter(Boolean).join(" ") ||
    [trimmed(profile.firstName), trimmed(profile.lastName)].filter(Boolean).join(" ") ||
    "—";

  const accountEmail = trimmed(order?.user?.email);
  return {
    name,
    email:
      trimmed(meta.email) ??
      trimmed(address.contactEmail) ??
      // Synthetic OTP logins are noise, not a contact address.
      (accountEmail && !accountEmail.endsWith("@otp.rajkamal.local") ? accountEmail : null),
    phone: trimmed(meta.phone) ?? trimmed(address.contactPhone),
    group: trimmed(order?.user?.customerGroup),
  };
}

/** The most recent shipment is the one worth showing; earlier ones are superseded. */
function extractShipment(order: any): WebsiteOrder["shipment"] {
  const shipments: any[] = Array.isArray(order?.shipments) ? order.shipments : [];
  if (shipments.length === 0) return null;

  const latest = shipments.reduce((newest, s) =>
    new Date(s?.createdAt ?? 0) > new Date(newest?.createdAt ?? 0) ? s : newest,
  );

  return {
    carrier: trimmed(latest?.carrier),
    trackingNumber: trimmed(latest?.trackingNumber),
    status: trimmed(latest?.status),
    shippedAt: trimmed(latest?.shippedAt),
    deliveredAt: trimmed(latest?.deliveredAt),
  };
}

function normalizeOrder(order: any): WebsiteOrder {
  const rawItems: any[] = Array.isArray(order?.items) ? order.items : [];

  const items: WebsiteOrderItem[] = rawItems.map((item) => {
    const quantity = Number(item?.quantity) || 0;
    const unitPrice = money(item?.unitPrice);
    return {
      id: String(item?.id ?? ""),
      name: trimmed(item?.productName) ?? trimmed(item?.productVariant?.product?.name) ?? "—",
      sku: trimmed(item?.sku) ?? trimmed(item?.productVariant?.sku),
      variant: trimmed(item?.productVariant?.title),
      quantity,
      unitPrice,
      // Upstream has no line total; discounts are already reflected in unitPrice.
      lineTotal: Number((unitPrice * quantity).toFixed(2)),
    };
  });

  const payments: any[] = Array.isArray(order?.payments) ? order.payments : [];

  return {
    id: String(order?.id ?? ""),
    orderNumber: String(order?.orderNumber ?? ""),
    placedAt: trimmed(order?.placedAt),
    updatedAt: trimmed(order?.updatedAt),
    status: trimmed(order?.status) ?? "UNKNOWN",
    paymentStatus: trimmed(order?.paymentStatus) ?? "UNKNOWN",
    paymentMethod: trimmed(payments[0]?.method),
    channel: trimmed(order?.channel) ?? "ONLINE",
    currency: trimmed(order?.currency) ?? "INR",
    customer: extractCustomer(order),
    shipTo: {
      city: trimmed(order?.address?.city),
      state: trimmed(order?.address?.state),
      postalCode: trimmed(order?.address?.postalCode),
      country: trimmed(order?.address?.country),
    },
    amounts: {
      subtotal: money(order?.subtotal),
      // Gift cards and loyalty points reduce what's owed just like a coupon does.
      discount:
        money(order?.discountTotal) +
        money(order?.giftCardTotal) +
        money(order?.pointsDiscountTotal),
      tax: money(order?.taxTotal),
      shipping: money(order?.shippingTotal),
      codFee: money(order?.codFee),
      grandTotal: money(order?.grandTotal),
    },
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    shipment: extractShipment(order),
    tags: Array.isArray(order?.tags) ? order.tags.map(String) : [],
    // Backorders are split into child orders upstream; flagging it stops the totals
    // from looking like duplicates to whoever reads the table.
    isSplitOrder: Boolean(order?.parentOrderId ?? order?.parentOrder),
  };
}

async function fetchRawPage(filters: OrderFilters): Promise<{ data: any[]; meta: any }> {
  const body = await websiteApiGet<{ data: any[]; meta: any }>(ORDERS_PATH, buildQuery(filters));
  if (!Array.isArray(body?.data)) {
    throw new WebsiteApiError("Website API returned an unexpected orders payload.", 502);
  }
  return body;
}

/** One page of orders, normalised for the dashboard. */
export async function fetchOrders(filters: OrderFilters): Promise<OrdersPage> {
  const { data, meta } = await fetchRawPage(filters);

  const page = Number(meta?.page) || 1;
  const pageSize = Number(meta?.pageSize) || data.length;
  const total = Number(meta?.total) || 0;

  return {
    orders: data.map(normalizeOrder),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Number(meta?.totalPages) || Math.max(1, Math.ceil(total / (pageSize || 1))),
      hasNextPage: Boolean(meta?.hasNextPage),
    },
  };
}

/** A single order by id, for the detail drawer. */
export async function fetchOrderById(id: string): Promise<WebsiteOrder> {
  const body = await websiteApiGet<any>(`${ORDERS_PATH}/${encodeURIComponent(id)}`);
  const order = body?.data ?? body;
  if (!order?.id) {
    throw new WebsiteApiError(`Order ${id} not found.`, 404);
  }
  return normalizeOrder(order);
}

function bump(
  bucket: Record<string, { count: number; revenue: number }>,
  key: string,
  revenue: number,
) {
  const entry = (bucket[key] ??= { count: 0, revenue: 0 });
  entry.count += 1;
  entry.revenue += revenue;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Aggregates for the KPI row and charts.
 *
 * There is no upstream stats endpoint, so this pages through the filtered range at
 * pageSize=100 and folds as it goes. Pages are fetched sequentially on purpose: the
 * upstream is rate-limited, and the first page is what tells us how many follow.
 *
 * Cancelled orders are counted but excluded from revenue — money that was never
 * collected shouldn't inflate the topline.
 */
export async function fetchOrdersSummary(filters: OrderFilters): Promise<OrdersSummary> {
  const byStatus: OrdersSummary["byStatus"] = {};
  const byPaymentMethod: OrdersSummary["byPaymentMethod"] = {};
  const dailyMap = new Map<string, { orders: number; revenue: number }>();
  const productMap = new Map<
    string,
    { name: string; sku: string | null; quantity: number; revenue: number }
  >();
  const stateMap = new Map<string, { orders: number; revenue: number }>();

  let orderCount = 0;
  let revenue = 0;
  let itemsSold = 0;
  let scannedOrders = 0;
  let truncated = false;

  let page = 1;
  let totalPages = 1;

  do {
    const { data, meta } = await fetchRawPage({ ...filters, page, pageSize: MAX_PAGE_SIZE });
    totalPages = Number(meta?.totalPages) || 1;

    for (const raw of data) {
      const order = normalizeOrder(raw);
      const isRevenue = order.status !== "CANCELLED";
      const orderRevenue = isRevenue ? order.amounts.grandTotal : 0;

      orderCount += 1;
      revenue += orderRevenue;
      if (isRevenue) itemsSold += order.totalQuantity;

      bump(byStatus, order.status, orderRevenue);
      bump(byPaymentMethod, order.paymentMethod ?? "UNSPECIFIED", orderRevenue);

      if (order.placedAt) {
        const day = order.placedAt.slice(0, 10);
        const bucket = dailyMap.get(day) ?? { orders: 0, revenue: 0 };
        bucket.orders += 1;
        bucket.revenue += orderRevenue;
        dailyMap.set(day, bucket);
      }

      const state = order.shipTo.state ?? "Unknown";
      const stateBucket = stateMap.get(state) ?? { orders: 0, revenue: 0 };
      stateBucket.orders += 1;
      stateBucket.revenue += orderRevenue;
      stateMap.set(state, stateBucket);

      if (isRevenue) {
        for (const item of order.items) {
          // SKU is the stable identity; titles repeat across editions.
          const key = item.sku ?? item.name;
          const product = productMap.get(key) ?? {
            name: item.name,
            sku: item.sku,
            quantity: 0,
            revenue: 0,
          };
          product.quantity += item.quantity;
          product.revenue += item.lineTotal;
          productMap.set(key, product);
        }
      }
    }

    scannedOrders += data.length;
    if (scannedOrders >= SUMMARY_MAX_ORDERS && page < totalPages) {
      truncated = true;
      break;
    }
    page += 1;
  } while (page <= totalPages);

  return {
    orderCount,
    revenue: round2(revenue),
    itemsSold,
    averageOrderValue: orderCount > 0 ? round2(revenue / orderCount) : 0,
    byStatus: Object.fromEntries(
      Object.entries(byStatus).map(([k, v]) => [k, { ...v, revenue: round2(v.revenue) }]),
    ),
    byPaymentMethod: Object.fromEntries(
      Object.entries(byPaymentMethod).map(([k, v]) => [k, { ...v, revenue: round2(v.revenue) }]),
    ),
    daily: [...dailyMap.entries()]
      .map(([date, v]) => ({ date, orders: v.orders, revenue: round2(v.revenue) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topProducts: [...productMap.values()]
      .map((p) => ({ ...p, revenue: round2(p.revenue) }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    topStates: [...stateMap.entries()]
      .map(([state, v]) => ({ state, orders: v.orders, revenue: round2(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    truncated,
    scannedOrders,
  };
}
