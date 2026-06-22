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
