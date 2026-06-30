import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '../shared/AppLayout';
import { useLang } from '../modules/lang/LangContext';
import { apiClient } from '../lib/apiClient';
import { FiMapPin, FiRefreshCw } from 'react-icons/fi';
import { REGIONAL_COLORS, GeoInsightsView } from './total-offline-sales/components';

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

const DATE_RANGES = [
  { label: 'FYTD', value: 'fytd' },
  { label: '1M',   value: '30' },
  { label: '3M',   value: '90' },
  { label: '6M',   value: '180' },
  { label: '1Y',   value: '365' },
  { label: 'All',  value: 'all' },
];

export default function GeoInsights() {
  const { t } = useLang();

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  // Shared filters — same shape as the Total Sales dashboard.
  const [activeTab, setActiveTab]         = useState<'revenue' | 'volume'>('revenue');
  const [dateRange, setDateRange]         = useState<string>('fytd');
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('all');
  const [fyMode, setFyMode]               = useState<'current' | 'previous'>('current');

  const isArchive = fyMode === 'previous';

  async function fetchData(rangeStr = dateRange, channelStr: ChannelKey = activeChannel, fy = fyMode) {
    setLoading(true);
    setError(null);
    try {
      const isArch = fy === 'previous';
      // In archive mode skip date range — the archive is a full FY, use range=all.
      const qs = isArch
        ? `total-offline-sales/summary?range=all&channel=${channelStr}&fy=previous`
        : `total-offline-sales/summary?range=${rangeStr}&channel=${channelStr}`;
      const data = await apiClient.get<any>(qs);
      if (data.ok) setSummary(data);
    } catch (err: any) {
      console.error('Failed to load geo insights:', err);
      setError(err?.message || 'Failed to fetch geo insights data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(dateRange, activeChannel, fyMode); }, [dateRange, activeChannel, fyMode]);

  const hasData = useMemo(
    () => !!summary?.topStatesByChannel && Object.keys(summary.topStatesByChannel).length > 0,
    [summary]
  );

  return (
    <AppLayout>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mt-6 mb-6 border-b border-gray-100 pb-6">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 text-white shadow-md shadow-indigo-200 shrink-0">
            <FiMapPin className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-3xl font-normal text-gray-900 tracking-tight">
              <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">
                {t('geo_insights')}
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Where your sales come from — state &amp; city distribution across every channel
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          {/* FY toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 border border-gray-200/40 shadow-sm">
            {(['current', 'previous'] as const).map((fy) => (
              <button
                key={fy}
                onClick={() => setFyMode(fy)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  fyMode === fy ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                {fy === 'current' ? 'FY 2026-27' : 'FY 2025-26'}
              </button>
            ))}
          </div>

          {/* Revenue / Volume toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 border border-gray-200/40 shadow-sm">
            {(['revenue', 'volume'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setActiveTab(m)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === m ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                {m === 'revenue' ? 'Revenue' : 'Copies'}
              </button>
            ))}
          </div>

          {/* Period selector — hidden in archive mode (full FY is always shown) */}
          {!isArchive && (
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 border border-gray-200/40 shadow-sm">
              {DATE_RANGES.map((p) => {
                const isSelected = dateRange === p.value;
                return (
                  <button
                    key={p.label}
                    onClick={() => setDateRange(p.value)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                      isSelected ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200/60'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {isArchive && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 font-medium">
              Archive: Apr 2025 – Mar 2026
            </div>
          )}

          <button
            onClick={() => fetchData(dateRange, activeChannel, fyMode)}
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
              style={isActive ? { backgroundColor: key !== 'all' ? color : '#4F46E5', borderColor: 'transparent' } : {}}
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

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="pb-12">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
            <div className="lg:col-span-2 h-[600px] rounded-3xl bg-gray-100" />
            <div className="flex flex-col gap-4">
              <div className="h-72 rounded-2xl bg-gray-100" />
              <div className="h-72 rounded-2xl bg-gray-100" />
            </div>
          </div>
        ) : hasData ? (
          <div className="animate-fadeIn">
            <GeoInsightsView
              topStatesByChannel={summary?.topStatesByChannel ?? {}}
              topCitiesByChannel={summary?.topCitiesByChannel ?? {}}
              activeChannel={activeChannel}
              activeTab={activeTab}
            />
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <FiMapPin className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No geographic sales data available for this selection.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
