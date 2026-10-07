/**
 * Website abandoned carts — data layer for the Abandoned Carts page.
 * Talks to our backend proxy (`/api/website-carts`), never to the bookstore API.
 */

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";

export interface CartItem {
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
}

export const OUTREACH_STATUSES = ["CONTACTED", "REPLIED", "FOLLOW_UP", "NOT_INTERESTED"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];
export type OutreachChannel = "WHATSAPP" | "CALL" | "EMAIL" | "OTHER";

export const OUTREACH_LABELS: Record<string, string> = {
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  FOLLOW_UP: "Follow up",
  NOT_INTERESTED: "Not interested",
};

export interface OutreachInfo {
  status: string;
  channel: string | null;
  note: string | null;
  contactedAt: string;
  contactedByName: string | null;
}

export interface WebsiteCart {
  id: string;
  currency: string;
  createdAt: string | null;
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
  valueAdjusted: boolean;
  items: CartItem[];
  outreach?: OutreachInfo | null;
}

export interface CartsPage {
  carts: WebsiteCart[];
  ordersReady: boolean;
  hiddenCheckedOut: number;
  meta: { page: number; pageSize: number; total: number; totalPages: number; hasNextPage: boolean };
  fetchedAt: string;
}

export type AgeBucketKey = "today" | "week" | "month" | "older";
export type CartSort = "recent" | "oldest" | "value" | "value_asc" | "items";

export interface Bucket {
  count: number;
  value: number;
}

export interface CartsSummary {
  ordersReady: boolean;
  hiddenCheckedOut: number;
  outreach: { contacted: number; notContacted: number; byStatus: Record<string, number> };
  cartCount: number;
  totalValue: number;
  averageCartValue: number;
  medianCartValue: number;
  totalItems: number;
  uniqueCustomers: number;
  staleValue: number;
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
}

export interface Rate {
  carts: number;
  recovered: number;
}

export interface CartsConversion {
  window: { from: string; to: string };
  ordersScanned: number;
  truncated: boolean;
  cartCount: number;
  buyers: { customers: number; cartCustomers: number };
  checkedOut: { carts: number; value: number };
  abandoned: { carts: number; value: number };
  outreachResults: {
    contacted: { carts: number; ordered: number; revenue: number };
    notContacted: Rate;
  };
  recovered: {
    carts: number;
    customers: number;
    orders: number;
    revenue: number;
    rate: number;
    sameBookCarts: number;
  };
  lag: { label: string; count: number }[];
  byAge: Record<AgeBucketKey, Rate>;
  byValueBand: ({ label: string } & Rate)[];
  repeatVsFirst: { repeat: Rate; firstTime: Rate };
  recentRecoveries: {
    customer: string;
    phone: string | null;
    cartValue: number;
    orderValue: number;
    hoursAfter: number;
    boughtSameBook: boolean;
    orderedAt: string;
  }[];
}

/** Everything the filter panel controls. Numeric bounds stay strings so inputs can be empty. */
export interface CartFilterState {
  search: string;
  product: string;
  dateFrom: string;
  dateTo: string;
  ages: AgeBucketKey[];
  minValue: string;
  maxValue: string;
  minItems: string;
  maxItems: string;
  groups: string[];
  contact: "" | "reachable" | "phone" | "email" | "unreachable";
  stock: "" | "issues" | "clean";
  hasDiscount: boolean;
  /** Show carts whose owner already ordered (hidden by default: they only look abandoned). */
  includeOrdered: boolean;
  outreach: "" | "none" | "any" | OutreachStatus;
  sort: CartSort;
}

export const DEFAULT_CART_FILTERS: CartFilterState = {
  search: "",
  product: "",
  dateFrom: "",
  dateTo: "",
  ages: [],
  minValue: "",
  maxValue: "",
  minItems: "",
  maxItems: "",
  groups: [],
  contact: "",
  stock: "",
  hasDiscount: false,
  includeOrdered: false,
  outreach: "",
  sort: "recent",
};

export type CartQuery = Partial<CartFilterState> & { page?: number; pageSize?: number; refresh?: boolean };

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  cached?: boolean;
}

function toQuery(filters: CartQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const websiteCartsApi = {
  list: (filters: CartQuery) => apiClient.get<ApiEnvelope<CartsPage>>(`website-carts${toQuery(filters)}`),
  summary: (filters: CartQuery) =>
    apiClient.get<ApiEnvelope<CartsSummary>>(`website-carts/summary${toQuery(filters)}`),
};

export const useWebsiteCarts = (filters: CartQuery) =>
  useQuery({
    queryKey: ["website-carts", "list", filters],
    queryFn: () => websiteCartsApi.list(filters),
    select: (response) => response.data,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    // While the server is still matching orders, check back so the already-ordered
    // carts drop out as soon as that finishes.
    refetchInterval: (query) => (query.state.data?.data.ordersReady === false && !filters.includeOrdered ? 6000 : false),
  });

export const useWebsiteCartsSummary = (filters: CartQuery) =>
  useQuery({
    queryKey: ["website-carts", "summary", filters],
    queryFn: () => websiteCartsApi.summary(filters),
    select: (response) => response.data,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchInterval: (query) => (query.state.data?.data.ordersReady === false && !filters.includeOrdered ? 6000 : false),
  });

/**
 * Conversion matches cart owners against recent orders, which means paging through
 * thousands of orders on a cold server cache (~30s). It loads on its own so the rest
 * of the page is never held up, and is cached hard on both sides.
 */
export const useWebsiteCartsConversion = (filters: CartQuery) =>
  useQuery({
    queryKey: ["website-carts", "conversion", filters],
    queryFn: () => apiClient.get<ApiEnvelope<CartsConversion>>(`website-carts/conversion${toQuery(filters)}`),
    select: (response) => response.data,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

/** Every cart matching the filters (for CSV export). */
export async function fetchAllMatchingCarts(filters: CartQuery): Promise<WebsiteCart[]> {
  const res = await websiteCartsApi.list({ ...filters, page: 1, pageSize: 5000 });
  return res.data.carts;
}

export interface OutreachInput {
  status?: OutreachStatus;
  channel?: OutreachChannel;
  note?: string;
  customerId?: string | null;
}

export const saveCartOutreach = (cartId: string, input: OutreachInput) =>
  apiClient.put<{ success: boolean }>(`website-carts/outreach/${encodeURIComponent(cartId)}`, input);

export const clearCartOutreach = (cartId: string) =>
  apiClient.delete<{ success: boolean }>(`website-carts/outreach/${encodeURIComponent(cartId)}`);

export async function refreshWebsiteCarts(filters: CartQuery) {
  // One request with refresh=true re-pulls upstream; the queries that follow reuse it.
  await websiteCartsApi.summary({ ...filters, refresh: true });
}
