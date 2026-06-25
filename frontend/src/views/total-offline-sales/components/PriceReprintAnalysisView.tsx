import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line } from 'recharts';
import { formatINR, formatChartValue } from './utils';
import { FiTrendingUp, FiActivity, FiArrowRight, FiInfo, FiLayers, FiCalendar, FiSearch } from 'react-icons/fi';
import { apiClient } from '../../../lib/apiClient';

interface BracketDetail {
  revenue: number;
  qty: number;
}

interface PriceSummaryData {
  brackets: {
    under250: BracketDetail;
    between250And500: BracketDetail;
    between500And1000: BracketDetail;
    over1000: BracketDetail;
  };
  multiPriceCount: number;
  multiPriceBooks: { title: string; rates: number[]; bindings: string[] }[];
}

interface PricePointDetail {
  rate: number;
  qty: number;
  revenue: number;
  minDate: string | null;
  maxDate: string | null;
  bindings: string[];
}

interface PriceReprintAnalysisViewProps {
  channel: string;
  fy?: string;
}

export const PriceReprintAnalysisView: React.FC<PriceReprintAnalysisViewProps> = ({ channel, fy = 'current' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<PriceSummaryData | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [bookDetails, setBookDetails] = useState<PricePointDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDetailBinding, setSelectedDetailBinding] = useState<string>('All');
  const [selectedBindingTab, setSelectedBindingTab] = useState<string>('All');

  // Fetch summary data
  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>(
        `total-offline-sales/price-analysis?channel=${channel}&fy=${fy}`
      );
      if (data.ok) {
        setSummaryData(data);
      } else {
        throw new Error(data.error || 'Failed to fetch price analysis');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading price analysis');
    } finally {
      setLoading(false);
    }
  };

  // Fetch book price points details
  const fetchBookDetails = async (title: string) => {
    setDetailsLoading(true);
    try {
      const data = await apiClient.get<any>(
        `total-offline-sales/price-analysis?channel=${channel}&title=${encodeURIComponent(title)}&fy=${fy}`
      );
      if (data.ok) {
        setBookDetails(data.pricePoints || []);
      }
    } catch (err) {
      console.error('Failed to load book price details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    setSelectedBook(null);
    setBookDetails([]);
    setSearchTerm('');
    setSelectedBindingTab('All');
  }, [channel, fy]);

  useEffect(() => {
    if (selectedBook) {
      fetchBookDetails(selectedBook);
      setSelectedDetailBinding('All');
    }
  }, [selectedBook, channel, fy]);

  // Calculate counts for each binding tab
  const tabCounts = useMemo(() => {
    const counts = { All: 0, Paperback: 0, Hardcover: 0, Others: 0 };
    if (!summaryData?.multiPriceBooks) return counts;
    
    summaryData.multiPriceBooks.forEach(b => {
      counts.All++;
      const hasPaperback = b.bindings?.some(bind => bind.toLowerCase().includes('paperback')) ?? false;
      const hasHardcover = b.bindings?.some(bind => {
        const lower = bind.toLowerCase();
        return lower.includes('hardcover') || lower.includes('hardbound');
      }) ?? false;
      
      if (hasPaperback) counts.Paperback++;
      if (hasHardcover) counts.Hardcover++;
      
      const hasOthers = b.bindings?.some(bind => {
        const lower = bind.toLowerCase();
        return !lower.includes('paperback') && !lower.includes('hardcover') && !lower.includes('hardbound');
      }) || !b.bindings || b.bindings.length === 0;
      
      if (hasOthers) counts.Others++;
    });
    
    return counts;
  }, [summaryData]);

  // Filter reprinted titles list by search term and binding tab
  const filteredMultiPriceBooks = useMemo(() => {
    if (!summaryData?.multiPriceBooks) return [];
    
    return summaryData.multiPriceBooks.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      
      if (selectedBindingTab === 'All') return true;
      
      const hasPaperback = b.bindings?.some(bind => bind.toLowerCase().includes('paperback')) ?? false;
      const hasHardcover = b.bindings?.some(bind => {
        const lower = bind.toLowerCase();
        return lower.includes('hardcover') || lower.includes('hardbound');
      }) ?? false;
      
      if (selectedBindingTab === 'Paperback') return hasPaperback;
      if (selectedBindingTab === 'Hardcover') return hasHardcover;
      
      if (selectedBindingTab === 'Others') {
        return b.bindings?.some(bind => {
          const lower = bind.toLowerCase();
          return !lower.includes('paperback') && !lower.includes('hardcover') && !lower.includes('hardbound');
        }) || !b.bindings || b.bindings.length === 0;
      }
      
      return true;
    });
  }, [summaryData, searchTerm, selectedBindingTab]);

  // Compute overall bindings for the selected book detail
  const selectedBookBindings = useMemo(() => {
    const all = new Set<string>();
    bookDetails.forEach(pt => {
      if (pt.bindings) {
        pt.bindings.forEach(b => {
          if (b) all.add(b);
        });
      }
    });
    return Array.from(all);
  }, [bookDetails]);

  // Filter bookDetails based on selectedDetailBinding sub-tab
  const filteredBookDetails = useMemo(() => {
    if (selectedDetailBinding === 'All') return bookDetails;
    return bookDetails.filter(pt =>
      pt.bindings?.some(b => b.toLowerCase() === selectedDetailBinding.toLowerCase())
    );
  }, [bookDetails, selectedDetailBinding]);

  // Map filteredBookDetails to include display label with binding for X-axis
  const lineChartData = useMemo(() => {
    return filteredBookDetails.map(pt => {
      const bindingStr = pt.bindings && pt.bindings.length > 0 ? ` (${pt.bindings.join(', ')})` : '';
      return {
        ...pt,
        displayLabel: `₹${pt.rate}${bindingStr}`
      };
    });
  }, [filteredBookDetails]);

  // Custom Line Chart Dot Renderers based on binding format
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return <g />;
    const isHardcover = payload.bindings?.some((b: string) => {
      const lower = b.toLowerCase();
      return lower.includes('hardcover') || lower.includes('hardbound');
    });
    const fill = isHardcover ? '#8B5CF6' : '#6366F1';
    return (
      <circle cx={cx} cy={cy} r={5} stroke={fill} strokeWidth={2} fill="#fff" key={`dot-${payload.rate}`} />
    );
  };

  const renderCustomActiveDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return <g />;
    const isHardcover = payload.bindings?.some((b: string) => {
      const lower = b.toLowerCase();
      return lower.includes('hardcover') || lower.includes('hardbound');
    });
    const fill = isHardcover ? '#8B5CF6' : '#6366F1';
    return (
      <circle cx={cx} cy={cy} r={7} fill={fill} stroke="#fff" strokeWidth={2} key={`active-dot-${payload.rate}`} />
    );
  };

  // Format price bracket chart data
  const bracketChartData = useMemo(() => {
    if (!summaryData) return [];
    const b = summaryData.brackets;
    return [
      { name: 'Under ₹250', value: b.under250.revenue, qty: b.under250.qty, color: '#3B82F6' },
      { name: '₹250 - ₹500', value: b.between250And500.revenue, qty: b.between250And500.qty, color: '#6366F1' },
      { name: '₹500 - ₹1000', value: b.between500And1000.revenue, qty: b.between500And1000.qty, color: '#8B5CF6' },
      { name: 'Over ₹1000', value: b.over1000.revenue, qty: b.over1000.qty, color: '#EC4899' },
    ];
  }, [summaryData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-gray-500">Processing price-point catalog matrices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center text-sm text-red-600">
        ⚠️ {error}
        <button onClick={fetchSummary} className="ml-2 underline hover:text-red-950 font-normal">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Section: Price Bracket Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-lg font-normal text-gray-800">Price Bracket Distribution</h3>
            <p className="text-xs text-gray-400">Total channel sales revenue grouped by book price point</p>
          </div>

          <div style={{ height: 240 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bracketChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  tickFormatter={formatChartValue}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl space-y-1 text-left">
                          <p className="text-xs font-semibold text-gray-800">{d.name}</p>
                          <p className="text-lg font-normal text-indigo-600">{formatINR(d.value)}</p>
                          <p className="text-[10px] text-gray-400">Copies: {d.qty.toLocaleString('en-IN')}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={44}>
                  {bracketChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reprint KPI Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full w-fit">
              Reprint Price Analysis
            </span>
            <h3 className="text-4xl font-bold text-gray-900 mt-6">
              {summaryData?.multiPriceCount.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Books showing multiple active price levels (rates) across this channel's history.
            </p>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 flex items-start gap-2 text-[10px] text-gray-500 leading-normal mt-4">
            <FiInfo className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
            <span>
              Price changes typically reflect new paper rates, reprints, hardback vs paperbacks, or edition revisions. Select a title below to audit demand elasticity!
            </span>
          </div>
        </div>
      </div>

      {/* Main Section: Books list vs Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-gray-100 pt-6">
        {/* Books List Panel */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-[520px] flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-normal text-gray-800">Reprinted Titles Catalog</h3>
            <p className="text-xs text-gray-400">Click a title to audit pre &amp; post price change metrics</p>
          </div>

          {/* Search box */}
          <div className="relative mb-3">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reprinted title..."
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Binding filter tabs */}
          <div className="flex gap-1 mb-3 border-b border-gray-100 pb-2.5 flex-wrap">
            {(['All', 'Paperback', 'Hardcover', 'Others'] as const).map((tab) => {
              const isActive = selectedBindingTab === tab;
              const count = tabCounts[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setSelectedBindingTab(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1 ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`px-1 rounded text-[8px] font-extrabold ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {filteredMultiPriceBooks.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400">
                No matching titles found.
              </div>
            ) : (
              filteredMultiPriceBooks.map((b, idx) => {
                const isSelected = selectedBook === b.title;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedBook(b.title)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all text-xs flex justify-between items-center group relative overflow-hidden ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 text-gray-700 bg-white hover:bg-gray-50/20'
                    }`}
                  >
                    <div className="space-y-1.5 pr-4">
                      <span className="font-semibold block line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {b.title}
                      </span>
                      <span className="text-[10px] text-gray-400 flex flex-col gap-1 font-medium">
                        <span className="flex items-center gap-1.5">
                          <FiLayers className="shrink-0 text-gray-300" />
                          {b.rates.length} price points: {b.rates.map(r => `₹${r}`).join(' → ')}
                        </span>
                        {b.bindings && b.bindings.length > 0 && (
                          <span className="text-[9px] text-indigo-500 font-semibold uppercase tracking-wider">
                            Format: {b.bindings.join(' • ')}
                          </span>
                        )}
                      </span>
                    </div>
                    <FiArrowRight className={`h-4 w-4 text-gray-300 group-hover:text-indigo-600 transition-all ${
                      isSelected ? 'translate-x-1 text-indigo-600' : 'group-hover:translate-x-1'
                    }`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Book Details Panel */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2 h-[520px] flex flex-col">
          {!selectedBook ? (
            <div className="m-auto text-center py-20 flex flex-col items-center gap-3 text-gray-400">
              <FiActivity className="h-10 w-10 text-gray-300 animate-pulse" />
              <div>
                <h4 className="text-sm font-semibold text-gray-600">Elasticity Audit Panel</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-[280px]">
                  Select a reprinted book from the left catalog to perform a comprehensive price transition check.
                </p>
              </div>
            </div>
          ) : detailsLoading ? (
            <div className="m-auto text-center flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-xs text-gray-500">Extracting transaction rate histories...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
              {/* Header */}
              <div className="border-b border-gray-50 pb-4 mb-4 shrink-0 flex justify-between items-center">
                <div>
                  <h4 className="text-base font-semibold text-gray-800 line-clamp-1">{selectedBook}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">Pre &amp; Post Reprint Performance Audit</p>
                </div>
                {selectedBookBindings.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {selectedBookBindings.map((b, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail view binding filter tabs */}
              {selectedBookBindings.length > 1 && (
                <div className="flex gap-1 mb-4 shrink-0 bg-gray-100/60 p-1 rounded-2xl border border-gray-200/50 w-fit">
                  <button
                    onClick={() => setSelectedDetailBinding('All')}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                      selectedDetailBinding === 'All'
                        ? 'bg-white text-indigo-900 shadow-sm border border-gray-200/40'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    All Formats
                  </button>
                  {selectedBookBindings.map((b) => (
                    <button
                      key={b}
                      onClick={() => setSelectedDetailBinding(b)}
                      className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                        selectedDetailBinding === b
                          ? 'bg-white text-indigo-900 shadow-sm border border-gray-200/40'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}

              {/* Chart of Elasticity (Copies sold vs Rate) */}
              <div className="flex-1 min-h-0 mb-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Demand Elasticity Curve (Copies Sold vs. Price Point)</p>
                <div style={{ height: 180 }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData} margin={{ top: 10, right: 25, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis
                        dataKey="displayLabel"
                        axisLine={false}
                        tickLine={false}
                        height={30}
                        tick={{ fill: '#9CA3AF', fontSize: 9 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        tickFormatter={(v) => v.toString()}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl text-left space-y-1">
                                <p className="text-xs font-semibold text-gray-800">Price Point: ₹{d.rate}</p>
                                <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">
                                  Binding: {d.bindings && d.bindings.length > 0 ? d.bindings.join(', ') : 'N/A'}
                                </p>
                                <p className="text-sm font-semibold text-indigo-600">Sold: {d.qty} copies</p>
                                <p className="text-[10px] text-gray-400">Revenue: {formatINR(d.revenue)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line type="monotone" dataKey="qty" stroke="#6366F1" strokeWidth={3} activeDot={renderCustomActiveDot} dot={renderCustomDot} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Price Points Table */}
              <div className="h-36 overflow-y-auto border border-gray-100 rounded-2xl bg-gray-50/50 shrink-0">
                <table className="min-w-full divide-y divide-gray-100 text-xs table-fixed">
                  <thead className="bg-gray-100 text-gray-400 text-[9px] font-bold uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-4 py-2.5 w-[14%]">Price Level</th>
                      <th className="px-4 py-2.5 text-right w-[15%]">Copies Sold</th>
                      <th className="px-4 py-2.5 text-right w-[16%]">Total Revenue</th>
                      <th className="px-4 py-2.5 text-center w-[20%]">Elasticity (PED)</th>
                      <th className="px-4 py-2.5 text-center w-[15%]">Binding</th>
                      <th className="px-4 py-2.5 text-right w-[20%]">Effective Date Span</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-600 bg-white">
                    {filteredBookDetails.map((pt, idx) => {
                      const minD = pt.minDate ? new Date(pt.minDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A';
                      const maxD = pt.maxDate ? new Date(pt.maxDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A';

                      const pedValue = (() => {
                        if (idx === 0) return null;
                        const prevPt = filteredBookDetails[idx - 1]!;
                        const priceChange = (pt.rate - prevPt.rate) / prevPt.rate;
                        if (priceChange === 0) return null;
                        const qtyChange = (pt.qty - prevPt.qty) / (prevPt.qty || 1);
                        return qtyChange / priceChange;
                      })();

                      const pedLabel = (() => {
                        if (pedValue === null) return 'Baseline';
                        const absPed = Math.abs(pedValue);
                        if (absPed > 1.05) return `Elastic (${pedValue.toFixed(2)})`;
                        if (absPed < 0.95) return `Inelastic (${pedValue.toFixed(2)})`;
                        return `Unitary (${pedValue.toFixed(2)})`;
                      })();

                      const pedBadgeColor = (() => {
                        if (pedValue === null) return 'bg-gray-50 text-gray-500 border border-gray-200/60';
                        const absPed = Math.abs(pedValue);
                        if (absPed > 1.05) return 'bg-amber-50 text-amber-700 border border-amber-200/50';
                        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
                      })();

                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-bold text-gray-900 truncate">
                            ₹{pt.rate}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium truncate">
                            {pt.qty} copies
                          </td>
                          <td className="px-4 py-2.5 text-right truncate">
                            {formatINR(pt.revenue)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${pedBadgeColor}`}>
                              {pedLabel}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-50 text-slate-700 border border-slate-200/60 uppercase tracking-wider truncate max-w-full">
                              {pt.bindings && pt.bindings.length > 0 ? pt.bindings.join(', ') : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-[10px] text-gray-400 font-medium">
                            <div className="flex items-center justify-end gap-1.5">
                              <FiCalendar className="shrink-0 text-gray-300" />
                              <span className="truncate">{minD} - {maxD}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
