import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '../shared/AppLayout';
import SalesDashboardTabs from '../components/SalesDashboardTabs';
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
  TopPublishersPanel,
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
  const [dateRange,     setDateRange]     = useState<string>('fytd');
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
    else if (dateRange === '180') days = 180;
    else if (dateRange === '365') days = 365;
    else if (dateRange === 'ytd') {
      const daysInMonths = [31, 28, 31, 30, 31];
      days = daysInMonths.reduce((a, b) => a + b, 0) + new Date().getDate();
    } else if (dateRange === 'fytd') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
      const fyStart = new Date(startYear, 3, 1); // April 1st
      const diffTime = Math.abs(now.getTime() - fyStart.getTime());
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
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
      <div className="pt-6">
        <SalesDashboardTabs />
      </div>
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
          {/* Quick Period selector */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 border border-gray-200/40 shadow-sm">
            {[
              { label: 'FYTD', value: 'fytd' },
              { label: '1M', value: '30' },
              { label: '3M', value: '90' },
              { label: '6M', value: '180' },
              { label: '1Y', value: '365' },
              { label: 'All', value: 'all' }
            ].map((p) => {
              const isSelected = dateRange === p.value;
              return (
                <button
                  key={p.label}
                  onClick={() => setDateRange(p.value)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-200/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
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
            {/* Net Revenue = OUT minus IN (returns) */}
            <KpiCard
              title="Net Revenue (OUT − IN)"
              value={formatINR(summary?.counts?.totalRevenue || 0)}
              icon={<FiTrendingUp className="h-20 w-20 text-indigo-600" />}
              badge={(() => {
                const gross   = summary?.counts?.totalGrossRevenue   || 0;
                const returns = summary?.counts?.totalReturnsRevenue || 0;
                const retPct  = gross > 0 ? ((returns / gross) * 100).toFixed(1) : '0.0';
                const netPct  = gross > 0 ? (((gross - returns) / gross) * 100).toFixed(1) : '100.0';
                return (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-normal text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full w-fit">
                      OUT&nbsp;<span className="font-semibold text-gray-700">{formatINR(gross)}</span>
                      &nbsp;−&nbsp;IN&nbsp;<span className="font-semibold text-red-500">{formatINR(returns)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs font-normal text-green-600 bg-green-50 px-2.5 py-1 rounded-full w-fit">
                        Net&nbsp;<span className="font-semibold">{netPct}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-normal text-red-500 bg-red-50 px-2.5 py-1 rounded-full w-fit">
                        Returns&nbsp;<span className="font-semibold">{retPct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            />

            {/* Copies Dispatched = gross OUT (not net) */}
            <KpiCard
              title="Copies Dispatched (OUT)"
              value={(summary?.counts?.totalGrossQty || 0).toLocaleString('en-IN')}
              icon={<FiShoppingBag className="h-20 w-20 text-teal-600" />}
              badge={(() => {
                const gross   = summary?.counts?.totalGrossQty   || 0;
                const returns = summary?.counts?.totalReturnsQty || 0;
                const net     = summary?.counts?.totalQty        || 0;
                const retPct  = gross > 0 ? ((returns / gross) * 100).toFixed(1) : '0.0';
                const netPct  = gross > 0 ? ((net / gross) * 100).toFixed(1) : '100.0';
                return (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-normal text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full w-fit">
                      Returns (IN):&nbsp;<span className="font-semibold text-red-500">{returns.toLocaleString('en-IN')}</span>&nbsp;copies
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs font-normal text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full w-fit">
                        Net&nbsp;<span className="font-semibold">{netPct}%</span>&nbsp;({net.toLocaleString('en-IN')})
                      </div>
                      <div className="flex items-center gap-1 text-xs font-normal text-red-500 bg-red-50 px-2.5 py-1 rounded-full w-fit">
                        Ret&nbsp;<span className="font-semibold">{retPct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
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

          {/* 7.5. Publisher Performance Breakdown */}
          {summary?.topPublishersByChannel && (
            <div className="border-t border-gray-100 pt-8">
              <TopPublishersPanel
                topPublishersByChannel={summary.topPublishersByChannel}
                activeChannel={activeChannel}
                activeTab={activeTab}
                dateRange={dateRange}
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
