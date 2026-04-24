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
} from './offlineSheetTypes';

const BASE = 'offline-sales';
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
  
  const page = filters.page || 1;
  const limit = filters.limit || 100;
  p.set('limit', String(limit));
  p.set('offset', String((page - 1) * limit));

  if (extra) Object.entries(extra).forEach(([k, v]) => v && p.set(k, v));
  return p.toString();
}

// ── Counts hook ─────────────────────────────────────────────────────────────

export function useOfflineSheetCounts(filters: OfflineSheetFilters) {
  return useQuery<OfflineSheetCountsResponse>({
    queryKey: ['osheetCounts', filters],
    queryFn: ({ signal }) =>
      apiClient.get<OfflineSheetCountsResponse>(
        `${BASE}/counts?${buildQs(filters)}`,
        { signal },
      ),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
    placeholderData: keepPreviousData,
  });
}

// ── Summary hook ─────────────────────────────────────────────────────────────

export function useOfflineSheetSummary(filters: OfflineSheetFilters) {
  return useQuery<OfflineSheetSummaryResponse>({
    queryKey: ['osheetSummary', filters],
    queryFn: ({ signal }) =>
      apiClient.get<OfflineSheetSummaryResponse>(
        `${BASE}/summary?${buildQs(filters)}`,
        { signal },
      ),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
    placeholderData: keepPreviousData,
  });
}

// ── Paginated list hook ─────────────────────────────────────────────────────────

export function useOfflineSheetList(filters: OfflineSheetFilters) {
  return useQuery<OfflineSheetListResponse>({
    queryKey: ['osheetList', filters],
    queryFn: ({ signal }) =>
      apiClient.get<OfflineSheetListResponse>(
        `${BASE}?${buildQs(filters)}`,
        { signal },
      ),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
    placeholderData: keepPreviousData,
  });
}

// ── Sync mutation ─────────────────────────────────────────────────────────────

export function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation<OfflineSheetSyncResponse>({
    mutationFn: () =>
      apiClient.get<OfflineSheetSyncResponse>(`${BASE}/google-sheets`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['osheetCounts'] });
      qc.invalidateQueries({ queryKey: ['osheetSummary'] });
      qc.invalidateQueries({ queryKey: ['osheetList'] });
    },
  });
}

// ── Options hook ─────────────────────────────────────────────────────────────

export function useOfflineSheetOptions() {
  return useQuery<OfflineSheetOptionsResponse>({
    queryKey: ['osheetOptions'],
    queryFn: () => apiClient.get<OfflineSheetOptionsResponse>(`${BASE}/options`),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
