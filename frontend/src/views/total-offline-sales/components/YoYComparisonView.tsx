import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatINR, formatChartValue, formatLakhsAndCrores } from './utils';
import { FiTrendingUp, FiTrendingDown, FiInfo, FiActivity } from 'react-icons/fi';

interface MonthlyDataPoint {
  month: number;
  revenue: number;
  qty: number;
}

interface YearDataset {
  year: number;
  isSimulated: boolean;
  monthly: MonthlyDataPoint[];
}

interface YoYComparisonViewProps {
  channel: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const YoYComparisonView: React.FC<YoYComparisonViewProps> = ({ channel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<YearDataset[]>([]);
  const [metric, setMetric] = useState<'revenue' | 'qty'>('revenue');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5100/api'}/total-offline-sales/yoy-comparison?channel=${channel}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        setDatasets(data.datasets || []);
      } else {
        throw new Error(data.error || 'Failed to fetch YoY comparison');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading YoY comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [channel]);

  // Combine datasets for chart representation
  const chartData = useMemo(() => {
    if (datasets.length === 0) return [];
    
    // We expect datasets to represent different years (e.g. 2025 and 2026)
    return MONTH_NAMES.map((name, idx) => {
      const point: any = { month: name };
      for (const d of datasets) {
        const monthVal = d.monthly.find(m => m.month === idx);
        point[`year_${d.year}`] = monthVal ? (metric === 'revenue' ? monthVal.revenue : monthVal.qty) : 0;
        point[`year_${d.year}_simulated`] = d.isSimulated;
      }
      return point;
    });
  }, [datasets, metric]);

  // Calculations for YoY indicators
  const stats = useMemo(() => {
    if (datasets.length < 2) return null;
    
    // Find current (2026) and previous (2025)
    const prevYearDataset = datasets.find(d => d.year === 2025);
    const currYearDataset = datasets.find(d => d.year === 2026);

    if (!prevYearDataset || !currYearDataset) return null;

    // Calculate sum of active months
    // Only sum up to the months that have data in 2026 (to do a fair like-for-like YTD comparison)
    let currTotalRev = 0;
    let prevTotalRev = 0;
    let currTotalQty = 0;
    let prevTotalQty = 0;

    currYearDataset.monthly.forEach((m, idx) => {
      // If current year month has sales, count it in comparison
      if (m.revenue > 0 || m.qty > 0) {
        currTotalRev += m.revenue;
        currTotalQty += m.qty;

        const prevMonth = prevYearDataset.monthly[idx];
        if (prevMonth) {
          prevTotalRev += prevMonth.revenue;
          prevTotalQty += prevMonth.qty;
        }
      }
    });

    const revGrowth = prevTotalRev > 0 ? ((currTotalRev - prevTotalRev) / prevTotalRev) * 100 : 0;
    const qtyGrowth = prevTotalQty > 0 ? ((currTotalQty - prevTotalQty) / prevTotalQty) * 100 : 0;

    return {
      currTotalRev,
      prevTotalRev,
      currTotalQty,
      prevTotalQty,
      revGrowth,
      qtyGrowth,
      isSimulated: prevYearDataset.isSimulated
    };
  }, [datasets]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-gray-500">Assembling YoY analytics models...</p>
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
      {/* Simulation Banner */}
      {stats?.isSimulated && (
        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-3xl flex items-start gap-3 text-xs text-blue-800 leading-normal">
          <FiInfo className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <strong>Historical Data Simulation Mode</strong>: The transaction database currently contains actual records starting January 1, 2026. The 2025 comparison curves are simulated based on standard seasonality and a -12% revenue factor baseline. Once older ERP worksheets are synched, actuals will load automatically.
          </div>
        </div>
      )}

      {/* KPI stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue YoY */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">YTD Like-for-Like Revenue</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900">{formatINR(stats.currTotalRev)}</span>
                <span className="text-xs text-gray-400">vs {formatINR(stats.prevTotalRev)} (LY)</span>
              </div>
            </div>
            <div className={`p-3 rounded-2xl flex items-center gap-1 text-sm font-semibold shrink-0 ${
              stats.revGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {stats.revGrowth >= 0 ? <FiTrendingUp className="h-4 w-4" /> : <FiTrendingDown className="h-4 w-4" />}
              {stats.revGrowth >= 0 ? `+${stats.revGrowth.toFixed(1)}%` : `${stats.revGrowth.toFixed(1)}%`}
            </div>
          </div>

          {/* Volume YoY */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">YTD Like-for-Like Copies Sold</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900">{stats.currTotalQty.toLocaleString('en-IN')}</span>
                <span className="text-xs text-gray-400">vs {stats.prevTotalQty.toLocaleString('en-IN')} (LY)</span>
              </div>
            </div>
            <div className={`p-3 rounded-2xl flex items-center gap-1 text-sm font-semibold shrink-0 ${
              stats.qtyGrowth >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {stats.qtyGrowth >= 0 ? <FiTrendingUp className="h-4 w-4" /> : <FiTrendingDown className="h-4 w-4" />}
              {stats.qtyGrowth >= 0 ? `+${stats.qtyGrowth.toFixed(1)}%` : `${stats.qtyGrowth.toFixed(1)}%`}
            </div>
          </div>
        </div>
      )}

      {/* Main Comparison Chart */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-normal text-gray-800">Year-on-Year Growth Chart</h3>
            <p className="text-xs text-gray-400 mt-0.5">Seasonal comparisons of sales totals</p>
          </div>

          {/* Toggle metric */}
          <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setMetric('revenue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                metric === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setMetric('qty')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                metric === 'qty' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Volume (Copies)
            </button>
          </div>
        </div>

        <div style={{ height: 320 }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="color2026" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="color2025" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickFormatter={metric === 'revenue' ? formatChartValue : (v) => v.toLocaleString('en-IN')}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl space-y-2 text-left">
                        <p className="text-xs font-semibold text-gray-500 border-b border-gray-100 pb-1.5">Month: {payload[0].payload.month}</p>
                        {payload.map((p: any, idx: number) => {
                          const year = p.name.split('_')[1];
                          const isSimulated = p.payload[`year_${year}_simulated`];
                          return (
                            <div key={idx} className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-medium">
                                Year {year} {isSimulated ? '(Simulated)' : '(Actual)'}
                              </span>
                              <span className="text-sm font-semibold text-gray-800 mt-0.5" style={{ color: p.color }}>
                                {metric === 'revenue' ? formatINR(p.value) : `${p.value.toLocaleString('en-IN')} copies`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              {datasets.map((d, index) => {
                const color = d.year === 2026 ? '#4F46E5' : '#9CA3AF';
                return (
                  <Area
                    key={d.year}
                    type="monotone"
                    dataKey={`year_${d.year}`}
                    name={`Year ${d.year} ${d.isSimulated ? '(Simulated)' : ''}`}
                    stroke={color}
                    strokeWidth={d.year === 2026 ? 2.5 : 1.5}
                    strokeDasharray={d.isSimulated ? '4 4' : undefined}
                    fillOpacity={1}
                    fill={`url(#color${d.year})`}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
