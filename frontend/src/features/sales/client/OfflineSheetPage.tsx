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
import OfflineSheetProjection from './OfflineSheetProjection';
import {
  useOfflineSheetCounts,
  useOfflineSheetSummary,
  useOfflineSheetList,
  useTriggerSync,
} from './offlineSheetService';
import { useOfflineSheetFilters } from './useOfflineSheetFilters';
import type { OfflineSheetFilters } from './offlineSheetTypes';

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
      <div className="text-xl font-medium text-black">
        Showing Page <span className="px-1 text-teal-700">{currentPage}</span> of <span className="px-1">{totalPages}</span>
        <span className="ml-4 text-base font-medium text-gray-700">({totalCount.toLocaleString()} total transactions)</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="rounded-xl border-2 border-gray-200 bg-white px-6 py-2 text-lg font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95"
        >
          ← Previous
        </button>
        <button
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="rounded-xl border-2 border-teal-600 bg-teal-600 px-8 py-2 text-lg font-medium text-white shadow-md hover:bg-teal-700 disabled:opacity-50 transition-all active:scale-95"
        >
          Next Page →
        </button>
      </div>
    </div>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: OfflineSheetFilters;
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

function FilterField({ id, label, placeholder, value, onChange, type = "text", width = "w-48" }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-black uppercase tracking-wider">{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : (type === 'number' ? Number(e.target.value) : e.target.value))}
        className={`${width} rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-base font-medium text-black border-black/10 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all`}
      />
    </div>
  );
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
    <div className="flex flex-col gap-6 rounded-2xl border-4 border-gray-200 bg-white p-6 shadow-2xl">
      {/* Top row: Global Search, Quick Period, and Sync */}
      <div className="flex flex-wrap items-end gap-6 border-b-2 border-gray-100 pb-6">
        <div className="flex flex-1 min-w-[350px] flex-col gap-1.5">
          <label htmlFor="search-input" className="text-sm font-medium text-black uppercase tracking-wider">Global Search (All columns)</label>
          <div className="relative">
            <input
              id="search-input"
              type="text"
              placeholder="Search Title, Customer, State, Publisher..."
              defaultValue={filters.q ?? ''}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border-2 border-teal-600 bg-teal-50/10 px-5 py-3 text-lg font-medium text-black placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-black uppercase tracking-wider">Quick Period</span>
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            {[30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  filters.days === d && !filters.startDate
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {d === 30 ? '1M' : d === 90 ? '3M' : d === 180 ? '6M' : '1Y'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {lastSyncResult && (
            <span className="text-xs font-medium text-teal-700 bg-teal-100 px-3 py-1.5 rounded-full border border-teal-200">{lastSyncResult}</span>
          )}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-base font-medium text-white shadow-xl hover:bg-gray-800 active:scale-95 disabled:opacity-60 transition-all"
          >
            {isSyncing ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
            {isSyncing ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>
      </div>

      {/* Second row: Spreadsheet-style Column Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-x-6 gap-y-4">
        <FilterField 
          id="f-cust" label="Customer Name" placeholder="e.g. Quick Offset" 
          value={filters.customerName} onChange={(v:any) => updateFilter('customerName', v)}
          width="w-full"
        />
        <FilterField 
          id="f-pub" label="Publisher" placeholder="e.g. Lokbharti" 
          value={filters.publisher} onChange={(v:any) => updateFilter('publisher', v)}
          width="w-full"
        />
        <FilterField 
          id="f-auth" label="Author" placeholder="e.g. Premchand" 
          value={filters.author} onChange={(v:any) => updateFilter('author', v)}
          width="w-full"
        />
        <FilterField 
          id="f-isbn" label="ISBN / Code" placeholder="Search ISBN..." 
          value={filters.isbn} onChange={(v:any) => updateFilter('isbn', v)}
          width="w-full"
        />
        <FilterField 
          id="f-state" label="State" placeholder="e.g. Delhi" 
          value={filters.state} onChange={(v:any) => updateFilter('state', v)}
          width="w-full"
        />
        <FilterField 
          id="f-city" label="City" placeholder="e.g. Varanasi" 
          value={filters.city} onChange={(v:any) => updateFilter('city', v)}
          width="w-full"
        />
        <FilterField 
          id="f-binding" label="Binding" placeholder="Paperback/Hardcover" 
          value={filters.binding} onChange={(v:any) => updateFilter('binding', v)}
          width="w-full"
        />
      </div>

      {/* Third row: Dates, Ranges and Reset */}
      <div className="flex flex-wrap items-end gap-8 pt-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-black uppercase tracking-wider">Date Range</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="rounded-xl border-2 border-gray-200 px-3 py-2 text-base font-medium border-black/10 focus:border-teal-600 focus:outline-none"
              value={filters.startDate?.slice(0, 10) ?? ''}
              onChange={(e) => {
                if (e.target.value) setDateRange(new Date(e.target.value).toISOString(), filters.endDate || new Date().toISOString());
              }}
            />
            <span className="text-black font-medium">→</span>
            <input
              type="date"
              className="rounded-xl border-2 border-gray-200 px-3 py-2 text-base font-medium border-black/10 focus:border-teal-600 focus:outline-none"
              value={filters.endDate?.slice(0, 10) ?? ''}
              onChange={(e) => {
                if (e.target.value) setDateRange(filters.startDate || new Date(0).toISOString(), new Date(e.target.value).toISOString());
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-black uppercase tracking-wider">Price Range (₹)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minAmount ?? ''}
              onChange={(e) => updateFilter('minAmount', e.target.value ? Number(e.target.value) : undefined)}
              className="w-28 rounded-xl border-2 border-gray-200 px-3 py-2 text-base font-medium border-black/10 focus:border-teal-600 focus:outline-none"
            />
            <span className="text-gray-400 font-medium">—</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxAmount ?? ''}
              onChange={(e) => updateFilter('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
              className="w-28 rounded-xl border-2 border-gray-200 px-3 py-2 text-base font-medium border-black/10 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={clearAll}
          className="ml-auto text-base font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-6 py-2.5 rounded-xl border-2 border-red-200 transition-all active:scale-95"
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
      <div className="mb-6 flex items-center justify-between pt-6">
        <div>
          <h1 className="text-3xl font-medium text-black tracking-tight uppercase">
            Master Sales Dashboard
          </h1>
          <p className="mt-1 text-base font-medium text-gray-500">
            Advanced Spreadsheet-style Filters & Legibility Optimized Data View
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-xl ring-4 ring-teal-500/20">
          <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
          Live ERP Data
        </div>
      </div>

      <div className="mb-8">
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

      <div className="mb-8">
        <OfflineSheetKPI 
          data={countsQ.data} 
          isLoading={countsQ.isLoading} 
        />
      </div>

      <div className="mb-12">
        <OfflineSheetProjection
          data={summaryQ.data}
          isLoading={summaryQ.isLoading}
        />
      </div>

      <div className="mb-12">
        <OfflineSheetCharts 
          data={summaryQ.data} 
          isLoading={summaryQ.isLoading}
          days={filters.days}
        />
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-2xl font-medium text-black border-b-4 border-black pb-1 inline-block uppercase">Recent Transactions</h3>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
            {totalCount.toLocaleString()} TOTAL ROWS
          </span>
        </div>
        <OfflineSheetTable 
          rows={allRows} 
          filters={filters} 
          onFilterChange={updateFilter} 
        />
        <Pagination
          currentPage={filters.page || 1}
          totalCount={totalCount}
          pageSize={filters.limit || 100}
          setPage={setPage}
          isLoading={listQ.isFetching}
        />
      </div>
    </AppLayout>
  );
}
