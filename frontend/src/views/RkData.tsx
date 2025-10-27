import { useEffect, useMemo, useState } from 'react';
import { rkdataImport, rkdataList, rkdataSummary, type RkDataItem } from '../services/rkdataService';

export default function RkData() {
  const [items, setItems] = useState<RkDataItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [missingTable, setMissingTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<null | Awaited<ReturnType<typeof rkdataSummary>>>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(cursorId?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await rkdataList({ limit: 50, cursorId });
      setItems((prev) => (cursorId ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursorId);
      if (res.missingTable) setMissingTable(true);
    } catch (e: any) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function refreshSummary() {
    try {
      const s = await rkdataSummary();
      setSummary(s);
      if ((s as any).missingTable) setMissingTable(true);
    } catch {}
  }

  useEffect(() => {
    loadPage();
    refreshSummary();
  }, []);

  const hasData = items.length > 0;

  const cols = useMemo(
    () => [
      { key: 'date', label: 'Date' },
      { key: 'orderId', label: 'Order Id' },
      { key: 'isbn', label: 'ISBN' },
      { key: 'title', label: 'Title' },
      { key: 'name', label: 'Name' },
      { key: 'paymentMode', label: 'Payment' },
      { key: 'sellingPrice', label: 'Selling Price' },
      { key: 'mrp', label: 'MRP' },
    ] as const,
    []
  );

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const res = await rkdataImport();
      // Refresh list and summary regardless of whether file existed
      await loadPage();
      await refreshSummary();
    } catch (e: any) {
      setError('Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">RK Data</h1>
        <button
          onClick={handleImport}
          disabled={importing}
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
        >
          {importing ? 'Importing…' : 'Run Import'}
        </button>
      </div>

      {summary && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded border p-3">
            <div className="text-gray-600 text-sm">Total Rows</div>
            <div className="text-2xl font-bold">{summary.totalCount}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-gray-600 text-sm">Total Selling</div>
            <div className="text-2xl font-bold">₹ {summary.totalSelling.toLocaleString()}</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-gray-600 text-sm">Total MRP</div>
            <div className="text-2xl font-bold">₹ {summary.totalMrp.toLocaleString()}</div>
          </div>
        </div>
      )}

      {missingTable && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
          The RK Data table is not created yet. From <code>backend/</code>, run
          <div className="mt-1 font-mono text-sm">npm run rkdata:push</div>
          to create it without resetting the database. Then refresh this page.
        </div>
      )}

      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
      )}

      {!hasData && !loading && (
        <div className="rounded border p-6 text-center text-gray-600">
          No records yet. Use "Run Import" to load from Excel when available.
        </div>
      )}

      {hasData && (
        <div className="overflow-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-left font-medium text-gray-700">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{row.date ? new Date(row.date).toISOString().slice(0, 10) : ''}</td>
                  <td className="px-3 py-2">{row.orderId || ''}</td>
                  <td className="px-3 py-2">{row.isbn || ''}</td>
                  <td className="px-3 py-2">{row.title || ''}</td>
                  <td className="px-3 py-2">{row.name || ''}</td>
                  <td className="px-3 py-2">{row.paymentMode || ''}</td>
                  <td className="px-3 py-2">{row.sellingPrice != null ? `₹ ${row.sellingPrice}` : ''}</td>
                  <td className="px-3 py-2">{row.mrp != null ? `₹ ${row.mrp}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cursor && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => loadPage(cursor || undefined)}
            disabled={loading}
            className="rounded border px-3 py-2 disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
