import React, { useEffect, useMemo, useState } from 'react';
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

const OnlineSalesWidget: React.FC = () => {
  const [days, setDays] = useState(90);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [counts, setCounts] = useState<CountsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ days: String(days) }).toString();
      const [s, c] = await Promise.all([
        apiClient.get<SummaryResponse>(`online-sales/summary?${qs}`),
        apiClient.get<CountsResponse>(`online-sales/counts?${qs}`),
      ]);
      setSummary(s);
      setCounts(c);
    } catch {
      setSummary({ ok: false as any, paymentMode: [], timeSeries: [], topItems: [] });
      setCounts({ ok: false as any, totalCount: 0, totalAmount: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [days]);

  const series = summary?.timeSeries || [];
  const growth = useMemo(() => computeGrowth(series, Math.min(30, days)), [series, days]);
  const totalAmt = counts?.totalAmount ?? 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
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
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs">Online</div>
          <select className="rounded border px-2 py-1 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d === 30 ? 'This Month' : `${d} days`}</option>)}
          </select>
        </div>
      </div>

      <div style={{ height: 300 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#526BA3" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {loading && <div className="mt-2 text-xs text-gray-500">Loading…</div>}
    </div>
  );
};

export default OnlineSalesWidget;
