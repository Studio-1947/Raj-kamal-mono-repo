import React from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
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

// ─── Custom Tooltip (Black Text) ───────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, title }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xl ring-1 ring-black/5">
        <p className="mb-1 text-sm font-black text-gray-900 uppercase tracking-wider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-lg font-black" style={{ color: entry.color || '#111827' }}>
            {title || entry.name}: {fmtINR(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Skeleton ──────────────────────────────────────────────────────────────
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
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton title="Revenue Trend" />
        <ChartSkeleton title="Top 10 States" />
        <ChartSkeleton title="Top 10 Publishers" />
        <ChartSkeleton title="Top 10 Customers" />
      </div>
    );
  }

  const timeSeries = data.timeSeries ?? [];
  const topItems   = data.topItems   ?? [];
  const byState    = data.revenueByState ?? [];
  const byPub      = data.revenueByPublisher ?? [];
  const byCustomer = data.topCustomers ?? [];

  // Solid black for maximum legibility (Senior citizens)
  const TEXT_COL = '#000000'; 
  const BOLD_TEXT = { fontSize: 13, fontWeight: 900, fill: TEXT_COL };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Row 1, Col 1: Revenue Trend (Area) */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-black text-gray-900 border-b-2 border-gray-100 pb-2">Revenue Trend (Last {days} Days)</h3>
          {timeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeries} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1D5DB" />
                <XAxis 
                  dataKey="date" 
                  tick={BOLD_TEXT} 
                  axisLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                  tickLine={false}
                  dy={10}
                  interval="preserveStartEnd" 
                />
                <YAxis 
                  tick={BOLD_TEXT} 
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} 
                  axisLine={{ stroke: '#000000', strokeWidth: 1.5 }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip title="Revenue" />} />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#0D9488" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  dot={false}
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#0D9488' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No sales trend data</div>
          )}
        </div>

        {/* Row 1, Col 2: Revenue by State (Bar) */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-black text-gray-900 border-b-2 border-gray-100 pb-2">Sales by State (Top 10)</h3>
          {byState.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byState} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" horizontal={false} />
                <XAxis type="number" tick={BOLD_TEXT} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} />
                <YAxis type="category" dataKey="state" width={120} tick={{ fontSize: 13, fontWeight: 900, fill: TEXT_COL }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total Revenue" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No state data</div>
          )}
        </div>

        {/* Row 2, Col 1: Revenue by Publisher (Bar) */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-black text-gray-900 border-b-2 border-gray-100 pb-2">Sales by Publisher (Top 10)</h3>
          {byPub.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byPub} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" horizontal={false} />
                <XAxis type="number" tick={BOLD_TEXT} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} />
                <YAxis type="category" dataKey="publisher" width={120} tick={{ fontSize: 13, fontWeight: 900, fill: TEXT_COL }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total Revenue" fill="#F59E0B" radius={[0, 8, 8, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No publisher data</div>
          )}
        </div>

        {/* Row 2, Col 2: Top Customers (Bar) */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-black text-gray-900 border-b-2 border-gray-100 pb-2">Top 10 Customers</h3>
          {byCustomer.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCustomer} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" horizontal={false} />
                <XAxis type="number" tick={BOLD_TEXT} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} />
                <YAxis type="category" dataKey="customerName" width={120} tick={{ fontSize: 13, fontWeight: 900, fill: TEXT_COL }} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total Revenue" fill="#8B5CF6" radius={[0, 8, 8, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No customer data</div>
          )}
        </div>

      </div>

      {/* Full width: Top Items Table-Chart */}
      <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-black text-gray-900 border-b-2 border-gray-100 pb-2">Top 10 Best Selling Items</h3>
        {topItems.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={topItems} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1D5DB" />
              <XAxis dataKey="title" angle={-45} textAnchor="end" height={80} tick={BOLD_TEXT} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} />
              <YAxis tick={BOLD_TEXT} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: '#000000', strokeWidth: 1.5 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Total Revenue" fill="#10B981" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 13, fontWeight: 'bold', fill: TEXT_COL }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No item data</div>
        )}
      </div>
    </div>
  );
}
