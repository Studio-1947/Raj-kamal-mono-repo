import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../../shared/searchUtils';
import { apiClient } from '../../../lib/apiClient';
import { FiSearch, FiX, FiShoppingBag, FiTrendingUp } from 'react-icons/fi';
import { formatINR, formatLakhsAndCrores, REGIONAL_COLORS } from './utils';

interface BookSearchResult {
  title: string;
  binding: string;
  totalQty: number;
  totalRevenue: number;
  channels: Record<string, { qty: number; revenue: number }>;
}

interface BookSearchViewProps {
  fyMode: 'current' | 'previous';
}

const CHANNEL_KEYS = ['Delhi', 'Mumbai', 'Patna', 'Online', 'BookFair', 'Lokbharti'];

const CHANNEL_DISPLAY: Record<string, { label: string; color: string }> = {
  Delhi:     { label: 'Delhi',     color: '#3B82F6' },
  Mumbai:    { label: 'Mumbai',    color: '#10B981' },
  Patna:     { label: 'Patna',     color: '#8B5CF6' },
  Online:    { label: 'Online',    color: '#F97316' },
  BookFair:  { label: 'Book Fair', color: '#EC4899' },
  Lokbharti: { label: 'Lokbharti', color: '#0D9488' },
};

export const BookSearchView: React.FC<BookSearchViewProps> = ({ fyMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<BookSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    async function performSearch() {
      const q = debouncedSearchTerm.trim();
      if (q.length < 2) {
        setBooks([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<{ ok: boolean; books: BookSearchResult[] }>(
          `total-offline-sales/book-search?q=${encodeURIComponent(q)}&fy=${fyMode}`
        );
        if (response.ok) {
          setBooks(response.books || []);
        } else {
          setError('Failed to fetch search results');
        }
      } catch (err: any) {
        console.error('Error searching books:', err);
        setError(err?.message || 'Error executing book search');
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [debouncedSearchTerm, fyMode]);

  const handleClear = () => {
    setSearchTerm('');
    setBooks([]);
    setError(null);
  };

  const renderCell = (qty: number, revenue: number) => {
    if (qty === 0 && revenue === 0) {
      return <span className="text-gray-300">—</span>;
    }
    return (
      <div className="flex flex-col items-end">
        <span className="font-semibold text-gray-800">{qty.toLocaleString('en-IN')}</span>
        <span className="text-[10px] text-gray-400 font-normal mt-0.5">{formatLakhsAndCrores(revenue)}</span>
      </div>
    );
  };

  const hasSearch = debouncedSearchTerm.trim().length >= 2;

  return (
    <div className="space-y-6">
      {/* 🔍 Search Input Card */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Search Book Sales
          </label>
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search book title across all channels (e.g. Godan, Kafan)..."
              className="block w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl bg-gray-50/50 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <FiX className="h-5 w-5" />
              </button>
            )}
          </div>
          {searchTerm && searchTerm.trim().length === 1 && (
            <p className="text-[10px] text-amber-600 italic">Please enter at least 2 characters to search.</p>
          )}
        </div>
      </div>

      {/* 📊 Expandable Search Results Container */}
      {hasSearch && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-fadeIn">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Search Results for "{debouncedSearchTerm.trim()}"
            </h3>
            {loading ? (
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-indigo-600 inline-block" />
                Searching...
              </span>
            ) : (
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {books.length} {books.length === 1 ? 'format found' : 'formats found'}
              </span>
            )}
          </div>

          {error ? (
            <div className="p-8 text-center text-sm text-red-500">
              ⚠️ {error}
            </div>
          ) : !loading && books.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No book sales matching "{debouncedSearchTerm.trim()}" found in this financial year.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/30 text-gray-400 text-[10px] font-semibold uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-6 py-3.5">Book Title & Binding</th>
                    <th className="px-6 py-3.5 text-right bg-indigo-50/20 text-indigo-700">Total Copies</th>
                    <th className="px-6 py-3.5 text-right bg-indigo-50/20 text-indigo-700">Total Revenue</th>
                    {CHANNEL_KEYS.map((ch) => {
                      const display = CHANNEL_DISPLAY[ch];
                      return (
                        <th 
                          key={ch} 
                          className="px-5 py-3.5 text-right"
                          style={{ color: display.color }}
                        >
                          {display.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs text-gray-600">
                  {books.map((b, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      {/* Title & Binding */}
                      <td className="px-6 py-4 pr-4 max-w-xs">
                        <div className="font-semibold text-gray-800 break-words">{b.title}</div>
                        <span className="inline-block text-[9px] font-medium text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded mt-1">
                          {b.binding}
                        </span>
                      </td>

                      {/* Total Copies */}
                      <td className="px-6 py-4 text-right font-bold text-indigo-700 bg-indigo-50/10">
                        {b.totalQty.toLocaleString('en-IN')}
                      </td>

                      {/* Total Revenue */}
                      <td className="px-6 py-4 text-right font-bold text-indigo-700 bg-indigo-50/10 whitespace-nowrap">
                        {formatINR(b.totalRevenue)}
                      </td>

                      {/* Channel Segments */}
                      {CHANNEL_KEYS.map((ch) => {
                        const cellData = b.channels[ch] || { qty: 0, revenue: 0 };
                        return (
                          <td key={ch} className="px-5 py-4 text-right whitespace-nowrap">
                            {renderCell(cellData.qty, cellData.revenue)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
