import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import { FixedSizeList as List } from 'react-window';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

type ListResponse = { ok: boolean; items: any[]; nextCursorId: string | null };
type SummaryResponse = {
  ok: boolean;
  paymentMode: { paymentMode: string; total: number }[];
  timeSeries: { date: string; total: number }[];
  topItems: { title: string; total: number; qty: number }[];
};
type CountsResponse = { ok: boolean; totalCount: number; totalAmount: number };

const PMODES = ['All', 'Cash', 'UPI', 'Card', 'NetBanking', 'Wallet', 'Cheque', 'BankTransfer', 'Other'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9e7cc1', '#f57f7f'];

const OnlineSalesPage: React.FC = () => {
  const [days, setDays] = useState(90);
  const [paymentMode, setPaymentMode] = useState('All');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [counts, setCounts] = useState<CountsResponse | null>(null);

  function buildParams(extra?: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    params.set('limit', '200');
    if (days) params.set('days', String(days));
    if (paymentMode && paymentMode !== 'All') params.set('paymentMode', paymentMode);
    if (q) params.set('q', q);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== '') params.set(k, String(v));
    }
    return params.toString();
  }

  const refresh = async () => {
    // reset table and load first page
    setRows([]);
    setCursor(null);
    try {
      await Promise.all([fetchSummary(), fetchCounts(), fetchPage(null, true)]);
    } catch (e) {
      // ignore; individual fetchers handle errors
    }
  };

  const fetchSummary = async () => {
    try {
      const qs = buildParams();
    const s = await apiClient.get<SummaryResponse>(`online-sales/summary?${qs}`);
      setSummary(s);
    } catch {
      setSummary({ ok: false as any, paymentMode: [], timeSeries: [], topItems: [] });
    }
  };

  const fetchCounts = async () => {
    try {
      const qs = buildParams();
    const c = await apiClient.get<CountsResponse>(`online-sales/counts?${qs}`);
      setCounts(c);
    } catch {
      setCounts({ ok: false as any, totalCount: 0, totalAmount: 0 });
    }
  };

  const fetchPage = async (cursorId?: string | null, reset?: boolean) => {
    const extra: any = {};
    if (cursorId) extra.cursorId = cursorId;
    const qs = buildParams(extra);
    let res: ListResponse | null = null;
    try {
      res = await apiClient.get<ListResponse>(`online-sales?${qs}`);
    } catch {
      res = { ok: false as any, items: [], nextCursorId: null };
    }
    const items = Array.isArray(res.items) ? res.items : [];
    const mapped = items.map((it) => ({
      id: it.id,
      date: it.date ? String(it.date).slice(0, 10) : '',
      title: it.title ?? '',
      isbn: it.isbn ?? '',
      customerName: it.customerName ?? '',
      paymentMode: it.paymentMode ?? '',
      qty: it.qty ?? '',
      amount: it.amount ?? '',
    }));
    setRows((prev) => (reset ? mapped : [...prev, ...mapped]));
    setCursor(res.nextCursorId || null);
  };

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paymentData = summary?.paymentMode || [];
  const series = summary?.timeSeries || [];
  const topItems = summary?.topItems || [];

  return (
    <div style={{ padding: 16 }}>
      <h2>Online Sales</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 12px' }}>
        <label>
          Days:&nbsp;
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>
          Payment Mode:&nbsp;
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            {PMODES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>
          Search:&nbsp;
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="title, customer, isbn, order no" />
        </label>
        <button onClick={refresh} style={{ padding: '6px 10px' }}>Apply</button>
        {counts && (
          <div style={{ color: '#555' }}>
            Total: {(counts.totalCount ?? 0).toLocaleString()} | Amount: {(counts.totalAmount ?? 0).toLocaleString()}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ height: 280, border: '1px solid #eee', padding: 8 }}>
          <h4>Payment Mode Distribution</h4>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie dataKey="total" data={paymentData} outerRadius={90} label>
                {paymentData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ height: 280, border: '1px solid #eee', padding: 8 }}>
          <h4>Sales Trend (last {days} days)</h4>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#82ca9d" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ height: 280, border: '1px solid #eee', padding: 8 }}>
          <h4>Top 10 Items</h4>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={topItems}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" tick={false} interval={0} height={40} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ border: '1px solid #ddd' }}>
        <div style={{ display: 'flex', background: '#f9f9f9', padding: 8, fontWeight: 600 }}>
          <div style={{ width: 140 }}>ID</div>
          <div style={{ width: 120 }}>Date</div>
          <div style={{ width: 260 }}>Title</div>
          <div style={{ width: 140 }}>ISBN</div>
          <div style={{ width: 180 }}>Customer</div>
          <div style={{ width: 120 }}>Mode</div>
          <div style={{ width: 80 }}>Qty</div>
          <div style={{ width: 120 }}>Amount</div>
        </div>
        <div style={{ width: 1160 }}>
          <List height={400} itemCount={rows.length} itemSize={36} width={1160}>
            {({ index, style }) => {
              const r = rows[index];
              if (!loadingMore && index >= rows.length - 5 && cursor) {
                setLoadingMore(true);
                fetchPage(cursor).finally(() => setLoadingMore(false));
              }
              return (
                <div style={{ ...style, display: 'flex', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                  <div style={{ width: 140, padding: '0 8px' }}>{r.id}</div>
                  <div style={{ width: 120, padding: '0 8px' }}>{r.date}</div>
                  <div style={{ width: 260, padding: '0 8px' }}>{r.title}</div>
                  <div style={{ width: 140, padding: '0 8px' }}>{r.isbn}</div>
                  <div style={{ width: 180, padding: '0 8px' }}>{r.customerName}</div>
                  <div style={{ width: 120, padding: '0 8px' }}>{r.paymentMode}</div>
                  <div style={{ width: 80, padding: '0 8px' }}>{r.qty}</div>
                  <div style={{ width: 120, padding: '0 8px' }}>{r.amount}</div>
                </div>
              );
            }}
          </List>
          {loadingMore && <div style={{ padding: 8 }}>Loading more…</div>}
        </div>
      </div>
    </div>
  );
};

export default OnlineSalesPage;
