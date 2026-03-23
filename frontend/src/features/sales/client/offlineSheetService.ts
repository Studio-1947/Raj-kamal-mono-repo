// ─────────────────────────────────────────────────────────────────────────────
// offlineSheetService.ts
//
// TanStack Query hooks for the Google-Sheet Offline Sales feature.
//
// Scalability design:
//  • Each hook embeds the full filter object in its queryKey, so 1000 concurrent
//    users with different filter combos get fully isolated cache entries. Two
//    users with identical filters share a single in-flight HTTP request (TQ
//    request deduplication).
//  • staleTime = 5 min  → repeated same-filter refreshes within 5 min are free.
//  • gcTime    = 15 min → cache stays alive while switching tabs.
//  • AbortController is threaded through so switching filters cancels the
//    superseded HTTP call immediately.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useQuery,
  useInfiniteQuery,
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

// ── Infinite-scroll list hook ─────────────────────────────────────────────────
// Uses useInfiniteQuery so cursor-based pages append without re-fetching
// existing rows — safe for 5000+ row datasets.

export function useOfflineSheetList(filters: OfflineSheetFilters, pageSize = 200) {
  return useInfiniteQuery<OfflineSheetListResponse>({
    queryKey: ['osheetList', filters, pageSize],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => {
      const extra: Record<string, string> = { limit: String(pageSize) };
      if (pageParam) extra.cursorId = pageParam as string;
      return apiClient.get<OfflineSheetListResponse>(
        `${BASE}?${buildQs(filters, extra)}`,
        { signal },
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursorId ?? undefined,
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
    placeholderData: keepPreviousData,
  });
}

// ── Sync mutation ─────────────────────────────────────────────────────────────
// Triggers GET /api/offline-sales/google-sheets and invalidates all osheet*
// queries so KPIs / charts / table auto-refresh after sync.

export function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation<OfflineSheetSyncResponse>({
    mutationFn: () =>
      apiClient.get<OfflineSheetSyncResponse>(`${BASE}/google-sheets`),
    onSuccess: () => {
      // Invalidate all offline-sheet query keys so every visible widget refetches
      qc.invalidateQueries({ queryKey: ['osheetCounts'] });
      qc.invalidateQueries({ queryKey: ['osheetSummary'] });
      qc.invalidateQueries({ queryKey: ['osheetList'] });
    },
  });
}
