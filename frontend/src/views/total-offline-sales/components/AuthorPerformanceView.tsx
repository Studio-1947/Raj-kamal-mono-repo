import React, { useState, useEffect, useMemo } from 'react';
import { formatINR } from './utils';
import {
  FiUsers, FiSearch, FiAward, FiGrid, FiTrendingUp,
  FiArrowUp, FiArrowDown, FiChevronUp, FiChevronDown,
  FiRotateCcw, FiDownload, FiFileText, FiFile, FiInfo,
} from 'react-icons/fi';
import { apiClient } from '../../../lib/apiClient';

interface AuthorStat {
  author: string;
  revenue: number;
  qty: number;
}

interface AuthorPerformanceViewProps {
  channel: string;
}

type SortField = 'author' | 'revenue' | 'copies' | 'share';
type SortDir = 'asc' | 'desc';
type TierKey = 'top' | 'medium' | 'low';

const TIER_LABEL: Record<TierKey, string> = { top: 'Top Tier', medium: 'Medium Tier', low: 'Low Tier' };

export const AuthorPerformanceView: React.FC<AuthorPerformanceViewProps> = ({ channel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorData, setAuthorData] = useState<{ top: AuthorStat[]; medium: AuthorStat[]; low: AuthorStat[]; counts: { total: number } } | null>(null);
  const [activeTier, setActiveTier] = useState<TierKey>('top');
  const [searchTerm, setSearchTerm] = useState('');

  // Refine controls
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [minRevenue, setMinRevenue] = useState<number>(0);
  const [minCopies, setMinCopies] = useState<number>(0);
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>(
        `total-offline-sales/author-performance?channel=${channel}`
      );
      if (data.ok) {
        setAuthorData(data);
      } else {
        throw new Error(data.error || 'Failed to fetch author performance');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading author performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [channel]);

  // Reset pagination on filter / tier / sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTier, searchTerm, channel, sortField, sortDir, minRevenue, minCopies]);

  // Filter current tier list (search + min revenue + min copies)
  const filteredList = useMemo(() => {
    if (!authorData) return [];
    const term = searchTerm.trim().toLowerCase();
    return (authorData[activeTier] || []).filter(a => {
      if (term && !a.author.toLowerCase().includes(term)) return false;
      if (minRevenue > 0 && a.revenue < minRevenue) return false;
      if (minCopies > 0 && a.qty < minCopies) return false;
      return true;
    });
  }, [authorData, activeTier, searchTerm, minRevenue, minCopies]);

  // Sort
  const list = useMemo(() => {
    const arr = [...filteredList];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'author': cmp = a.author.localeCompare(b.author); break;
        case 'copies': cmp = a.qty - b.qty; break;
        case 'share':  // share is proportional to revenue
        case 'revenue':
        default: cmp = a.revenue - b.revenue; break;
      }
      if (cmp === 0) cmp = a.author.localeCompare(b.author); // stable tiebreak
      return cmp * dir;
    });
    return arr;
  }, [filteredList, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'author' ? 'asc' : 'desc');
    }
  };

  const isDefaultState =
    searchTerm.trim() === '' && minRevenue === 0 && minCopies === 0 &&
    sortField === 'revenue' && sortDir === 'desc';

  const filtersActive = searchTerm.trim() !== '' || minRevenue > 0 || minCopies > 0;

  const resetAll = () => {
    setSearchTerm('');
    setMinRevenue(0);
    setMinCopies(0);
    setSortField('revenue');
    setSortDir('desc');
  };

  // Compute pagination details
  const totalPages = Math.ceil(list.length / itemsPerPage);

  const paginatedList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return list.slice(startIndex, startIndex + itemsPerPage);
  }, [list, currentPage, itemsPerPage]);

  // Aggregate values to show percentage contributions
  const statsSummary = useMemo(() => {
    if (!authorData) return null;
    const all = [...authorData.top, ...authorData.medium, ...authorData.low];
    const totalRev = all.reduce((s, a) => s + a.revenue, 0);
    const totalQty = all.reduce((s, a) => s + a.qty, 0);

    const topRev = authorData.top.reduce((s, a) => s + a.revenue, 0);
    const medRev = authorData.medium.reduce((s, a) => s + a.revenue, 0);
    const lowRev = authorData.low.reduce((s, a) => s + a.revenue, 0);

    return {
      totalRev,
      totalQty,
      topShare: totalRev > 0 ? (topRev / totalRev) * 100 : 0,
      medShare: totalRev > 0 ? (medRev / totalRev) * 100 : 0,
      lowShare: totalRev > 0 ? (lowRev / totalRev) * 100 : 0,
    };
  }, [authorData]);

  const shareOf = (a: AuthorStat) =>
    statsSummary && statsSummary.totalRev > 0 ? (a.revenue / statsSummary.totalRev) * 100 : 0;

  // ─── Export helpers (current tier + filters + sort) ──────────────────────────
  const buildExportRows = () => {
    const header = ['Rank', 'Author', 'Net Revenue (INR)', 'Copies Sold', 'Channel Revenue Share %', 'Tier'];
    const rows = list.map((a, i) => [
      String(i + 1),
      a.author,
      String(Math.round(a.revenue)),
      String(a.qty),
      `${shareOf(a).toFixed(2)}%`,
      TIER_LABEL[activeTier],
    ]);
    return { header, rows };
  };

  const exportFileBase = () => `author-performance-${activeTier}-${channel}-${new Date().toISOString().slice(0, 10)}`;

  const filterSummary = () => {
    const parts: string[] = [`Tier: ${TIER_LABEL[activeTier]}`, `Channel: ${channel}`];
    if (minRevenue > 0) parts.push(`Min revenue: ${minRevenue}`);
    if (minCopies > 0) parts.push(`Min copies: ${minCopies}`);
    if (searchTerm.trim()) parts.push(`Search: "${searchTerm.trim()}"`);
    return parts;
  };

  const downloadCSV = () => {
    const { header, rows } = buildExportRows();
    const esc = (v: string) => '"' + String(v).replace(/"/g, '""') + '"';
    const csv = [header, ...rows].map(line => line.map(esc).join(',')).join('\r\n');
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
    const esc = (v: string) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const numericCols = new Set([0, 2, 3, 4]);
    const thead = header.map((h, i) => `<th class="${numericCols.has(i) ? 'num' : ''}">${esc(h)}</th>`).join('');
    const tbody = rows.map(r => `<tr>${r.map((c, i) => `<td class="${numericCols.has(i) ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('');
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
      <h1>Author Performance — ${esc(TIER_LABEL[activeTier])}</h1>
      <div class="sub">Channel: ${esc(channel)} &nbsp;•&nbsp; ${rows.length} authors &nbsp;•&nbsp; Generated ${esc(generated)}</div>
      <div class="meta">${filterSummary().map(p => `<span>${esc(p)}</span>`).join('')}</div>
      <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
    setDownloadOpen(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-gray-500">Segmenting author cohorts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center text-sm text-red-600">
        ⚠️ {error}
        <button onClick={fetchData} className="ml-2 underline hover:text-red-950 font-normal">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cohorts Strip */}
      {statsSummary && authorData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Tier Summary */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-3xl text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <FiAward className="absolute right-4 bottom-4 h-16 w-16 text-indigo-400/20 -rotate-12 pointer-events-none z-0" />
            <div className="relative z-10 flex flex-col h-full justify-between w-full">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full w-fit">
                  Top Performers (Top 15%)
                </span>
                <h3 className="text-2xl font-bold mt-4">{statsSummary.topShare.toFixed(1)}%</h3>
                <p className="text-xs text-indigo-100 mt-1">Revenue contribution share</p>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-indigo-100">
                <span>Cohort Size:</span>
                <span className="font-semibold">{authorData.top.length} Authors</span>
              </div>
            </div>
          </div>

          {/* Medium Tier Summary */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <FiGrid className="absolute right-4 bottom-4 h-16 w-16 text-gray-400/10 -rotate-12 pointer-events-none z-0" />
            <div className="relative z-10 flex flex-col h-full justify-between w-full">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full w-fit">
                  Medium Performers (Next 50%)
                </span>
                <h3 className="text-2xl font-semibold text-gray-800 mt-4">{statsSummary.medShare.toFixed(1)}%</h3>
                <p className="text-xs text-gray-400 mt-1">Revenue contribution share</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                <span>Cohort Size:</span>
                <span className="font-semibold text-gray-800">{authorData.medium.length} Authors</span>
              </div>
            </div>
          </div>

          {/* Low Tier Summary */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <FiUsers className="absolute right-4 bottom-4 h-16 w-16 text-gray-400/10 -rotate-12 pointer-events-none z-0" />
            <div className="relative z-10 flex flex-col h-full justify-between w-full">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full w-fit">
                  Low Performers (Bottom 35%)
                </span>
                <h3 className="text-2xl font-semibold text-gray-800 mt-4">{statsSummary.lowShare.toFixed(1)}%</h3>
                <p className="text-xs text-gray-400 mt-1">Revenue contribution share</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                <span>Cohort Size:</span>
                <span className="font-semibold text-gray-800">{authorData.low.length} Authors</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Controls & Search */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        {/* Row 1: Tier Tabs + methodology + Search */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="flex items-center gap-2">
            {/* Tier Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {([
                { key: 'top', label: 'Top Tier' },
                { key: 'medium', label: 'Medium Tier' },
                { key: 'low', label: 'Low Tier' },
              ] as { key: TierKey; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTier(t.key)}
                  className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeTier === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Methodology explainer */}
            <div className="relative group">
              <button className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" aria-label="How tiers are calculated">
                <FiInfo className="h-4 w-4" />
              </button>
              <div className="pointer-events-none absolute left-0 top-full mt-2 z-30 w-72 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
                <div className="rounded-xl bg-gray-900 text-white text-[11px] leading-snug font-normal p-3 shadow-lg space-y-1.5">
                  <span className="block font-semibold">How tiers are calculated</span>
                  <p>Authors are ranked by <strong>net revenue</strong> (sales − returns) across the selected channel. The ranked list is then split by author count:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-200">
                    <li><strong>Top Tier</strong> — top 15% of authors</li>
                    <li><strong>Medium Tier</strong> — next 50%</li>
                    <li><strong>Low Tier</strong> — bottom 35%</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search author..."
              className="block w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Row 2: Refine controls */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-50">
          <div className="flex items-center gap-1.5 pt-3">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Min Revenue ₹</label>
            <input
              type="number" min={0} value={minRevenue || ''}
              onChange={(e) => setMinRevenue(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-24 px-2.5 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 pt-3">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Min Copies</label>
            <input
              type="number" min={0} value={minCopies || ''}
              onChange={(e) => setMinCopies(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-20 px-2.5 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 pt-3">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sort</label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="revenue">Net Revenue</option>
              <option value="author">Author (A–Z)</option>
              <option value="copies">Copies Sold</option>
              <option value="share">Revenue Share</option>
            </select>
            <button
              onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
            >
              {sortDir === 'asc' ? <FiArrowUp className="h-4 w-4" /> : <FiArrowDown className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-3 pt-3 ml-auto">
            {/* Download dropdown */}
            <div className="relative">
              <button
                onClick={() => setDownloadOpen(o => !o)}
                disabled={list.length === 0}
                title="Download the current view"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <FiDownload className="h-3.5 w-3.5" /> Download
                <FiChevronDown className={`h-3.5 w-3.5 transition-transform ${downloadOpen ? 'rotate-180' : ''}`} />
              </button>
              {downloadOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setDownloadOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-30 w-52 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
                    <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                      Export {list.length} authors
                    </div>
                    <button onClick={downloadCSV} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      <FiFileText className="h-4 w-4 text-emerald-600" />
                      <span className="flex-1 text-left">CSV spreadsheet</span>
                    </button>
                    <button onClick={downloadPDF} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-50">
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
              title="Reset filters and sorting to defaults"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <FiRotateCcw className="h-3.5 w-3.5" /> Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Author table list */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400 flex flex-col items-center gap-3">
            No authors found matching this criteria.
            {filtersActive && (
              <button onClick={resetAll} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                <FiRotateCcw className="h-3.5 w-3.5" /> Reset all
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Hint */}
            <div className="px-6 pt-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">
                <FiArrowDown className="h-3 w-3" /> Tip: click any column heading to sort
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50 text-gray-700 text-[10px] font-semibold uppercase tracking-wider text-left">
                  <tr>
                    {([
                      { field: 'author' as SortField, label: 'Author Name', align: 'left' },
                      { field: 'revenue' as SortField, label: 'Net Revenue Contribution', align: 'right' },
                      { field: 'copies' as SortField, label: 'Copies Sold', align: 'right' },
                      { field: 'share' as SortField, label: 'Channel Revenue Share', align: 'right' },
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
                              active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                          >
                            <span className="uppercase tracking-wider">{col.label}</span>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
                  {paginatedList.map((item, idx) => {
                    const pct = statsSummary && statsSummary.totalRev > 0 ? (item.revenue / statsSummary.totalRev) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {item.author}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatINR(item.revenue)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900 font-medium">
                          {item.qty.toLocaleString('en-IN')} copies
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full text-[10px]">
                            <FiTrendingUp className="h-3 w-3" />
                            {pct.toFixed(2)}%
                          </div>
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
                  Showing <span className="text-gray-800 font-semibold">{Math.min(list.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                  <span className="text-gray-800 font-semibold">{Math.min(list.length, currentPage * itemsPerPage)}</span> of{' '}
                  <span className="text-gray-800 font-semibold">{list.length}</span> entries
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
