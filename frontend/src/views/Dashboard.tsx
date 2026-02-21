/**
 * Dashboard Component
 *
 * Main dashboard view that displays comprehensive sales analytics across multiple channels:
 * - Online sales
 * - Offline sales (Cash/UPI/Credit Card)
 * - Lok Event sales
 * - RajRadha Event sales
 *
 * Features:
 * - Overall aggregated metrics across all channels
 * - Individual channel breakdowns
 * - Time-series charts for each sale type
 * - Recent online sales list
 * - Loading skeletons for better UX
 * - Cached data fallback for offline scenarios
 */

import { useAuth } from "../modules/auth/AuthContext";
import { useLang } from "../modules/lang/LangContext";
import AppLayout from "../shared/AppLayout";
import GenericSalesWidget from "../features/sales/client/GenericSalesWidget";
import OnlineSalesList from "../features/sales/client/OnlineSalesList";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from 'react';
import { apiClient } from "../lib/apiClient";

/**
 * Type definition for different sale channels
 */
type SaleType = {
  name: string; // Unique identifier for the sale type
  displayName: string; // Human-readable name shown in UI
  endpoint: string; // API endpoint to fetch data from
  color: string; // Background and border color classes
  badgeColor: string; // Badge styling classes
  chartColor: string; // Chart color in hex format
};

/**
 * Configuration for all supported sale types
 * Each sale type has its own endpoint, colors, and display properties
 */
const SALE_TYPES: SaleType[] = [
  {
    name: "online",
    displayName: "Online Sales",
    endpoint: "online-sales",
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-50 text-blue-700 ring-blue-200",
    chartColor: "#3B82F6",
  },
  {
    name: "offline",
    displayName: "Offline Sales (Cash/UPI/CC)",
    endpoint: "offline-sales",
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-50 text-green-700 ring-green-200",
    chartColor: "#10B981",
  },
  {
    name: "lok",
    displayName: "Lok Event Sales",
    endpoint: "lok-event-sales",
    color: "bg-purple-50 border-purple-200",
    badgeColor: "bg-purple-50 text-purple-700 ring-purple-200",
    chartColor: "#8B5CF6",
  },
  {
    name: "rajradha",
    displayName: "RajRadha Event Sales",
    endpoint: "rajradha-event-sales",
    color: "bg-orange-50 border-orange-200",
    badgeColor: "bg-orange-50 text-orange-700 ring-orange-200",
    chartColor: "#F97316",
  },
];

