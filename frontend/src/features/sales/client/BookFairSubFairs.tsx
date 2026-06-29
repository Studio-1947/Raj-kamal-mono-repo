// ─────────────────────────────────────────────────────────────────────────────
// BookFairSubFairs.tsx
//
// Promotes each individual book fair (Exhibition, World, Raipur…) to a first-class
// category. Each fair is encoded in the source "type" column as "Book Fair - <Name>".
// Live tables currently carry a single generic "Book Fair" type, so this breakdown
// is sourced from the archived FY history (offline_sales_history). Shown only on the
// dedicated BookFair page.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiShoppingBag } from 'react-icons/fi';
import { apiClient } from '../../../lib/apiClient';
import BookFairSubFairDetail from './BookFairSubFairDetail';

interface SubFair {
  type: string;   // "Book Fair - Exhibition"
  label: string;  // "Exhibition"
  total: number;
  qty: number;
  txns: number;
}

interface SubFairsResponse {
  ok: boolean;
  fy: string;
  grandTotal: number;
  grandQty: number;
  subFairs: SubFair[];
}

function fmtINR(n: number): string {
  if (!Number.isFinite(n)) return '₹0';
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

// A stable, distinct colour per fair so each promoted category reads as its own.
const PALETTE = ['#4F46E5', '#0D9488', '#EC4899', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444', '#3B82F6', '#D946EF', '#14B8A6'];

interface Props {
  /** Archive financial year to break down. Defaults to the latest archive (2025-26). */
  fy?: string;
}

export default function BookFairSubFairs({ fy = '2025-26' }: Props) {
  const [data, setData] = useState<SubFairsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null); // selected fair `type`, or null = all

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get<SubFairsResponse>(`bookfair-offline-sales/sub-fairs?fy=${fy}`)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setData(res);
        else setError('Failed to load book-fair breakdown');
      })
      .catch((e: any) => !cancelled && setError(e?.message || 'Failed to load book-fair breakdown'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [fy]);

  const maxTotal = useMemo(
    () => Math.max(1, ...(data?.subFairs ?? []).map((s) => s.total)),
    [data],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-600" />
        <span className="text-sm text-gray-500">Loading individual book fairs…</span>
      </div>
    );
  }

  // Silent when there's genuinely no archived breakdown (keeps the live page clean).
  if (error || !data || data.subFairs.length === 0) return null;

  const selectedIdx = active ? data.subFairs.findIndex((s) => s.type === active) : -1;
  const selected = selectedIdx >= 0 ? data.subFairs[selectedIdx] : null;
  const selectedColor = selectedIdx >= 0 ? PALETTE[selectedIdx % PALETTE.length] : '#4F46E5';

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-normal text-gray-900">Individual Book Fairs</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Each fair as its own category · FY {data.fy} archive
          </p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total ({data.subFairs.length} fairs)</p>
            <p className="text-xl font-semibold text-gray-900">{fmtINR(data.grandTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Copies</p>
            <p className="text-xl font-semibold text-gray-900">{data.grandQty.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Promoted category pills — click to focus one fair */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setActive(null)}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
            active === null
              ? 'border-transparent bg-indigo-600 text-white shadow-sm'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          All Fairs
        </button>
        {data.subFairs.map((s, i) => {
          const isActive = active === s.type;
          const color = PALETTE[i % PALETTE.length];
          return (
            <button
              key={s.type}
              onClick={() => setActive(isActive ? null : s.type)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive ? 'text-white shadow-sm border-transparent' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
              style={isActive ? { backgroundColor: color } : {}}
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.8)' : color }} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Focused single-fair deep dive */}
      {selected && (
        <div className="mb-6">
          <BookFairSubFairDetail
            type={selected.type}
            label={selected.label}
            color={selectedColor}
            fy={data.fy}
            onClose={() => setActive(null)}
          />
        </div>
      )}

      {/* Ranked breakdown rows */}
      <div className="space-y-2.5">
        {data.subFairs.map((s, i) => {
          const dimmed = active !== null && active !== s.type;
          const color = PALETTE[i % PALETTE.length];
          return (
            <button
              key={s.type}
              onClick={() => setActive(active === s.type ? null : s.type)}
              className={`flex w-full items-center gap-4 rounded-2xl border border-gray-100 px-4 py-3 text-left transition-all hover:border-gray-200 hover:bg-gray-50/60 ${
                dimmed ? 'opacity-40' : ''
              }`}
            >
              <span className="w-5 shrink-0 text-xs font-semibold text-gray-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-gray-800">{s.label}</span>
                  <span className="shrink-0 text-sm font-semibold text-gray-900">{fmtINR(s.total)}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${(s.total / maxTotal) * 100}%`, backgroundColor: color }} />
                </div>
                <div className="mt-1.5 flex items-center gap-4 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-1"><FiShoppingBag className="h-3 w-3" /> {s.qty.toLocaleString('en-IN')} copies</span>
                  <span className="inline-flex items-center gap-1"><FiCalendar className="h-3 w-3" /> {s.txns.toLocaleString('en-IN')} txns</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
