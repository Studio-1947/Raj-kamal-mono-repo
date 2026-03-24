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
import type { OfflineSheetItem, OfflineSheetFilters } from './offlineSheetTypes';

// ─── Pagination Component ───────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  setPage: (p: number) => void;
  isLoading?: boolean;
}

function Pagination({ currentPage, totalCount, pageSize, setPage, isLoading }: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-between border-t-2 border-gray-100 pt-6">
      <div className="text-xl font-black text-gray-900">
        Showing Page <span className="px-1 text-teal-700">{currentPage}</span> of <span className="px-1">{totalPages}</span>
        <span className="ml-4 text-base font-black text-gray-700">({totalCount.toLocaleString()} total transactions)</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="rounded-xl border-2 border-gray-200 bg-white px-6 py-2 text-lg font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95"
        >
          ← Previous
        </button>
        <button
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="rounded-xl border-2 border-teal-600 bg-teal-600 px-8 py-2 text-lg font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-50 transition-all active:scale-95"
        >
          Next Page →
        </button>
      </div>
    </div>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: ReturnType<typeof useOfflineSheetFilters>['filters'];
  setDays: (d: number) => void;
  setDateRange: (s: string, e: string) => void;
  clearDateRange: () => void;
  setQ: (q: string) => void;
  updateFilter: (key: keyof OfflineSheetFilters, value: string | number | undefined) => void;
  clearAll: () => void;
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
  updateFilter,
  clearAll,
  onSync,
  isSyncing,
  lastSyncResult,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-teal-100 bg-white p-6 shadow-md">
      {/* Top row: Search and Sync */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-1 min-w-[300px] items-center gap-3">
          <label htmlFor="search-input" className="text-xl font-black text-black">Filter by Title / Customer / State / Publisher:</label>
          <div className="relative flex-1">
            <input
              id="search-input"
              type="text"
              placeholder="Search by Title, Customer, State or Publisher..."
              defaultValue={filters.q ?? ''}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-5 py-3 text-lg text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-50/50 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastSyncResult && (
            <span className="text-sm font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">{lastSyncResult}</span>
          )}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-lg font-bold text-white shadow-lg hover:bg-teal-700 active:scale-95 disabled:opacity-60 transition-all"
          >
            {isSyncing ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent" />
                Updating Data...
              </>
            ) : (
              <>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Now
              </>
            )}
          </button>
        </div>
      </div>

      <div className="h-px bg-gray-100 w-full" />

      {/* Second row: Presets and Dates */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-black">Select Period:</span>
          <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-1.5">
            {[30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-5 py-2 text-base font-bold transition-all ${
                  filters.days === d && !filters.startDate
                    ? 'bg-white text-teal-700 shadow-md ring-2 ring-teal-100'
                    : 'text-black hover:bg-gray-200'
                }`}
              >
                {d === 30 ? '1 Month' : d === 90 ? '3 Months' : d === 180 ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-black">Date Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="From Date"
              className="rounded-xl border-2 border-gray-200 px-3 py-2 text-base font-medium focus:border-teal-500 focus:outline-none"
              value={filters.startDate?.slice(0, 10) ?? ''}
              onChange={(e) => {
                if (e.target.value) setDateRange(new Date(e.target.value).toISOString(), filters.endDate || new Date().toISOString());
              }}
            />
            <span className="text-black font-black px-1">to</span>
            <input
              type="date"
              aria-label="To Date"
              className="rounded-xl border-2 border-gray-200 px-3 py-2 text-base font-medium focus:border-teal-500 focus:outline-none"
              value={filters.endDate?.slice(0, 10) ?? ''}
              onChange={(e) => {
                if (e.target.value) setDateRange(filters.startDate || new Date(0).toISOString(), new Date(e.target.value).toISOString());
              }}
            />
            {(filters.startDate || filters.endDate) && (
              <button
                onClick={clearDateRange}
                className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Clear date range"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-100 w-full" />

      {/* Third row: Advanced Filters */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <label htmlFor="filter-state" className="text-base font-bold text-gray-700">State:</label>
          <input
            id="filter-state"
            type="text"
            placeholder="e.g. Delhi"
            value={filters.state ?? ''}
            onChange={(e) => updateFilter('state', e.target.value)}
            className="w-32 rounded-xl border-2 border-gray-200 px-4 py-2 text-base focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="filter-publisher" className="text-base font-bold text-gray-700">Publisher:</label>
          <input
            id="filter-publisher"
            type="text"
            placeholder="Search Publisher..."
            value={filters.publisher ?? ''}
            onChange={(e) => updateFilter('publisher', e.target.value)}
            className="w-48 rounded-xl border-2 border-gray-200 px-4 py-2 text-base focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 border-l pl-6 border-gray-200">
          <span className="text-base font-bold text-gray-700">Amount:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minAmount ?? ''}
              onChange={(e) => updateFilter('minAmount', e.target.value ? Number(e.target.value) : undefined)}
              className="w-24 rounded-xl border-2 border-gray-200 px-3 py-2 text-base focus:border-teal-500 focus:outline-none"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxAmount ?? ''}
              onChange={(e) => updateFilter('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
              className="w-24 rounded-xl border-2 border-gray-200 px-3 py-2 text-base focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={clearAll}
          className="ml-auto text-base font-bold text-red-600 hover:text-red-700 hover:underline px-4 py-2"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfflineSheetPage() {
  const { filters, setDays, setDateRange, clearDateRange, setQ, updateFilter, setPage, clearAll } = useOfflineSheetFilters();

  // Data hooks
  const countsQ  = useOfflineSheetCounts(filters);
  const summaryQ = useOfflineSheetSummary(filters);
  const listQ    = useOfflineSheetList(filters);
  const syncMut  = useTriggerSync();

  const allRows = listQ.data?.items ?? [];
  const totalCount = listQ.data?.totalCount ?? 0;

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
          updateFilter={updateFilter}
          clearAll={clearAll}
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
        <h2 className="text-xl font-bold text-gray-700">
          Recent Transactions
          {allRows.length > 0 && (
            <span className="ml-3 rounded-full bg-teal-100 px-3 py-1 text-sm font-bold text-teal-800 ring-2 ring-teal-200">
              {allRows.length.toLocaleString('en-IN')} rows showing
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
      {/* Transactions table and pagination */}
      <OfflineSheetTable rows={allRows} />

      <Pagination
        currentPage={filters.page || 1}
        totalCount={totalCount}
        pageSize={filters.limit || 100}
        setPage={setPage}
        isLoading={listQ.isFetching}
      />
    </AppLayout>
  );
}
