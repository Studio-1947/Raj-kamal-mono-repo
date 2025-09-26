import React, { useEffect, useMemo, useState } from 'react';
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
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      try {
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);
        const qs = new URLSearchParams({
          limit: '200',
          startDate: since.toISOString(),
          endDate: now.toISOString(),
          ...(q ? { q } : {}),
        }).toString();
        const resp = await apiClient.get<ListResp>(`online-sales?${qs}`);
        setItems(resp.items || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
    setPage(1);
  }, [days, q]);

  const fmtINR = (n?: number | null) => (n == null ? '-' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n));

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  return (
    <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-gray-700">Raw Rows</div>
        <div className="flex items-center gap-2">
          <input className="rounded border px-2 py-1 text-sm" placeholder="Search title, order, customer" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="rounded border px-2 py-1 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[30, 60, 90, 180, 365, 730].map((d) => <option key={d} value={d}>{d === 30 ? 'This Month' : `${d} days`}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600">
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Order</th>
              <th className="px-2 py-2">Title</th>
              <th className="px-2 py-2">Qty</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Payment</th>
              <th className="px-2 py-2">Raw</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((it) => {
              const raw = it.rawJson || {};
              const paymentRaw = (raw['Payment Mode'] || it.paymentMode || '-') as string;
              const title = it.title || (raw['Title'] || raw['Title '] || '-') as string;
              const date = (it.date || (raw['Date'] as string) || (raw['                                                          '] as string) || (raw['Txn Date'] as string) || '') as string;
              return (
                <tr key={it.id} className="border-b last:border-0">
                  <td className="px-2 py-2 text-gray-700">{date ? new Date(date).toLocaleDateString() : '-'}</td>
                  <td className="px-2 py-2">{it.orderNo || (raw['Order'] as string) || '-'}</td>
                  <td className="px-2 py-2">{title}</td>
                  <td className="px-2 py-2">{it.qty ?? raw['Qty'] ?? '-'}</td>
                  <td className="px-2 py-2">{fmtINR(it.amount ?? (raw['Selling Price'] as number) ?? (raw['Amount'] as number))}</td>
                  <td className="px-2 py-2">{String(paymentRaw)}</td>
                  <td className="px-2 py-2">
                    <details>
                      <summary className="cursor-pointer text-blue-600">view</summary>
                      <pre className="mt-1 max-w-[480px] whitespace-pre-wrap break-words rounded bg-gray-100 p-2 text-xs text-gray-700">{JSON.stringify(raw, null, 2)}</pre>
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
    </div>
  );
}
