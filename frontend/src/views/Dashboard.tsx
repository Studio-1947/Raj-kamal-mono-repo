import { useAuth } from '../modules/auth/AuthContext';
import { useLang } from '../modules/lang/LangContext';
import AppLayout from '../shared/AppLayout';
import GenericSalesWidget from '../features/sales/client/GenericSalesWidget';
import OnlineSalesList from '../features/sales/client/OnlineSalesList';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/apiClient';

type SaleType = {
  name: string;
  displayName: string;
  endpoint: string;
  color: string;
  badgeColor: string;
  chartColor: string;
};

const SALE_TYPES: SaleType[] = [
  { 
    name: 'online', 
    displayName: 'Online Sales', 
    endpoint: 'online-sales', 
    color: 'bg-blue-50 border-blue-200',
    badgeColor: 'bg-blue-50 text-blue-700 ring-blue-200',
    chartColor: '#3B82F6'
  },
  { 
    name: 'offline', 
    displayName: 'Offline Sales (Cash/UPI/CC)', 
    endpoint: 'offline-sales', 
    color: 'bg-green-50 border-green-200',
    badgeColor: 'bg-green-50 text-green-700 ring-green-200',
    chartColor: '#10B981'
  },
  { 
    name: 'lok', 
    displayName: 'Lok Event Sales', 
    endpoint: 'lok-event-sales', 
    color: 'bg-purple-50 border-purple-200',
    badgeColor: 'bg-purple-50 text-purple-700 ring-purple-200',
    chartColor: '#8B5CF6'
  },
  { 
    name: 'rajradha', 
    displayName: 'RajRadha Event Sales', 
    endpoint: 'rajradha-event-sales', 
    color: 'bg-orange-50 border-orange-200',
    badgeColor: 'bg-orange-50 text-orange-700 ring-orange-200',
    chartColor: '#F97316'
  },
];

