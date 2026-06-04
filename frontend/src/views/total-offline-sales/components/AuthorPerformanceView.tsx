import React, { useState, useEffect, useMemo } from 'react';
import { formatINR } from './utils';
import { FiUsers, FiSearch, FiAward, FiGrid, FiTrendingUp } from 'react-icons/fi';

interface AuthorStat {
  author: string;
  revenue: number;
  qty: number;
}

interface AuthorPerformanceViewProps {
  channel: string;
}

export const AuthorPerformanceView: React.FC<AuthorPerformanceViewProps> = ({ channel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorData, setAuthorData] = useState<{ top: AuthorStat[]; medium: AuthorStat[]; low: AuthorStat[]; counts: { total: number } } | null>(null);
  const [activeTier, setActiveTier] = useState<'top' | 'medium' | 'low'>('top');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5100/api'}/total-offline-sales/author-performance?channel=${channel}`;
      const response = await fetch(url);
      const data = await response.json();
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

  // Reset pagination on filter or tier change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTier, searchTerm, channel]);

  // Filter current tier list by search term
  const list = useMemo(() => {
    if (!authorData) return [];
    const tierList = authorData[activeTier] || [];
    return tierList.filter(a => a.author.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [authorData, activeTier, searchTerm]);

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
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Tier Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          {[
            { key: 'top', label: 'Top Tier' },
            { key: 'medium', label: 'Medium Tier' },
            { key: 'low', label: 'Low Tier' }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTier(t.key as any);
                setSearchTerm('');
              }}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTier === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
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

      {/* Author table list */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {list.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            No authors found matching this criteria.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50 text-gray-700 text-[10px] font-semibold uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-4">Author Name</th>
                    <th className="px-6 py-4 text-right">Net Revenue Contribution</th>
                    <th className="px-6 py-4 text-right">Copies Sold</th>
                    <th className="px-6 py-4 text-right">Channel Revenue Share</th>
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
