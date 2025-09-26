import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

type SummaryResponse = {
  ok: boolean;
  paymentMode: { paymentMode: string; total: number }[];
  timeSeries: { date: string; total: number }[];
  topItems: { title: string; total: number; qty: number }[];
};

type CountsResponse = { ok: boolean; totalCount: number; totalAmount: number };

function formatINR(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

function computeGrowth(series: { date: string; total: number }[], days: number) {
  if (!series.length) return { pct: 0, dir: 'flat' as 'up' | 'down' | 'flat' };
  const recent = series.slice(-days);
  const prev = series.slice(-(days * 2), -days);
  const sum = (arr: { total: number }[]) => arr.reduce((a, b) => a + (b.total || 0), 0);
  const a = sum(recent);
  const b = sum(prev) || 1; // avoid div by zero
  const pct = ((a - b) / b) * 100;
  return { pct, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

type Props = { days?: number; onDaysChange?: (d: number) => void };

const OnlineSalesWidget: React.FC<Props> = ({ days: daysProp, onDaysChange }) => {
  const [daysState, setDaysState] = useState(daysProp ?? 90);
  const days = daysProp ?? daysState;
  const setDays = onDaysChange ?? setDaysState;
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [counts, setCounts] = useState<CountsResponse | null>(null);
  const [counts365, setCounts365] = useState<CountsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDev = String((import.meta as any).env?.VITE_DEV_MODE ?? '').toLowerCase() === 'true';
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

  async function fetchAll() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ days: String(days) }).toString();
      const qs365 = new URLSearchParams({ days: '365' }).toString();
      // cancel any in-flight
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      let lastErr: any = null;
      let s: SummaryResponse | null = null;
      let c: CountsResponse | null = null;
      let c365: CountsResponse | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const [s0, c0] = await Promise.all([
            apiClient.get<SummaryResponse>(`online-sales/summary?${qs}`, { signal: controller.signal }),
            apiClient.get<CountsResponse>(`online-sales/counts?${qs}`, { signal: controller.signal }),
          ]);
          s = s0; c = c0; lastErr = null; break;
        } catch (e) {
          lastErr = e; if (attempt < 2) await sleep(300 * (attempt + 1));
        }
      }
      if (!s || !c) throw lastErr || new Error('Request failed');
      // try get 365-day counts from cache first
      try {
        const cached365 = localStorage.getItem('rk_osw_counts_365');
        if (cached365) c365 = JSON.parse(cached365);
      } catch {}
      if (!c365) {
        try {
          c365 = await apiClient.get<CountsResponse>(`online-sales/counts?${qs365}`, { signal: controller.signal });
        } catch (e) {
          // ignore; will stay null and not render the extra line
        }
      }
      setSummary(s);
      setCounts(c);
      if (c365) setCounts365(c365);
      setError(null);
      setFromCache(false);
      try {
        localStorage.setItem(`rk_osw_summary_${days}`, JSON.stringify(s));
        localStorage.setItem(`rk_osw_counts_${days}`, JSON.stringify(c));
        if (c365) localStorage.setItem('rk_osw_counts_365', JSON.stringify(c365));
      } catch {}
      if (isDev) console.warn('[OnlineSalesWidget] fetch failed for days=', days);
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return; // request was aborted due to days change
      // Try stale cache instead of hard zeroing UI
      try {
        const s = localStorage.getItem(`rk_osw_summary_${days}`);
        const c = localStorage.getItem(`rk_osw_counts_${days}`);
        const c365 = localStorage.getItem('rk_osw_counts_365');
        if (s && c) {
          setSummary(JSON.parse(s));
          setCounts(JSON.parse(c));
          setFromCache(true);
        } else {
          setSummary({ ok: false as any, paymentMode: [], timeSeries: [], topItems: [] });
          setCounts({ ok: false as any, totalCount: 0, totalAmount: 0 });
        }
        if (c365) setCounts365(JSON.parse(c365));
      } catch {}
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [days]);

  const series = summary?.timeSeries || [];
  const growth = useMemo(() => computeGrowth(series, Math.min(30, days)), [series, days]);
  const seriesTotal = useMemo(() => series.reduce((a, b) => a + (b.total || 0), 0), [series]);
  const totalAmt = (counts?.totalAmount ?? 0) || seriesTotal;
  const now = new Date();
  const since = new Date(now.getTime() - days * 86400000);
  const projection365 = Math.round((totalAmt / Math.max(1, days)) * 365);
  const projectionLabel = days === 365 ? '365-day total' : 'Projected 365-day total';
  const actual365Total = counts365?.totalAmount ?? (days === 365 ? totalAmt : null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-900">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Revenue Overview</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900">{formatINR(totalAmt)}</div>
          <div className="mt-1 text-xs text-gray-600">
            <span className={growth.dir === 'down' ? 'text-red-600' : 'text-green-600'}>
              {growth.pct >= 0 ? '+' : ''}{growth.pct.toFixed(2)}%
            </span>
            <span className="ml-1">vs previous period</span>
          </div>
          <div className="mt-1 text-sm text-gray-800">
            {projectionLabel}: <span className="font-semibold text-gray-900">{formatINR(projection365)}</span>
          </div>
          {actual365Total != null && (
            <div className="mt-1 text-sm text-gray-800">
              Last 365 days total: <span className="font-semibold text-gray-900">{formatINR(actual365Total)}</span>
            </div>
          )}
          <div className="mt-1 text-xs text-gray-500">{since.toLocaleDateString()} – {now.toLocaleDateString()}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">Online</div>
          <select className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d === 30 ? 'This Month' : `${d} days`}</option>)}
          </select>
        </div>
      </div>

      <div style={{ height: 300 }} className="w-full">
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#526BA3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
            <div className="flex items-center gap-3">
              <span>{loading ? 'Loading…' : 'No data for selected period'}</span>
              {!loading && (
                <button className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900" onClick={fetchAll}>
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && <div className="mt-2 text-xs text-gray-500">Loading…</div>}
      {!loading && isDev && (error || fromCache) && (
        <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          {fromCache ? 'Showing cached data. ' : 'Dev note: '} {error ? `Fetch error: ${error}` : ''}
        </div>
      )}
    </div>
  );
};

export default OnlineSalesWidget;
