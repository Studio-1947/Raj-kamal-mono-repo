import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { OfflineSheetSummaryResponse, OfflineSheetFilters } from './offlineSheetTypes';
import { apiClient } from '../../../lib/apiClient';
import { useOfflineSheetOptions } from './offlineSheetService';

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
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
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

const TEXT_COL = '#000000'; 
const BOLD_TEXT = { fontSize: 13, fontWeight: 500, fill: TEXT_COL };

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
          <p className="mt-1 text-sm font-medium text-gray-700">Quantity: {originalData.qty.toLocaleString('en-IN')}</p>
        ) : null}
      </div>
    );
  }
  return null;
};

// ─── Block Filter Components ────────────────────────────────────────────────

function BlockFilterField({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : (type === 'number' ? Number(e.target.value) : e.target.value))}
        className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-black focus:border-teal-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
      />
    </div>
  );
}

function BlockFilterDropdown({ label, value, onChange, placeholder, options = [] }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: string) => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{label}</label>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={isOpen ? search : (value ?? '')}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
             if (e.key === 'Enter' && search) {
                onChange(search);
                setIsOpen(false);
             }
          }}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-black focus:border-teal-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-300 pr-6"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-48 overflow-auto rounded-xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-200">
          {filteredOptions.length > 0 ? (
            filteredOptions.slice(0, 100).map((opt: string, i: number) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-black hover:bg-teal-50 hover:text-teal-700 transition-colors border-b border-gray-50 last:border-0"
              >
                {opt}
              </button>
            ))
          ) : (
             <div className="px-3 py-2 text-xs text-gray-400 italic text-center">No matches found</div>
          )}
          {search && !filteredOptions.includes(search) && (
            <button 
               type="button"
               onMouseDown={() => { onChange(search); setIsOpen(false); }}
               className="w-full px-3 py-2 text-left text-[10px] font-bold text-black bg-teal-50/50 hover:bg-teal-100 uppercase tracking-tight sticky bottom-0 border-t border-teal-100"
            >
              Use Custom: "{search}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chart Block Component ──────────────────────────────────────────────────
interface ChartBlockProps {
  id: string;
  title: string;
  globalFilters: OfflineSheetFilters;
  render: (data: OfflineSheetSummaryResponse) => React.ReactNode;
}

function ChartBlock({ id, title, globalFilters, render }: ChartBlockProps) {
  const [localFilters, setLocalFilters] = useState<OfflineSheetFilters>(() => {
    const saved = localStorage.getItem(`rk_chart_filters_${id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { days: globalFilters.days || 90 };
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [data, setData] = useState<OfflineSheetSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: optData } = useOfflineSheetOptions();

  useEffect(() => {
    async function fetchChart() {
      setLoading(true);
      try {
        const p = new URLSearchParams();
        Object.entries(localFilters).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== null) p.set(k, String(v));
        });
        const resp = await apiClient.get<OfflineSheetSummaryResponse>(`offline-sales/summary?${p.toString()}`);
        setData(resp);
        localStorage.setItem(`rk_chart_filters_${id}`, JSON.stringify(localFilters));
      } catch (e) {
        console.error(`Failed to fetch chart ${id}`, e);
      } finally {
        setLoading(false);
      }
    }
    fetchChart();
  }, [id, localFilters]);

  const updateF = (key: keyof OfflineSheetFilters, val: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: val }));
  };

  const activeFilterCount = Object.entries(localFilters).filter(([k, v]) => k !== 'days' && v !== undefined && v !== '').length;

  return (
    <div className="flex flex-col h-full rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm hover:border-teal-500/30 hover:shadow-xl transition-all duration-300 relative group/block">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-medium text-black border-b-4 border-teal-500 pb-1 inline-block uppercase tracking-tight">{title}</h3>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
              {activeFilterCount} ACTIVE FILTERS
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Days Selector */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-1 border border-gray-100">
            {[30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => updateF('days', d)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  localFilters.days === d
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-gray-500 hover:bg-white hover:text-teal-600'
                }`}
              >
                {d === 30 ? '1M' : d === 90 ? '3M' : d === 180 ? '6M' : '1Y'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`rounded-xl border-2 p-2 transition-all ${
              isFilterOpen ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-100 bg-white text-gray-400 hover:border-teal-300 hover:text-teal-600'
            }`}
            title="Drill-down filters"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Advanced Block Filters */}
      <div className={`overflow-hidden transition-all duration-300 ${isFilterOpen ? 'max-h-[500px] mb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="rounded-xl border-2 border-teal-100 bg-teal-50/30 p-4 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
          <BlockFilterDropdown label="Book Name" value={localFilters.title} onChange={(v:any) => updateF('title', v)} placeholder="Filter Title..." options={optData?.bookTitles} />
          <BlockFilterDropdown label="Customer" value={localFilters.customerName} onChange={(v:any) => updateF('customerName', v)} placeholder="Search name..." options={optData?.customerNames} />
          <BlockFilterDropdown label="Publisher" value={localFilters.publisher} onChange={(v:any) => updateF('publisher', v)} placeholder="All publishers" options={optData?.publishers} />
          <BlockFilterDropdown label="State" value={localFilters.state} onChange={(v:any) => updateF('state', v)} placeholder="e.g. Delhi" options={optData?.states} />
          <BlockFilterDropdown label="Binding" value={localFilters.binding} onChange={(v:any) => updateF('binding', v)} placeholder="All bindings" options={optData?.bindings} />
          <BlockFilterField label="ISBN" value={localFilters.isbn} onChange={(v:any) => updateF('isbn', v)} placeholder="Code..." />
          <div className="flex gap-2 items-end">
             <div className="flex-1"><BlockFilterField label="Min ₹" type="number" value={localFilters.minAmount} onChange={(v:any) => updateF('minAmount', v)} /></div>
             <div className="flex-1"><BlockFilterField label="Max ₹" type="number" value={localFilters.maxAmount} onChange={(v:any) => updateF('maxAmount', v)} /></div>
          </div>
          <div className="col-span-full pt-2 flex justify-between items-center border-t border-teal-100">
             <button onClick={() => setLocalFilters({ days: 90 })} className="text-[10px] font-bold text-red-600 uppercase hover:underline">Reset Block Filters</button>
             <button onClick={() => setIsFilterOpen(false)} className="text-[10px] font-bold text-teal-700 uppercase hover:underline text-right">Close Panel ↑</button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[300px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : data ? (
          render(data)
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">No data found with individual block filters</div>
        )}
      </div>
    </div>
  );
}

// ─── Sortable Wrapper Component ─────────────────────────────────────────────
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isStretched: boolean;
  onToggleStretch: (id: string) => void;
}

function SortableItem({ id, children, className, isStretched, onToggleStretch }: SortableItemProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative group ${className || ''} ${isDragging ? 'opacity-20 z-50' : ''}`}>
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStretch(id); }}
          className="rounded-lg bg-white/90 p-2 text-gray-500 shadow-lg backdrop-blur-md transition-all hover:bg-white hover:text-teal-600 border border-gray-200"
        >
          {isStretched ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6v6M10 14l-6 6M20 10h-6V4M14 10l6-6"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M21 3l-6 6M9 21H3v-6M3 21l6-6"/></svg>
          )}
        </button>
        <div {...attributes} {...listeners} className="cursor-grab rounded-lg bg-white/90 p-2 text-gray-400 shadow-lg backdrop-blur-md border border-gray-200">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="9" cy="5" r="1.25" fill="currentColor"/><circle cx="9" cy="12" r="1.25" fill="currentColor"/><circle cx="9" cy="19" r="1.25" fill="currentColor"/>
            <circle cx="15" cy="5" r="1.25" fill="currentColor"/><circle cx="15" cy="12" r="1.25" fill="currentColor"/><circle cx="15" cy="19" r="1.25" fill="currentColor"/>
          </svg>
        </div>
      </div>
      {children}
    </div>
  );
}

