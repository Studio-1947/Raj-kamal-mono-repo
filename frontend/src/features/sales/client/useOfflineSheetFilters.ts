import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { OfflineSheetFilters } from './offlineSheetTypes';

export function getFinancialYearStartDate(date: Date = new Date()): Date {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth(); // 0-indexed: April is 3
  
  if (currentMonth >= 3) {
    // April to December
    return new Date(Date.UTC(currentYear, 3, 1, 0, 0, 0, 0));
  } else {
    // January to March
    return new Date(Date.UTC(currentYear - 1, 3, 1, 0, 0, 0, 0));
  }
}

export function useOfflineSheetFilters() {
  const [s, setS] = useSearchParams();

  const filters = useMemo<OfflineSheetFilters>(() => {
    const days = s.get('days') ? Number(s.get('days')) : undefined;
    const startDate = s.get('startDate') || undefined;
    const endDate = s.get('endDate') || undefined;

    let finalStartDate = startDate;
    let finalEndDate = endDate;

    // Default to Indian Financial Year to Date (FYTD) if no date filter parameters are set.
    // Pin endDate to end-of-day (UTC) so the value is stable for the whole day — otherwise
    // its millisecond timestamp makes every request a unique cache key (backend + react-query),
    // defeating caching for the default view.
    if (days === undefined && startDate === undefined && endDate === undefined) {
      finalStartDate = getFinancialYearStartDate().toISOString();
      const endOfDay = new Date();
      endOfDay.setUTCHours(23, 59, 59, 999);
      finalEndDate = endOfDay.toISOString();
    }

    return {
      days,
      startDate: finalStartDate,
      endDate: finalEndDate,
      q: s.get('q') || undefined,
      state: s.get('state') || undefined,
      city: s.get('city') || undefined,
      publisher: s.get('publisher') || undefined,
      author: s.get('author') || undefined,
      isbn: s.get('isbn') || undefined,
      customerName: s.get('customerName') || undefined,
      binding: s.get('binding') || undefined,
      title: s.get('title') || undefined,
      type: s.get('type') || undefined,
      fictionType: s.get('fictionType') || undefined,
      minAmount: s.get('minAmount') ? Number(s.get('minAmount')) : undefined,
      maxAmount: s.get('maxAmount') ? Number(s.get('maxAmount')) : undefined,
      page: s.get('page') ? Number(s.get('page')) : 1,
      limit: s.get('limit') ? Number(s.get('limit')) : 100,
    };
  }, [s]);

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
      prev.delete('days');
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

  const updateFilters = useCallback((updates: Partial<Record<keyof OfflineSheetFilters, string | number | undefined>>) => {
    setS((prev) => {
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          prev.delete(key);
        } else {
          prev.set(key, String(value));
        }
      });
      prev.set('page', '1');
      return prev;
    });
  }, [setS]);

  const clearAll = useCallback(() => {
    setS({ page: '1', limit: '100' });
  }, [setS]);

  const isFiltered = useMemo(() => {
    return !!(filters.q || filters.state || filters.city || filters.publisher || filters.author || filters.isbn || filters.customerName || filters.binding || filters.minAmount || filters.maxAmount || filters.startDate || filters.title || filters.type || filters.fictionType);
  }, [filters]);

  return { filters, setDays, setDateRange, clearDateRange, setQ, setPage, updateFilter, updateFilters, clearAll, isFiltered };
}
