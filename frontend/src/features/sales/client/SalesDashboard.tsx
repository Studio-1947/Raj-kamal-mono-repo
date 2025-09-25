import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import UploadCsv from './UploadCsv';
import VirtualTable, { SaleRow } from './VirtualTable';

type SummaryResponse = {
  ok: boolean;
  bySource: { source: string; total: number }[];
  paymentMode: { paymentMode: string; total: number }[];
  timeSeries: { date: string; total: number }[];
  topItems: { title: string; total: number; qty: number }[];
};

type ListResponse = { ok: boolean; items: any[]; nextCursorId: string | null };

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9e7cc1', '#f57f7f'];

const SalesDashboard: React.FC = () => {
  const [sourceFilter, setSourceFilter] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchSummary = async (src?: string) => {
    const params = src ? `?source=${encodeURIComponent(src)}` : '';
    const s = await apiClient.get<SummaryResponse>(`sales/summary${params}`);
    setSummary(s);
  };

  const fetchPage = async (cursorId?: string | null) => {
    const q = new URLSearchParams();
    q.set('limit', '200');
    if (cursorId) q.set('cursorId', cursorId);
    const res = await apiClient.get<ListResponse>(`sales?${q.toString()}`);
    const mapped: SaleRow[] = res.items.map((it) => ({
      id: it.id,
      source: it.source,
      orderNo: it.orderNo,
      isbn: it.isbn,
      title: it.title,
      customerName: it.customerName,
      paymentMode: it.paymentMode,
      amount: it.amount ?? null,
      qty: it.qty ?? null,
      date: it.date ? String(it.date).slice(0, 10) : null,
    }));
    setRows((prev) => [...prev, ...mapped]);
    setCursor(res.nextCursorId);
  };

  useEffect(() => {
    fetchSummary();
    fetchPage();
  }, []);

  useEffect(() => {
    fetchSummary(sourceFilter);
  }, [sourceFilter]);

  const bySource = summary?.bySource || [];
  const paymentMode = summary?.paymentMode || [];
  const series = summary?.timeSeries || [];
  const topItems = summary?.topItems || [];

  const onEndReached = async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    try { await fetchPage(cursor); } finally { setLoadingMore(false); }
  };

  const sourcesList = useMemo(() => bySource.map((x) => x.source), [bySource]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Sales Dashboard</h2>
      <UploadCsv />
      <div style={{ margin: '8px 0' }}>
        <label>
          Source filter:&nbsp;
          <select value={sourceFilter || ''} onChange={(e) => setSourceFilter(e.target.value || undefined)}>
            <option value="">All</option>
            {sourcesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Chart A: Total by source */}
        <div style={{ height: 280, border: '1px solid #eee', padding: 8 }}>
          <h4>Total Sales by Source</h4>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={bySource}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="source" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart B: Payment Mode distribution */}
        <div style={{ height: 280, border: '1px solid #eee', padding: 8 }}>
          <h4>Payment Mode Distribution</h4>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie dataKey="total" data={paymentMode} outerRadius={90} label>
                {paymentMode.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart C: Sales trend */}
        <div style={{ height: 280, border: '1px solid #eee', padding: 8 }}>
          <h4>Sales Trend (last 90 days)</h4>
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

        {/* Chart D: Top 10 items */}
        <div style={{ height: 280, border: '1px solid #eee', padding: 8 }}>
          <h4>Top 10 Items by Amount</h4>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={topItems}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" tick={false} interval={0} height={40} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h4>Sales Table</h4>
      <VirtualTable rows={rows} onEndReached={onEndReached} />
      {loadingMore && <div style={{ marginTop: 8 }}>Loading more…</div>}
    </div>
  );
};

export default SalesDashboard;