interface Props {
  filters: OfflineSheetFilters;
}

const DEFAULT_ORDER = ['revenue-trend', 'sales-by-state', 'sales-by-publisher', 'top-customers', 'sales-by-binding', 'top-items', 'bottom-items'];

export default function OfflineSheetCharts({ filters: globalFilters }: Props) {
  const [items, setItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('rk_offline_charts_order');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_ORDER.length) return parsed;
      } catch {}
    }
    return DEFAULT_ORDER;
  });

  const [stretchedItems, setStretchedItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('rk_offline_charts_stretched');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return ['revenue-trend', 'top-items', 'bottom-items']; 
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

  function toggleStretch(id: string) {
    setStretchedItems((prev) => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('rk_offline_charts_stretched', JSON.stringify(next));
      return next;
    });
  }

  const chartConfigs: Record<string, { title: string; render: (data: OfflineSheetSummaryResponse) => React.ReactNode }> = {
    'revenue-trend': {
      title: 'Revenue Trend',
      render: (data) => (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.timeSeries || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs><linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0D9488" stopOpacity={0.3}/><stop offset="95%" stopColor="#0D9488" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={BOLD_TEXT} minTickGap={50} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
            <YAxis tick={BOLD_TEXT} tickFormatter={fmtChartAxis} />
            <Tooltip content={<CustomTooltip title="Revenue" />} />
            <Area type="monotone" dataKey="total" stroke="#0D9488" strokeWidth={4} fill="url(#colorTrend)" dot={false} activeDot={{ r: 8 }} />
          </AreaChart>
        </ResponsiveContainer>
      )
    },
    'sales-by-state': {
      title: 'Sales by State',
      render: (data) => (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.revenueByState || []} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} />
            <YAxis type="category" dataKey="state" width={120} tick={BOLD_TEXT} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )
    },
    'sales-by-publisher': {
      title: 'Sales by Publisher',
      render: (data) => (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.revenueByPublisher || []} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} />
            <YAxis type="category" dataKey="publisher" width={120} tick={BOLD_TEXT} tickFormatter={(v) => v.length > 15 ? v.substring(0, 13) + '..' : v} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )
    },
    'top-customers': {
      title: 'Top 10 Customers',
      render: (data) => (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.topCustomers || []} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} />
            <YAxis type="category" dataKey="customerName" width={120} tick={BOLD_TEXT} tickFormatter={(v) => v.length > 15 ? v.substring(0, 13) + '..' : v} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )
    },
    'sales-by-binding': {
      title: 'Sales by Binding',
      render: (data) => (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.revenueByBinding || []} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} />
            <YAxis type="category" dataKey="binding" width={100} tick={BOLD_TEXT} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#EC4899" radius={[0, 4, 4, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      )
    },
    'top-items': {
      title: 'Top Selling Items',
      render: (data) => (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.topItems || []} layout="vertical" margin={{ left: 20, right: 60 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} />
            <YAxis type="category" dataKey="title" width={180} tick={{ fontSize: 11, fontWeight: 500 }} tickFormatter={(v) => v.length > 25 ? v.substring(0, 23) + '..' : v} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 10, fontWeight: 600, formatter: (v: any) => fmtChartAxis(Number(v)) }} />
          </BarChart>
        </ResponsiveContainer>
      )
    },
    'bottom-items': {
      title: 'Least Selling Items',
      render: (data) => (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.bottomItems || []} layout="vertical" margin={{ left: 20, right: 60 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} />
            <YAxis type="category" dataKey="title" width={180} tick={{ fontSize: 11, fontWeight: 500 }} tickFormatter={(v) => v.length > 25 ? v.substring(0, 23) + '..' : v} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 10, fontWeight: 600, formatter: (v: any) => fmtChartAxis(Number(v)) }} />
          </BarChart>
        </ResponsiveContainer>
      )
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
          {items.map((id) => {
            const config = chartConfigs[id];
            if (!config) return null;
            const isStretched = stretchedItems.includes(id);
            return (
              <SortableItem key={id} id={id} isStretched={isStretched} onToggleStretch={toggleStretch} className={isStretched ? 'lg:col-span-2' : ''}>
                <ChartBlock id={id} title={config.title} globalFilters={globalFilters} render={config.render} />
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
