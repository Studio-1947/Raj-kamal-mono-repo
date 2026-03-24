// ─────────────────────────────────────────────────────────────────────────────
// offlineSheetTypes.ts
// Centralised TypeScript interfaces for the Google-Sheet Offline Sales feature.
// ─────────────────────────────────────────────────────────────────────────────

export interface OfflineSheetItem {
  id: string;
  docNo?: string | null;
  orderNo?: string | null; // backend alias for docNo
  title?: string | null;
  customerName?: string | null;
  date?: string | null;
  amount?: number | null;
  qty?: number | null;
  rate?: number | null;
  month?: string | null;
  year?: number | null;
  state?: string | null;
  city?: string | null;
  publisher?: string | null;
  author?: string | null;
  binding?: string | null;
  rawJson?: Record<string, unknown>;
}

export interface OfflineSheetListResponse {
  ok: boolean;
  items: OfflineSheetItem[];
  nextCursorId: string | null;
  totalCount?: number;
}

export interface OfflineSheetSummaryResponse {
  ok: boolean;
  timeSeries: { date: string; total: number }[];
  topItems: { title: string; total: number; qty: number }[];
  paymentMode?: { paymentMode: string; total: number }[];
  revenueByState?: { state: string; total: number }[];
  revenueByPublisher?: { publisher: string; total: number }[];
  topCustomers?: { customerName: string; total: number }[];
}

export interface OfflineSheetCountsResponse {
  ok: boolean;
  totalCount: number;
  totalAmount: number;
  uniqueCustomers: number;
  refundCount: number;
}

export interface OfflineSheetSyncResponse {
  ok: boolean;
  importedCount?: number;
  skippedCount?: number;
  message?: string;
}

/** Filter state shared across hooks and URL params */
export interface OfflineSheetFilters {
  days: number;
  startDate?: string;
  endDate?: string;
  q?: string;
  state?: string;
  city?: string;
  publisher?: string;
  author?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}
