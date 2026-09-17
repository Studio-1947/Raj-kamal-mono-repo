/**
 * Website orders — data layer for the Website Orders page.
 *
 * Talks to our own backend (`/api/website-orders`), never to the bookstore API
 * directly: the upstream credential is a server-side secret and the proxy already
 * flattens the very wide upstream payload into the shapes below.
 */

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";

export const ORDER_STATUSES = [
  "PENDING",
  "PENDING_INVOICE",
  "PENDING_LABEL",
  "PENDING_DISPATCH",
  "COMPLETED",
  "CANCELLED",
] as const;

export const PAYMENT_STATUSES = ["PENDING", "CAPTURED", "FAILED", "REFUNDED"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Human labels — the raw enums are shouty and `PENDING_LABEL` reads as jargon. */
export const STATUS_LABELS: Record<string, string> = {
  ALL: "All statuses",
  PENDING: "Pending",
  PENDING_INVOICE: "Pending invoice",
  PENDING_LABEL: "Awaiting label",
  PENDING_DISPATCH: "Awaiting dispatch",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  ALL: "All payments",
  PENDING: "Pending",
  CAPTURED: "Captured",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: "Cash on delivery",
  RAZORPAY: "Razorpay",
  UNSPECIFIED: "Not recorded",
};

export interface WebsiteOrderItem {
  id: string;
  name: string;
  sku: string | null;
  variant: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface WebsiteOrder {
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
  shipTo: {
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
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
}

export interface OrdersPage {
  orders: WebsiteOrder[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface OrdersSummary {
  orderCount: number;
  revenue: number;
  itemsSold: number;
  averageOrderValue: number;
  byStatus: Record<string, { count: number; revenue: number }>;
  byPaymentMethod: Record<string, { count: number; revenue: number }>;
  daily: { date: string; orders: number; revenue: number }[];
  topProducts: { name: string; sku: string | null; quantity: number; revenue: number }[];
  topStates: { state: string; orders: number; revenue: number }[];
  /** Set when the range held more orders than the server will aggregate in one pass. */
  truncated: boolean;
  scannedOrders: number;
  /** Oldest order date actually included — differs from `dateFrom` when truncated. */
  coveredFrom: string | null;
}

export interface OrderFilters {
  page?: number;
  pageSize?: number;
  status?: string[];
  paymentStatus?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  cached?: boolean;
}

function toQuery(filters: OrderFilters): string {
  const params = new URLSearchParams();
  // "ALL" is the UI's way of saying "no filter" — don't send it as a value.
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "" || value === "ALL") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const websiteOrdersApi = {
  list: (filters: OrderFilters) =>
    apiClient.get<ApiEnvelope<OrdersPage>>(`website-orders${toQuery(filters)}`),
  summary: (filters: Omit<OrderFilters, "page" | "pageSize">) =>
    apiClient.get<ApiEnvelope<OrdersSummary>>(`website-orders/summary${toQuery(filters)}`),
  byId: (id: string) => apiClient.get<ApiEnvelope<WebsiteOrder>>(`website-orders/${id}`),
};

/**
 * A page of orders. `placeholderData` keeps the previous page on screen while the
 * next one loads, so paging doesn't blank the table on every click.
 */
export const useWebsiteOrders = (filters: OrderFilters) =>
  useQuery({
    queryKey: ["website-orders", "list", filters],
    queryFn: () => websiteOrdersApi.list(filters),
    select: (response) => response.data,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

/**
 * KPIs for the same filters. This one is expensive upstream (it pages through the
 * whole range server-side), so it gets a longer stale window than the table.
 */
export const useWebsiteOrdersSummary = (filters: Omit<OrderFilters, "page" | "pageSize">) =>
  useQuery({
    queryKey: ["website-orders", "summary", filters],
    queryFn: () => websiteOrdersApi.summary(filters),
    select: (response) => response.data,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

/** A single order, fetched only once a row is actually opened. */
export const useWebsiteOrder = (id: string | null) =>
  useQuery({
    queryKey: ["website-orders", "detail", id],
    queryFn: () => websiteOrdersApi.byId(id as string),
    select: (response) => response.data,
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
