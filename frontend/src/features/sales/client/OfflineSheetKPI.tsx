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
}

function KpiTile({ label, value, sub, accent = 'text-gray-900' }: TileProps) {
  return (
    <div className="rounded-2xl border-2 border-teal-100 bg-white p-7 shadow-md transition-transform hover:scale-[1.02]">
      <p className="text-sm font-medium uppercase tracking-wider text-gray-900">{label}</p>
      <p className={`mt-3 text-4xl font-medium ${accent}`}>{value}</p>
      {sub && <p className="mt-2 text-sm font-medium text-gray-900">{sub}</p>}
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <KpiSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiTile
        label="Total Sales"
        value={fmtINR(data.totalAmount ?? 0)}
        sub={`${(data.totalCount ?? 0).toLocaleString('en-IN')} transactions`}
        accent="text-teal-700"
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
        label="Refunds"
        value={(data.refundCount ?? 0).toLocaleString('en-IN')}
        accent={data.refundCount > 0 ? 'text-red-600' : 'text-gray-900'}
      />
    </div>
  );
}
