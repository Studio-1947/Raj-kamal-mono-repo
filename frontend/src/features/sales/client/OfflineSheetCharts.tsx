import React from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { OfflineSheetSummaryResponse } from './offlineSheetTypes';

const COLORS = [
  '#0D9488', '#3B82F6', '#F59E0B', '#EF4444',
  '#8B5CF6', '#10B981', '#F97316', '#EC4899',
];

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

// ─── Skeleton for chart ────────────────────────────────────────────────────
function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse h-[300px]">
      <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
      <div className="h-[224px] bg-gray-100 rounded" />
      <p className="text-xs text-gray-400 mt-2">{title}</p>
    </div>
  );
}

interface Props {
  data?: OfflineSheetSummaryResponse;
  isLoading: boolean;
  days: number;
}

export default function OfflineSheetCharts({ data, isLoading, days }: Props) {
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton title="Revenue Trend" />
        <ChartSkeleton title="Top 10 Items" />
        <ChartSkeleton title="Payment Mode" />
      </div>
    );
  }

  const timeSeries = data.timeSeries ?? [];
  const topItems   = data.topItems   ?? [];
  const payMode    = data.paymentMode ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-3">

      {/* ── Line chart: revenue trend ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          Revenue Trend — last {days} days
        </h3>
        {timeSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmtINR(v)} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#0D9488"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[240px] items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
            No date-series data available
          </div>
        )}
      </div>

      {/* ── Bar chart: top 10 items ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Top 10 Items by Revenue</h3>
        {topItems.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topItems} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis
                type="category"
                dataKey="title"
                width={100}
                tick={{ fontSize: 9 }}
                tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '…' : v}
              />
              <Tooltip formatter={(v: number) => fmtINR(v)} />
              <Bar dataKey="total" fill="#0D9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[240px] items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
            No item data
          </div>
        )}
      </div>

      {/* ── Pie chart: payment mode ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Payment Mode Distribution</h3>
        {payMode.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={payMode}
                dataKey="total"
                nameKey="paymentMode"
                outerRadius={90}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {payMode.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtINR(v)} />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[240px] items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
            No payment mode data
          </div>
        )}
      </div>

    </div>
  );
}
