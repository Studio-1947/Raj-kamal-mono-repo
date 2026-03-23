// ─────────────────────────────────────────────────────────────────────────────
// OfflineSheetPage.tsx
//
// Full Google-Sheet Offline Sales analysis page.
// Wires together filter controls, KPI tiles, charts, and virtualised table.
//
// Filter state lives in the URL (?days=90&q=...) via useOfflineSheetFilters.
// All data fetching is TanStack Query with filter-aware cache keys.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import AppLayout from '../../../shared/AppLayout';
import OfflineSheetKPI    from './OfflineSheetKPI';
import OfflineSheetCharts from './OfflineSheetCharts';
import OfflineSheetTable  from './OfflineSheetTable';
import {
  useOfflineSheetCounts,
  useOfflineSheetSummary,
  useOfflineSheetList,
  useTriggerSync,
} from './offlineSheetService';
import { useOfflineSheetFilters } from './useOfflineSheetFilters';
import type { OfflineSheetItem } from './offlineSheetTypes';

// ─── Filter bar ──────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: ReturnType<typeof useOfflineSheetFilters>['filters'];
  setDays: (d: number) => void;
  setDateRange: (s: string, e: string) => void;
  clearDateRange: () => void;
  setQ: (q: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  lastSyncResult?: string | null;
}

function FilterBar({
  filters,
  setDays,
  setDateRange,
  clearDateRange,
  setQ,
  onSync,
  isSyncing,
  lastSyncResult,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      {/* Days preset */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500">Period</label>
        <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
          {[30, 60, 90, 180, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1 font-medium transition-all ${
                filters.days === d && !filters.startDate
                  ? 'bg-white text-teal-700 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {d === 30 ? '1M' : d === 60 ? '2M' : d === 90 ? '3M' : d === 180 ? '6M' : '1Y'}
            </button>
          ))}
        </div>
      </div>

      {/* Date range override */}
      <div className="flex items-center gap-1">
        <label htmlFor="osheet-from" className="text-xs font-medium text-gray-500">From</label>
        <input
          id="osheet-from"
          type="date"
          aria-label="Start date"
          title="Start date"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
          value={filters.startDate?.slice(0, 10) ?? ''}
          onChange={(e) => {
            if (e.target.value && filters.endDate) setDateRange(new Date(e.target.value).toISOString(), filters.endDate);
            else if (e.target.value) setDateRange(new Date(e.target.value).toISOString(), new Date().toISOString());
          }}
        />
        <label htmlFor="osheet-to" className="text-xs font-medium text-gray-500">To</label>
        <input
          id="osheet-to"
          type="date"
          aria-label="End date"
          title="End date"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
          value={filters.endDate?.slice(0, 10) ?? ''}
          onChange={(e) => {
            if (e.target.value && filters.startDate) setDateRange(filters.startDate, new Date(e.target.value).toISOString());
          }}
        />
        {filters.startDate && (
          <button
            onClick={clearDateRange}
            className="rounded-md px-2 py-1 text-xs text-gray-500 hover:text-red-500"
            title="Clear date range"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
        <label className="text-xs font-medium text-gray-500">Search</label>
        <input
          type="text"
          placeholder="title, customer…"
          defaultValue={filters.q ?? ''}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
        />
      </div>

      {/* Sync button */}
      <div className="ml-auto flex items-center gap-2">
        {lastSyncResult && (
          <span className="text-xs text-teal-600">{lastSyncResult}</span>
        )}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-teal-700 disabled:opacity-60 transition-all"
        >
          {isSyncing ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Syncing…
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Sync Now
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfflineSheetPage() {
  const { filters, setDays, setDateRange, clearDateRange, setQ } = useOfflineSheetFilters();

  // Data hooks
  const countsQ  = useOfflineSheetCounts(filters);
  const summaryQ = useOfflineSheetSummary(filters);
  const listQ    = useOfflineSheetList(filters, 200);
  const syncMut  = useTriggerSync();

  // Flatten infinite pages into a single flat row array
  const allRows = useMemo<OfflineSheetItem[]>(() => {
    return (listQ.data?.pages ?? []).flatMap((p) => p.items);
  }, [listQ.data]);

  const syncMsg = syncMut.isSuccess
    ? `✓ Synced ${syncMut.data?.importedCount ?? 0} rows`
    : syncMut.isError
    ? '✗ Sync failed'
    : null;

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between pt-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Google Sheet Offline Sales
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Live analysis of ERP-synced offline transactions
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-200">
          <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
          GSheet Offline Sales
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-5">
        <FilterBar
          filters={filters}
          setDays={setDays}
          setDateRange={setDateRange}
          clearDateRange={clearDateRange}
          setQ={setQ}
          onSync={() => syncMut.mutate()}
          isSyncing={syncMut.isPending}
          lastSyncResult={syncMsg}
        />
      </div>

      {/* KPI tiles */}
      <div className="mb-6">
        <OfflineSheetKPI
          data={countsQ.data}
          isLoading={countsQ.isLoading}
        />
      </div>

      {/* Charts */}
      <div className="mb-6">
        <OfflineSheetCharts
          data={summaryQ.data}
          isLoading={summaryQ.isLoading}
          days={filters.days}
        />
      </div>

      {/* Table header row */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Transactions
          {allRows.length > 0 && (
            <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-200">
              {allRows.length.toLocaleString('en-IN')} loaded
            </span>
          )}
        </h2>
        {listQ.isLoading && (
          <p className="text-xs text-gray-400 animate-pulse">Loading records…</p>
        )}
        {listQ.isError && !listQ.isLoading && (
          <p className="text-xs text-red-500">Failed to load records</p>
        )}
      </div>

      {/* Virtualised table */}
      <OfflineSheetTable
        rows={allRows}
        hasNextPage={listQ.hasNextPage}
        isFetchingNextPage={listQ.isFetchingNextPage}
        fetchNextPage={listQ.fetchNextPage}
      />
    </AppLayout>
  );
}
