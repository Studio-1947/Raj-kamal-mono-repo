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
    return { days, startDate, endDate, q };
  }, [searchParams]);

  // Debounce timer ref — used by setQ so rapid typing doesn't spam URL writes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDays = useCallback((days: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('days', String(days));
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
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearDateRange = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('startDate');
      next.delete('endDate');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  /** Debounced — safe to call on every keystroke */
  const setQ = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (q.trim()) next.set('q', q.trim());
        else next.delete('q');
        return next;
      }, { replace: true });
    }, 300);
  }, [setSearchParams]);

  return { filters, setDays, setDateRange, clearDateRange, setQ };
}
