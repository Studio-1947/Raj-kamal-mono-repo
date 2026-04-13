import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { OfflineSheetFilters } from './offlineSheetTypes';

export function useOfflineSheetFilters() {
  const [s, setS] = useSearchParams();

  const filters = useMemo<OfflineSheetFilters>(() => ({
    days: s.get('days') ? Number(s.get('days')) : 90,
    startDate: s.get('startDate') || undefined,
    endDate: s.get('endDate') || undefined,
    q: s.get('q') || undefined,
    state: s.get('state') || undefined,
    city: s.get('city') || undefined,
    publisher: s.get('publisher') || undefined,
    author: s.get('author') || undefined,
    isbn: s.get('isbn') || undefined,
    customerName: s.get('customerName') || undefined,
    binding: s.get('binding') || undefined,
    minAmount: s.get('minAmount') ? Number(s.get('minAmount')) : undefined,
    maxAmount: s.get('maxAmount') ? Number(s.get('maxAmount')) : undefined,
    page: s.get('page') ? Number(s.get('page')) : 1,
    limit: s.get('limit') ? Number(s.get('limit')) : 100,
  }), [s]);

  const setDays = useCallback((days: number) => {
    setS((prev) => {
      prev.set('days', String(days));
      prev.delete('startDate');
      prev.delete('endDate');
      prev.set('page', '1');
      return prev;
    });
  }, [setS]);

  const setDateRange = useCallback((start: string, end: string) => {
    setS((prev) => {
      prev.set('startDate', start);
      prev.set('endDate', end);
      prev.delete('days');
      prev.set('page', '1');
      return prev;
    });
  }, [setS]);

  const clearDateRange = useCallback(() => {
    setS((prev) => {
      prev.delete('startDate');
      prev.delete('endDate');
      prev.set('days', '90');
      prev.set('page', '1');
      return prev;
    });
  }, [setS]);

  const setQ = useCallback((q: string) => {
    setS((prev) => {
      if (q) prev.set('q', q);
      else prev.delete('q');
      prev.set('page', '1');
      return prev;
    });
  }, [setS]);

  const setPage = useCallback((p: number) => {
    setS((prev) => {
      prev.set('page', String(p));
      return prev;
    });
  }, [setS]);

  const updateFilter = useCallback((key: keyof OfflineSheetFilters, value: string | number | undefined) => {
    setS((prev) => {
      if (value === undefined || value === '') {
        prev.delete(key);
      } else {
        prev.set(key, String(value));
      }
      prev.set('page', '1');
      return prev;
    });
  }, [setS]);

  const clearAll = useCallback(() => {
    setS({ days: '90', page: '1', limit: '100' });
  }, [setS]);

  const isFiltered = useMemo(() => {
    return !!(filters.q || filters.state || filters.city || filters.publisher || filters.author || filters.isbn || filters.customerName || filters.binding || filters.minAmount || filters.maxAmount || filters.startDate);
  }, [filters]);

  return { filters, setDays, setDateRange, clearDateRange, setQ, setPage, updateFilter, clearAll, isFiltered };
}