export default function Dashboard() {
  const { token } = useAuth();
  const { t } = useLang();

  // State for time range filter (in days)
  const [days, setDays] = useState(90);

  // Loading state for metrics fetching
  const [loading, setLoading] = useState(false);

  // Error state for failed API calls
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // Flag to indicate if data is from cache
  const [fromCache, setFromCache] = useState(false);

  // Development mode flag for showing debug information
  const isDev =
    String((import.meta as any).env?.VITE_DEV_MODE ?? "").toLowerCase() ===
    "true";

  /**
   * Aggregated metrics across all sale types
   * These represent the overall performance of all sales channels combined
   */
  const [metrics, setMetrics] = useState({
    totalAmount: 0, // Total revenue
    totalOrders: 0, // Total number of orders
    uniqueCustomers: 0, // Unique customer count
    refundCount: 0, // Number of refunds
  });

  /**
   * Previous period metrics for comparison
   * Used to calculate percentage changes and trends
   */
  const [prevMetrics, setPrevMetrics] = useState({
    totalAmount: 0,
    totalOrders: 0,
    uniqueCustomers: 0,
    refundCount: 0,
  });

  /**
   * Individual sale type metrics
   * Stores current and previous data for each channel separately
   */
  const [saleTypeMetrics, setSaleTypeMetrics] = useState<Record<string, any>>(
    {}
  );

  // Type definition for API response
  type CountsResp = {
    ok: boolean;
    totalAmount: number;
    totalCount: number;
    uniqueCustomers?: number;
    refundCount?: number;
  };

  /**
   * Fetch metrics data for all sale types
   * Runs when component mounts or when days filter changes
   *
   * Process:
   * 1. Calculate date ranges for current and previous periods
   * 2. Fetch counts from all sale type endpoints in parallel
   * 3. Aggregate the results
   * 4. Store in state and cache in localStorage
   * 5. On error, attempt to load from cache
   */
  useEffect(() => {
    async function fetchTiles() {
      setLoading(true);
      try {
        // Calculate date ranges
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);
        const prevEnd = new Date(since.getTime());
        const prevStart = new Date(prevEnd.getTime() - days * 86400000);

        // Build query strings for current and previous periods
        const qs = new URLSearchParams({
          startDate: since.toISOString(),
          endDate: now.toISOString(),
        }).toString();
        const qsPrev = new URLSearchParams({
          startDate: prevStart.toISOString(),
          endDate: prevEnd.toISOString(),
        }).toString();

        // Fetch counts from all sale types (current + previous periods)
        const allPromises = SALE_TYPES.flatMap((saleType) => [
          apiClient
            .get(`${saleType.endpoint}/counts?${qs}`)
            .catch(() => ({
              ok: false,
              totalAmount: 0,
              totalCount: 0,
              uniqueCustomers: 0,
              refundCount: 0,
            })),
          apiClient
            .get(`${saleType.endpoint}/counts?${qsPrev}`)
            .catch(() => ({
              ok: false,
              totalAmount: 0,
              totalCount: 0,
              uniqueCustomers: 0,
              refundCount: 0,
            })),
        ]);

        const results = await Promise.all(allPromises);

        // Aggregate current and previous metrics across all channels
        let totalAmount = 0,
          totalOrders = 0,
          uniqueCustomers = 0,
          refundCount = 0;
        let prevTotalAmount = 0,
          prevTotalOrders = 0,
          prevUniqueCustomers = 0,
          prevRefundCount = 0;
        const typeMetrics: Record<string, any> = {};

        SALE_TYPES.forEach((saleType, idx) => {
          const cur = results[idx * 2] as CountsResp;
          const prev = results[idx * 2 + 1] as CountsResp;

          // Store individual channel metrics
          typeMetrics[saleType.name] = {
            current: {
              totalAmount: cur.totalAmount || 0,
              totalOrders: cur.totalCount || 0,
              uniqueCustomers: cur.uniqueCustomers || 0,
              refundCount: cur.refundCount || 0,
            },
            previous: {
              totalAmount: prev.totalAmount || 0,
              totalOrders: prev.totalCount || 0,
              uniqueCustomers: prev.uniqueCustomers || 0,
              refundCount: prev.refundCount || 0,
            },
          };

          // Accumulate totals
          totalAmount += cur.totalAmount || 0;
          totalOrders += cur.totalCount || 0;
          uniqueCustomers += cur.uniqueCustomers || 0;
          refundCount += cur.refundCount || 0;

          prevTotalAmount += prev.totalAmount || 0;
          prevTotalOrders += prev.totalCount || 0;
          prevUniqueCustomers += prev.uniqueCustomers || 0;
          prevRefundCount += prev.refundCount || 0;
        });

        const next = { totalAmount, totalOrders, uniqueCustomers, refundCount };
        const prevNext = {
          totalAmount: prevTotalAmount,
          totalOrders: prevTotalOrders,
          uniqueCustomers: prevUniqueCustomers,
          refundCount: prevRefundCount,
        };

        // Update state
        setMetrics(next);
        setPrevMetrics(prevNext);
        setSaleTypeMetrics(typeMetrics);
        setLoadErr(null);
        setFromCache(false);

        // Cache the data in localStorage for offline access
        try {
          localStorage.setItem(`rk_dash_counts_${days}`, JSON.stringify(next));
          localStorage.setItem(
            `rk_dash_prev_counts_${days}`,
            JSON.stringify(prevNext)
          );
          localStorage.setItem(
            `rk_dash_type_metrics_${days}`,
            JSON.stringify(typeMetrics)
          );
        } catch {}
      } catch (e) {
        // On error, attempt to load from cache
        try {
          const m = localStorage.getItem(`rk_dash_counts_${days}`);
          const p = localStorage.getItem(`rk_dash_prev_counts_${days}`);
          const tm = localStorage.getItem(`rk_dash_type_metrics_${days}`);
          if (m && p) {
            setMetrics(JSON.parse(m));
            setPrevMetrics(JSON.parse(p));
            if (tm) setSaleTypeMetrics(JSON.parse(tm));
            setFromCache(true);
          }
        } catch {}
        setLoadErr((e as any)?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchTiles();
  }, [days]);

  /**
   * Calculate percentage change between current and previous values
   * @param cur Current period value
   * @param prev Previous period value
   * @returns Object with formatted percentage and negative flag
   */
  function pctDelta(
    cur: number,
    prev: number
  ): { pct: string; negative?: boolean } {
    const base = prev || 1;
    const pct = ((cur - base) / base) * 100;
    const neg = pct < 0;
    return { pct: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, negative: neg };
  }

  /**
   * Format number as Indian Rupee currency
   * @param n Number to format
   * @returns Formatted currency string
   */
  const fmtINR = (n: number) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `₹${Math.round(n).toLocaleString("en-IN")}`;
    }
  };

  // Calculate percentage changes for all metrics (memoized for performance)
  const salesDelta = useMemo(
    () => pctDelta(metrics.totalAmount, prevMetrics.totalAmount),
    [metrics, prevMetrics]
  );
  const ordersDelta = useMemo(
    () => pctDelta(metrics.totalOrders, prevMetrics.totalOrders),
    [metrics, prevMetrics]
  );
  const customersDelta = useMemo(
    () => pctDelta(metrics.uniqueCustomers, prevMetrics.uniqueCustomers),
    [metrics, prevMetrics]
  );
  const refundsDelta = useMemo(
    () => pctDelta(metrics.refundCount, prevMetrics.refundCount),
    [metrics, prevMetrics]
  );

  return (
    <AppLayout>
      {/* Dashboard Header */}
      <h1 className="text-3xl font-bold text-gray-900">
        {t("dashboard_title")}
      </h1>
      <p className="mt-2 text-[#C41E3A]">{t("dashboard_subtitle")}</p>

      {/* Overall Metrics Section - Shows aggregated data across all channels */}
      <CollapsibleSection title="Overall Sales (All Channels)" storageKey="rk_dash_sec_overall" className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("total_sales")}
              value={fmtINR(metrics.totalAmount)}
              delta={salesDelta.pct}
              fromLastWeek={t("from_last_week")}
              negative={salesDelta.negative}
            />
            <StatCard
              label={t("orders")}
              value={metrics.totalOrders.toLocaleString("en-IN")}
              delta={ordersDelta.pct}
              fromLastWeek={t("from_last_week")}
              negative={ordersDelta.negative}
            />
          </div>
        )}
      </CollapsibleSection>

      {/* Sale Type Breakdown Section - Shows individual channel performance */}
      <CollapsibleSection title="Sales by Channel" storageKey="rk_dash_sec_channels" className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {SALE_TYPES.map((saleType) => (
              <ChannelCardSkeleton key={saleType.name} color={saleType.color} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {SALE_TYPES.map((saleType) => {
              const data = saleTypeMetrics[saleType.name];
              if (!data) return null;

              const cur = data.current;
              const prev = data.previous;
              const delta = pctDelta(cur.totalAmount, prev.totalAmount);

              return (
                <div
                  key={saleType.name}
                  className={`rounded-lg border p-4 ${saleType.color}`}
                >
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {saleType.displayName}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {fmtINR(cur.totalAmount)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {cur.totalOrders.toLocaleString("en-IN")} orders
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      delta.negative ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {delta.pct} {t("from_last_week")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Individual Sale Type Graphs Section - Detailed analytics for each channel */}
      <CollapsibleSection title="Detailed Sales Analytics" storageKey="rk_dash_sec_analytics" className="mt-8">
        <div className="space-y-8">
          {SALE_TYPES.map((saleType) => (
            <div key={saleType.name} className="space-y-4">
              <GenericSalesWidget
                title={saleType.displayName}
                endpoint={saleType.endpoint}
                color={saleType.chartColor}
                badgeColor={saleType.badgeColor}
                days={days}
                onDaysChange={setDays}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Authors Section - Top/Bottom authors aggregated from online/offline/events */}
      <CollapsibleSection title="Authors" storageKey="rk_dash_sec_authors" className="mt-8">
        <AuthorsPanel days={days} />
      </CollapsibleSection>

      {/* Titles x Publisher (Offline + Events) */}
      <CollapsibleSection title="Titles by Publisher (Offline & Events)" storageKey="rk_dash_sec_titles_publishers" className="mt-8">
        <TitlesPublishersPanel days={days} />
      </CollapsibleSection>

      {/* Online Sales List Section - Detailed list of recent online transactions */}
      <CollapsibleSection title="Recent Online Sales" storageKey="rk_dash_sec_recent" className="mt-8">
        <OnlineSalesList days={days} />
      </CollapsibleSection>

      {/* Development Mode Debug Information */}
      {!loading && isDev && (loadErr || fromCache) && (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          {fromCache ? "Showing cached tiles. " : ""}
          {loadErr ? `Counts fetch error: ${loadErr}` : ""}
        </div>
      )}
    </AppLayout>
  );
}
/**
 * StatCard Component
 * Displays a single metric with its value, label, and trend indicator
 *
 * @param label - The metric label (e.g., "Total Sales")
 * @param value - The formatted value to display
 * @param delta - Percentage change from previous period
 * @param fromLastWeek - Text label for the comparison period
 * @param negative - Whether the trend is negative (affects color)
 */
type StatProps = {
  label: string;
  value: string;
  delta: string;
  fromLastWeek: string;
  negative?: boolean;
};

function StatCard({ label, value, delta, fromLastWeek, negative }: StatProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-gray-900">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <p
        className={`mt-1 text-xs ${
          negative ? "text-red-600" : "text-green-600"
        }`}
      >
        {delta} {fromLastWeek}
      </p>
    </div>
  );
}

/**
 * StatCardSkeleton Component
 * Loading placeholder for StatCard
 * Shows animated shimmer effect while data is being fetched
 */
function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse">
      {/* Label skeleton */}
      <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>

      {/* Value skeleton */}
      <div className="h-8 bg-gray-300 rounded w-32 mb-2"></div>

      {/* Delta skeleton */}
      <div className="h-3 bg-gray-200 rounded w-20"></div>
    </div>
  );
}

/**
 * ChannelCardSkeleton Component
 * Loading placeholder for individual channel cards
 *
 * @param color - Background color classes to match the channel theme
 */
function ChannelCardSkeleton({ color }: { color: string }) {
  return (
    <div className={`rounded-lg border p-4 animate-pulse ${color}`}>
      {/* Title skeleton */}
      <div className="h-4 bg-gray-300 rounded w-32 mb-3"></div>

      {/* Amount skeleton */}
      <div className="h-8 bg-gray-400 rounded w-28 mb-2"></div>

      {/* Orders count skeleton */}
      <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>

      {/* Delta skeleton */}
      <div className="h-3 bg-gray-300 rounded w-20"></div>
    </div>
  );
}

// Collapsible wrapper used to toggle visibility of sections
function CollapsibleSection({
  title,
  storageKey,
  className,
  children,
}: {
  title: string;
  storageKey: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem(storageKey);
      if (s === '0') return false;
      if (s === '1') return true;
    } catch {}
    return true;
  });
  const toggle = () => {
    setOpen((v) => {
      const n = !v;
      try { localStorage.setItem(storageKey, n ? '1' : '0'); } catch {}
      return n;
    });
  };
  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        <button
          onClick={toggle}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          title={open ? 'Collapse' : 'Expand'}
        >
          {open ? 'Hide' : 'Show'}
          <span className={`transition-transform ${open ? '' : 'rotate-180'}`}>▲</span>
        </button>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}

// Shows rankings of Title x Publisher for Offline/Lok/RajRadha
function TitlesPublishersPanel({ days }: { days: number }) {
  type ListItem = { title?: string | null; publisher?: string | null; qty?: number | null; amount?: number | null; rate?: number | null; date?: string | null; rawJson?: Record<string, any> };
  type ListResp = { ok: boolean; items: ListItem[] };

  const [channel, setChannel] = useState<'all' | 'offline' | 'lok' | 'rajradha'>('all');
  const [view, setView] = useState<'top' | 'bottom'>('top');
  const [topN, setTopN] = useState<number>(25);
  const [rows, setRows] = useState<Array<{ key: string; title: string; publisher: string; qty: number; total: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDev = String((import.meta as any).env?.VITE_DEV_MODE ?? '').toLowerCase() === 'true';
  const [debug, setDebug] = useState<{ fetched: Record<string, number>; afterFilter: number } | null>(null);

  const endpoints: Record<'offline'|'lok'|'rajradha', string> = {
    offline: 'offline-sales',
    lok: 'lok-event-sales',
    rajradha: 'rajradha-event-sales',
  };

  const parseNumber = (v: any): number | null => {
    if (v == null || v === '') return null;
    try {
      const n = typeof v === 'string' ? Number(v.replace(/[\,\s]/g, '')) : Number(v);
      return Number.isFinite(n) ? n : null;
    } catch { return null; }
  };

  const computeAmount = (it: ListItem): number => {
    const direct = parseNumber(it.amount);
    if (direct) return direct;
    const raw = (it.rawJson || {}) as Record<string, any>;
    const fields = ['Selling Price','Amount','Total','amount','SellingPrice','Selling_Price','AMOUNT','Net Amount','NET AMOUNT','NetAmount','NETAMOUNT','Gross Amount','GROSS AMOUNT'];
    for (const f of fields) {
      const n = parseNumber((raw as any)[f]);
      if (n) return n;
    }
    const rate = parseNumber(it.rate) ?? parseNumber((raw as any)['Rate']) ?? parseNumber((raw as any)['BOOKRATE']) ?? 0;
    const qty = parseNumber(it.qty) ?? parseNumber((raw as any)['Qty']) ?? parseNumber((raw as any)['OUT']) ?? 0;
    return (rate || 0) * (qty || 0);
  };

  const extractTitle = (it: ListItem): string | null => {
    const t0 = (it.title && String(it.title).trim()) || '';
    if (t0) return t0;
    const raw = (it.rawJson || {}) as Record<string, any>;
    const fields = ['Title','title','BookName','Book','book','Product','Item','Description','Product Name','Item Name'];
    for (const f of fields) {
      const v = (raw as any)[f];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  };

  const extractPublisher = (it: ListItem): string | null => {
    if (it.publisher && String(it.publisher).trim()) return String(it.publisher).trim();
    const raw = (it.rawJson || {}) as Record<string, any>;
    const fields = ['Publisher','publisher','PUBLISHER','Publication','publication','Published By','Publisher Name','Publication Name','Imprint','Brand','Seller','SOLD BY','Sold By','PublisherName'];
    for (const f of fields) {
      const v = (raw as any)[f];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return 'Unknown Publisher';
  };

  useEffect(() => {
    async function run() {
      setLoading(true); setError(null);
      try {
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);
        const qs = new URLSearchParams({ limit: '1000', startDate: since.toISOString(), endDate: now.toISOString() }).toString();

        const fetchChannel = async (ch: 'offline'|'lok'|'rajradha'): Promise<ListItem[]> => {
          let list = await apiClient.get<ListResp>(`${endpoints[ch]}?${qs}`);
          let items = list.items || [];
          const fetchedPrimary = items.length;
          if (!items.length) {
            try {
              const fallback = await apiClient.get<ListResp>(`${endpoints[ch]}?limit=5000`);
              const sinceTs = +since; const endTs = +now;
              const parseRowDate = (it: ListItem): number | null => {
                if (it.date) { const d = new Date(it.date); if (!isNaN(+d)) return +d; }
                const raw = (it.rawJson || {}) as Record<string, any>;
                const keys = ['Date','Txn Date','Transaction Date','Trnsdocdate'];
                for (const k of keys) { const v = (raw as any)[k]; if (typeof v === 'string' && v.trim()) { const d = new Date(v); if (!isNaN(+d)) return +d; } }
                return null;
              };
              items = (fallback.items || []).filter(it => {
                const t = parseRowDate(it);
                if (t == null) return true;
                return t >= sinceTs && t <= endTs;
              });
            } catch {}
          }
          return items;
        };

        let all: ListItem[] = [];
        const fetchedCounts: Record<string, number> = {};
        if (channel === 'all') {
          const [o1, o2, o3] = await Promise.all([
            fetchChannel('offline'), fetchChannel('lok'), fetchChannel('rajradha')
          ]);
          fetchedCounts['offline'] = o1.length; fetchedCounts['lok'] = o2.length; fetchedCounts['rajradha'] = o3.length;
          all = [...o1, ...o2, ...o3];
        } else {
          const ch = channel === 'offline' ? 'offline' : channel === 'lok' ? 'lok' : 'rajradha';
          const single = await fetchChannel(ch);
          fetchedCounts[ch] = single.length;
          all = single;
        }

        // Aggregate by (publisher, title)
        const map = new Map<string, { title: string; publisher: string; qty: number; total: number }>();
        for (const it of all) {
          const title = extractTitle(it) || 'Untitled Item';
          const publisher = extractPublisher(it);
          const qty = parseNumber(it.qty) ?? 0;
          const amt = computeAmount(it);
          const key = `${publisher}__${title}`;
          const cur = map.get(key) || { title, publisher, qty: 0, total: 0 };
          cur.qty += qty;
          cur.total += amt;
          map.set(key, { ...cur, publisher: publisher || '' });
        }

        let listRows = Array.from(map.values())
          .filter(r => r.qty > 0 || r.total > 0)
          .sort((a, b) => (b.total - a.total) || (b.qty - a.qty));
        if (view === 'bottom') listRows = listRows.slice(-topN).reverse();
        else listRows = listRows.slice(0, topN);

        setRows(listRows.map(r => ({ key: `${r.publisher}__${r.title}`, ...r })));
        setDebug({ fetched: fetchedCounts, afterFilter: listRows.length });
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [days, channel, view, topN]);

  const fmtINR = (n: number) => {
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n); }
    catch { return `₹${Math.round(n).toLocaleString('en-IN')}`; }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
          {[
            { key: 'all', label: 'All' },
            { key: 'offline', label: 'Offline' },
            { key: 'lok', label: 'Lok Event' },
            { key: 'rajradha', label: 'RajRadha' },
          ].map((tab: any) => (
            <button key={tab.key} className={`px-2.5 py-1 rounded-full font-semibold ${channel===tab.key ? 'bg-white text-indigo-700 shadow' : 'text-gray-700 hover:text-gray-900'}`} onClick={() => setChannel(tab.key)}>{tab.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs ml-auto">
          <button className={`px-2.5 py-1 rounded-full font-semibold ${view==='top' ? 'bg-white text-indigo-700 shadow' : 'text-gray-700 hover:text-gray-900'}`} onClick={() => setView('top')}>Top</button>
          <button className={`px-2.5 py-1 rounded-full font-semibold ${view==='bottom' ? 'bg-white text-indigo-700 shadow' : 'text-gray-700 hover:text-gray-900'}`} onClick={() => setView('bottom')}>Bottom</button>
        </div>
        <label className="text-xs text-gray-600">Show</label>
        <select className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-900">
          <thead>
            <tr className="border-b bg-gray-100 text-gray-800">
              <th className="px-2 py-2 font-semibold">Title</th>
              <th className="px-2 py-2 font-semibold">Publisher</th>
              <th className="px-2 py-2 font-semibold">Units</th>
              <th className="px-2 py-2 font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="px-2 py-4 text-sm text-gray-500">Loading…</td></tr>
            )}
            {!loading && rows.map(r => (
              <tr key={r.key} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-2 py-2 max-w-[420px] truncate" title={r.title}>{r.title}</td>
                <td className="px-2 py-2">{r.publisher}</td>
                <td className="px-2 py-2">{r.qty.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2">{fmtINR(r.total)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={4} className="px-2 py-6 text-center text-gray-500">No data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && error && <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">{error}</div>}
      {!loading && isDev && debug && (
        <div className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-700 border border-slate-200">
          Dev: fetched {JSON.stringify(debug.fetched)}; afterFilter={debug.afterFilter}
        </div>
      )}
    </div>
  );
}

// Lightweight Authors panel for Top/Bottom author listings
function AuthorsPanel({ days }: { days: number }) {
  type SummaryResponse = {
    ok: boolean;
    timeSeries: { date: string; total: number }[];
    paymentMode?: { paymentMode: string; total: number }[];
    topItems?: { title: string; total: number; qty: number; isbn?: string; author?: string; language?: string }[];
  };

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'top' | 'bottom'>("top");
  const [topN, setTopN] = useState<number>(10);
  const [channel, setChannel] = useState<'all' | 'online' | 'offline' | 'lok' | 'rajradha'>('all');
  const [entity, setEntity] = useState<'author' | 'publisher' | 'title'>("author");

  // Fetch and aggregate authors per channel
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);
        const qs = new URLSearchParams({
          limit: '1000',
          startDate: since.toISOString(),
          endDate: now.toISOString(),
        }).toString();

        type ListItem = { title?: string | null; qty?: number | null; amount?: number | null; rate?: number | null; date?: string | null; rawJson?: Record<string, any> };
        type ListResp = { ok: boolean; items: ListItem[] };

        const endpoints: Record<'online'|'offline'|'lok'|'rajradha', string> = {
          online: 'online-sales',
          offline: 'offline-sales',
          lok: 'lok-event-sales',
          rajradha: 'rajradha-event-sales',
        };

        const extractAuthor = (raw?: Record<string, any>, title?: string | null): string | null => {
          if (raw) {
            const candidates = [
              'Author','author','AUTHOR','Author Name','AuthorName','Author(s)',
              'Writer','writer','Writer Name','WriterName','WRITER',
              'Book Author','BOOKAUTHOR','AUTH','AUT'
            ];
            for (const k of Object.keys(raw)) {
              if (candidates.some(c => c.toLowerCase() === k.toLowerCase())) {
                const v = (raw as any)[k];
                if (typeof v === 'string' && v.trim()) return v.trim();
              }
            }
          }
          // Heuristic: extract after "by" in title
          const t = (title || '').toString();
          const byIdx = t.toLowerCase().lastIndexOf(' by ');
          if (byIdx > -1) {
            const guess = t.slice(byIdx + 4).trim();
            if (guess) return guess;
          }
          return null;
        };

        const extractPublisher = (raw?: Record<string, any>): string | null => {
          if (!raw) return null;
          const candidates = [
            'Publisher','publisher','PUBLISHER','Publication','publication','Published By','Publisher Name','Publication Name','Imprint','Brand','Seller','SOLD BY','Sold By','PublisherName'
          ];
          for (const k of Object.keys(raw)) {
            if (candidates.some(c => c.toLowerCase() === k.toLowerCase())) {
              const v = (raw as any)[k];
              if (typeof v === 'string' && v.trim()) return v.trim();
            }
          }
          return null;
        };

        const parseNumber = (v: any): number | null => {
          if (v == null || v === '') return null;
          try {
            const n = typeof v === 'string' ? Number(v.replace(/[,\s]/g, '')) : Number(v);
            return Number.isFinite(n) ? n : null;
          } catch { return null; }
        };

        const computeAmount = (it: ListItem): number => {
          const direct = parseNumber(it.amount);
          if (direct) return direct;
          const raw = it.rawJson || {} as Record<string, any>;
          const fields = ['Selling Price','Amount','Total','amount','SellingPrice','Selling_Price','AMOUNT','Net Amount','NET AMOUNT','NetAmount','NETAMOUNT','Gross Amount','GROSS AMOUNT'];
          for (const f of fields) {
            const n = parseNumber((raw as any)[f]);
            if (n) return n;
          }
          const rate = parseNumber(it.rate) ?? parseNumber((raw as any)['Rate']) ?? parseNumber((raw as any)['BOOKRATE']) ?? 0;
          const qty = parseNumber(it.qty) ?? parseNumber((raw as any)['Qty']) ?? parseNumber((raw as any)['OUT']) ?? 0;
          return (rate || 0) * (qty || 0);
        };

        const extractTitle = (it: ListItem): string | null => {
          const t0 = (it.title && String(it.title).trim()) || '';
          if (t0) return t0;
          const raw = it.rawJson || {} as Record<string, any>;
          const fields = ['Title','title','BookName','Book','book','Product','Item','Description','Product Name','Item Name'];
          for (const f of fields) {
            const v = (raw as any)[f];
            if (typeof v === 'string' && v.trim()) return v.trim();
          }
          return null;
        };

        async function fetchChannel(ch: 'online'|'offline'|'lok'|'rajradha'): Promise<ListItem & { author?: string|null; publisher?: string|null }[]> {
          // Prefer online summary for authors (it carries author field), else fallback to list
          if (ch === 'online') {
            try {
              const s = await apiClient.get<SummaryResponse>(`${endpoints[ch]}/summary?days=${days}`);
              if (s?.topItems?.length) {
                return s.topItems.map((ti) => ({ title: ti.title, qty: ti.qty, amount: ti.total, author: ti.author || null, publisher: null }));
              }
            } catch {}
          }
          // First try with server-side date filter (fast path)
          let list = await apiClient.get<ListResp>(`${endpoints[ch]}?${qs}`);
          let arr: (ListItem & { author?: string|null; publisher?: string|null })[] = (list.items || []).map((it: any) => {
            const title = it.title || null;
            const raw = it.rawJson as Record<string, any> | undefined;
            const dbAuthor = (typeof it.author === 'string' && it.author.trim()) ? String(it.author).trim() : null;
            const dbPublisher = (typeof it.publisher === 'string' && it.publisher.trim()) ? String(it.publisher).trim() : null;
            const author = dbAuthor || extractAuthor(raw, title);
            const publisher = dbPublisher || extractPublisher(raw);
            return { ...it, author, publisher };
          });

          // If empty (common when dates are missing in DB), fallback to broader fetch and client-side filter
          if (!arr.length) {
            try {
              const fallback = await apiClient.get<ListResp>(`${endpoints[ch]}?limit=5000`);
              const sinceTs = since.getTime();
              const endTs = now.getTime();
              const parseRowDate = (it: ListItem): number | null => {
                if (it.date) {
                  const d = new Date(it.date);
                  if (!isNaN(+d)) return +d;
                }
                const raw = it.rawJson || {} as Record<string, any>;
                const keys = ['Date','Txn Date','Transaction Date','Trnsdocdate'];
                for (const k of keys) {
                  const v = (raw as any)[k];
                  if (typeof v === 'string' && v.trim()) {
                    const d = new Date(v);
                    if (!isNaN(+d)) return +d;
                  }
                }
                return null;
              };
              arr = (fallback.items || [])
                .filter((it) => {
                  const t = parseRowDate(it);
                  if (t == null) return true; // include undated rows so we don't lose sales
                  return t >= sinceTs && t <= endTs;
                })
                .map((it: any) => {
                  const title = it.title || null;
                  const raw = it.rawJson as Record<string, any> | undefined;
                  const dbAuthor = (typeof it.author === 'string' && it.author.trim()) ? String(it.author).trim() : null;
                  const dbPublisher = (typeof it.publisher === 'string' && it.publisher.trim()) ? String(it.publisher).trim() : null;
                  const author = dbAuthor || extractAuthor(raw, title);
                  const publisher = dbPublisher || extractPublisher(raw);
                  return { ...it, author, publisher };
                });
            } catch {}
          }
          return arr;
        }

        let items: { title?: string|null; qty?: number|null; amount?: number|null; author?: string|null; publisher?: string|null; rate?: number|null; rawJson?: Record<string, any> }[] = [];
        if (channel === 'all') {
          const [o, f, l, r] = await Promise.all([
            fetchChannel('online'),
            fetchChannel('offline'),
            fetchChannel('lok'),
            fetchChannel('rajradha'),
          ]);
          items = [...o, ...f, ...l, ...r];
        } else {
          const ch = channel === 'online' ? 'online' : channel === 'offline' ? 'offline' : channel === 'lok' ? 'lok' : 'rajradha';
          items = await fetchChannel(ch);
        }

        // Build a fake summary object with topItems carrying author info so downstream stays same
        const map = new Map<string, { total: number; qty: number }>();
        const authorOfTitle = new Map<string, string>();
        const publisherOfTitle = new Map<string, string>();
        for (const it of items) {
          const title = extractTitle(it) || 'Untitled Item';
          const amt = computeAmount(it);
          const qty = parseNumber(it.qty) ?? 0;
          const prev = map.get(title) || { total: 0, qty: 0 };
          prev.total += isFinite(amt) ? amt : 0;
          prev.qty += isFinite(qty) ? qty : 0;
          map.set(title, prev);
          const a = (it.author && it.author.trim()) || extractAuthor(it.rawJson, title) || null;
          if (a && !authorOfTitle.has(title)) authorOfTitle.set(title, a);
          const p = (it.publisher && it.publisher.trim()) || extractPublisher(it.rawJson) || null;
          if (p && !publisherOfTitle.has(title)) publisherOfTitle.set(title, p);
        }

        const topItems = Array.from(map.entries()).map(([title, v]) => ({
          title,
          total: v.total,
          qty: v.qty,
          author: authorOfTitle.get(title),
          publisher: publisherOfTitle.get(title),
        })).filter(it => (it.total ?? 0) > 0 || (it.qty ?? 0) > 0);

        if (cancelled) return;
        setSummary({ ok: true, timeSeries: [], topItems });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load authors');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [days, channel]);

  const authors = useMemo(() => {
    const items = summary?.topItems || [];
    if (!items.length) return [] as { name: string; total: number; qty: number; books: number }[];
    const mapAgg = new Map<string, { total: number; qty: number; books: number }>();
    for (const it of items) {
      if (!it || !it.title || ((it.total ?? 0) <= 0 && (it.qty ?? 0) <= 0)) continue;
      // If ranking authors and we still don't know the author, skip this row
      // to avoid inflating an "Unknown Author" bucket.
      let key = '';
      if (entity === 'author') {
        const name = (it as any).author && String((it as any).author).trim();
        if (!name) continue;
        key = name;
      }
      else if (entity === 'publisher') key = (it as any).publisher && String((it as any).publisher).trim() || 'Unknown Publisher';
      else key = String(it.title).trim() || 'Untitled Item';
      const cur = mapAgg.get(key) || { total: 0, qty: 0, books: 0 };
      cur.total += it.total || 0;
      cur.qty += it.qty || 0;
      // books = unique titles contributing to this key
      cur.books += 1;
      mapAgg.set(key, cur);
    }
    return Array.from(mapAgg.entries())
      .map(([name, v]) => ({ name, total: v.total, qty: v.qty, books: v.books }))
      .sort((a, b) => (b.total - a.total) || (b.qty - a.qty));
  }, [summary, entity]);

  const rows = useMemo(() => {
    if (view === 'top') return authors.slice(0, topN);
    return authors.filter(a => a.total > 0 || a.qty > 0).slice(-topN).reverse();
  }, [authors, view, topN]);

  const fmtINR = (n: number) => {
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n); }
    catch { return `₹${Math.round(n).toLocaleString('en-IN')}`; }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="text-sm font-semibold text-gray-900">{entity === 'author' ? 'Author Rankings' : entity === 'publisher' ? 'Publisher Rankings' : 'Title Rankings'}</div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
            {[
              { key: 'author', label: 'Authors' },
              { key: 'publisher', label: 'Publishers' },
              { key: 'title', label: 'Titles' },
            ].map((tab: any) => (
              <button
                key={tab.key}
                className={`px-2.5 py-1 rounded-full font-semibold ${entity===tab.key ? 'bg-white text-indigo-700 shadow' : 'text-gray-700 hover:text-gray-900'}`}
                onClick={() => setEntity(tab.key)}
              >{tab.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
            {[
              { key: 'all', label: 'All' },
              { key: 'online', label: 'Online' },
              { key: 'offline', label: 'Offline' },
              { key: 'lok', label: 'Lok Event' },
              { key: 'rajradha', label: 'RajRadha' },
            ].map((tab: any) => (
              <button
                key={tab.key}
                className={`px-2.5 py-1 rounded-full font-semibold ${channel===tab.key ? 'bg-white text-indigo-700 shadow' : 'text-gray-700 hover:text-gray-900'}`}
                onClick={() => setChannel(tab.key)}
              >{tab.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
            <button
              className={`px-2.5 py-1 rounded-full font-semibold ${view==='top' ? 'bg-white text-indigo-700 shadow' : 'text-gray-700 hover:text-gray-900'}`}
              onClick={() => setView('top')}
            >Top</button>
            <button
              className={`px-2.5 py-1 rounded-full font-semibold ${view==='bottom' ? 'bg-white text-indigo-700 shadow' : 'text-gray-700 hover:text-gray-900'}`}
              onClick={() => setView('bottom')}
            >Bottom</button>
          </div>
          <label className="text-xs text-gray-600">Show</label>
          <select
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
          >
            {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-900">
          <thead>
            <tr className="border-b bg-gray-100 text-gray-800">
              <th className="px-2 py-2 font-semibold">{entity === 'author' ? 'Author' : entity === 'publisher' ? 'Publisher' : 'Title'}</th>
              {entity !== 'title' && (
                <th className="px-2 py-2 font-semibold">Books</th>
              )}
              <th className="px-2 py-2 font-semibold">Units</th>
              <th className="px-2 py-2 font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={entity==='title' ? 3 : 4} className="px-2 py-4 text-sm text-gray-500">Loading…</td>
              </tr>
            )}
            {!loading && rows.map((a) => (
              <tr key={a.name} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-2 py-2 max-w-[340px] truncate" title={a.name}>{a.name}</td>
                {entity !== 'title' && (
                  <td className="px-2 py-2">{a.books}</td>
                )}
                <td className="px-2 py-2">{a.qty.toLocaleString('en-IN')}</td>
                <td className="px-2 py-2">{fmtINR(a.total)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={entity==='title' ? 3 : 4} className="px-2 py-6 text-center text-gray-500">No data for this period</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && error && (
        <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">{error}</div>
      )}
    </div>
  );
}
