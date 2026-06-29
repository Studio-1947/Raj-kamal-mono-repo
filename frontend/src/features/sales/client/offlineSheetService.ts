// ─────────────────────────────────────────────────────────────────────────────
// offlineSheetService.ts
//
// TanStack Query hooks for the Google-Sheet Offline Sales feature.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';
import type {
  OfflineSheetFilters,
  OfflineSheetListResponse,
  OfflineSheetSummaryResponse,
  OfflineSheetCountsResponse,
  OfflineSheetSyncResponse,
  OfflineSheetOptionsResponse,
  OfflineSheetDailyDetailResponse,
} from './offlineSheetTypes';

const REGION_MAP = {
  delhi: 'offline-sales',
  mumbai: 'mumbai-offline-sales',
  patna: 'patna-offline-sales',
  online: 'online-offline-sales',
  bookfair: 'bookfair-offline-sales',
  lokbharti: 'lokbharti-offline-sales',
};

type Region = keyof typeof REGION_MAP;

const STALE = 5 * 60 * 1000;   // 5 min
const GC    = 15 * 60 * 1000;  // 15 min

// ── helpers ─────────────────────────────────────────────────────────────────

function buildQs(filters: OfflineSheetFilters, extra?: Record<string, string>): string {
  const p = new URLSearchParams();
  if (filters.days)      p.set('days', String(filters.days));
  if (filters.startDate) p.set('startDate', filters.startDate);
  if (filters.endDate)   p.set('endDate', filters.endDate);
  if (filters.q?.trim()) p.set('q', filters.q.trim());
  if (filters.state)     p.set('state', filters.state);
  if (filters.city)      p.set('city', filters.city);
  if (filters.publisher) p.set('publisher', filters.publisher);
  if (filters.author)    p.set('author', filters.author);
  if (filters.isbn)      p.set('isbn', filters.isbn);
  if (filters.customerName) p.set('customerName', filters.customerName);
  if (filters.binding)   p.set('binding', filters.binding);
  if (filters.minAmount) p.set('minAmount', String(filters.minAmount));
  if (filters.maxAmount) p.set('maxAmount', String(filters.maxAmount));
  if (filters.title)     p.set('title', filters.title);
  if (filters.type)      p.set('type', filters.type);
  if (filters.fictionType) p.set('fictionType', filters.fictionType);
  
  const page = filters.page || 1;
  const limit = filters.limit || 100;
  p.set('limit', String(limit));
  p.set('offset', String((page - 1) * limit));

  if (extra) Object.entries(extra).forEach(([k, v]) => v && p.set(k, v));
  return p.toString();
}

function getBase(region: Region = 'delhi') {
  return REGION_MAP[region] || REGION_MAP.delhi;
}

// ── Counts hook ─────────────────────────────────────────────────────────────

export function useOfflineSheetCounts(filters: OfflineSheetFilters, region: Region = 'delhi') {
  return useQuery<OfflineSheetCountsResponse>({
    queryKey: ['osheetCounts', region, filters],
    queryFn: ({ signal }) =>
      apiClient.get<OfflineSheetCountsResponse>(
        `${getBase(region)}/counts?${buildQs(filters)}`,
        { signal },
      ),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
    placeholderData: keepPreviousData,
  });
}

// ── Summary hook ─────────────────────────────────────────────────────────────

export function useOfflineSheetSummary(filters: OfflineSheetFilters, region: Region = 'delhi') {
  return useQuery<OfflineSheetSummaryResponse>({
    queryKey: ['osheetSummary', region, filters],
    queryFn: ({ signal }) =>
      apiClient.get<OfflineSheetSummaryResponse>(
        `${getBase(region)}/summary?${buildQs(filters)}`,
        { signal },
      ),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
    placeholderData: keepPreviousData,
  });
}

// ── Daily Details hook ─────────────────────────────────────────────────────────────

export function useOfflineSheetDailyDetails(filters: OfflineSheetFilters, date: string | null, enabled: boolean = true, region: Region = 'delhi') {
  return useQuery<OfflineSheetDailyDetailResponse>({
    queryKey: ['osheetDailyDetails', region, filters, date],
    queryFn: ({ signal }) => {
      const extraArgs: Record<string, string> = date ? { date } : {};
      return apiClient.get<OfflineSheetDailyDetailResponse>(
        `${getBase(region)}/daily-details?${buildQs(filters, extraArgs)}`,
        { signal },
      );
    },
    enabled: enabled,
    staleTime: STALE,
    gcTime: GC,
  });
}

