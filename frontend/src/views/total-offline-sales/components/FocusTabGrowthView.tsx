import React, { useState, useMemo } from 'react';
import { formatINR } from './utils';
import { FiAlertCircle, FiSearch, FiSliders, FiArrowUp, FiArrowDown, FiChevronUp, FiChevronDown, FiRotateCcw, FiDownload, FiFileText, FiFile, FiExternalLink, FiX } from 'react-icons/fi';
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
  invoiceCount: number;
  isBulk: boolean;
  bindings: string[];
}

interface FocusTabGrowthViewProps {
  channel: string;
}

// Canonicalise messy binding values so spelling/case variants unify into one label
// (e.g. "paperback"/"Paperback", "Textbook"/"Text Book"). Applied at ingestion so
// every downstream consumer (pills, counts, filter, tags, exports) stays consistent.
const BINDING_CANON: Record<string, string> = {
  paperback: 'Paperback',
  hardcover: 'Hardcover',
  hardback: 'Hardcover',
  hardbound: 'Hardcover',
  textbook: 'Text Book',
};
const canonBinding = (raw: string): string => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BINDING_CANON[key] ?? trimmed;
};

type SortField = 'title' | 'publisher' | 'copies' | 'baseline' | 'revenue' | 'growth' | 'invoices';
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
  const [bindingFilter, setBindingFilter] = useState<string>('all');
  const [publisherFilter, setPublisherFilter] = useState<string>('all');
  const [minCopies, setMinCopies] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>('growth');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Invoice drill-down modal
  const [invoiceModalTitle, setInvoiceModalTitle] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

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
        // Normalise binding variants at ingestion so the pills/filter stay unified
        const items: GrowthBookItem[] = (data.items || []).map((it: GrowthBookItem) => ({
          ...it,
          bindings: Array.from(new Set((it.bindings || []).map(canonBinding).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        }));
        setBooks(items);
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

  // Open the per-invoice drill-down modal for a title
  const openInvoiceModal = async (title: string) => {
    setInvoiceModalTitle(title);
    setInvoiceData(null);
    setInvoiceError(null);
    setInvoiceLoading(true);
    try {
      const data = await apiClient.get<any>(
        `total-offline-sales/title-invoices?channel=${channel}&title=${encodeURIComponent(title)}`
      );
      if (data.ok) {
        setInvoiceData(data);
      } else {
        throw new Error(data.error || 'Failed to load invoice breakdown');
      }
    } catch (err: any) {
      console.error(err);
      setInvoiceError(err.message || 'Error loading invoice breakdown');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const closeInvoiceModal = () => {
    setInvoiceModalTitle(null);
    setInvoiceData(null);
    setInvoiceError(null);
  };

  // Reset to first page whenever any filter/sort/benchmark changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, benchmarkType, statusFilter, bindingFilter, publisherFilter, minCopies, sortField, sortDir]);

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

  // Unique binding types (sorted A→Z) for the pill row
  const bindings = useMemo(() => {
    const set = new Set<string>();
    for (const b of books) for (const bd of b.bindings || []) set.add(bd);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [books]);

  // Shared filters that both pill groups respect: search + publisher + min copies
  const sharedBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return books.filter(b => {
      if (term && !b.title.toLowerCase().includes(term) && !b.publisher.toLowerCase().includes(term)) return false;
      if (publisherFilter !== 'all' && (b.publisher || 'Unknown') !== publisherFilter) return false;
      if (minCopies > 0 && b.currentQty < minCopies) return false;
      return true;
    });
  }, [books, searchTerm, publisherFilter, minCopies]);

  const passesBinding = (b: GrowthBookItem) => bindingFilter === 'all' || (b.bindings || []).includes(bindingFilter);
  const passesStatus = (b: GrowthBookItem) => statusFilter === 'all' || statusOf(b) === statusFilter;

  // Status counts: faceted over shared + binding (independent of the status selection)
  const statusCounts = useMemo(() => {
    const c = { all: 0, high: 0, steady: 0, dormant: 0 };
    for (const b of sharedBooks) {
      if (!passesBinding(b)) continue;
      c.all++;
      c[statusOf(b)]++;
    }
    return c;
  }, [sharedBooks, bindingFilter, benchmarkType, threshold]);

  // Binding counts: faceted over shared + status (independent of the binding selection)
  const bindingCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const bd of bindings) c[bd] = 0;
    for (const b of sharedBooks) {
      if (!passesStatus(b)) continue;
      c.all++;
      for (const bd of b.bindings || []) if (bd in c) c[bd]++;
    }
    return c;
  }, [sharedBooks, bindings, statusFilter, benchmarkType, threshold]);

  // Apply both pill selections
  const filteredBooks = useMemo(() => {
    return sharedBooks.filter(b => passesBinding(b) && passesStatus(b));
  }, [sharedBooks, statusFilter, bindingFilter, benchmarkType, threshold]);

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
        case 'invoices': cmp = a.invoiceCount - b.invoiceCount; break;
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
    bindingFilter === 'all' &&
    publisherFilter === 'all' &&
    minCopies === 0 &&
    sortField === 'growth' &&
    sortDir === 'desc' &&
    benchmarkType === 'prev' &&
    threshold === 50;

  const filtersActive =
    searchTerm.trim() !== '' || statusFilter !== 'all' || bindingFilter !== 'all' || publisherFilter !== 'all' || minCopies > 0;

  // Reset every control back to its default version
  const resetAll = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBindingFilter('all');
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

  const STATUS_LABEL: Record<Exclude<StatusKey, 'all'>, string> = {
    high: 'High Growth',
    steady: 'Steady',
    dormant: 'Dormant',
  };

  // ─── Export helpers (operate on the current filtered + sorted view) ──────────
  const baselineHeader = benchmarkType === 'prev' ? 'Preceding 30 Days' : 'YTD Monthly Avg';

  const buildExportRows = () => {
    const header = ['#', 'Title', 'Publisher', 'Binding', 'Last 30 Days (Copies)', 'Revenue (INR)', `${baselineHeader} (Copies)`, 'Growth %', 'Invoices', 'Status'];
    const rows = sortedBooks.map((b, i) => [
      String(i + 1),
      b.title,
      b.publisher || 'Unknown',
      (b.bindings || []).join('; ') || '—',
      String(b.currentQty),
      String(Math.round(b.currentRevenue)),
      String(baselineOf(b)),
      `${growthOf(b) > 0 ? '+' : ''}${growthOf(b)}%`,
      String(b.invoiceCount),
      STATUS_LABEL[statusOf(b)],
    ]);
    return { header, rows };
  };

  const exportFileBase = () => `focus-growth-${channel}-${new Date().toISOString().slice(0, 10)}`;

  const filterSummary = () => {
    const parts: string[] = [];
    parts.push(`Benchmark: ${benchmarkType === 'prev' ? 'Previous 30 Days' : 'YTD Monthly Average'}`);
    parts.push(`Growth threshold: >${threshold}%`);
    parts.push(`Status: ${statusFilter === 'all' ? 'All' : STATUS_LABEL[statusFilter]}`);
    if (bindingFilter !== 'all') parts.push(`Binding: ${bindingFilter}`);
    if (publisherFilter !== 'all') parts.push(`Publisher: ${publisherFilter}`);
    if (minCopies > 0) parts.push(`Min copies: ${minCopies}`);
    if (searchTerm.trim()) parts.push(`Search: "${searchTerm.trim()}"`);
    return parts;
  };

  const downloadCSV = () => {
    const { header, rows } = buildExportRows();
    const esc = (v: string) => '"' + String(v).replace(/"/g, '""') + '"';
    const csv = [header, ...rows].map(line => line.map(esc).join(',')).join('\r\n');
    // Prepend BOM so Excel reads UTF-8 (Hindi titles) correctly
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileBase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadOpen(false);
  };

  const downloadPDF = () => {
    const { header, rows } = buildExportRows();
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow pop-ups for this site to download the PDF.');
      setDownloadOpen(false);
      return;
    }
    const esc = (v: string) =>
      String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const numericCols = new Set([0, 4, 5, 6, 7, 8]);
    const thead = header.map((h, i) => `<th class="${numericCols.has(i) ? 'num' : ''}">${esc(h)}</th>`).join('');
    const tbody = rows
      .map(r => `<tr>${r.map((c, i) => `<td class="${numericCols.has(i) ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`)
      .join('');
    const generated = new Date().toLocaleString('en-IN');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${exportFileBase()}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1f2937; margin: 24px; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .sub { font-size: 11px; color: #6b7280; margin-bottom: 12px; }
        .meta { font-size: 11px; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
        .meta span { display: inline-block; margin-right: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; text-transform: uppercase; letter-spacing: .04em; font-size: 9px; color: #6b7280; }
        td.num, th.num { text-align: right; }
        tr:nth-child(even) td { background: #fafafa; }
        @media print { body { margin: 12mm; } }
      </style></head><body>
      <h1>Focus Tab — Growth Indicators</h1>
      <div class="sub">Channel: ${esc(channel)} &nbsp;•&nbsp; ${rows.length} titles &nbsp;•&nbsp; Generated ${esc(generated)}</div>
      <div class="meta">${filterSummary().map(p => `<span>${esc(p)}</span>`).join('')}</div>
      <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    // Wait for layout before invoking the print dialog
    setTimeout(() => win.print(), 300);
    setDownloadOpen(false);
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
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col gap-4">
       <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
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
              <option value="revenue">Revenue</option>
              <option value="invoices">Invoices</option>
            </select>
            <button
              onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
            >
              {sortDir === 'asc' ? <FiArrowUp className="h-4 w-4" /> : <FiArrowDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Download dropdown */}
          <div className="relative">
            <button
              onClick={() => setDownloadOpen(o => !o)}
              disabled={sortedBooks.length === 0}
              title="Download the current view"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <FiDownload className="h-3.5 w-3.5" /> Download
              <FiChevronDown className={`h-3.5 w-3.5 transition-transform ${downloadOpen ? 'rotate-180' : ''}`} />
            </button>
            {downloadOpen && (
              <>
                {/* click-away backdrop */}
                <div className="fixed inset-0 z-20" onClick={() => setDownloadOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-30 w-52 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    Export {sortedBooks.length} rows
                  </div>
                  <button
                    onClick={downloadCSV}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FiFileText className="h-4 w-4 text-emerald-600" />
                    <span className="flex-1 text-left">CSV spreadsheet</span>
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-50"
                  >
                    <FiFile className="h-4 w-4 text-red-500" />
                    <span className="flex-1 text-left">PDF document</span>
                  </button>
                </div>
              </>
            )}
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

       {/* Binding pills row */}
       {bindings.length > 0 && (
         <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
           <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Binding</span>
           {([{ key: 'all', label: 'All Bindings' }, ...bindings.map(b => ({ key: b, label: b }))]).map(p => (
             <button
               key={p.key}
               onClick={() => setBindingFilter(p.key)}
               className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                 bindingFilter === p.key ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
               }`}
             >
               {p.label}
               <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] ${
                 bindingFilter === p.key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
               }`}>
                 {bindingCounts[p.key] ?? 0}
               </span>
             </button>
           ))}
         </div>
       )}
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
                      { field: 'growth' as SortField, label: 'Growth Rate', align: 'right' },
                      { field: 'invoices' as SortField, label: 'Invoices', align: 'right' },
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
                    const isHigh = growthVal >= threshold;

                    return (
                      <tr key={idx} className={`hover:bg-gray-50/40 transition-colors ${isHigh ? 'bg-amber-50/30' : ''}`}>
                        <td className={`py-4 pr-6 transition-all ${isHigh ? 'border-l-4 border-l-amber-500 pl-5' : 'pl-6'}`}>
                          <p className="font-semibold text-gray-800 line-clamp-1">{b.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-gray-400">{b.publisher}</span>
                            {(b.bindings || []).map(bd => (
                              <span key={bd} className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{bd}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-800">
                          {b.currentQty} copies
                          <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                            {formatINR(b.currentRevenue)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          <span className={growthVal > 0 ? 'text-emerald-600' : growthVal < 0 ? 'text-red-500' : 'text-gray-500'}>
                            {growthVal > 0 ? `+${growthVal}%` : `${growthVal}%`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openInvoiceModal(b.title)}
                            title="View invoice-wise breakdown (date, OUT, IN, price)"
                            className="flex flex-col items-end gap-1 ml-auto group/inv hover:bg-indigo-50/60 rounded-lg px-2 py-1 -my-1 transition-colors cursor-pointer"
                          >
                            <span className="font-medium text-gray-700 group-hover/inv:text-indigo-700 inline-flex items-center gap-1">
                              {b.invoiceCount} {b.invoiceCount === 1 ? 'invoice' : 'invoices'}
                              <FiExternalLink className="h-3 w-3 opacity-0 group-hover/inv:opacity-100 transition-opacity" />
                            </span>
                          </button>
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

      {/* Invoice Drill-down Modal */}
      {invoiceModalTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* backdrop */}
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={closeInvoiceModal} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{invoiceModalTitle}</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Invoice-wise breakdown · last 30 days</p>
              </div>
              <button
                onClick={closeInvoiceModal}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-4">
              {invoiceLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
                  <p className="text-xs text-gray-500">Loading invoices...</p>
                </div>
              ) : invoiceError ? (
                <div className="py-12 text-center text-sm text-red-600">
                  ⚠️ {invoiceError}
                  <button onClick={() => openInvoiceModal(invoiceModalTitle)} className="ml-2 underline">Retry</button>
                </div>
              ) : invoiceData && invoiceData.invoices.length > 0 ? (
                <>
                  {/* Summary chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700">
                      {invoiceData.outInvoiceCount} OUT invoice{invoiceData.outInvoiceCount === 1 ? '' : 's'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      invoiceData.isBulk ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${invoiceData.isBulk ? 'bg-violet-500' : 'bg-sky-500'}`} />
                      {invoiceData.isBulk ? 'Bulk' : 'Non-Bulk'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700">
                      {invoiceData.totals.outQty} OUT
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600">
                      {invoiceData.totals.inQty} IN
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {formatINR(invoiceData.totals.outAmount)}
                    </span>
                  </div>

                  {/* Invoice table */}
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-100 text-xs">
                      <thead className="bg-gray-50/70 text-gray-400 text-[10px] font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Date</th>
                          <th className="px-4 py-2.5 text-left">Invoice No.</th>
                          <th className="px-4 py-2.5 text-left">Customer</th>
                          <th className="px-4 py-2.5 text-right">OUT</th>
                          <th className="px-4 py-2.5 text-right">IN</th>
                          <th className="px-4 py-2.5 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {invoiceData.invoices.map((inv: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                              {inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{inv.docNo || '—'}</td>
                            <td className="px-4 py-2.5 text-gray-500 max-w-[160px] truncate" title={inv.customerName || ''}>
                              {inv.customerName || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-emerald-700">{inv.outQty}</td>
                            <td className="px-4 py-2.5 text-right text-red-500">{inv.inQty || 0}</td>
                            <td className="px-4 py-2.5 text-right text-gray-800">{formatINR(inv.outAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50/70 text-gray-700 font-semibold">
                        <tr>
                          <td className="px-4 py-2.5" colSpan={3}>Total · {invoiceData.invoices.length} invoice(s)</td>
                          <td className="px-4 py-2.5 text-right text-emerald-700">{invoiceData.totals.outQty}</td>
                          <td className="px-4 py-2.5 text-right text-red-500">{invoiceData.totals.inQty}</td>
                          <td className="px-4 py-2.5 text-right">{formatINR(invoiceData.totals.outAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-sm text-gray-400">No invoices found in the last 30 days.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
