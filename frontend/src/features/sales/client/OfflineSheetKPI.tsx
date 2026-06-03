import React from 'react';
import type { OfflineSheetCountsResponse } from './offlineSheetTypes';

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-28 mb-3" />
      <div className="h-8 bg-gray-300 rounded w-36 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-20" />
    </div>
  );
}

// ─── Single tile ─────────────────────────────────────────────────────────────
interface TileProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string; // tailwind text colour class
  badge?: React.ReactNode;
}

function KpiTile({ label, value, sub, accent = 'text-gray-900', badge }: TileProps) {
  return (
    <div className="rounded-2xl border-2 border-teal-100 bg-white p-5 shadow-md transition-transform hover:scale-[1.02] flex flex-col justify-between h-full">
      <div>
        <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-gray-400">{label}</p>
        <p className={`mt-2 text-xl lg:text-2xl font-normal ${accent}`}>{value}</p>
        {sub && <p className="mt-1 text-xs font-normal text-gray-400">{sub}</p>}
      </div>
      {badge}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
interface Props {
  data?: OfflineSheetCountsResponse;
  isLoading: boolean;
}

export default function OfflineSheetKPI({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <KpiSkeleton key={i} />)}
      </div>
    );
  }

  const grossAmt = data.grossAmount ?? 0;
  const inAmt = data.inAmount ?? 0;
  const grossQty = data.grossQty ?? 0;
  const inQty = data.inQty ?? 0;
  const netQty = grossQty - inQty;

  const amtRetPct = grossAmt > 0 ? ((inAmt / grossAmt) * 100).toFixed(1) : '0.0';
  const amtNetPct = grossAmt > 0 ? (((grossAmt - inAmt) / grossAmt) * 100).toFixed(1) : '100.0';

  const qtyRetPct = grossQty > 0 ? ((inQty / grossQty) * 100).toFixed(1) : '0.0';
  const qtyNetPct = grossQty > 0 ? ((netQty / grossQty) * 100).toFixed(1) : '100.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiTile
        label="Net Revenue"
        value={fmtINR(data.totalAmount ?? 0)}
        sub={`${(data.totalCount ?? 0).toLocaleString('en-IN')} transactions`}
        accent="text-teal-700"
        badge={
          <div className="mt-3 flex flex-col gap-1 border-t border-teal-50/50 pt-2.5">
            <div className="flex items-center gap-1 text-[11px] font-normal text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full w-fit">
              OUT <span className="font-semibold text-gray-700">{fmtINR(grossAmt)}</span> − IN <span className="font-semibold text-red-500">{fmtINR(inAmt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                Net {amtNetPct}%
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full w-fit">
                Ret {amtRetPct}%
              </span>
            </div>
          </div>
        }
      />
      <KpiTile
        label="Copies Dispatched"
        value={grossQty.toLocaleString('en-IN')}
        accent="text-teal-700"
        badge={
          <div className="mt-3 flex flex-col gap-1 border-t border-teal-50/50 pt-2.5">
            <div className="flex items-center gap-1 text-[11px] font-normal text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full w-fit">
              Returns (IN): <span className="font-semibold text-red-500">{inQty.toLocaleString('en-IN')}</span> copies
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-[10px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full w-fit">
                Net {qtyNetPct}% ({netQty.toLocaleString('en-IN')})
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full w-fit">
                Ret {qtyRetPct}%
              </span>
            </div>
          </div>
        }
      />
      <KpiTile
        label="Total Orders"
        value={(data.totalCount ?? 0).toLocaleString('en-IN')}
      />
      <KpiTile
        label="Unique Customers"
        value={(data.uniqueCustomers ?? 0).toLocaleString('en-IN')}
      />
      <KpiTile
        label="Top Binding"
        value={data.topBinding ?? 'N/A'}
        accent="text-pink-600"
      />
      <KpiTile
        label="Refunds"
        value={(data.refundCount ?? 0).toLocaleString('en-IN')}
        accent={data.refundCount > 0 ? 'text-red-600' : 'text-gray-900'}
      />
    </div>
  );
}
