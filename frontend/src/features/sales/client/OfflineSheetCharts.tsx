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
import { useOfflineSheetOptions, useOfflineSheetDailyDetails } from './offlineSheetService';

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

const TEXT_COL = '#64748B'; 
const BOLD_TEXT = { fontSize: 11, fontWeight: 400, fill: TEXT_COL };

const CustomTooltip = ({ active, payload, label, title }: any) => {
  if (active && payload && payload.length) {
    const originalData = payload[0]?.payload;
    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-5 shadow-2xl ring-4 ring-black/5 select-none min-w-[240px] animate-in zoom-in-95 duration-200">
        <div className="mb-3 border-b border-gray-100 pb-2">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[220px]">
            {originalData.date && !isNaN(new Date(originalData.date).getTime())
              ? new Date(originalData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : (label || title || "Details")}
          </p>
        </div>
        
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex flex-col">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tight">{title || entry.name}</span>
            <p className="text-2xl font-medium text-black leading-none mt-0.5">
              {fmtINR(entry.value)}
            </p>
          </div>
        ))}

        {originalData?.qty ? (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-[10px] font-medium text-gray-400 uppercase">Volume</span>
            <span className="text-sm font-medium text-black">{originalData.qty.toLocaleString('en-IN')} units</span>
          </div>
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
        <div className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-56 overflow-y-auto overflow-x-hidden rounded-xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-200 custom-scrollbar">
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

// ─── Daily Details Panel ────────────────────────────────────────────────────
function DailyDetailsPanel({ date, filters, onApplyGlobal, onClose, onDateChange }: { date: string; filters: OfflineSheetFilters; onApplyGlobal?: (s: string, e: string) => void; onClose: () => void; onDateChange?: (d: string) => void }) {
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Local states for the Date Range mode
  const [localStart, setLocalStart] = useState<string>('');
  const [localEnd, setLocalEnd] = useState<string>('');

  useEffect(() => {
    if (filters.startDate) setLocalStart(filters.startDate);
    else if (filters.days) setLocalStart(new Date(Date.now() - filters.days * 86400000).toISOString());
    else setLocalStart(new Date('2026-01-01T00:00:00.000Z').toISOString());
    
    if (filters.endDate) setLocalEnd(filters.endDate);
    else setLocalEnd(new Date().toISOString());
  }, [filters]);

  const actualDate = mode === 'single' ? date : null;
  
  const panelFilters = { ...filters };
  if (mode === 'range') {
     panelFilters.startDate = localStart || undefined;
     panelFilters.endDate = localEnd || undefined;
     delete panelFilters.days;
  }

  const { data: details, isLoading } = useOfflineSheetDailyDetails(panelFilters, actualDate, true);

  const totalRev = details?.items?.reduce((acc, it) => acc + it.total, 0) || 0;
  const totalQty = details?.items?.reduce((acc, it) => acc + it.qty, 0) || 0;

  const wrapperClass = isFullScreen 
    ? "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
    : "flex flex-col h-full border-l border-gray-100 bg-gray-50/50 overflow-hidden animate-in slide-in-from-right-4 duration-500 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]";

  const containerClass = isFullScreen
    ? "w-full max-w-6xl max-h-[90vh] flex flex-col bg-gray-50 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200"
    : "flex flex-col h-full w-full";

  return (
    <div 
      className={wrapperClass}
      onClick={(e) => {
        if (isFullScreen && e.target === e.currentTarget) setIsFullScreen(false);
      }}
    >
      <div className={containerClass}>
        <div className="border-b border-gray-200 bg-white p-5 sm:p-6 shrink-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">{mode === 'single' ? 'Daily Summary' : 'Range Summary'}</h4>
              {mode === 'single' ? (
                <div className="relative group min-h-[30px]">
                  <p className="text-sm font-semibold text-black flex items-center gap-2">
                    {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M17 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM16 2v2M8 2v2M3 7h18"/></svg>
                  </p>
                  <input 
                    type="date" 
                    value={new Date(date).toISOString().split('T')[0]} 
                    onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }}
                    onChange={(e) => {
                      const newD = e.target.value;
                      if (newD && onDateChange) onDateChange(new Date(newD).toISOString());
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              ) : (
                <div className="min-h-[30px] flex items-center gap-2">
                  <input 
                    type="date" 
                    value={localStart ? new Date(localStart).toISOString().split('T')[0] : ''} 
                    onChange={e => setLocalStart(e.target.value ? new Date(e.target.value).toISOString() : '')} 
                    className="w-[105px] border-b-2 border-teal-400 bg-teal-50 px-1 py-0.5 rounded-t text-xs font-semibold text-teal-900 focus:outline-none cursor-pointer hover:bg-teal-100 transition-colors"
                    onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }}
                    title="Start Date"
                  />
                  <span className="text-gray-300 font-bold text-xs">→</span>
                  <input 
                    type="date" 
                    value={localEnd ? new Date(localEnd).toISOString().split('T')[0] : ''} 
                    onChange={e => setLocalEnd(e.target.value ? new Date(e.target.value).toISOString() : '')} 
                    className="w-[105px] border-b-2 border-teal-400 bg-teal-50 px-1 py-0.5 rounded-t text-xs font-semibold text-teal-900 focus:outline-none cursor-pointer hover:bg-teal-100 transition-colors"
                    onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }}
                    title="End Date"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsFullScreen(!isFullScreen); }} 
                className="rounded-full bg-gray-100 p-1.5 text-gray-400 hover:text-black hover:bg-gray-200 transition-all" 
                title={isFullScreen ? "Close modal view" : "Expand to full screen modal"}
              >
                {isFullScreen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 13h3a2 2 0 0 1 2 2v3"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                )}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="rounded-full bg-gray-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" 
                title="Close panel entirely"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <div className="flex bg-gray-100 p-0.5 rounded-lg w-max mb-4 mt-1">
            <button onClick={() => setMode('single')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all tracking-wider ${mode === 'single' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-black'}`}>Single Day</button>
            <button onClick={() => setMode('range')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all tracking-wider ${mode === 'range' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-black'}`}>Date Range</button>
          </div>

          {!isLoading && (
            <div className={`flex gap-4 ${isFullScreen ? 'max-w-xl' : ''}`}>
              <div className="flex-1 rounded-xl bg-teal-600 px-3 py-2 text-white shadow-inner">
                <span className="text-[9px] font-medium uppercase opacity-80 block mb-0.5">Revenue</span>
                <p className="text-base font-semibold leading-none">{fmtINR(totalRev)}</p>
              </div>
              <div className="flex-1 rounded-xl bg-black px-3 py-2 text-white shadow-inner">
                <span className="text-[9px] font-medium uppercase opacity-80 block mb-0.5">Units</span>
                <p className="text-base font-semibold leading-none">{totalQty.toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-auto custom-scrollbar min-h-0 ${isFullScreen ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-gray-50/50 p-6 sm:p-8 auto-rows-max items-start content-start' : 'p-4 space-y-3'}`}>
          {isLoading ? (
            <div className={`flex h-32 items-center justify-center ${isFullScreen ? 'col-span-full' : ''}`}>
               <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
          ) : details?.items?.length ? (
            details.items.map((it, i) => (
               <div key={i} className={`rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow ${isFullScreen ? 'p-5' : 'p-3'}`}>
                  <div className="flex justify-between items-start gap-3 mb-1.5 min-h-[34px]">
                     <p className={`font-medium text-black leading-tight line-clamp-2 ${isFullScreen ? 'text-sm' : 'text-[11px]'}`}>{it.title}</p>
                     <span className={`shrink-0 rounded bg-gray-100 font-medium text-black ${isFullScreen ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'}`}>×{it.qty}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-50 pt-2 mt-2">
                     <p className={`font-medium text-gray-400 uppercase truncate ${isFullScreen ? 'text-[10px] max-w-[200px]' : 'text-[9px] max-w-[120px]'}`} title={it.publisher}>{it.publisher}</p>
                     <p className={`font-semibold text-teal-600 ${isFullScreen ? 'text-sm' : 'text-[11px]'}`}>{fmtINR(it.total)}</p>
                  </div>
               </div>
            ))
          ) : (
            <p className={`text-center text-[10px] font-medium text-gray-300 py-10 uppercase italic ${isFullScreen ? 'col-span-full' : ''}`}>No sales records</p>
          )}
        </div>

        {onApplyGlobal && !isLoading && details?.items?.length && (
           <div className="p-4 sm:p-5 bg-white border-t border-gray-200 mt-auto shrink-0">
              <button 
                onClick={() => {
                  if (mode === 'single') {
                    const d = new Date(date);
                    onApplyGlobal(new Date(d.setUTCHours(0,0,0,0)).toISOString(), new Date(d.setUTCHours(23,59,59,999)).toISOString());
                  } else {
                    onApplyGlobal(localStart || new Date(0).toISOString(), localEnd || new Date().toISOString());
                  }
                  if (isFullScreen) setIsFullScreen(false);
                }}
                className="w-full rounded-xl bg-teal-600 py-3 text-[10px] font-semibold text-white hover:bg-teal-700 transition-all uppercase tracking-widest shadow-md"
              >
                Analyze Dashboard With Picked Dates
              </button>
           </div>
        )}
      </div>
    </div>
  );
}

// ─── Revenue Trend Chart Component ──────────────────────────────────────────
function RevenueTrendChart({ data, globalFilters, onApplyGlobal }: { data: OfflineSheetSummaryResponse; globalFilters: OfflineSheetFilters; onApplyGlobal?: (s: string, e: string) => void }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const latestDate = data.timeSeries && data.timeSeries.length > 0 
    ? data.timeSeries[data.timeSeries.length - 1].date 
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Interactive Analysis</p>
        <button 
          onClick={() => {
            if (latestDate) setSelectedDate(latestDate);
          }}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-teal-700 active:scale-95"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Daily Summary
        </button>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className={`flex flex-col transition-all duration-500 ${selectedDate ? 'lg:w-[60%] w-full' : 'w-full'} p-4`}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart 
              data={data.timeSeries || []} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onClick={(e: any) => { 
                if (e?.activePayload?.[0]) setSelectedDate(e.activePayload[0].payload.date);
              }}
              style={{ cursor: 'pointer' }}
            >
              <defs><linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0D9488" stopOpacity={0.25}/><stop offset="95%" stopColor="#0D9488" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.06} />
              <XAxis dataKey="date" tick={BOLD_TEXT} minTickGap={60} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} stroke="#E5E7EB" />
              <YAxis tick={BOLD_TEXT} tickFormatter={fmtChartAxis} stroke="#E5E7EB" />
              <Tooltip 
                content={<CustomTooltip title="Revenue" />} 
                wrapperStyle={{ pointerEvents: 'auto', outline: 'none' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#0D9488" 
                strokeWidth={4} 
                fill="url(#colorTrend)" 
                dot={false}
                activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: '#0D9488' }} 
              />
            </AreaChart>
          </ResponsiveContainer>
          {selectedDate && <div className="mt-4 text-center lg:hidden"><button onClick={() => setSelectedDate(null)} className="text-[10px] font-bold text-gray-400 uppercase underline">Close Details ↑</button></div>}
        </div>

        {selectedDate && (
          <div className="lg:w-[40%] w-full h-[400px] lg:h-auto border-l border-gray-100 flex-shrink-0 relative overflow-hidden">
            <div className="absolute inset-0">
              <DailyDetailsPanel 
                 date={selectedDate} 
                 filters={globalFilters} 
                 onClose={() => setSelectedDate(null)} 
                 onApplyGlobal={onApplyGlobal} 
                 onDateChange={setSelectedDate} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chart Block Component ──────────────────────────────────────────────────
interface ChartBlockProps {
  id: string;
  title: string;
  globalFilters: OfflineSheetFilters;
  render: (data: OfflineSheetSummaryResponse) => React.ReactNode;
  resetVersion?: number;
}

function ChartBlock({ id, title, globalFilters, render, resetVersion }: ChartBlockProps) {
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
  const initialResetVersion = React.useRef(resetVersion);

  useEffect(() => {
    if (resetVersion !== undefined && resetVersion > (initialResetVersion.current || 0)) {
       setLocalFilters({ days: 90 });
       localStorage.removeItem(`rk_chart_filters_${id}`);
       initialResetVersion.current = resetVersion;
    }
  }, [resetVersion, id]);

  const { data: optData } = useOfflineSheetOptions();

  useEffect(() => {
    async function fetchChart() {
      setLoading(true);
      try {
        const p = new URLSearchParams();
        // 1. Start with global filters
        Object.entries(globalFilters).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== null && k !== 'page' && k !== 'limit') {
            // Ignore global date bounds if block is using 'days'
            if ((k === 'startDate' || k === 'endDate') && localFilters.days !== undefined) return;
            // Ignore global 'days' if block is using explicit custom dates
            if (k === 'days' && (localFilters.startDate !== undefined || localFilters.endDate !== undefined)) return;
            p.set(k, String(v));
          }
        });
        // 2. Overlay local filters (overrides)
        Object.entries(localFilters).forEach(([k, v]) => {
          // If a local override is empty string or explicit null, we should delete the global one.
          // Since we already set globals, if local is undefined we just skip it unless we need to explicitly delete.
          if (v !== undefined && v !== '' && v !== null) {
            p.set(k, String(v));
          } else if (v === '' || v === undefined) {
             p.delete(k); // Allow local to clear global
          }
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
  }, [id, localFilters, globalFilters]);

  const updateF = (key: keyof OfflineSheetFilters, val: any) => {
    setLocalFilters(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'startDate' || key === 'endDate') {
        delete next.days;
      }
      if (key === 'days') {
        delete next.startDate;
        delete next.endDate;
      }
      return next;
    });
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
            {(localFilters.startDate || localFilters.endDate) && (
              <span className="px-2 py-1 text-[10px] font-bold text-teal-600 uppercase tracking-tight bg-teal-50 rounded-lg border border-teal-100">Custom</span>
            )}
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
          <BlockFilterDropdown label="City" value={localFilters.city} onChange={(v:any) => updateF('city', v)} placeholder="e.g. Mumbai" options={optData?.cities} />
          <BlockFilterDropdown label="Binding" value={localFilters.binding} onChange={(v:any) => updateF('binding', v)} placeholder="All bindings" options={optData?.bindings} />
          <BlockFilterField label="ISBN" value={localFilters.isbn} onChange={(v:any) => updateF('isbn', v)} placeholder="Code..." />
          <div className="flex gap-2 items-end">
             <div className="flex-1"><BlockFilterField label="Min ₹" type="number" value={localFilters.minAmount} onChange={(v:any) => updateF('minAmount', v)} /></div>
             <div className="flex-1"><BlockFilterField label="Max ₹" type="number" value={localFilters.maxAmount} onChange={(v:any) => updateF('maxAmount', v)} /></div>
          </div>
          <div className="col-span-full flex flex-col gap-1.5 mt-1 pt-3 border-t border-teal-100/50">
             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Custom Date Range</label>
             <div className="flex items-center gap-2">
               <input 
                 type="date" 
                 className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-black focus:border-teal-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-300 cursor-pointer" 
                 value={localFilters.startDate ? new Date(localFilters.startDate).toISOString().split('T')[0] : ''} 
                 onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }}
                 onChange={(e) => updateF('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} 
               />
               <span className="text-gray-400 font-bold text-xs">→</span>
               <input 
                 type="date" 
                 className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-black focus:border-teal-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-300 cursor-pointer" 
                 value={localFilters.endDate ? new Date(localFilters.endDate).toISOString().split('T')[0] : ''} 
                 onClick={(e) => { try { e.currentTarget.showPicker(); } catch(err){} }}
                 onChange={(e) => updateF('endDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} 
               />
             </div>
          </div>
          <div className="col-span-full mt-2 pt-3 flex justify-between items-center border-t border-teal-100/70">
             <button onClick={() => setLocalFilters({ days: 90 })} className="text-[10px] font-bold text-red-600 uppercase hover:underline">Reset Filters</button>
             <div className="flex items-center gap-3">
               <button onClick={() => setIsFilterOpen(false)} className="text-[10px] font-bold text-gray-500 uppercase hover:text-black">Cancel</button>
               <button 
                 onClick={() => setIsFilterOpen(false)} 
                 className="rounded-lg bg-teal-600 px-4 py-2 text-[10px] font-bold text-white uppercase tracking-widest shadow-md hover:bg-teal-700 transition-all active:scale-95"
               >
                 Apply Filters
               </button>
             </div>
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
  resetVersion?: number;
  onApplyDateRange?: (start: string, end: string) => void;
}

const DEFAULT_ORDER = ['revenue-trend', 'sales-by-state', 'sales-by-city', 'sales-by-publisher', 'top-customers', 'sales-by-binding', 'top-items', 'top-items-qty', 'bottom-items'];

export default function OfflineSheetCharts({ filters: globalFilters, resetVersion, onApplyDateRange }: Props) {
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
      render: (data) => <RevenueTrendChart data={data} globalFilters={globalFilters} onApplyGlobal={onApplyDateRange} />
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
    'sales-by-city': {
      title: 'Sales by City',
      render: (data) => (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.revenueByCity || []} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={BOLD_TEXT} tickFormatter={fmtChartAxis} />
            <YAxis 
              type="category" 
              dataKey="city" 
              width={160} 
              tick={BOLD_TEXT} 
              tickFormatter={(val, i) => {
                const item = data.revenueByCity?.[i];
                return item ? `${val} (${item.state})` : val;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
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
    'top-items-qty': {
      title: 'Top Items by Volume (Qty)',
      render: (data) => (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.topItemsByQty || []} layout="vertical" margin={{ left: 20, right: 60 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={BOLD_TEXT} />
            <YAxis type="category" dataKey="title" width={180} tick={{ fontSize: 11, fontWeight: 500 }} tickFormatter={(v) => v.length > 25 ? v.substring(0, 23) + '..' : v} />
            <Tooltip content={<CustomTooltip title="Quantity" />} />
            <Bar dataKey="qty" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 10, fontWeight: 600 }} />
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
                <ChartBlock id={id} title={config.title} globalFilters={globalFilters} render={config.render} resetVersion={resetVersion} />
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
