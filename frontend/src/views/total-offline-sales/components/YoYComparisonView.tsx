import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatINR, formatChartValue } from './utils';
import { FiTrendingUp, FiTrendingDown, FiInfo } from 'react-icons/fi';
import { apiClient } from '../../../lib/apiClient';

interface MonthlyDataPoint {
  month: number; // financial-month index: 0 = Apr … 11 = Mar
  revenue: number;
  qty: number;
}

interface YearDataset {
  fy: string;        // e.g. "2025-26"
  label: string;     // e.g. "FY 2025-26"
  isHistory: boolean;
  isSimulated: boolean;
  monthly: MonthlyDataPoint[];
}

interface YoYComparisonViewProps {
  channel: string;
}

const FALLBACK_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

// Current FY drawn in indigo, the archived previous FY in grey.
const CURRENT_COLOR = '#4F46E5';
const PREVIOUS_COLOR = '#9CA3AF';
const colorFor = (d: YearDataset) => (d.isHistory ? PREVIOUS_COLOR : CURRENT_COLOR);

export const YoYComparisonView: React.FC<YoYComparisonViewProps> = ({ channel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<YearDataset[]>([]);
  const [monthLabels, setMonthLabels] = useState<string[]>(FALLBACK_LABELS);
  const [metric, setMetric] = useState<'revenue' | 'qty'>('revenue');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>(
        `total-offline-sales/yoy-comparison?channel=${channel}`
      );
      if (data.ok) {
        setDatasets(data.datasets || []);
        if (Array.isArray(data.monthLabels) && data.monthLabels.length === 12) {
          setMonthLabels(data.monthLabels);
        }
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

  // Build the chart rows: one entry per financial month, each dataset keyed by its FY.
  const chartData = useMemo(() => {
    if (datasets.length === 0) return [];
    return monthLabels.map((name, idx) => {
      const point: any = { month: name };
      for (const d of datasets) {
        const m = d.monthly.find(mm => mm.month === idx);
        point[d.fy] = m ? (metric === 'revenue' ? m.revenue : m.qty) : 0;
      }
      return point;
    });
  }, [datasets, monthLabels, metric]);

  // Like-for-like YTD: only sum the FY-months where the CURRENT year has activity,
  // so we compare equal portions of each year (the current FY is still in progress).
  const stats = useMemo(() => {
    const prev = datasets.find(d => d.isHistory);
    const curr = datasets.find(d => !d.isHistory);
    if (!prev || !curr) return null;

    let currRev = 0, prevRev = 0, currQty = 0, prevQty = 0;
    curr.monthly.forEach((m, idx) => {
      if (m.revenue > 0 || m.qty > 0) {
        currRev += m.revenue;
        currQty += m.qty;
        const pm = prev.monthly[idx];
        if (pm) { prevRev += pm.revenue; prevQty += pm.qty; }
      }
    });

    const revGrowth = prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : 0;
    const qtyGrowth = prevQty > 0 ? ((currQty - prevQty) / prevQty) * 100 : 0;
    return { currRev, prevRev, currQty, prevQty, revGrowth, qtyGrowth, prevLabel: prev.label, currLabel: curr.label };
  }, [datasets]);

  const emptyDataset = datasets.find(d => d.monthly.every(m => m.revenue === 0 && m.qty === 0));

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
      {/* Info banner only if one of the years genuinely has no data for this channel */}
      {emptyDataset && (
        <div className="bg-blue-50/50 border border-blue-200/60 p-5 rounded-3xl flex items-start gap-3.5 text-xs text-blue-900 leading-relaxed shadow-sm">
          <FiInfo className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-950 mb-1">{emptyDataset.label} has no recorded sales for this channel</h4>
            <p>The comparison below plots the years that do have data. Switch channels to view a full side-by-side.</p>
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
                <span className="text-2xl font-semibold text-gray-900">{formatINR(stats.currRev)}</span>
                <span className="text-xs text-gray-400">vs {formatINR(stats.prevRev)} ({stats.prevLabel})</span>
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
                <span className="text-2xl font-semibold text-gray-900">{stats.currQty.toLocaleString('en-IN')}</span>
                <span className="text-xs text-gray-400">vs {stats.prevQty.toLocaleString('en-IN')} ({stats.prevLabel})</span>
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
            <p className="text-xs text-gray-400 mt-0.5">Financial-year comparison by month (Apr → Mar)</p>
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
                {datasets.map((d) => (
                  <linearGradient key={d.fy} id={`grad_${d.fy}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colorFor(d)} stopOpacity={d.isHistory ? 0.1 : 0.2} />
                    <stop offset="95%" stopColor={colorFor(d)} stopOpacity={0} />
                  </linearGradient>
                ))}
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
                          const ds = datasets.find(d => d.fy === p.dataKey);
                          return (
                            <div key={idx} className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-medium">{ds?.label ?? p.name}</span>
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
              {datasets.map((d) => (
                <Area
                  key={d.fy}
                  type="monotone"
                  dataKey={d.fy}
                  name={d.label}
                  stroke={colorFor(d)}
                  strokeWidth={d.isHistory ? 1.5 : 2.5}
                  fillOpacity={1}
                  fill={`url(#grad_${d.fy})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
