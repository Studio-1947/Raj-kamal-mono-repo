// ─────────────────────────────────────────────────────────────────────────────
// OfflineSheetPage.tsx
//
// Full Google-Sheet Offline Sales analysis page.
// Wires together filter controls, KPI tiles, charts, and virtualised table.
//
// Filter state lives in the URL (?days=90&q=...) via useOfflineSheetFilters.
// All data fetching is TanStack Query with filter-aware cache keys.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../../../shared/AppLayout';
import PageHero from '../../../shared/PageHero';
import StickyTabs from '../../../shared/StickyTabs';
import { fuzzyMatch, useDebounce } from '../../../shared/searchUtils';
import OfflineSheetKPI    from './OfflineSheetKPI';
import OfflineSheetCharts from './OfflineSheetCharts';
import OfflineSheetTable  from './OfflineSheetTable';
import OfflineSheetProjection from './OfflineSheetProjection';
import BookFairSubFairs from './BookFairSubFairs';
import {
  useOfflineSheetCounts,
  useOfflineSheetSummary,
  useOfflineSheetList,
  useTriggerSync,
  useOfflineSheetOptions,
  useHistoryChannelList,
  useHistoryChannelCounts,
  useHistoryChannelOptions,
} from './offlineSheetService';
import { useOfflineSheetFilters, getFinancialYearStartDate } from './useOfflineSheetFilters';
import type { OfflineSheetFilters } from './offlineSheetTypes';
import {
  NewOldContributionView,
  FocusTabGrowthView,
  YoYComparisonView,
  AuthorPerformanceView,
  PriceReprintAnalysisView,
  CategorySalesView,
} from '../../../views/total-offline-sales/components';
import { apiClient } from '../../../lib/apiClient';

const REGION_TO_CHANNEL: Record<string, string> = {
  delhi: 'Delhi',
  mumbai: 'Mumbai',
  patna: 'Patna',
  online: 'Online',
  bookfair: 'BookFair',
  lokbharti: 'Lokbharti',
};

// Per-region banner copy (title + kicker + optional decorative image) for the PageHero.
// Drop PNGs in `frontend/public/hero/` to enable the right-side illustration.
const REGION_HERO: Record<string, { title: string; kicker: string; image?: string }> = {
  delhi:     { title: 'Delhi',     kicker: 'Offline Sales Data' },
  mumbai:    { title: 'Mumbai',    kicker: 'Offline Sales Data' },
  patna:     { title: 'Patna',     kicker: 'Offline Sales Data' },
  online:    { title: 'Website',   kicker: 'Online Sales Data', image: '/hero/website.svg' },
  bookfair:  { title: 'BookFair',  kicker: 'Offline Sales Data' },
  lokbharti: { title: 'Lokbharti', kicker: 'Offline Sales Data' },
};

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
      <div className="text-xl font-normal text-black">
        Showing Page <span className="px-1 text-teal-700">{currentPage}</span> of <span className="px-1">{totalPages}</span>
        <span className="ml-4 text-base font-normal text-gray-700">({totalCount.toLocaleString()} total transactions)</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="rounded-xl border-2 border-gray-200 bg-white px-6 py-2 text-lg font-normal text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95"
        >
          ← Previous
        </button>
        <button
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="rounded-xl border-2 border-teal-600 bg-teal-600 px-8 py-2 text-lg font-normal text-white shadow-md hover:bg-teal-700 disabled:opacity-50 transition-all active:scale-95"
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
  updateFilters: (updates: Partial<Record<keyof OfflineSheetFilters, string | number | undefined>>) => void;
  clearAll: () => void;
  onSync: () => void;
  isSyncing: boolean;
  lastSyncResult?: string | null;
  region?: 'delhi' | 'mumbai' | 'patna' | 'online' | 'bookfair' | 'lokbharti';
  historyMode?: boolean;
  optionsOverride?: any;
}

function FilterField({ id, label, placeholder, value, onChange, type = "text", width = "w-48" }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-normal text-black uppercase tracking-wider">{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : (type === 'number' ? Number(e.target.value) : e.target.value))}
        className={`${width} rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-base font-normal text-black border-black/10 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all`}
      />
    </div>
  );
}

