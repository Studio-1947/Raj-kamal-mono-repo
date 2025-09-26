import { useAuth } from '../modules/auth/AuthContext';
import { useLang } from '../modules/lang/LangContext';
import AppLayout from '../shared/AppLayout';
import OnlineSalesWidget from '../features/sales/client/OnlineSalesWidget';
import OnlineSalesList from '../features/sales/client/OnlineSalesList';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/apiClient';

export default function Dashboard() {
  const { token } = useAuth();
  const { t } = useLang();

  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
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

        const [cur, prev] = await Promise.all<CountsResp>([
          apiClient.get(`online-sales/counts?${qs}`),
          apiClient.get(`online-sales/counts?${qsPrev}`),
        ] as any);

        setMetrics({
          totalAmount: cur.totalAmount || 0,
          totalOrders: cur.totalCount || 0,
          uniqueCustomers: cur.uniqueCustomers || 0,
          refundCount: cur.refundCount || 0,
        });
        setPrevMetrics({
          totalAmount: prev.totalAmount || 0,
          totalOrders: prev.totalCount || 0,
          uniqueCustomers: prev.uniqueCustomers || 0,
          refundCount: prev.refundCount || 0,
        });
      } catch (e) {
        setMetrics({ totalAmount: 0, totalOrders: 0, uniqueCustomers: 0, refundCount: 0 });
        setPrevMetrics({ totalAmount: 0, totalOrders: 0, uniqueCustomers: 0, refundCount: 0 });
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('total_sales')} value={fmtINR(metrics.totalAmount)} delta={salesDelta.pct} fromLastWeek={t('from_last_week')} negative={salesDelta.negative} />
        <StatCard label={t('orders')} value={metrics.totalOrders.toLocaleString('en-IN')} delta={ordersDelta.pct} fromLastWeek={t('from_last_week')} negative={ordersDelta.negative} />
        <StatCard label={t('customers')} value={metrics.uniqueCustomers.toLocaleString('en-IN')} delta={customersDelta.pct} fromLastWeek={t('from_last_week')} negative={customersDelta.negative} />
        <StatCard label={t('refunds')} value={metrics.refundCount.toLocaleString('en-IN')} delta={refundsDelta.pct} fromLastWeek={t('from_last_week')} negative={refundsDelta.negative} />
      </div>

      {/* Online Sales widget – compact and themed */}
      <div className="mt-8">
        <OnlineSalesWidget days={days} onDaysChange={setDays} />
      </div>

      <OnlineSalesList />

      {/* {token && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700">{t('auth_token')}</h2>
          <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-green-300">{token}</pre>
        </div>
      )} */}
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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <p className={`mt-1 text-xs ${negative ? 'text-red-600' : 'text-green-600'}`}>{delta} {fromLastWeek}</p>
    </div>
  );
}
