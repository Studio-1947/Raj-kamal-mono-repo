import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { OfflineSheetSummaryResponse } from './offlineSheetTypes';

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function fmtChartAxis(v: number): string {
  const absV = Math.abs(v);
  if (absV === 0) return '₹0';
  if (absV < 1000) return `₹${v}`;
  if (absV < 100000) return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${(v / 1000).toFixed(0)}k`;
}

// Solid black for absolute legibility
const TEXT_COL = '#000000'; 
const BOLD_TEXT = { fontSize: 13, fontWeight: 500, fill: TEXT_COL };

// ─── Custom Tooltip (Black Text) ───────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, title }: any) => {
  if (active && payload && payload.length) {
    const originalData = payload[0]?.payload;
    return (
      <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-xl ring-2 ring-black/5">
        <p className="mb-2 text-base font-medium text-black uppercase tracking-widest border-b border-gray-100 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xl font-medium" style={{ color: entry.color || '#000000' }}>
            {title || entry.name}: {fmtINR(entry.value)}
          </p>
        ))}
        {originalData?.qty ? (
          <p className="mt-1 text-sm font-medium text-gray-700">
            Total Quantity: {originalData.qty.toLocaleString('en-IN')} Units
          </p>
        ) : null}
        {originalData?.rate ? (
          <p className="mt-1 text-sm font-medium text-gray-700">
            Book Rate: {fmtINR(originalData.rate)}
          </p>
        ) : null}
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

// ─── Sortable Wrapper Component ─────────────────────────────────────────────
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function SortableItem({ id, children, className }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative group ${className || ''} ${isDragging ? 'opacity-20 z-50' : ''}`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="absolute right-4 top-4 z-20 cursor-grab rounded-lg bg-gray-50 p-2 text-gray-400 opacity-0 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-900 group-hover:opacity-100 active:cursor-grabbing"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="5" r="1.25" fill="currentColor"/><circle cx="9" cy="12" r="1.25" fill="currentColor"/><circle cx="9" cy="19" r="1.25" fill="currentColor"/>
          <circle cx="15" cy="5" r="1.25" fill="currentColor"/><circle cx="15" cy="12" r="1.25" fill="currentColor"/><circle cx="15" cy="19" r="1.25" fill="currentColor"/>
        </svg>
      </div>
      {children}
    </div>
  );
}

interface Props {
  data?: OfflineSheetSummaryResponse;
  isLoading: boolean;
  days: number;
}

const DEFAULT_ORDER = [
  'revenue-trend',
  'sales-by-state',
  'sales-by-publisher',
  'top-customers',
  'sales-by-binding',
  'top-items',
  'bottom-items'
];