export default function Dashboard() {
  const { token } = useAuth();
  const { t } = useLang();

  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const isDev = String((import.meta as any).env?.VITE_DEV_MODE ?? '').toLowerCase() === 'true';
  
  // Aggregate metrics across all sale types
  const [metrics, setMetrics] = useState({
    totalAmount: 0,
    totalOrders: 0,
    uniqueCustomers: 0,
    refundCount: 0,
  });
  const [prevMetrics, setPrevMetrics] = useState({
    totalAmount: 0,
    totalOrders: 0,
    uniqueCustomers: 0,
    refundCount: 0,
  });

  // Individual sale type metrics
  const [saleTypeMetrics, setSaleTypeMetrics] = useState<Record<string, any>>({});

  type CountsResp = { ok: boolean; totalAmount: number; totalCount: number; uniqueCustomers?: number; refundCount?: number };

  useEffect(() => {
    async function fetchTiles() {
      setLoading(true);
      try {
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);
        const prevEnd = new Date(since.getTime());
        const prevStart = new Date(prevEnd.getTime() - days * 86400000);

        const qs = new URLSearchParams({ startDate: since.toISOString(), endDate: now.toISOString() }).toString();
        const qsPrev = new URLSearchParams({ startDate: prevStart.toISOString(), endDate: prevEnd.toISOString() }).toString();

        // Fetch counts from all sale types
        const allPromises = SALE_TYPES.flatMap(saleType => [
          apiClient.get(`${saleType.endpoint}/counts?${qs}`).catch(() => ({ ok: false, totalAmount: 0, totalCount: 0, uniqueCustomers: 0, refundCount: 0 })),
          apiClient.get(`${saleType.endpoint}/counts?${qsPrev}`).catch(() => ({ ok: false, totalAmount: 0, totalCount: 0, uniqueCustomers: 0, refundCount: 0 })),
        ]);

        const results = await Promise.all(allPromises);

        // Aggregate current and previous metrics
        let totalAmount = 0, totalOrders = 0, uniqueCustomers = 0, refundCount = 0;
        let prevTotalAmount = 0, prevTotalOrders = 0, prevUniqueCustomers = 0, prevRefundCount = 0;
        const typeMetrics: Record<string, any> = {};

        SALE_TYPES.forEach((saleType, idx) => {
          const cur = results[idx * 2] as CountsResp;
          const prev = results[idx * 2 + 1] as CountsResp;

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
            }
          };

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
          refundCount: prevRefundCount 
        };

        setMetrics(next);
        setPrevMetrics(prevNext);
        setSaleTypeMetrics(typeMetrics);
        setLoadErr(null);
        setFromCache(false);
        
        try {
          localStorage.setItem(`rk_dash_counts_${days}`, JSON.stringify(next));
          localStorage.setItem(`rk_dash_prev_counts_${days}`, JSON.stringify(prevNext));
          localStorage.setItem(`rk_dash_type_metrics_${days}`, JSON.stringify(typeMetrics));
        } catch {}
      } catch (e) {
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
        setLoadErr((e as any)?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetchTiles();
  }, [days]);

  function pctDelta(cur: number, prev: number): { pct: string; negative?: boolean } {
    const base = prev || 1;
    const pct = ((cur - base) / base) * 100;
    const neg = pct < 0;
    return { pct: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, negative: neg };
  }

  const fmtINR = (n: number) => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
    } catch {
      return `₹${Math.round(n).toLocaleString('en-IN')}`;
    }
  };

  const salesDelta = useMemo(() => pctDelta(metrics.totalAmount, prevMetrics.totalAmount), [metrics, prevMetrics]);
  const ordersDelta = useMemo(() => pctDelta(metrics.totalOrders, prevMetrics.totalOrders), [metrics, prevMetrics]);
  const customersDelta = useMemo(() => pctDelta(metrics.uniqueCustomers, prevMetrics.uniqueCustomers), [metrics, prevMetrics]);
  const refundsDelta = useMemo(() => pctDelta(metrics.refundCount, prevMetrics.refundCount), [metrics, prevMetrics]);

  return (
    <AppLayout>
      <h1 className="text-3xl font-bold text-gray-900">{t('dashboard_title')}</h1>
      <p className="mt-2 text-[#C41E3A]">{t('dashboard_subtitle')}</p>

      {/* Overall Metrics */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Overall Sales (All Channels)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t('total_sales')} value={fmtINR(metrics.totalAmount)} delta={salesDelta.pct} fromLastWeek={t('from_last_week')} negative={salesDelta.negative} />
          <StatCard label={t('orders')} value={metrics.totalOrders.toLocaleString('en-IN')} delta={ordersDelta.pct} fromLastWeek={t('from_last_week')} negative={ordersDelta.negative} />
          <StatCard label={t('customers')} value={metrics.uniqueCustomers.toLocaleString('en-IN')} delta={customersDelta.pct} fromLastWeek={t('from_last_week')} negative={customersDelta.negative} />
          <StatCard label={t('refunds')} value={metrics.refundCount.toLocaleString('en-IN')} delta={refundsDelta.pct} fromLastWeek={t('from_last_week')} negative={refundsDelta.negative} />
        </div>
      </div>

      {/* Sale Type Breakdown */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Sales by Channel</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SALE_TYPES.map(saleType => {
            const data = saleTypeMetrics[saleType.name];
            if (!data) return null;
            
            const cur = data.current;
            const prev = data.previous;
            const delta = pctDelta(cur.totalAmount, prev.totalAmount);

            return (
              <div key={saleType.name} className={`rounded-lg border p-4 ${saleType.color}`}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{saleType.displayName}</h3>
                <p className="text-2xl font-bold text-gray-900">{fmtINR(cur.totalAmount)}</p>
                <p className="text-sm text-gray-600 mt-1">{cur.totalOrders.toLocaleString('en-IN')} orders</p>
                <p className={`text-xs mt-1 ${delta.negative ? 'text-red-600' : 'text-green-600'}`}>
                  {delta.pct} {t('from_last_week')}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual Sale Type Graphs */}
      <div className="mt-8 space-y-8">
        <h2 className="text-lg font-semibold text-gray-700">Detailed Sales Analytics</h2>
        
        {SALE_TYPES.map(saleType => (
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

      {/* Online Sales List (keeping the existing detailed list for online sales) */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Online Sales</h2>
        <OnlineSalesList days={days} />
      </div>

      {!loading && isDev && (loadErr || fromCache) && (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          {fromCache ? 'Showing cached tiles. ' : ''}
          {loadErr ? `Counts fetch error: ${loadErr}` : ''}
        </div>
      )}
    </AppLayout>
  );
}

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
      <p className={`mt-1 text-xs ${negative ? 'text-red-600' : 'text-green-600'}`}>{delta} {fromLastWeek}</p>
    </div>
  );
}
