// ─────────────────────────────────────────────────────────────────────────────
// useOfflineSheetFilters.ts
//
// URL-param-driven filter state hook.
// Persists filters in the URL (?days=90&q=...&startDate=...&endDate=...) so:
//  • Each user's browser tab has a fully shareable, bookmarkable URL.
//  • TanStack Query cache keys (derived from the filter object) stay stable.
//  • Changing from 90d to 30d and back = 0 HTTP requests (cache hit).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { OfflineSheetFilters } from './offlineSheetTypes';

const DEFAULT_DAYS = 90;

export function useOfflineSheetFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: OfflineSheetFilters = useMemo(() => {
    const days      = Number(searchParams.get('days')) || DEFAULT_DAYS;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate   = searchParams.get('endDate')   || undefined;
    const q         = searchParams.get('q')         || undefined;
    const state     = searchParams.get('state')     || undefined;
    const city      = searchParams.get('city')      || undefined;
    const publisher = searchParams.get('publisher') || undefined;
    const author    = searchParams.get('author')    || undefined;
    const minAmount = searchParams.get('minAmount') ? Number(searchParams.get('minAmount')) : undefined;
    const maxAmount = searchParams.get('maxAmount') ? Number(searchParams.get('maxAmount')) : undefined;
    const page      = Number(searchParams.get('page')) || 1;
    const limit     = Number(searchParams.get('limit')) || 100;

    return { days, startDate, endDate, q, state, city, publisher, author, minAmount, maxAmount, page, limit };
  }, [searchParams]);

  // Debounce timer ref — used by setQ so rapid typing doesn't spam URL writes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDays = useCallback((days: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('days', String(days));
      next.set('page', '1'); // Reset to page 1 on filter change
      // Clear date-range overrides when switching days preset
      next.delete('startDate');
      next.delete('endDate');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setDateRange = useCallback((startDate: string, endDate: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('startDate', startDate);
      next.set('endDate', endDate);
      next.set('page', '1');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearDateRange = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('startDate');
      next.delete('endDate');
      next.set('page', '1');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const updateFilter = useCallback((key: keyof OfflineSheetFilters, value: string | number | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
      
      if (key !== 'page') next.set('page', '1'); // Reset to page 1 on filter change
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setPage = useCallback((page: number) => {
    updateFilter('page', page);
  }, [updateFilter]);

  /** Debounced — safe to call on every keystroke */
  const setQ = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilter('q', q.trim());
    }, 300);
  }, [updateFilter]);

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams({ days: String(DEFAULT_DAYS), page: '1' }), { replace: true });
  }, [setSearchParams]);

  return { 
    filters, 
    setDays, 
    setDateRange, 
    clearDateRange, 
    setQ, 
    updateFilter,
    setPage,
    clearAll 
  };
}
