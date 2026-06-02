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
  RecentTransactionsTable,
  LoadingSkeleton,
  ChannelKpiStrip,
  ChannelComparisonChart,
  MonthlyBreakdownTable,
  TopStatesPanel,
} from './total-offline-sales/components';

type ChannelKey = 'all' | 'Delhi' | 'Mumbai' | 'Patna' | 'Online' | 'BookFair' | 'Lokbharti';

const CHANNEL_PILLS: { key: ChannelKey; label: string }[] = [
  { key: 'all',       label: 'All Channels' },
  { key: 'Delhi',     label: 'Delhi' },
  { key: 'Mumbai',    label: 'Mumbai' },
  { key: 'Patna',     label: 'Patna' },
  { key: 'Online',    label: 'Online' },
  { key: 'BookFair',  label: 'Book Fair' },
  { key: 'Lokbharti', label: 'Lokbharti' },
];

const REGION_LABEL: Record<string, string> = {
  Delhi:     'Delhi Offline',
  Mumbai:    'Mumbai Offline',
  Patna:     'Patna Offline',
  Online:    'Online - Website',
  BookFair:  'BookFair Offline',
  Lokbharti: 'Lokbharti - Allahabad',
};

export default function TotalOfflineSales() {
  const { t } = useLang();

  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [summary,        setSummary]        = useState<any>(null);
  const [transactions,   setTransactions]   = useState<any[]>([]);
  const [projectionData, setProjectionData] = useState<any>(null);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [activeTab,     setActiveTab]     = useState<'revenue' | 'volume'>('revenue');
  const [dateRange,     setDateRange]     = useState<string>('ytd');
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('all');

  // ── Data fetching ──────────────────────────────────────────────────────────
  async function fetchData(rangeStr = dateRange, channelStr: ChannelKey = activeChannel) {
    setLoading(true);
    setError(null);
    try {
      const qs = `range=${rangeStr}&channel=${channelStr}`;
      const [sumData, txnData, projData] = await Promise.all([
        apiClient.get<any>(`total-offline-sales/summary?${qs}`),
        apiClient.get<any>(`total-offline-sales/transactions?${qs}&limit=20`),
        apiClient.get<any>(`total-offline-sales/projections`),
      ]);
      if (sumData.ok)  setSummary(sumData);
      if (txnData.ok)  setTransactions(txnData.items);
      if (projData.ok) setProjectionData(projData);
    } catch (err: any) {
      console.error('Failed to load total sales analysis:', err);
      setError(err?.message || 'Failed to fetch sales analysis data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(dateRange, activeChannel); }, [dateRange, activeChannel]);

  // When user clicks a channel card, update state
  const handleChannelSelect = (ch: string) => {
    setActiveChannel(ch as ChannelKey);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const pieData = useMemo(() => {
    if (!summary?.regionalBreakdown) return [];
    return summary.regionalBreakdown.map((r: any) => ({
      name:  r.region,
      value: activeTab === 'revenue' ? r.revenue : r.qty,
    }));
  }, [summary, activeTab]);

  const { totalRangeRevenue, rangeDaysCount, projectedAnnualRevenue } = useMemo(() => {
    if (!summary?.timeSeries) return { totalRangeRevenue: 0, rangeDaysCount: 30, projectedAnnualRevenue: 0 };
    const sum  = summary.timeSeries.reduce((acc: number, day: any) => acc + (day.total || 0), 0);
    let days   = 30;
    if (dateRange === '7')        days = 7;
    else if (dateRange === '90')  days = 90;
    else if (dateRange === 'ytd') {
      const daysInMonths = [31, 28, 31, 30, 31];
      days = daysInMonths.reduce((a, b) => a + b, 0) + new Date().getDate();
    } else if (dateRange === 'all') {
      days = summary.timeSeries.length || 365;
    }
    return {
      totalRangeRevenue:    sum,
      rangeDaysCount:       days,
      projectedAnnualRevenue: Math.round((sum / Math.max(1, days)) * 365),
    };
  }, [summary, dateRange]);

  const activeChannelLabel = activeChannel !== 'all' ? REGION_LABEL[activeChannel] : undefined;

  return (
    <AppLayout>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-normal text-gray-900 tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">
              Total Sales Dashboard
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Deep analytics &amp; complete channel-wise tracking across all 6 sales channels
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          {/* Date range */}
          <div className="relative shrink-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none rounded-2xl bg-white border border-gray-200 pl-4 pr-10 py-2.5 text-xs font-normal text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all hover:bg-gray-50 cursor-pointer"
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
            onClick={() => fetchData(dateRange, activeChannel)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-normal text-white shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Channel Filter Pills ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CHANNEL_PILLS.map(({ key, label }) => {
          const color    = key !== 'all' ? REGIONAL_COLORS[REGION_LABEL[key]] : undefined;
          const isActive = activeChannel === key;
          return (
            <button
              key={key}
              onClick={() => setActiveChannel(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-normal transition-all border ${
                isActive
                  ? 'text-white shadow-md border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              style={isActive
                ? { backgroundColor: key !== 'all' ? color : '#4F46E5', borderColor: 'transparent' }
                : {}}
            >
              {key !== 'all' && (
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : color }}
                />
              )}
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button onClick={() => fetchData(dateRange, activeChannel)} className="underline font-normal ml-auto hover:text-red-950">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-10 animate-fadeIn">

          {/* 1. KPI Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Sales Revenue"
              value={formatINR(summary?.counts?.totalRevenue || 0)}
              icon={<FiTrendingUp className="h-20 w-20 text-indigo-600" />}
              badge={
                <div className="mt-2 flex items-center gap-1.5 text-xs font-normal text-green-600 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                  <span>Active Channels: {summary?.regionalBreakdown?.length ?? 6} / 6</span>
                </div>
              }
            />
            <KpiCard
              title="Books Sold (Volume)"
              value={(summary?.counts?.totalQty || 0).toLocaleString('en-IN')}
              icon={<FiShoppingBag className="h-20 w-20 text-teal-600" />}
              badge={
                <div className="mt-2 flex items-center gap-1.5 text-xs font-normal text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full w-fit">
                  <span>Avg Rate: {formatINR((summary?.counts?.totalRevenue || 0) / Math.max(1, summary?.counts?.totalQty || 0))}</span>
                </div>
              }
            />
            <KpiCard
              title="Annual Projected Sales"
              value={formatINR(projectedAnnualRevenue)}
              icon={<FiTrendingUp className="h-20 w-20 text-indigo-600 animate-pulse" />}
              badge={
                <div className="mt-2 flex items-center gap-1.5 text-xs font-normal text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full w-fit">
                  <span>Velocity: {formatINR(totalRangeRevenue / Math.max(1, rangeDaysCount))} / day</span>
                </div>
              }
            />
            <KpiCard
              title="Fidelity Rows Ingested"
              value={(summary?.counts?.totalCount || 0).toLocaleString('en-IN')}
              icon={<FiDatabase className="h-20 w-20 text-purple-600" />}
              badge={
                <div className="mt-2 flex items-center gap-1.5 text-xs font-normal text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full w-fit">
                  <span>100% Sheet Synchronization</span>
                </div>
              }
            />
          </div>

          {/* 2. Channel KPI Strip */}
          {summary?.regionalBreakdown?.length > 0 && (
            <div className="border-t border-gray-100 pt-8">
              <ChannelKpiStrip
                breakdown={summary.regionalBreakdown}
                activeChannel={activeChannel}
                activeTab={activeTab}
                onChannelSelect={handleChannelSelect}
              />
            </div>
          )}

          {/* 3. Channel Comparison + Donut (side by side) */}
          {summary?.regionalBreakdown?.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 border-t border-gray-100 pt-8">
              <div className="lg:col-span-2">
                <ChannelComparisonChart
                  breakdown={summary.regionalBreakdown}
                  activeChannel={activeChannel}
                  onChannelSelect={handleChannelSelect}
                />
              </div>
              <ChannelShareDonut
                pieData={pieData}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>
          )}

          {/* 4. Daily Trends */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-1 border-t border-gray-100 pt-8">
            <DailyTrendsChart timeSeries={summary?.timeSeries || []} dateRange={dateRange} />
          </div>

          {/* 5. Forecast Section */}
          <ForecastSection projectionData={projectionData} />

          {/* 6. Monthly Breakdown Table */}
          {summary?.monthlyByChannel && (
            <div className="border-t border-gray-100 pt-8">
              <MonthlyBreakdownTable
                monthlyByChannel={summary.monthlyByChannel}
                activeChannel={activeChannel}
              />
            </div>
          )}

          {/* 7. Geographic State Distribution */}
          {summary?.topStatesByChannel && (
            <div className="border-t border-gray-100 pt-8">
              <TopStatesPanel
                topStatesByChannel={summary.topStatesByChannel}
                activeChannel={activeChannel}
                activeTab={activeTab}
              />
            </div>
          )}

          {/* 8. Bestsellers + Transactions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 border-t border-gray-100 pt-8">
            <BestsellersTable
              topItems={summary?.topItems || []}
              channelLabel={activeChannelLabel}
            />
            <RecentTransactionsTable transactions={transactions || []} />
          </div>

          <p className="text-xs text-gray-400 italic">
            * Projection uses a straight-line daily velocity derived from YTD actuals. Current month
            is extrapolated from {new Date().getDate()} of {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} days recorded.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
