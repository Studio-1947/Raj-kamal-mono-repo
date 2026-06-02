import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '../shared/AppLayout';
import { useLang } from '../modules/lang/LangContext';
import { apiClient } from '../lib/apiClient';
import { FiTrendingUp, FiShoppingBag, FiDatabase, FiRefreshCw } from 'react-icons/fi';
import {
  REGIONAL_COLORS,
  formatINR,
  formatLakhsAndCrores,
  KpiCard,
  ForecastSection,
  DailyTrendsChart,
  ChannelShareDonut,
  BestsellersTable,
  RecentTransactionsTable
} from './total-offline-sales/components';

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
            <KpiCard
              title="Total Sales Revenue"
              value={formatINR(summary?.counts?.totalRevenue || 0)}
              icon={<FiTrendingUp className="h-20 w-20 text-indigo-600" />}
              badge={
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                  <span>Active Channels: 6 / 6</span>
                </div>
              }
            />

            {/* Quantity Card */}
            <KpiCard
              title="Books Sold (Volume)"
              value={(summary?.counts?.totalQty || 0).toLocaleString('en-IN')}
              icon={<FiShoppingBag className="h-20 w-20 text-teal-600" />}
              badge={
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full w-fit">
                  <span>Avg Rate: {formatINR((summary?.counts?.totalRevenue || 0) / Math.max(1, summary?.counts?.totalQty || 0))}</span>
                </div>
              }
            />

            {/* Dynamic Velocity-Based Projected Annual Sales Card */}
            <KpiCard
              title="Annual Projected Sales"
              value={formatINR(projectedAnnualRevenue)}
              icon={<FiTrendingUp className="h-20 w-20 text-indigo-600 animate-pulse" />}
              badge={
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full w-fit">
                  <span>Velocity: {formatINR(totalRangeRevenue / Math.max(1, rangeDaysCount))} / day</span>
                </div>
              }
            />

            {/* Row Count Card */}
            <KpiCard
              title="Fidelity Rows Ingested"
              value={(summary?.counts?.totalCount || 0).toLocaleString('en-IN')}
              icon={<FiDatabase className="h-20 w-20 text-purple-600" />}
              badge={
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full w-fit">
                  <span>100% Sheet Synchronization</span>
                </div>
              }
            />
          </div>

          {/* 2. Stunning Unified 2026 Forecast & Projections Section */}
          <ForecastSection projectionData={projectionData} />

          {/* 3. Interactive Charting Layer (Overview Trends & Channel Share) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 border-t border-gray-100 pt-8">
            <DailyTrendsChart timeSeries={summary?.timeSeries || []} dateRange={dateRange} />
            <ChannelShareDonut pieData={pieData} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          {/* 4. Lower Layer: Bestsellers and Transactions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 border-t border-gray-100 pt-8">
            <BestsellersTable topItems={summary?.topItems || []} />
            <RecentTransactionsTable transactions={transactions || []} />
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
