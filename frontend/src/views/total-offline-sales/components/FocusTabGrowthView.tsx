import React, { useState, useMemo } from 'react';
import { formatINR } from './utils';
import { FiAlertCircle, FiSearch, FiSliders, FiArrowUp, FiArrowDown, FiChevronUp, FiChevronDown, FiRotateCcw } from 'react-icons/fi';
import { apiClient } from '../../../lib/apiClient';

interface GrowthBookItem {
  title: string;
  publisher: string;
  currentQty: number;
  currentRevenue: number;
  prevQty: number;
  ytdQty: number;
  growth: number;
  growthVsAvg: number;
}

interface FocusTabGrowthViewProps {
  channel: string;
}

type SortField = 'title' | 'publisher' | 'copies' | 'baseline' | 'revenue' | 'growth';
type SortDir = 'asc' | 'desc';
type StatusKey = 'all' | 'high' | 'steady' | 'dormant';

export const FocusTabGrowthView: React.FC<FocusTabGrowthViewProps> = ({ channel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<GrowthBookItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [threshold, setThreshold] = useState(50);
  const [benchmarkType, setBenchmarkType] = useState<'prev' | 'avg'>('prev');

  // Refine controls
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [publisherFilter, setPublisherFilter] = useState<string>('all');
  const [minCopies, setMinCopies] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>('growth');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Fetch growth data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>(
        `total-offline-sales/growth-indicators?channel=${channel}&threshold=${threshold}`
      );
      if (data.ok) {
        setBooks(data.items || []);
      } else {
        throw new Error(data.error || 'Failed to fetch growth indicators');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading growth indicators');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
    setCurrentPage(1);
  }, [channel, threshold]);

  // Reset to first page whenever any filter/sort/benchmark changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, benchmarkType, statusFilter, publisherFilter, minCopies, sortField, sortDir]);

  // Active growth value + status classification for a book (benchmark-aware)
  const growthOf = (b: GrowthBookItem) => (benchmarkType === 'prev' ? b.growth : b.growthVsAvg);
  const statusOf = (b: GrowthBookItem): Exclude<StatusKey, 'all'> => {
    const g = growthOf(b);
    if (g >= threshold) return 'high';
    if (g > 0) return 'steady';
    return 'dormant';
  };
  const baselineOf = (b: GrowthBookItem) =>
    benchmarkType === 'prev' ? b.prevQty : Math.max(1, Math.round(b.ytdQty / 5));

  // Unique publishers for the dropdown (sorted A→Z)
  const publishers = useMemo(() => {
    const set = new Set(books.map(b => b.publisher || 'Unknown'));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [books]);

  // Base set: everything except the status pill (search + publisher + min copies)
  const baseBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return books.filter(b => {
      if (term && !b.title.toLowerCase().includes(term) && !b.publisher.toLowerCase().includes(term)) return false;
      if (publisherFilter !== 'all' && (b.publisher || 'Unknown') !== publisherFilter) return false;
      if (minCopies > 0 && b.currentQty < minCopies) return false;
      return true;
    });
  }, [books, searchTerm, publisherFilter, minCopies]);

  // Status counts over the base set (so pills show live, benchmark-aware totals)
  const statusCounts = useMemo(() => {
    const c = { all: baseBooks.length, high: 0, steady: 0, dormant: 0 };
    for (const b of baseBooks) c[statusOf(b)]++;
    return c;
  }, [baseBooks, benchmarkType, threshold]);

  // Apply status pill
  const filteredBooks = useMemo(() => {
    if (statusFilter === 'all') return baseBooks;
    return baseBooks.filter(b => statusOf(b) === statusFilter);
  }, [baseBooks, statusFilter, benchmarkType, threshold]);

  // Sort
  const sortedBooks = useMemo(() => {
    const arr = [...filteredBooks];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'publisher': cmp = (a.publisher || 'Unknown').localeCompare(b.publisher || 'Unknown'); break;
        case 'copies': cmp = a.currentQty - b.currentQty; break;
        case 'baseline': cmp = baselineOf(a) - baselineOf(b); break;
        case 'revenue': cmp = a.currentRevenue - b.currentRevenue; break;
        case 'growth': default: cmp = growthOf(a) - growthOf(b); break;
      }
      if (cmp === 0) cmp = a.title.localeCompare(b.title); // stable tiebreak
      return cmp * dir;
    });
    return arr;
  }, [filteredBooks, sortField, sortDir, benchmarkType]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Text columns default A→Z, numeric columns default high→low
      setSortDir(field === 'title' || field === 'publisher' ? 'asc' : 'desc');
    }
  };

  // The view is in its default state when nothing has been changed from initial values
  const isDefaultState =
    searchTerm.trim() === '' &&
    statusFilter === 'all' &&
    publisherFilter === 'all' &&
    minCopies === 0 &&
    sortField === 'growth' &&
    sortDir === 'desc' &&
    benchmarkType === 'prev' &&
    threshold === 50;

  const filtersActive =
    searchTerm.trim() !== '' || statusFilter !== 'all' || publisherFilter !== 'all' || minCopies > 0;

  // Reset every control back to its default version
  const resetAll = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPublisherFilter('all');
    setMinCopies(0);
    setSortField('growth');
    setSortDir('desc');
    setBenchmarkType('prev');
    setThreshold(50);
  };

  // Plain-language meaning of each status, shown on hover
  const STATUS_INFO: Record<StatusKey, string> = {
    all: 'Every active title in the current selection.',
    high: 'Sales rose by your growth threshold or more vs the benchmark — prioritise reprints, marketing and distribution.',
    steady: 'Positive growth, but below the threshold — selling consistently without a breakout.',
    dormant: 'Flat or declining vs the benchmark — little to no recent momentum.',
  };

  // Calculate pagination
  const totalPages = Math.ceil(sortedBooks.length / itemsPerPage);

  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedBooks.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedBooks, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Configuration Strip */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-stretch md:items-center">
        {/* Threshold Slider */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-700 flex items-center gap-1.5">
              <FiSliders className="text-indigo-600 h-4 w-4" />
              Growth Trigger Threshold
            </span>
            <span className="bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full">
              &gt; {threshold}% Growth
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>10% (Broad)</span>
            <span>50% (Standard)</span>
            <span>100%+ (High Potential)</span>
          </div>
        </div>

        {/* Benchmark Toggle & Search */}
        <div className="flex flex-col sm:flex-row gap-4 shrink-0 items-stretch sm:items-center">
          {/* Toggle */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Benchmark Baseline</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setBenchmarkType('prev')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  benchmarkType === 'prev' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Prev. 30 Days
              </button>
              <button
                onClick={() => setBenchmarkType('avg')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  benchmarkType === 'avg' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                YTD Monthly Avg
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex flex-col space-y-1 w-full sm:w-60">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Filter Titles</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-gray-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search book or publisher..."
                className="block w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Focus Alert Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-100 rounded-3xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="h-6 w-6 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900">Target High-Potential Books</h4>
            <p className="text-xs text-amber-800 leading-normal mt-0.5">
              These books have surpassed the selected benchmark by more than <strong>{threshold}%</strong>. Align marketing, reprints, and bookshop distributions accordingly to capture momentum!
            </p>
          </div>
        </div>
        <div className="bg-amber-600 text-white font-semibold text-xs px-4 py-2 rounded-xl shrink-0 shadow-sm">
          {statusCounts.high} Titles Flagged
        </div>
      </div>

      {/* Refine Bar */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: 'all', label: 'All', active: 'bg-gray-800 text-white border-gray-800' },
            { key: 'high', label: 'High Growth', active: 'bg-amber-500 text-white border-amber-500' },
            { key: 'steady', label: 'Steady', active: 'bg-emerald-500 text-white border-emerald-500' },
            { key: 'dormant', label: 'Dormant', active: 'bg-gray-400 text-white border-gray-400' },
          ] as { key: StatusKey; label: string; active: string }[]).map(p => (
            <div key={p.key} className="relative group">
              <button
                onClick={() => setStatusFilter(p.key)}
                aria-label={`${p.label}: ${STATUS_INFO[p.key]}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                  statusFilter === p.key ? p.active + ' shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {p.label}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] ${
                  statusFilter === p.key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                }`}>
                  {statusCounts[p.key]}
                </span>
              </button>
              {/* Hover info tooltip */}
              <div className="pointer-events-none absolute left-0 top-full mt-2 z-20 w-56 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
                <div className="rounded-xl bg-gray-900 text-white text-[11px] leading-snug font-normal p-3 shadow-lg">
                  <span className="block font-semibold mb-0.5">{p.label}</span>
                  {STATUS_INFO[p.key]}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Publisher, Min copies, Sort */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={publisherFilter}
            onChange={(e) => setPublisherFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 max-w-[180px]"
          >
            <option value="all">All Publishers</option>
            {publishers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Min Copies</label>
            <input
              type="number"
              min={0}
              value={minCopies || ''}
              onChange={(e) => setMinCopies(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-16 px-2.5 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sort</label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="growth">Growth Rate</option>
              <option value="title">Title (A–Z)</option>
              <option value="publisher">Publisher (A–Z)</option>
              <option value="copies">Copies Sold</option>
              <option value="baseline">Baseline</option>
              <option value="revenue">Revenue</option>
            </select>
            <button
              onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
            >
              {sortDir === 'asc' ? <FiArrowUp className="h-4 w-4" /> : <FiArrowDown className="h-4 w-4" />}
            </button>
          </div>

          <button
            onClick={resetAll}
            disabled={isDefaultState}
            title="Reset all filters, sorting and benchmark to defaults"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <FiRotateCcw className="h-3.5 w-3.5" /> Reset All
          </button>
        </div>
      </div>

      {/* Growth Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-xs text-gray-500">Evaluating growth trajectories...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">
            ⚠️ {error}
            <button onClick={fetchData} className="ml-2 underline hover:text-red-950 font-normal">
              Retry
            </button>
          </div>
        ) : sortedBooks.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400 flex flex-col items-center gap-3">
            No active growth records match your filters.
            {filtersActive && (
              <button onClick={resetAll} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                <FiRotateCcw className="h-3.5 w-3.5" /> Reset all
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-semibold uppercase tracking-wider text-left">
                  {/* Hint row: tells users the columns are clickable sort controls */}
                  <tr>
                    <th colSpan={5} className="px-6 pt-3 pb-0">
                      <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-[10px] font-medium text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">
                        <FiArrowDown className="h-3 w-3" />
                        Tip: click any column heading to sort
                      </span>
                    </th>
                  </tr>
                  <tr>
                    {([
                      { field: 'title' as SortField, label: 'Title & Publisher', align: 'left' },
                      { field: 'copies' as SortField, label: 'Last 30 Days Sold (OUT)', align: 'right' },
                      {
                        field: 'baseline' as SortField,
                        label: benchmarkType === 'prev' ? 'Preceding 30 Days (OUT)' : 'YTD Monthly Average',
                        align: 'right',
                      },
                      { field: 'growth' as SortField, label: 'Growth Rate', align: 'right' },
                    ]).map(col => {
                      const active = sortField === col.field;
                      return (
                        <th key={col.field} className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => toggleSort(col.field)}
                            title={`Sort by ${col.label}`}
                            className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all w-full ${
                              col.align === 'right' ? 'flex-row-reverse justify-start' : 'justify-start'
                            } ${
                              active
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                          >
                            <span className="uppercase tracking-wider">{col.label}</span>
                            {/* Persistent sort glyph: faded when inactive, colored + directional when active */}
                            {active ? (
                              sortDir === 'asc'
                                ? <FiArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                : <FiArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            ) : (
                              <span className="flex flex-col -space-y-1.5 text-gray-300 group-hover:text-gray-400 shrink-0">
                                <FiChevronUp className="h-3 w-3" />
                                <FiChevronDown className="h-3 w-3" />
                              </span>
                            )}
                          </button>
                        </th>
                      );
                    })}
                    <th className="px-6 py-3 text-center">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                  {paginatedBooks.map((b, idx) => {
                    const growthVal = benchmarkType === 'prev' ? b.growth : b.growthVsAvg;
                    const baselineVal = benchmarkType === 'prev' ? b.prevQty : Math.max(1, Math.round(b.ytdQty / 5));
                    const isHigh = growthVal >= threshold;

                    return (
                      <tr key={idx} className={`hover:bg-gray-50/40 transition-colors ${isHigh ? 'bg-amber-50/30' : ''}`}>
                        <td className={`py-4 pr-6 transition-all ${isHigh ? 'border-l-4 border-l-amber-500 pl-5' : 'pl-6'}`}>
                          <p className="font-semibold text-gray-800 line-clamp-1">{b.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{b.publisher}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-800">
                          {b.currentQty} copies
                          <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                            {formatINR(b.currentRevenue)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-500">
                          {baselineVal} copies
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          <span className={growthVal > 0 ? 'text-emerald-600' : growthVal < 0 ? 'text-red-500' : 'text-gray-500'}>
                            {growthVal > 0 ? `+${growthVal}%` : `${growthVal}%`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isHigh ? (
                            <span title={STATUS_INFO.high} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 cursor-help">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> High Growth
                            </span>
                          ) : growthVal > 0 ? (
                            <span title={STATUS_INFO.steady} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 cursor-help">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Steady
                            </span>
                          ) : (
                            <span title={STATUS_INFO.dormant} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-400 cursor-help">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" /> Dormant
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-white select-none">
                <span className="text-xs text-gray-500 font-medium">
                  Showing <span className="text-gray-800 font-semibold">{Math.min(sortedBooks.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                  <span className="text-gray-800 font-semibold">{Math.min(sortedBooks.length, currentPage * itemsPerPage)}</span> of{' '}
                  <span className="text-gray-800 font-semibold">{sortedBooks.length}</span> entries
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Previous
                  </button>

                  {/* Render Page Numbers */}
                  {(() => {
                    const pages: number[] = [];
                    const maxButtons = 5;
                    if (totalPages <= maxButtons) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      let start = currentPage - 2;
                      let end = currentPage + 2;
                      if (start < 1) {
                        start = 1;
                        end = maxButtons;
                      } else if (end > totalPages) {
                        end = totalPages;
                        start = totalPages - maxButtons + 1;
                      }
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                    }
                    return pages.map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-xl text-xs font-semibold transition-all ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ));
                  })()}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
