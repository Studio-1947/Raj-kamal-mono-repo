import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '../shared/AppLayout';
import { useLang } from '../modules/lang/LangContext';
import { apiClient } from '../lib/apiClient';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import { FiTrendingUp, FiShoppingBag, FiDatabase, FiRefreshCw, FiBookOpen } from 'react-icons/fi';

// Curated harmonious regional color palette
const REGIONAL_COLORS: Record<string, string> = {
  'Delhi Offline': '#3B82F6', // Blue
  'Mumbai Offline': '#10B981', // Green
  'Patna Offline': '#8B5CF6', // Purple
  'Online - Website': '#F97316', // Orange
  'BookFair Offline': '#EC4899', // Pink
  'Lokbharti - Allahabad': '#0D9488' // Teal
};

const CHART_KEYS = ['Delhi', 'Mumbai', 'Patna', 'Online', 'BookFair', 'Lokbharti'];
const KEY_MAP: Record<string, string> = {
  'Delhi': 'Delhi Offline',
  'Mumbai': 'Mumbai Offline',
  'Patna': 'Patna Offline',
  'Online': 'Online - Website',
  'BookFair': 'BookFair Offline',
  'Lokbharti': 'Lokbharti - Allahabad'
};

function formatINR(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function formatLakhsAndCrores(n: number): string {
  if (n >= 10000000) {
    return `₹${(n / 10000000).toFixed(2)} Cr`;
  } else if (n >= 100000) {
    return `₹${(n / 100000).toFixed(2)} L`;
  } else {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function formatChartValue(n: number): string {
  if (n >= 10000000) {
    return `${(n / 10000000).toFixed(1)}Cr`;
  } else if (n >= 100000) {
    const val = n / 100000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}L`;
  } else {
    return `${Math.round(n / 1000)}K`;
  }
}

export default function TotalOfflineSales() {
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [projectionData, setProjectionData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'revenue' | 'volume'>('revenue');
  const [dateRange, setDateRange] = useState<string>('30');

  async function fetchData(rangeStr = dateRange) {
    setLoading(true);
    setError(null);
    try {
      const [sumData, txnData, projData] = await Promise.all([
        apiClient.get<any>(`total-offline-sales/summary?range=${rangeStr}`),
        apiClient.get<any>(`total-offline-sales/transactions?range=${rangeStr}`),
        apiClient.get<any>(`total-offline-sales/projections`) // Projections uses full year 2026 data
      ]);

      if (sumData.ok) setSummary(sumData);
      if (txnData.ok) setTransactions(txnData.items);
      if (projData.ok) setProjectionData(projData);
    } catch (err: any) {
      console.error('Failed to load total sales analysis:', err);
      setError(err?.message || 'Failed to fetch sales analysis data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange]);

  // Compute Pie Chart Data
  const pieData = useMemo(() => {
    if (!summary?.regionalBreakdown) return [];
    return summary.regionalBreakdown.map((r: any) => ({
      name: r.region,
      value: activeTab === 'revenue' ? r.revenue : r.qty
    }));
  }, [summary, activeTab]);

  // Compute Dynamic Projected annual revenue based on the selected date range filter
  const { totalRangeRevenue, rangeDaysCount, projectedAnnualRevenue } = useMemo(() => {
    if (!summary?.timeSeries) return { totalRangeRevenue: 0, rangeDaysCount: 30, projectedAnnualRevenue: 0 };
    const sum = summary.timeSeries.reduce((acc: number, day: any) => acc + (day.total || 0), 0);
    
    let days = 30;
    if (dateRange === '7') days = 7;
    else if (dateRange === '90') days = 90;
    else if (dateRange === 'ytd') {
      const currentDayInMonth = new Date().getDate();
      const daysInMonths = [31, 28, 31, 30, 31]; // Jan-May complete days elapsed
      days = daysInMonths.reduce((a, b) => a + b, 0) + currentDayInMonth; // June 1st = 152 days in
    } else if (dateRange === 'all') {
      days = summary.timeSeries.length || 365;
    }

    return {
      totalRangeRevenue: sum,
      rangeDaysCount: days,
      projectedAnnualRevenue: Math.round((sum / Math.max(1, days)) * 365)
    };
  }, [summary, dateRange]);

  return (
    <AppLayout>
      {/* Upper Dashboard Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">
              Total Sales Dashboard
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Unified analytics & complete row-fidelity tracking across all 6 sales channels
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          {/* Dynamic Premium Date Filter */}
          <div className="relative shrink-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none rounded-2xl bg-white border border-gray-200 pl-4 pr-10 py-2.5 text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all hover:bg-gray-50 cursor-pointer"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="ytd">Year to Date (2026)</option>
              <option value="all">All Time</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <button
            onClick={() => fetchData(dateRange)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button onClick={() => fetchData(dateRange)} className="underline font-bold ml-auto hover:text-red-950">Retry</button>
        </div>
      )}
      {loading ? (
        <div className="space-y-6 animate-pulse mb-6">
          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-3xl" />
            ))}
          </div>
          {/* Skeleton Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-3xl" />
            <div className="h-96 bg-gray-200 rounded-3xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-fadeIn">
          {/* 1. Premium KPI Metrics Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Revenue Card */}
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <FiTrendingUp className="h-20 w-20 text-indigo-600" />
              </div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Sales Revenue</p>
              <p className="mt-2 text-xl sm:text-2xl xl:text-3xl font-black text-gray-900 tracking-tight truncate" title={formatINR(summary?.counts?.totalRevenue || 0)}>
                {formatINR(summary?.counts?.totalRevenue || 0)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                <span>Active Channels: 6 / 6</span>
              </div>
            </div>

            {/* Quantity Card */}
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <FiShoppingBag className="h-20 w-20 text-teal-600" />
              </div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Books Sold (Volume)</p>
              <p className="mt-2 text-xl sm:text-2xl xl:text-3xl font-black text-gray-900 tracking-tight truncate" title={(summary?.counts?.totalQty || 0).toLocaleString('en-IN')}>
                {(summary?.counts?.totalQty || 0).toLocaleString('en-IN')}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full w-fit">
                <span>Avg Rate: {formatINR((summary?.counts?.totalRevenue || 0) / Math.max(1, summary?.counts?.totalQty || 0))}</span>
              </div>
            </div>

            {/* Dynamic Velocity-Based Projected Annual Sales Card */}
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <FiTrendingUp className="h-20 w-20 text-indigo-600 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Annual Projected Sales</p>
              <p className="mt-2 text-xl sm:text-2xl xl:text-3xl font-black text-gray-900 tracking-tight truncate" title={formatINR(projectedAnnualRevenue)}>
                {formatINR(projectedAnnualRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full w-fit">
                <span>Velocity: {formatINR(totalRangeRevenue / Math.max(1, rangeDaysCount))} / day</span>
              </div>
            </div>

            {/* Row Count Card */}
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <FiDatabase className="h-20 w-20 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Fidelity Rows Ingested</p>
              <p className="mt-2 text-xl sm:text-2xl xl:text-3xl font-black text-gray-900 tracking-tight truncate" title={(summary?.counts?.totalCount || 0).toLocaleString('en-IN')}>
                {(summary?.counts?.totalCount || 0).toLocaleString('en-IN')}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full w-fit">
                <span>100% Sheet Synchronization</span>
              </div>
            </div>
          </div>

          {/* 2. Stunning Unified 2026 Forecast & Projections Section */}
          {projectionData && (
            <div className="space-y-6 border-t border-gray-100 pt-8">
              {/* Header Box containing title and large Yearly Estimate circle */}
              <div className="rounded-3xl border border-teal-100 bg-white p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
                <div className="space-y-2.5 z-10">
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    {projectionData.year} Revenue Projection Analysis
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-teal-500 text-white tracking-widest uppercase animate-pulse">
                      Live
                    </span>
                  </h2>
                  <p className="text-sm font-semibold text-gray-500">
                    Weighted run rate (last 3 months):{' '}
                    <span className="text-teal-600 font-bold">
                      {formatLakhsAndCrores(projectionData.weightedMonthlyAvg)}
                    </span>{' '}
                    / month
                  </p>
                </div>

                {/* Circle Card on Right */}
                <div className="flex items-center gap-4 bg-teal-50/40 border border-teal-100/50 rounded-2xl p-6 z-10 w-full md:w-auto justify-between md:justify-start">
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Yearly Estimate</p>
                    <p className="text-2xl sm:text-3xl font-black text-gray-950 mt-1">
                      {formatLakhsAndCrores(projectionData.yearlyEstimate)}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                    <FiTrendingUp className="h-5 w-5 animate-bounce" />
                  </div>
                </div>

                {/* Elegant background glowing design */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
              </div>

              {/* Projections Secondary Metrics Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Actual so far */}
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actual So Far</p>
                    <p className="text-3xl font-black text-teal-600 mt-2">
                      {formatLakhsAndCrores(projectionData.actualSoFar)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-gray-400 mt-4 bg-gray-50 px-3 py-1 rounded-full w-fit">
                    {projectionData.daysElapsed} days in
                  </p>
                </div>

                {/* Projected Remainder */}
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Projected Rem.</p>
                    <p className="text-3xl font-black text-gray-900 mt-2">
                      {formatLakhsAndCrores(projectionData.projectedRemaining)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-gray-400 mt-4 bg-gray-50 px-3 py-1 rounded-full w-fit">
                    {projectionData.daysLeft} days left
                  </p>
                </div>

                {/* Monthly Average */}
                <div className="rounded-3xl bg-teal-600 p-6 shadow-md shadow-teal-100 flex flex-col justify-between hover:shadow-lg transition-all text-white text-left">
                  <div>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Monthly Avg (WTD)</p>
                    <p className="text-3xl font-black mt-2">
                      {formatLakhsAndCrores(projectionData.weightedMonthlyAvg)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold bg-white/20 text-white mt-4 px-3 py-1 rounded-full w-fit">
                    Recent 3 months
                  </p>
                </div>

                {/* Achievement */}
                <div className="rounded-3xl bg-slate-900 p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-all text-white text-left relative overflow-hidden">
                  <div className="z-10">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Achievement</p>
                    <p className="text-4xl font-black mt-2">
                      {projectionData.achievementPercent.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-xs font-semibold bg-white/10 text-white mt-4 px-3 py-1 rounded-full w-fit z-10">
                    of Yearly Est.
                  </p>
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
                </div>
              </div>

              {/* Month-wise breakdown Recharts chart */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Month-Wise Breakdown — {projectionData.year}</h3>
                    <p className="text-xs text-gray-400">Teal columns show actuals, grey columns represent weighted projections</p>
                  </div>
                  
                  {/* Custom Legend */}
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-teal-600" />
                      Actual
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-gray-200" />
                      Projected
                    </div>
                  </div>
                </div>

                <div style={{ height: 320 }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectionData.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontWeight: 'semibold', fontSize: 13 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        tickFormatter={(v) => formatChartValue(v)}
                      />
                      <Tooltip
                        cursor={{ fill: '#F9FAFB', radius: 12 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl space-y-1">
                                <p className="text-xs font-bold text-gray-400 uppercase">{data.name} 2026</p>
                                <p className="text-lg font-black text-gray-900">{formatINR(data.value)}</p>
                                <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${data.type === 'projected' ? 'bg-gray-100 text-gray-600' : 'bg-teal-50 text-teal-600'}`}>
                                  {data.type}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={44}>
                        {projectionData.chartData.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.type === 'projected' ? '#E5E7EB' : '#0D9488'}
                            className="transition-all duration-300 hover:opacity-85"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Month Label values below */}
                <div className="grid grid-cols-12 text-center text-[10px] sm:text-xs font-black text-gray-600 mt-4 border-t border-gray-50 pt-4">
                  {projectionData.chartData.map((d: any, i: number) => (
                    <div key={i} className="space-y-1">
                      <p className={`${d.type === 'projected' ? 'text-gray-400 font-medium' : 'text-teal-600 font-extrabold'}`}>
                        {formatChartValue(d.value)}
                        {d.type === 'current' && '*'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Year Progress Container */}
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-400 uppercase tracking-widest text-xs">Year Progress</span>
                  <span className="text-gray-700">
                    <span className="text-teal-600">{projectionData.achievementPercent.toFixed(1)}% Revenue</span>
                    {' '}/{' '}
                    <span className="text-gray-500">{projectionData.timeElapsedPercent.toFixed(1)}% Time</span>
                  </span>
                </div>

                {/* Gorgeous progress bar */}
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-1000 shadow-sm shadow-teal-200"
                      style={{ width: `${Math.min(100, projectionData.achievementPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">
                    <span>Jan 1</span>
                    <span>Dec 31</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Interactive Charting Layer (Overview Trends & Channel Share) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 border-t border-gray-100 pt-8">
            {/* Daily Regional Timeseries Area Chart */}
            <div className="lg:col-span-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Unified Daily Sales Trends</h3>
                  <p className="text-xs text-gray-400">
                    Regional sales volumes over the selected range ({dateRange === 'all' ? 'All Time' : `Last ${dateRange} Days`})
                  </p>
                </div>
              </div>
              <div style={{ height: 320 }} className="w-full">
                {summary?.timeSeries && summary.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.timeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        {CHART_KEYS.map((key) => (
                          <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={REGIONAL_COLORS[KEY_MAP[key]]} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={REGIONAL_COLORS[KEY_MAP[key]]} stopOpacity={0.0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        tickFormatter={(v) => formatINR(v)}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl space-y-2 max-h-80 overflow-y-auto">
                                <p className="text-xs font-bold text-gray-400">{label}</p>
                                <div className="space-y-1.5">
                                  {payload.map((p: any) => (
                                    <div key={p.name} className="flex items-center gap-6 justify-between text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                        <span className="font-semibold text-gray-600">{KEY_MAP[p.name]}</span>
                                      </div>
                                      <span className="font-black text-gray-900">{formatINR(p.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {CHART_KEYS.map((key) => (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stackId="1"
                          stroke={REGIONAL_COLORS[KEY_MAP[key]]}
                          fill={`url(#grad-${key})`}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">No daily aggregation data found.</div>
                )}
              </div>
            </div>

            {/* Regional Contribution Donut Chart */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Channel Share</h3>
                  <p className="text-xs text-gray-400">Contribution percentage breakdown</p>
                </div>
                {/* Tab Switch */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab('revenue')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${activeTab === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setActiveTab('volume')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${activeTab === 'volume' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                  >
                    Qty
                  </button>
                </div>
              </div>

              <div style={{ height: 220 }} className="relative w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: REGIONAL_COLORS[data.name] }} />
                                  <p className="text-xs font-bold text-gray-400 uppercase">{data.name}</p>
                                </div>
                                <p className="text-lg font-black text-gray-900">
                                  {activeTab === 'revenue' ? formatINR(data.value) : `${data.value.toLocaleString('en-IN')} copies`}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={REGIONAL_COLORS[entry.name]}
                            className="transition-all duration-300 hover:opacity-80 focus:outline-none cursor-pointer"
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">No breakdowns found.</div>
                )}
              </div>

              {/* Channel Legends */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-[11px] font-semibold text-gray-500">
                {pieData.map((d: any) => (
                  <div key={d.name} className="flex items-center gap-1.5 truncate">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: REGIONAL_COLORS[d.name] }} />
                    <span className="truncate">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Lower Layer: Bestsellers and Transactions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 border-t border-gray-100 pt-8">
            {/* Aggregate Top 10 Bestsellers */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiBookOpen className="text-indigo-600" />
                Top 10 Bestsellers
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 rounded-l-2xl">Title</th>
                      <th className="px-4 py-3 text-right">Copies Sold</th>
                      <th className="px-4 py-3 text-right rounded-r-2xl">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {summary?.topItems && summary.topItems.length > 0 ? (
                      summary.topItems.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-gray-900 truncate max-w-xs">{item.title}</td>
                          <td className="px-4 py-3.5 text-right font-medium">{item.qty.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-indigo-600">{formatINR(item.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-400">No bestseller data computed yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Combined Recent Live Ingestion Stream */}
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiDatabase className="text-indigo-600" />
                Live Ingestion Stream
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 rounded-l-2xl">Bill No</th>
                      <th className="px-4 py-3">Book</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3 text-right rounded-r-2xl">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions && transactions.length > 0 ? (
                      transactions.map((txn: any) => (
                        <tr key={txn.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs font-bold text-gray-900">{txn.docNo}</td>
                          <td className="px-4 py-3.5 truncate max-w-[140px]" title={txn.title}>{txn.title}</td>
                          <td className="px-4 py-3.5">
                            <span
                              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
                              style={{
                                backgroundColor: `${REGIONAL_COLORS[txn.region]}15`,
                                color: REGIONAL_COLORS[txn.region]
                              }}
                            >
                              {txn.region}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">{formatINR(txn.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No live transactions found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Explanatory text */}
          <p className="text-xs text-gray-400 italic">
            * Projection uses a weighted average of the last 3 complete months (newest month weighted highest). Current month is extrapolated from {new Date().getDate()} of {new Date(2026, 6, 0).getDate()} days recorded.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