function FilterDropdown({ id, label, placeholder, value, onChange, width = "w-full", options = [] }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce setting of filterQuery and wrap in transition to ensure input field remains fluid and responsive
  useEffect(() => {
    if (search === '') {
      setFilterQuery('');
      return;
    }
    const handler = setTimeout(() => {
      startTransition(() => {
        setFilterQuery(search);
      });
    }, 150);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Client-side fuzzy sorting of dropdown options
  const filteredOptions = useMemo(() => {
    if (!filterQuery) return options;
    return options
      .map((opt: string) => {
        const match = fuzzyMatch(opt, filterQuery);
        return { opt, ...match };
      })
      .filter((item: any) => item.matches)
      .sort((a: any, b: any) => b.score - a.score)
      .map((item: any) => item.opt);
  }, [options, filterQuery]);

  return (
    <div className={`flex flex-col gap-1.5 relative ${width}`} ref={dropdownRef}>
      <label htmlFor={id} className="text-sm font-normal text-gray-800 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          placeholder={placeholder}
          value={isOpen ? search : (value ?? '')}
          onFocus={(e) => {
            setIsOpen(true);
            setSearch(value ?? '');
            try { e.currentTarget.select(); } catch (err) {}
          }}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
             if (e.key === 'Enter' && search) {
                onChange(search);
                setIsOpen(false);
             }
          }}
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-base font-normal text-black border-black/10 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
           {isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent inline-block" />
           ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
           )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[100] max-h-60 overflow-auto rounded-2xl border-2 border-gray-100 bg-white shadow-2xl ring-4 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
          {filteredOptions.length > 0 ? (
            filteredOptions.slice(0, 100).map((opt: string, i: number) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="w-full px-5 py-3 text-left text-base font-normal text-black hover:bg-teal-50 hover:text-teal-700 transition-colors border-b border-gray-50 last:border-0"
              >
                {opt}
              </button>
            ))
          ) : (
             <div className="px-5 py-3 text-base text-gray-400 italic text-center">No matches found</div>
          )}
          {search && !filteredOptions.includes(search) && (
            <button 
               type="button"
               onMouseDown={() => { onChange(search); setIsOpen(false); }}
               className="w-full px-5 py-3 text-left text-xs font-normal text-black bg-teal-50/50 hover:bg-teal-100 uppercase tracking-tight sticky bottom-0 border-t border-teal-100"
            >
              Use Custom: "{search}"
            </button>
          )}
        </div>
      )}
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
  updateFilters,
  clearAll,
  onSync,
  isSyncing,
  lastSyncResult,
  region = 'delhi',
  historyMode = false,
  optionsOverride,
}: FilterBarProps) {
  const [searchParams] = useSearchParams();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(filters.q ?? '');
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const liveOptions = useOfflineSheetOptions(region);
  const optData = optionsOverride ?? liveOptions.data;
 
  const displayStartDate = React.useMemo(() => {
    if (filters.startDate) return filters.startDate.slice(0, 10);
    if (filters.days) {
      const d = new Date();
      d.setDate(d.getDate() - filters.days);
      return d.toISOString().slice(0, 10);
    }
    return getFinancialYearStartDate().toISOString().slice(0, 10);
  }, [filters.startDate, filters.days]);
 
  const displayEndDate = React.useMemo(() => {
    if (filters.endDate) return filters.endDate.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  }, [filters.endDate]);

  // Sync local search query if filters.q or other main text filters change externally (e.g. on clear)
  React.useEffect(() => {
    if (filters.q !== undefined) {
      setSearchQuery(filters.q);
    } else {
      const activeTextFilter = filters.title || filters.customerName || filters.publisher || filters.author;
      setSearchQuery(activeTextFilter ?? '');
    }
  }, [filters.q, filters.title, filters.customerName, filters.publisher, filters.author]);

  // Click outside to close global suggestions dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce the query for auto-searching (500ms delay)
  const debouncedSearchFilter = useDebounce(searchQuery, 500);

  // Auto-run search when typing stops
  React.useEffect(() => {
    if ((filters.q ?? '') !== debouncedSearchFilter) {
      setQ(debouncedSearchFilter);
    }
  }, [debouncedSearchFilter, setQ, filters.q]);

  // Debounce for suggestions matching (150ms delay)
  const debouncedSuggestQuery = useDebounce(searchQuery, 150);

  // Compute suggestions list based on options
  const suggestions = useMemo(() => {
    if (!debouncedSuggestQuery || !optData) return [];
    
    const results: { value: string; type: string; score: number }[] = [];
    const query = debouncedSuggestQuery.trim();
    if (!query) return [];

    const addMatches = (list: string[] | undefined, type: string) => {
      if (!list) return;
      for (const item of list) {
        const match = fuzzyMatch(item, query);
        if (match.matches) {
          results.push({ value: item, type, score: match.score });
        }
      }
    };

    addMatches(optData.bookTitles, 'Book');
    addMatches(optData.customerNames, 'Customer');
    addMatches(optData.publishers, 'Publisher');
    addMatches(optData.authors, 'Author');

    // Sort combined results by relevance score, taking top 15
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }, [optData, debouncedSuggestQuery]);

  // Helper to count active filters excluding defaults.
  // In history mode, startDate/endDate are the FYTD auto-defaults (not user-set),
  // so exclude them so the chip count and chip strip don't show misleading 2026 dates.
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (key === 'page' || key === 'limit') return false;
    if (historyMode && (key === 'startDate' || key === 'endDate')) return false;
    return value !== undefined && value !== '' && value !== null;
  });

  return (
    <div className="flex flex-col gap-6 rounded-2xl border-4 border-gray-200 bg-white p-6 shadow-2xl transition-all duration-300">
      {/* Top row: Global Search, Quick Period, and Sync */}
      <div className="flex flex-wrap items-end gap-6 border-b-2 border-gray-100 pb-6">
        <div className="flex flex-1 min-w-[350px] flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="search-input" className="text-sm font-normal text-black uppercase tracking-wider">Global Search (All columns)</label>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-normal text-teal-700 hover:text-teal-900 flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-md border border-teal-100 transition-colors"
            >
              {isExpanded ? 'Collapse Filters ↑' : `Manage Advanced Filters (${activeFilters.length}) ↓`}
            </button>
          </div>
          
          <div className="relative w-full" ref={dropdownRef}>
            <input
              id="search-input"
              type="text"
              placeholder="Search Title, Binding, Customer, State, Publisher..."
              value={searchQuery}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setQ(searchQuery);
                  setIsOpen(false);
                }
              }}
              className="w-full rounded-xl border-2 border-teal-600 bg-teal-50/10 px-5 py-3 text-lg font-normal text-black placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all pr-12"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-teal-600/50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>

            {/* Suggestions Dropdown for Global Search */}
            {isOpen && searchQuery.trim() !== '' && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[120] max-h-80 overflow-y-auto rounded-2xl border-2 border-gray-150 bg-white shadow-2xl ring-4 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                {suggestions.length > 0 ? (
                  suggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => {
                        // Update specific filters based on suggestion type for superior UX
                        if (sug.type === 'Book') {
                          updateFilters({ title: sug.value, q: undefined });
                          setSearchQuery(sug.value);
                        } else if (sug.type === 'Customer') {
                          updateFilters({ customerName: sug.value, q: undefined });
                          setSearchQuery(sug.value);
                        } else if (sug.type === 'Publisher') {
                          updateFilters({ publisher: sug.value, q: undefined });
                          setSearchQuery(sug.value);
                        } else if (sug.type === 'Author') {
                          updateFilters({ author: sug.value, q: undefined });
                          setSearchQuery(sug.value);
                        } else {
                          updateFilters({ q: sug.value });
                          setSearchQuery(sug.value);
                        }
                        setIsOpen(false);
                      }}
                      className="w-full px-5 py-3.5 text-left text-base font-normal text-black hover:bg-teal-50 hover:text-teal-700 transition-colors border-b border-gray-50 last:border-0 flex justify-between items-center"
                    >
                      <span className="truncate pr-4 font-normal text-gray-900">{sug.value}</span>
                      <span className="text-[10px] shrink-0 font-medium uppercase tracking-wider text-teal-600 bg-teal-50/80 border border-teal-100 px-2.5 py-1 rounded-md">{sug.type}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-5 py-4 text-base text-gray-400 italic text-center">No matching suggestions found</div>
                )}
              </div>
            )}
          </div>

          {/* Quick Binding Selectors */}
          <div className="mt-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-500">
            <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-200 pr-4">Quick Binding:</span>
            <div className="flex flex-wrap items-center gap-4">
              {(optData?.bindings ?? ['Paperback', 'Hardbound']).slice(0, 6).map((b: string) => {
                const isActive = (filters.binding ?? '').split(',').includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      const current = (filters.binding ?? '').split(',').filter(Boolean);
                      const next = current.includes(b) ? current.filter(x => x !== b) : [...current, b];
                      updateFilter('binding', next.join(',') || undefined);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all active:scale-95 ${
                      isActive 
                        ? 'bg-teal-600 border-teal-600 text-white shadow-md' 
                        : 'bg-white border-gray-100 text-gray-500 hover:border-teal-200 hover:bg-teal-50/30'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-md flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                      {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <span className="text-xs font-normal uppercase tracking-tight">
                      {b}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Quick Fiction Selectors */}
          <div className="mt-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-500">
            <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-200 pr-4">Quick Fiction:</span>
            <div className="flex flex-wrap items-center gap-4">
              {['Fiction', 'Non-Fiction', 'Children Book', 'Other'].map((f) => {
                const isActive = (filters.fictionType ?? '').split(',').includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      const current = (filters.fictionType ?? '').split(',').filter(Boolean);
                      const next = current.includes(f) ? current.filter(x => x !== f) : [...current, f];
                      updateFilter('fictionType', next.join(',') || undefined);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all active:scale-95 ${
                      isActive
                        ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                        : 'bg-white border-gray-100 text-gray-500 hover:border-teal-200 hover:bg-teal-50/30'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-md flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                      {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <span className="text-xs font-normal uppercase tracking-tight">
                      {f}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick reference for active filters when collapsed */}
          {!isExpanded && activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 animate-fadeIn">
              {activeFilters.map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1 text-xs font-normal text-gray-700 border border-gray-200">
                  <span className="opacity-50 uppercase text-[10px]">{key}:</span>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  <button onClick={() => updateFilter(key as any, undefined)} className="text-gray-400 hover:text-red-500">×</button>
                </span>
              ))}
              <button 
                onClick={clearAll}
                className="text-[10px] font-normal text-red-600 uppercase hover:underline"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {historyMode ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-normal text-black uppercase tracking-wider">Archive Period</span>
            <div className="flex items-center gap-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-5 py-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span className="text-sm font-normal text-indigo-700">01 Apr 2025 – 31 Mar 2026 (full FY 2025-26)</span>
              <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-indigo-500 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md">Fixed Archive</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-normal text-black uppercase tracking-wider">Quick Period</span>
              <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
                {[
                  { label: 'FYTD', value: 'fytd' },
                  { label: '1M', value: 30 },
                  { label: '3M', value: 90 },
                  { label: '6M', value: 180 },
                  { label: '1Y', value: 365 },
                  { label: 'All', value: 10000 }
                ].map((p) => {
                  const isSelected = p.value === 'fytd'
                    ? (!filters.days && !searchParams.get('startDate') && !searchParams.get('endDate'))
                    : (filters.days === p.value && !searchParams.get('startDate'));
                  return (
                    <button
                      key={p.label}
                      onClick={() => {
                        if (p.value === 'fytd') {
                          clearDateRange();
                        } else {
                          setDays(p.value as number);
                        }
                      }}
                      className={`rounded-lg px-4 py-2 text-sm font-normal transition-all ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-normal text-black uppercase tracking-wider">Date Range</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  title="Start Date"
                  aria-label="Start Date"
                  className="rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-base font-normal text-black border-black/10 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all cursor-pointer h-[46px]"
                  value={displayStartDate}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateRange(new Date(e.target.value).toISOString(), displayEndDate === new Date().toISOString().slice(0, 10) ? new Date().toISOString() : new Date(displayEndDate).toISOString());
                    }
                  }}
                />
                <span className="text-gray-400 font-normal">→</span>
                <input
                  type="date"
                  title="End Date"
                  aria-label="End Date"
                  className="rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2 text-base font-normal text-black border-black/10 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all cursor-pointer h-[46px]"
                  value={displayEndDate}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateRange(displayStartDate === getFinancialYearStartDate().toISOString().slice(0, 10) ? getFinancialYearStartDate().toISOString() : new Date(displayStartDate).toISOString(), new Date(e.target.value).toISOString());
                    }
                  }}
                />
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-3 ml-auto">
          {lastSyncResult && (
            <span className="text-xs font-normal text-teal-700 bg-teal-100 px-3 py-1.5 rounded-full border border-teal-200">{lastSyncResult}</span>
          )}
          <button
            onClick={() => setQ(searchQuery)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-8 py-3 text-base font-normal text-white shadow-xl hover:bg-teal-700 active:scale-95 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            SEARCH
          </button>
          {!historyMode && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              title="Sync Data from Sheets"
              className="flex items-center justify-center h-12 w-12 rounded-xl bg-black text-white shadow-lg hover:bg-gray-800 active:scale-95 disabled:opacity-60 transition-all"
            >
              {isSyncing ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Section - Collapsible */}
      <div className={`space-y-6 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {/* Second row: Spreadsheet-style Column Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-x-6 gap-y-4">
          <FilterDropdown
            id="f-book" label="Book (Binding)" placeholder="Search Book & Binding..."
            value={filters.title} onChange={(v:any) => updateFilter('title', v)}
            options={optData?.bookTitles}
          />
          <FilterDropdown
            id="f-cust" label="Customer Name" placeholder="e.g. Quick Offset"
            value={filters.customerName} onChange={(v:any) => updateFilter('customerName', v)}
            options={optData?.customerNames}
          />
          <FilterDropdown
            id="f-pub" label="Publisher" placeholder="e.g. Lokbharti"
            value={filters.publisher} onChange={(v:any) => updateFilter('publisher', v)}
            options={optData?.publishers}
          />
          <FilterDropdown
            id="f-auth" label="Author" placeholder="e.g. Premchand"
            value={filters.author} onChange={(v:any) => updateFilter('author', v)}
            options={optData?.authors}
          />
          <FilterField
            id="f-isbn" label="ISBN / Code" placeholder="Search ISBN..."
            value={filters.isbn} onChange={(v:any) => updateFilter('isbn', v)}
            width="w-full"
          />
          <FilterDropdown
            id="f-state" label="State" placeholder="e.g. Delhi"
            value={filters.state} onChange={(v:any) => updateFilter('state', v)}
            options={optData?.states}
          />
          <FilterDropdown
            id="f-city" label="City" placeholder="e.g. Varanasi"
            value={filters.city} onChange={(v:any) => updateFilter('city', v)}
            options={optData?.cities}
          />
          <FilterDropdown
            id="f-binding" label="Binding" placeholder="Paperback/Hardcover"
            value={filters.binding} onChange={(v:any) => updateFilter('binding', v)}
            options={optData?.bindings}
          />
          <FilterDropdown
            id="f-type" label="Sale Type" placeholder="Offline/Online..."
            value={filters.type} onChange={(v:any) => updateFilter('type', v)}
            options={optData?.types}
          />
        </div>
 
        {/* Third row: Price Range and Reset */}
        <div className="flex flex-wrap items-end gap-8 pt-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-normal text-black uppercase tracking-wider">Price Range (₹)</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minAmount ?? ''}
                onChange={(e) => updateFilter('minAmount', e.target.value ? Number(e.target.value) : undefined)}
                className="w-28 rounded-xl border-2 border-gray-200 px-3 py-2 text-base font-normal border-black/10 focus:border-teal-600 focus:outline-none"
              />
              <span className="text-gray-400 font-normal">—</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxAmount ?? ''}
                onChange={(e) => updateFilter('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
                className="w-28 rounded-xl border-2 border-gray-200 px-3 py-2 text-base font-normal border-black/10 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>
 
          <button
            onClick={clearAll}
            className="ml-auto text-base font-normal text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-6 py-2.5 rounded-xl border-2 border-red-200 transition-all active:scale-95"
          >
            Reset All Filters
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfflineSheetPage({ region = 'delhi' }: { region?: 'delhi' | 'mumbai' | 'patna' | 'online' | 'bookfair' | 'lokbharti' }) {
  const { filters, setDays, setDateRange, clearDateRange, setQ, updateFilter, updateFilters, setPage, clearAll, hasExplicitDateFilter } = useOfflineSheetFilters();
  const [resetVersion, setResetVersion] = useState(0);
  const [dashboardTab, setDashboardTab] = useState<'sheet' | 'new-old' | 'focus' | 'yoy' | 'author' | 'price' | 'category'>('sheet');
  const [fyMode, setFyMode] = useState<'current' | 'previous'>('current');

  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const channelKey = REGION_TO_CHANNEL[region] || 'Delhi';
  const fyParam = fyMode === 'previous' ? 'previous' : 'current';

  const fetchChannelSummary = async (fy: string) => {
    setSummaryLoading(true);
    try {
      const range = fy === 'previous' ? 'all' : 'fytd';
      const data = await apiClient.get<any>(`total-offline-sales/summary?range=${range}&channel=${channelKey}&fy=${fy}`);
      if (data.ok) {
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch channel summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchChannelSummary(fyParam);
  }, [region, fyParam]);

  // Reset date range when switching FY modes
  const handleFySwitch = (mode: 'current' | 'previous') => {
    setFyMode(mode);
    clearAll();
  };

  const handleGlobalClear = () => {
    clearAll();
    setResetVersion(v => v + 1);
  };

  // Live mode hooks
  const liveCountsQ  = useOfflineSheetCounts(filters, region);
  const liveSummaryQ = useOfflineSheetSummary(filters, region);
  const liveListQ    = useOfflineSheetList(filters, region);
  const syncMut      = useTriggerSync(region);

  // History mode hooks — pass hasExplicitDateFilter so the default FYTD window
  // (April 2026 → today) is not forwarded to archive queries (data is in FY2025-26).
  const histCountsQ  = useHistoryChannelCounts(filters, region, 'previous', hasExplicitDateFilter);
  const histListQ    = useHistoryChannelList(filters, region, 'previous', hasExplicitDateFilter);
  const histOptions  = useHistoryChannelOptions(region);

  const countsQ    = fyMode === 'previous' ? histCountsQ  : liveCountsQ;
  const listQ      = fyMode === 'previous' ? histListQ    : liveListQ;
  const summaryQ   = fyMode === 'previous' ? null : liveSummaryQ;

  const allRows    = listQ.data?.items ?? [];
  const totalCount = listQ.data?.totalCount ?? 0;

  const syncMsg = syncMut.isSuccess
    ? `✓ Synced ${syncMut.data?.importedCount ?? 0} rows`
    : syncMut.isError
    ? '✗ Sync failed'
    : null;

  return (
    <AppLayout>
      {/* ── Page Hero + FY Toggle + Sticky Tabs ─────────────────────────── */}
      <div className="pt-6 mb-8">
        <div className="relative z-10">
          <PageHero
            kicker={REGION_HERO[region].kicker}
            title={REGION_HERO[region].title}
            badge={fyMode === 'previous'
              ? { label: 'FY 2025-26 Archive', tone: 'archive' as any }
              : { label: 'Live Data', tone: 'live' }
            }
            illustrationSrc={REGION_HERO[region].image}
          />
          {/* FY Toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 mt-3 w-fit">
            <button
              onClick={() => handleFySwitch('current')}
              className={`rounded-lg px-5 py-2 text-sm font-normal transition-all ${
                fyMode === 'current'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              FY 2026-27 (Live)
            </button>
            <button
              onClick={() => handleFySwitch('previous')}
              className={`rounded-lg px-5 py-2 text-sm font-normal transition-all ${
                fyMode === 'previous'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              FY 2025-26 (Archive)
            </button>
          </div>
        </div>
        <StickyTabs
          active={dashboardTab}
          onChange={(id) => setDashboardTab(id as any)}
          className="relative z-0 -mt-5 pl-6 sm:pl-8"
          tabs={[
            { id: 'sheet',    label: 'Transaction Sheet' },
            { id: 'new-old',  label: 'New vs. Old Titles' },
            { id: 'focus',    label: 'Focus Tab (Growth)' },
            { id: 'yoy',      label: 'YoY Comparison' },
            { id: 'author',   label: 'Author Performance' },
            { id: 'price',    label: 'Price & Reprints' },
            { id: 'category', label: 'Fiction vs. Non-Fiction' },
          ]}
        />
      </div>

      {dashboardTab === 'sheet' ? (
        <>
          <div className="mb-8">
            <FilterBar
              filters={filters}
              setDays={setDays}
              setDateRange={setDateRange}
              clearDateRange={clearDateRange}
              setQ={setQ}
              updateFilter={updateFilter}
              updateFilters={updateFilters}
              clearAll={handleGlobalClear}
              onSync={() => syncMut.mutate()}
              isSyncing={syncMut.isPending}
              lastSyncResult={syncMsg}
              region={region}
              historyMode={fyMode === 'previous'}
              optionsOverride={fyMode === 'previous' ? histOptions.data : undefined}
            />
          </div>

          <div className="mb-8">
            <OfflineSheetKPI
              data={countsQ.data}
              isLoading={countsQ.isLoading}
            />
          </div>

          {region === 'bookfair' && (
            <div className="mb-12">
              <BookFairSubFairs source={fyMode === 'previous' ? 'history' : 'live'} />
            </div>
          )}

          {fyMode === 'current' && summaryQ && (
            <div className="mb-12">
              <OfflineSheetProjection
                data={summaryQ.data}
                isLoading={summaryQ.isLoading}
              />
            </div>
          )}

          <div className="mb-12">
            <OfflineSheetCharts
              filters={filters}
              resetVersion={resetVersion}
              onApplyDateRange={setDateRange}
              region={region}
              fy={fyMode}
            />
          </div>

          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-normal text-black border-b-4 border-black pb-1 inline-block uppercase">
                {fyMode === 'previous' ? 'Archive Transactions (FY 2025-26)' : 'Recent Transactions'}
              </h3>
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
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
        </>
      ) : (
        <div className="space-y-10 animate-fadeIn">
          {summaryLoading && !summary ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-xs text-gray-500">Loading channel summary...</p>
            </div>
          ) : (
            <>
              {dashboardTab === 'new-old' && (
                <NewOldContributionView data={summary?.newVsOldContribution} loading={summaryLoading} />
              )}

              {dashboardTab === 'focus' && (
                <FocusTabGrowthView channel={channelKey} fy={fyParam} />
              )}

              {dashboardTab === 'yoy' && (
                <>
                  {fyMode === 'previous' && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span>YoY Comparison always shows <strong>FY 2025-26 vs FY 2026-27</strong> — this tab is not affected by the archive toggle and includes live FY 2026-27 data for context.</span>
                    </div>
                  )}
                  <YoYComparisonView channel={channelKey} />
                </>
              )}

              {dashboardTab === 'author' && (
                <AuthorPerformanceView channel={channelKey} fy={fyParam} />
              )}

              {dashboardTab === 'price' && (
                <PriceReprintAnalysisView channel={channelKey} fy={fyParam} />
              )}

              {dashboardTab === 'category' && (
                <CategorySalesView channel={channelKey} fy={fyParam} />
              )}
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}
