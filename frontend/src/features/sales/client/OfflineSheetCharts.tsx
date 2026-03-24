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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Row 1, Col 1: Revenue Trend (Area) */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-gray-800">Revenue Trend (Last {days} Days)</h3>
          {timeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#6B7280' }} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  interval="preserveStartEnd" 
                />
                <YAxis 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#6B7280' }} 
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ fontSize: '16px', fontWeight: 'bold', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  formatter={(v: number) => [fmtINR(v), "Total Revenue"]} 
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#0D9488" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#0D9488' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No sales trend data</div>
          )}
        </div>

        {/* Row 1, Col 2: Revenue by State (Bar) */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-gray-800">Sales by State (Top 10)</h3>
          {byState.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byState} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fontWeight: 600, fill: '#6B7280' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="state" width={120} tick={{ fontSize: 14, fontWeight: 700, fill: '#374151' }} />
                <Tooltip formatter={(v: number) => fmtINR(v)} />
                <Bar dataKey="total" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No state data</div>
          )}
        </div>

        {/* Row 2, Col 1: Revenue by Publisher (Bar) */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-gray-800">Sales by Publisher (Top 10)</h3>
          {byPub.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byPub} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fontWeight: 600, fill: '#6B7280' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="publisher" width={120} tick={{ fontSize: 12, fontWeight: 700, fill: '#374151' }} tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} />
                <Tooltip formatter={(v: number) => fmtINR(v)} />
                <Bar dataKey="total" fill="#F59E0B" radius={[0, 8, 8, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No publisher data</div>
          )}
        </div>

        {/* Row 2, Col 2: Top Customers (Bar) */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold text-gray-800">Top 10 Customers</h3>
          {byCustomer.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCustomer} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fontWeight: 600, fill: '#6B7280' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="customerName" width={120} tick={{ fontSize: 12, fontWeight: 700, fill: '#374151' }} tickFormatter={(v) => v.length > 15 ? v.substring(0, 15) + '...' : v} />
                <Tooltip formatter={(v: number) => fmtINR(v)} />
                <Bar dataKey="total" fill="#8B5CF6" radius={[0, 8, 8, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No customer data</div>
          )}
        </div>

      </div>

      {/* Full width: Top Items Table-Chart */}
      <div className="rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-xl font-bold text-gray-800">Top 10 Best Selling Items</h3>
        {topItems.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={topItems} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="title" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
              <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: '#6B7280' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmtINR(v)} />
              <Bar dataKey="total" fill="#10B981" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 12, fontWeight: 'bold' }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-gray-400 font-medium">No item data</div>
        )}
      </div>
    </div>
  );
}