export default function OfflineSheetCharts({ data, isLoading, days }: Props) {
  const [items, setItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('rk_offline_charts_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all default items are present, handle migration
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_ORDER.length) return parsed;
      } catch (e) {}
    }
    return DEFAULT_ORDER;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const nextOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('rk_offline_charts_order', JSON.stringify(nextOrder));
        return nextOrder;
      });
    }
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton title="Revenue Trend" />
        <ChartSkeleton title="Top 10 States" />
        <ChartSkeleton title="Top 10 Publishers" />
        <ChartSkeleton title="Top 10 Customers" />
        <ChartSkeleton title="Sales by Binding" />
      </div>
    );
  }

  const timeSeries = data.timeSeries ?? [];
  const topItems   = data.topItems   ?? [];
  const bottomItems = data.bottomItems ?? [];
  const byState    = data.revenueByState ?? [];
  const byPub      = data.revenueByPublisher ?? [];
  const byBinding  = data.revenueByBinding ?? [];
  const byCustomer = data.topCustomers ?? [];

  const renderChart = (id: string) => {
    switch (id) {
      case 'revenue-trend':
        return (
          <div className="h-full rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="mb-4 text-xl font-medium text-black border-b-4 border-teal-500 pb-2 inline-block">Revenue Trend (Last {days} Days)</h3>
            {timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeries} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tick={BOLD_TEXT} 
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                    tickLine={{ stroke: '#000000', strokeWidth: 2 }}
                    dy={10}
                    minTickGap={50}
                    tickFormatter={(val) => {
                      const date = new Date(val);
                      return isNaN(date.getTime()) ? val : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis 
                    tick={BOLD_TEXT} 
                    tickFormatter={fmtChartAxis} 
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                    tickLine={{ stroke: '#000000', strokeWidth: 2 }}
                  />
                  <Tooltip content={<CustomTooltip title="Revenue" />} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#0D9488" 
                    strokeWidth={5} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    dot={false}
                    activeDot={{ r: 10, strokeWidth: 0, fill: '#0D9488' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-black font-medium">No sales trend data</div>
            )}
          </div>
        );
      case 'sales-by-state':
        return (
          <div className="h-full rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="mb-4 text-xl font-medium text-black border-b-4 border-blue-500 pb-2 inline-block">Sales by State (Top 10)</h3>
            {byState.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={byState} layout="vertical" margin={{ left: 20, right: 40, top: 30, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} axisLine={{ stroke: '#000000', strokeWidth: 2 }} />
                  <YAxis 
                    type="category" 
                    dataKey="state" 
                    width={140} 
                    tick={{ fontSize: 13, fontWeight: 500, fill: TEXT_COL }} 
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }} 
                    interval={0}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total Revenue" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-black font-medium">No state data</div>
            )}
          </div>
        );
      case 'sales-by-publisher':
        return (
          <div className="h-full rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="mb-4 text-xl font-medium text-black border-b-4 border-orange-500 pb-2 inline-block">Sales by Publisher (Top 10)</h3>
            {byPub.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={byPub} layout="vertical" margin={{ left: 20, right: 40, top: 30, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} axisLine={{ stroke: '#000000', strokeWidth: 2 }} />
                  <YAxis 
                    type="category" 
                    dataKey="publisher" 
                    width={140} 
                    tick={{ fontSize: 13, fontWeight: 500, fill: TEXT_COL }} 
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }} 
                    interval={0}
                    tickFormatter={(v) => v.length > 20 ? v.substring(0, 18) + '...' : v} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total Revenue" fill="#F59E0B" radius={[0, 8, 8, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-black font-medium">No publisher data</div>
            )}
          </div>
        );
      case 'top-customers':
        return (
          <div className="h-full rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="mb-4 text-xl font-medium text-black border-b-4 border-purple-500 pb-2 inline-block">Top 10 Customers</h3>
            {byCustomer.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={byCustomer} layout="vertical" margin={{ left: 20, right: 40, top: 30, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} axisLine={{ stroke: '#000000', strokeWidth: 2 }} />
                  <YAxis 
                    type="category" 
                    dataKey="customerName" 
                    width={140} 
                    tick={{ fontSize: 13, fontWeight: 500, fill: TEXT_COL }} 
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }} 
                    interval={0}
                    tickFormatter={(v) => v.length > 20 ? v.substring(0, 18) + '...' : v} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total Revenue" fill="#8B5CF6" radius={[0, 8, 8, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-black font-medium">No customer data</div>
            )}
          </div>
        );
      case 'sales-by-binding':
        return (
          <div className="h-full rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="mb-4 text-xl font-medium text-black border-b-4 border-pink-500 pb-2 inline-block">Sales by Binding</h3>
            {byBinding.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byBinding} layout="vertical" margin={{ left: 20, right: 40, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} axisLine={{ stroke: '#000000', strokeWidth: 2 }} />
                  <YAxis 
                    type="category" 
                    dataKey="binding" 
                    width={140} 
                    tick={{ fontSize: 13, fontWeight: 500, fill: TEXT_COL }} 
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }} 
                    interval={0}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total Revenue" fill="#EC4899" radius={[0, 8, 8, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-black font-medium">No binding data</div>
            )}
          </div>
        );
      case 'top-items':
        return (
          <div className="h-full rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="mb-2 text-xl font-medium text-black border-b-4 border-green-500 pb-2 inline-block">Top 10 Best Selling Items</h3>
            <p className="mb-4 text-sm text-gray-500">
              <span className="italic">Note: Items labeled "[No Title]" are records missing a Title in source data. ISBN/Doc No are shown for identification.</span>
            </p>
            {topItems.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, topItems.length * 42)}>
                <BarChart data={topItems} layout="vertical" margin={{ left: 20, right: 60, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={BOLD_TEXT} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: '#000000', strokeWidth: 2 }} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={200}
                    tick={{ fontSize: 12, fontWeight: 500, fill: TEXT_COL }}
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                    interval={0}
                    tickFormatter={(v) => v.length > 30 ? v.substring(0, 28) + '…' : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total Revenue" fill="#10B981" radius={[0, 8, 8, 0]} barSize={22}
                    label={{ position: 'right', fontSize: 12, fontWeight: 600, fill: TEXT_COL, formatter: (v: any) => fmtChartAxis(Number(v)) }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-black font-medium">No item data</div>
            )}
          </div>
        );
      case 'bottom-items':
        return (
          <div className="h-full rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="mb-2 text-xl font-medium text-black border-b-4 border-red-400 pb-2 inline-block">Bottom 10 Worst Performing Items</h3>
            <p className="mb-4 text-sm text-gray-500">
              Books with the lowest total revenue. <span className="italic">[No Title] entries are identifying records with missing title data.</span>
            </p>
            {bottomItems.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, bottomItems.length * 42)}>
                <BarChart data={bottomItems} layout="vertical" margin={{ left: 20, right: 60, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis 
                    type="number" 
                    tick={BOLD_TEXT} 
                    tickFormatter={fmtChartAxis} 
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                    domain={[ (dataMin: number) => Math.min(0, dataMin) * 1.1, (dataMax: number) => Math.max(0, dataMax) * 1.1 ]}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={200}
                    tick={{ fontSize: 12, fontWeight: 500, fill: TEXT_COL }}
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                    interval={0}
                    tickFormatter={(v) => v.length > 30 ? v.substring(0, 28) + '…' : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="total" 
                    name="Total Revenue" 
                    fill="#EF4444" 
                    radius={[0, 8, 8, 0]} 
                    barSize={22}
                    label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      const isNegative = value < 0;
                      const labelX = isNegative ? x - 5 : x + width + 5;
                      const textAnchor = isNegative ? 'end' : 'start';
                      return (
                        <text 
                          x={labelX} 
                          y={y + height / 2} 
                          dy={4} 
                          fill={TEXT_COL} 
                          fontSize={12} 
                          fontWeight={600} 
                          textAnchor={textAnchor}
                        >
                          {fmtChartAxis(Number(value))}
                        </text>
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-100 text-lg text-black font-medium">No item data</div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={items}
        strategy={rectSortingStrategy}
      >
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {items.map((id) => {
            // Determine if the chart should be full width (last two usually are)
            const isFullWidth = id === 'top-items' || id === 'bottom-items';
            return (
              <SortableItem key={id} id={id} className={isFullWidth ? 'lg:col-span-2' : ''}>
                {renderChart(id)}
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