// ── Paginated list hook ─────────────────────────────────────────────────────────

export function useOfflineSheetList(filters: OfflineSheetFilters, region: Region = 'delhi') {
  return useQuery<OfflineSheetListResponse>({
    queryKey: ['osheetList', region, filters],
    queryFn: ({ signal }) =>
      apiClient.get<OfflineSheetListResponse>(
        `${getBase(region)}?${buildQs(filters)}`,
        { signal },
      ),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
    placeholderData: keepPreviousData,
  });
}

// ── Sync mutation ─────────────────────────────────────────────────────────────

export function useTriggerSync(region: Region = 'delhi') {
  const qc = useQueryClient();
  return useMutation<OfflineSheetSyncResponse>({
    mutationFn: () => {
      const endpoint = region === 'delhi' ? 'google-sheets' : 'sync';
      return apiClient.get<OfflineSheetSyncResponse>(`${getBase(region)}/${endpoint}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['osheetCounts', region] });
      qc.invalidateQueries({ queryKey: ['osheetSummary', region] });
      qc.invalidateQueries({ queryKey: ['osheetList', region] });
    },
  });
}

// ── Options hook ─────────────────────────────────────────────────────────────

export function useOfflineSheetOptions(region: Region = 'delhi') {
  return useQuery<OfflineSheetOptionsResponse>({
    queryKey: ['osheetOptions', region],
    queryFn: () => apiClient.get<OfflineSheetOptionsResponse>(`${getBase(region)}/options`),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// ── History channel hooks (query offline_sales_history via total-offline-sales) ──

const CHANNEL_KEY: Record<Region, string> = {
  delhi:     'Delhi',
  mumbai:    'Mumbai',
  patna:     'Patna',
  online:    'Online',
  bookfair:  'BookFair',
  lokbharti: 'Lokbharti',
};

// hasExplicitDate: when false, startDate/endDate on filters are the computed FYTD
// defaults (not user-set) and must NOT be forwarded to history queries — the
// archive lives in a different FY so the current-FY FYTD window would return zero rows.
function buildHistoryQs(filters: OfflineSheetFilters, channel: string, fy: string, hasExplicitDate: boolean): string {
  const p = new URLSearchParams({ channel, fy });
  if (hasExplicitDate) {
    if (filters.startDate) p.set('startDate', filters.startDate);
    if (filters.endDate)   p.set('endDate',   filters.endDate);
  }
  if (filters.q?.trim())   p.set('q',            filters.q.trim());
  if (filters.state)       p.set('state',        filters.state);
  if (filters.city)        p.set('city',         filters.city);
  if (filters.publisher)   p.set('publisher',    filters.publisher);
  if (filters.author)      p.set('author',       filters.author);
  if (filters.isbn)        p.set('isbn',         filters.isbn);
  if (filters.customerName) p.set('customerName', filters.customerName);
  if (filters.binding)     p.set('binding',      filters.binding);
  if (filters.title)       p.set('title',        filters.title);
  if (filters.type)        p.set('type',         filters.type);
  if (filters.fictionType) p.set('fictionType',  filters.fictionType);
  if (filters.minAmount)   p.set('minAmount',    String(filters.minAmount));
  if (filters.maxAmount)   p.set('maxAmount',    String(filters.maxAmount));
  const page  = filters.page  || 1;
  const limit = filters.limit || 100;
  p.set('limit',  String(limit));
  p.set('offset', String((page - 1) * limit));
  return p.toString();
}

export function useHistoryChannelList(filters: OfflineSheetFilters, region: Region = 'delhi', fy = 'previous', hasExplicitDate = false) {
  const channel = CHANNEL_KEY[region];
  return useQuery<OfflineSheetListResponse>({
    queryKey: ['histChannelList', region, fy, hasExplicitDate, filters],
    queryFn: ({ signal }) =>
      apiClient.get<OfflineSheetListResponse>(
        `total-offline-sales/channel-list?${buildHistoryQs(filters, channel, fy, hasExplicitDate)}`,
        { signal },
      ),
    staleTime: 30 * 60 * 1000,
    gcTime: GC,
    placeholderData: keepPreviousData,
  });
}

export function useHistoryChannelCounts(filters: OfflineSheetFilters, region: Region = 'delhi', fy = 'previous', hasExplicitDate = false) {
  const channel = CHANNEL_KEY[region];
  return useQuery<OfflineSheetCountsResponse>({
    queryKey: ['histChannelCounts', region, fy, hasExplicitDate, filters],
    queryFn: ({ signal }) =>
      apiClient.get<OfflineSheetCountsResponse>(
        `total-offline-sales/channel-counts?${buildHistoryQs(filters, channel, fy, hasExplicitDate)}`,
        { signal },
      ),
    staleTime: 30 * 60 * 1000,
    gcTime: GC,
    placeholderData: keepPreviousData,
  });
}

export function useHistoryChannelOptions(region: Region = 'delhi', fy = 'previous') {
  const channel = CHANNEL_KEY[region];
  return useQuery<OfflineSheetOptionsResponse>({
    queryKey: ['histChannelOptions', region, fy],
    queryFn: () =>
      apiClient.get<OfflineSheetOptionsResponse>(
        `total-offline-sales/channel-options?channel=${channel}&fy=${fy}`,
      ),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

// Maps total-offline-sales/summary (channel=X, fy=previous) → OfflineSheetSummaryResponse
// so OfflineSheetCharts can use history data without changing its internal logic.
function mapTotalSummaryToSheetSummary(raw: any, channelKey: string): OfflineSheetSummaryResponse {
  if (!raw?.ok) return { ok: false, timeSeries: [], topItems: [] };

  // timeSeries: { date, Delhi, Mumbai, ..., total } → { date, total, qty }
  // For a single-channel request the entry.total equals that channel's contribution.
  const timeSeries = (raw.timeSeries ?? []).map((r: any) => ({
    date:  r.date as string,
    total: typeof r[channelKey] === 'number' ? r[channelKey] : (r.total ?? 0),
    qty:   0,  // qty not included in combined daily series
  }));

  const ch  = raw.topStatesByChannel?.[channelKey]         ?? [];
  const cc  = raw.topCitiesByChannel?.[channelKey]          ?? [];
  const cp  = raw.topPublishersByChannel?.[channelKey]      ?? [];
  const cus = raw.topCustomersByChannel?.[channelKey]       ?? [];
  const bin = raw.revenueByBindingByChannel?.[channelKey]   ?? [];
  const typ = raw.revenueByTypeByChannel?.[channelKey]      ?? [];
  const qty = raw.topItemsByQtyByChannel?.[channelKey]      ?? [];
  const bot = raw.bottomItemsByChannel?.[channelKey]        ?? [];

  return {
    ok:                 true,
    timeSeries,
    topItems:           (raw.topItems ?? []).map((i: any) => ({ title: i.title, total: i.total, qty: i.qty ?? 0 })),
    topItemsByQty:      qty.map((i: any) => ({ title: i.title, total: i.total, qty: i.qty })),
    bottomItems:        bot.map((i: any) => ({ title: i.title, total: i.total, qty: i.qty })),
    revenueByState:     ch.map((s: any)  => ({ state: s.state, total: s.revenue ?? s.total ?? 0 })),
    revenueByCity:      cc.map((c: any)  => ({ city: c.city, state: c.state, total: c.revenue ?? c.total ?? 0 })),
    revenueByPublisher: cp.map((p: any)  => ({ publisher: p.publisher, total: p.revenue ?? p.total ?? 0 })),
    topCustomers:       cus.map((c: any) => ({ customerName: c.customerName, total: c.total })),
    revenueByBinding:   bin.map((b: any) => ({ binding: b.binding, total: b.total, qty: b.qty ?? 0 })),
    revenueByType:      typ.map((t: any) => ({ type: t.type, total: t.total })),
  };
}

export function useHistoryChannelSummary(region: Region = 'delhi', fy = 'previous', enabled = true) {
  const channel = CHANNEL_KEY[region];
  return useQuery<OfflineSheetSummaryResponse>({
    queryKey: ['histChannelSummary', region, fy],
    queryFn: async () => {
      const raw = await apiClient.get<any>(
        `total-offline-sales/summary?channel=${channel}&fy=${fy}&range=all`,
      );
      return mapTotalSummaryToSheetSummary(raw, channel);
    },
    staleTime: 30 * 60 * 1000,
    gcTime: GC,
    enabled,
  });
}
