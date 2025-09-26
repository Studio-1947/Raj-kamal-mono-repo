import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../../lib/apiClient';

type Item = {
  id: string;
  orderNo?: string | null;
  title?: string | null;
  amount?: number | null;
  qty?: number | null;
  paymentMode?: string | null;
  date?: string | null;
  rawJson: Record<string, any>;
};

type ListResp = { ok: boolean; items: Item[]; nextCursorId?: string | null };

export default function OnlineSalesList() {
  const [days, setDays] = useState(90);
  const [q, setQ] = useState('');
  // debounced query to reduce API thrash while typing
  const [qDebounced, setQDebounced] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const isDev = String((import.meta as any).env?.VITE_DEV_MODE ?? '').toLowerCase() === 'true';
  const abortRef = useRef<AbortController | null>(null);

  // Debounce q for 300ms
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      setError(null);
      const cacheKey = `rk_osl_${days}_${qDebounced || 'all'}`;
      try {
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);
        const qs = new URLSearchParams({
          limit: '200',
          startDate: since.toISOString(),
          endDate: now.toISOString(),
          ...(qDebounced ? { q: qDebounced } : {}),
        }).toString();

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        let lastErr: any = null;
        let resp: ListResp | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            resp = await apiClient.get<ListResp>(`online-sales?${qs}`, { signal: controller.signal } as any);
            lastErr = null; break;
          } catch (e) {
            lastErr = e;
            if ((e as any)?.code === 'ERR_CANCELED') return; // ignore aborted
            if (attempt < 2) await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
          }
        }
        if (!resp) throw lastErr || new Error('Request failed');
        setItems(resp.items || []);
        setFromCache(false);
        try { localStorage.setItem(cacheKey, JSON.stringify(resp.items || [])); } catch {}
      } catch (e: any) {
        // Try stale cache
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) { setItems(JSON.parse(cached)); setFromCache(true); }
        } catch {}
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
    setPage(1);
  }, [days, qDebounced]);

  const fmtINR = (n?: number | null) => (n == null ? '-' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n));

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  return (
    <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">Raw Rows</div>
        <div className="flex items-center gap-2">
          <input
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Search title, order, customer"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[30, 60, 90, 180, 365, 730].map((d) => (
              <option key={d} value={d}>
                {d === 30 ? 'This Month' : `${d} days`}
              </option>
            ))}
          </select>
          {!loading && (
            <button
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm hover:bg-gray-50"
              onClick={() => {
                // trigger refetch by nudging qDebounced
                setQDebounced((s) => s);
              }}
            >
              Refresh
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-900">
          <thead>
            <tr className="border-b bg-gray-100 text-gray-800">
              <th className="px-2 py-2 font-semibold">Date</th>
              <th className="px-2 py-2 font-semibold">Order</th>
              <th className="px-2 py-2 font-semibold">Title</th>
              <th className="px-2 py-2 font-semibold">Qty</th>
              <th className="px-2 py-2 font-semibold">Amount</th>
              <th className="px-2 py-2 font-semibold">Payment</th>
              <th className="px-2 py-2 font-semibold">Raw</th>
            </tr>
          </thead>
          <tbody className="text-gray-900">
            {paged.map((it) => {
              const raw = it.rawJson || {};
              const paymentRaw = (raw['Payment Mode'] || it.paymentMode || '-') as string;
              const title = it.title || (raw['Title'] || raw['Title '] || '-') as string;
              const date = (it.date || (raw['Date'] as string) || (raw['                                                          '] as string) || (raw['Txn Date'] as string) || '') as string;
              return (
                <tr key={it.id} className="border-b last:border-0 text-gray-900 hover:bg-gray-50">
                  <td className="px-2 py-2">{date ? new Date(date).toLocaleDateString() : '-'}</td>
                  <td className="px-2 py-2">{it.orderNo || (raw['Order'] as string) || '-'}</td>
                  <td className="px-2 py-2">{title}</td>
                  <td className="px-2 py-2">{it.qty ?? raw['Qty'] ?? '-'}</td>
                  <td className="px-2 py-2">{fmtINR(it.amount ?? (raw['Selling Price'] as number) ?? (raw['Amount'] as number))}</td>
                  <td className="px-2 py-2">{String(paymentRaw)}</td>
                  <td className="px-2 py-2">
                    <details>
                      <summary className="cursor-pointer text-blue-700">view</summary>
                      <pre className="mt-1 max-w-[480px] whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-xs text-gray-800">{JSON.stringify(raw, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td className="px-2 py-6 text-center text-gray-500" colSpan={7}>No data in this period</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-sm">
        <button className="rounded border px-2 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span className="text-gray-600">Page {page} of {totalPages}</span>
        <button className="rounded border px-2 py-1 disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
      </div>
      {loading && <div className="mt-2 text-xs text-gray-500">Loading…</div>}
      {!loading && isDev && (error || fromCache) && (
        <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          {fromCache ? 'Showing cached rows. ' : ''}
          {error ? `List fetch error: ${error}` : ''}
        </div>
      )}
    </div>
  );
}
