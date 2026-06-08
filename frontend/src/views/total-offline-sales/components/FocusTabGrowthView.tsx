import React, { useState, useMemo } from 'react';
import { formatINR } from './utils';
import { FiTrendingUp, FiAlertCircle, FiSearch, FiSliders, FiCheckCircle } from 'react-icons/fi';
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

export const FocusTabGrowthView: React.FC<FocusTabGrowthViewProps> = ({ channel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<GrowthBookItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [threshold, setThreshold] = useState(50);
  const [benchmarkType, setBenchmarkType] = useState<'prev' | 'avg'>('prev');

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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, benchmarkType]);

  // Derived filter and calculations
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.publisher.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [books, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);

  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBooks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBooks, currentPage, itemsPerPage]);

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
          🔥 {filteredBooks.filter(b => (benchmarkType === 'prev' ? b.growth : b.growthVsAvg) >= threshold).length} Titles Flagged
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
        ) : filteredBooks.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            No active growth records match your filters.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-semibold uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-4">Title &amp; Publisher</th>
                    <th className="px-6 py-4 text-right">Last 30 Days Sold (OUT)</th>
                    <th className="px-6 py-4 text-right">
                      {benchmarkType === 'prev' ? 'Preceding 30 Days (OUT)' : 'YTD Monthly Average'}
                    </th>
                    <th className="px-6 py-4 text-right">Growth Rate</th>
                    <th className="px-6 py-4 text-center">Status Flag</th>
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
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 animate-pulse">
                              🔥 High Growth
                            </span>
                          ) : growthVal > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                              📈 Steady
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-400">
                              💤 Dormant
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
                  Showing <span className="text-gray-800 font-semibold">{Math.min(filteredBooks.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
                  <span className="text-gray-800 font-semibold">{Math.min(filteredBooks.length, currentPage * itemsPerPage)}</span> of{' '}
                  <span className="text-gray-800 font-semibold">{filteredBooks.length}</span> entries
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
