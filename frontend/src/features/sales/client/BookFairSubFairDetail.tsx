// ─────────────────────────────────────────────────────────────────────────────
// BookFairSubFairDetail.tsx
//
// Full drill-down analytics for a single individual book fair (archived FY).
// Fetched on demand from /bookfair-offline-sales/sub-fair-details.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { FiX, FiBook, FiUsers, FiRepeat, FiTag } from 'react-icons/fi';
import { apiClient } from '../../../lib/apiClient';

interface NamedTotal { total: number; qty?: number }
interface DetailResponse {
  ok: boolean;
  fy: string;
  type: string;
  label: string;
  kpis: {
    total: number; qty: number; txns: number; gross: number; returns: number;
    refundCount: number; uniqueCustomers: number; uniqueTitles: number; avgRate: number;
  };
  monthly: { month: string; total: number; qty: number }[];
  topItems: ({ title: string } & NamedTotal)[];
  topItemsByQty: ({ title: string } & NamedTotal)[];
  topPublishers: ({ publisher: string } & NamedTotal)[];
  topAuthors: ({ author: string } & NamedTotal)[];
  topStates: ({ state: string } & NamedTotal)[];
  topCities: ({ city: string } & NamedTotal)[];
  fictionSplit: ({ fictionType: string } & NamedTotal)[];
}

function fmtINR(n: number): string {
  if (!Number.isFinite(n)) return '₹0';
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
const fmtAxis = (n: number) => (Math.abs(n) >= 1e7 ? `${(n / 1e7).toFixed(1)}Cr` : Math.abs(n) >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : `${n}`);

const FICTION_COLORS: Record<string, string> = { Fiction: '#4F46E5', 'Non-Fiction': '#0D9488', 'Children Book': '#F59E0B', Other: '#9CA3AF' };
const colorForFiction = (k: string) => FICTION_COLORS[k] ?? '#8B5CF6';

interface Props {
  type: string;     // "Book Fair - Exhibition"
  label: string;    // "Exhibition"
  color: string;
  fy?: string;
  source?: 'live' | 'history';
  onClose: () => void;
}

// Compact ranked bar list reused for items / publishers / states / cities.
function RankedList({ title, rows, nameKey, color }: { title: string; rows: any[]; nameKey: string; color: string }) {
  const max = Math.max(1, ...rows.map(r => r.total));
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h4>
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm text-gray-700" title={r[nameKey]}>
                <span className="mr-1.5 text-xs font-semibold text-gray-300">{i + 1}</span>{r[nameKey]}
              </span>
              <span className="shrink-0 text-sm font-semibold text-gray-900">{fmtINR(r.total)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${(r.total / max) * 100}%`, backgroundColor: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon?: React.ReactNode; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{icon}{label}</p>
      <p className={`mt-1.5 text-xl font-semibold ${tone ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

export default function BookFairSubFairDetail({ type, label, color, fy, source = 'history', onClose }: Props) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    const qs = `source=${source}&type=${encodeURIComponent(type)}${fy ? `&fy=${encodeURIComponent(fy)}` : ''}`;
    apiClient
      .get<DetailResponse>(`bookfair-offline-sales/sub-fair-details?${qs}`)
      .then(res => { if (!cancelled) { res.ok ? setData(res) : setError('Failed to load fair details'); } })
      .catch((e: any) => !cancelled && setError(e?.message || 'Failed to load fair details'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [type, fy, source]);

  const monthsWithData = data?.monthly.filter(m => m.total !== 0).length ?? 0;
  const returnsPct = data && data.kpis.gross > 0 ? (data.kpis.returns / data.kpis.gross) * 100 : 0;

  return (
    <div className="rounded-3xl border-2 p-6 shadow-sm animate-fadeIn" style={{ borderColor: color }}>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-400">Book-fair deep dive · {source === 'live' ? 'Live current-year data' : `FY ${fy} archive`}</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full border border-gray-200 p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700">
          <FiX className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-10 text-sm text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600" /> Loading deep dive…
        </div>
      )}
      {error && <p className="py-8 text-center text-sm text-red-600">⚠️ {error}</p>}

      {data && !loading && (
        <div className="space-y-6">
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Net Revenue" value={fmtINR(data.kpis.total)} sub={`Gross ${fmtINR(data.kpis.gross)}`} />
            <Kpi icon={<FiBook className="h-3 w-3" />} label="Copies Sold" value={data.kpis.qty.toLocaleString('en-IN')} />
            <Kpi icon={<FiRepeat className="h-3 w-3" />} label="Transactions" value={data.kpis.txns.toLocaleString('en-IN')} />
            <Kpi icon={<FiTag className="h-3 w-3" />} label="Unique Titles" value={data.kpis.uniqueTitles.toLocaleString('en-IN')} />
            <Kpi label="Avg Rate / Copy" value={fmtINR(data.kpis.avgRate)} />
            <Kpi label="Returns" value={fmtINR(data.kpis.returns)} sub={`${returnsPct.toFixed(1)}% · ${data.kpis.refundCount} txns`} tone={data.kpis.returns > 0 ? 'text-red-600' : 'text-gray-900'} />
          </div>

          {/* Monthly trend + fiction split */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-2">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Monthly Revenue {monthsWithData <= 1 && <span className="ml-1 normal-case text-gray-300">(this fair ran in a single month)</span>}
              </h4>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={fmtAxis} />
                    <Tooltip
                      cursor={{ fill: '#F9FAFB' }}
                      content={({ active, payload }) => active && payload && payload.length ? (
                        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
                          <p className="text-xs font-semibold text-gray-500">{payload[0].payload.month}</p>
                          <p className="text-sm font-semibold" style={{ color }}>{fmtINR(Number(payload[0].value))}</p>
                          <p className="text-[11px] text-gray-400">{Number(payload[0].payload.qty).toLocaleString('en-IN')} copies</p>
                        </div>
                      ) : null}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={26} fill={color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fiction split */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Fiction vs Non-Fiction</h4>
              <div className="space-y-3">
                {data.fictionSplit.map((f, i) => {
                  const pct = data.kpis.total > 0 ? (f.total / data.kpis.total) * 100 : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{f.fictionType}</span>
                        <span className="font-semibold text-gray-900">{fmtINR(f.total)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colorForFiction(f.fictionType) }} />
                      </div>
                      <p className="text-[11px] text-gray-400">{pct.toFixed(1)}% · {(f.qty ?? 0).toLocaleString('en-IN')} copies</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ranked lists */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RankedList title="Top Titles (by revenue)" rows={data.topItems} nameKey="title" color={color} />
            <RankedList title="Top Publishers" rows={data.topPublishers} nameKey="publisher" color="#F59E0B" />
            <RankedList title="Top Authors" rows={data.topAuthors} nameKey="author" color="#8B5CF6" />
            <RankedList title="Top States" rows={data.topStates} nameKey="state" color="#0D9488" />
          </div>

          {data.topCities.length > 1 && (
            <RankedList title="Top Cities" rows={data.topCities} nameKey="city" color="#EC4899" />
          )}
        </div>
      )}
    </div>
  );
}
