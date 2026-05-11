
import React, { useState } from 'react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { OfflineSheetSummaryResponse } from './offlineSheetTypes';

interface Props {
  data?: OfflineSheetSummaryResponse;
  isLoading?: boolean;
}

function fmtCr(val: number): string {
  if (val == null) return '₹0';
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (val >= 100_000)   return `₹${(val / 100_000).toFixed(2)} L`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

function fmtAxis(val: number): string {
  if (val >= 10_000_000) return `${(val / 10_000_000).toFixed(1)}Cr`;
  if (val >= 100_000)   return `${(val / 100_000).toFixed(0)}L`;
  return `${Math.round(val / 1000)}k`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-2xl text-sm min-w-[160px]">
      <p className="font-bold text-gray-900 mb-2 text-base">{label}</p>
      {d.isComplete && (
        <p className="text-teal-700 font-semibold">Actual: {fmtCr(d.actual)}</p>
      )}
      {d.isCurrent && (
        <>
          <p className="text-teal-700 font-semibold">Actual so far: {fmtCr(d.actual)}</p>
          <p className="text-orange-500 font-semibold">Full month est.: {fmtCr(d.projected)}</p>
          <p className="text-gray-400 text-xs mt-1">{d.daysElapsed} of {d.totalDays} days</p>
        </>
      )}
      {!d.isComplete && !d.isCurrent && (
        <p className="text-gray-400 font-semibold">Projected: {fmtCr(d.projected)}</p>
      )}
    </div>
  );
};

export default function OfflineSheetProjection({ data, isLoading }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border-4 border-gray-200 bg-white p-8 shadow-2xl">
        <div className="h-8 w-64 rounded-lg bg-gray-200" />
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100" />)}
        </div>
        <div className="mt-6 h-48 rounded-xl bg-gray-100" />
      </div>
    );
  }

  const p = data?.projection;
  if (!p) return null;

  const progress = p.totalProjected > 0 ? (p.totalSoFar / p.totalProjected) * 100 : 0;
  const timeProgress = ((p.daysElapsed) / (p.daysElapsed + p.remainingDays)) * 100;

  // Build chart data — each month shows the value that fills the bar
  const chartData = p.monthlyBreakdown.map(m => ({
    ...m,
    // barValue: what the bar height represents
    barValue: m.isComplete ? m.actual : m.projected,
  }));

  const maxBarVal = Math.max(...chartData.map(d => d.barValue ?? 0), 1);

  return (
    <div className="rounded-2xl border-4 border-teal-600 bg-white p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
      <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-teal-50 opacity-40 pointer-events-none" />

      {/* Header row */}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">
              2026 Revenue Projection
            </h2>
            <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[9px] font-bold uppercase text-white">Live</span>
            {!isExpanded && (
              <span className="rounded-full bg-black px-2.5 py-0.5 text-[9px] font-bold uppercase text-white">
                {progress.toFixed(1)}% Achieved
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-medium text-gray-400">
            Weighted run rate (last {Math.min(p.currentMonth - 1, 3)} months):{' '}
            <span className="text-teal-600 font-semibold">{fmtCr(p.weightedMonthlyAvg)}</span>
            <span className="text-[10px] opacity-60"> / month</span>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-300 mb-0.5">Yearly Estimate</div>
            <div className="text-3xl font-semibold text-black tabular-nums tracking-tight">
              {fmtCr(p.totalProjected)}
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 hover:bg-white hover:text-teal-600 transition-all text-gray-300 border border-gray-200 hover:border-teal-500 shadow-sm"
          >
            {isExpanded ? <HiChevronUp size={18} /> : <HiChevronDown size={18} />}
          </button>
        </div>
      </div>

      <div className={`transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[900px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-200/50">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Actual So Far</div>
            <div className="mt-0.5 text-xl font-bold text-teal-800">{fmtCr(p.totalSoFar)}</div>
            <div className="text-[10px] font-medium text-gray-400">{p.daysElapsed} days in</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-200/50">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Projected Rem.</div>
            <div className="mt-0.5 text-xl font-bold text-gray-700">{fmtCr(p.projectedRemaining)}</div>
            <div className="text-[10px] font-medium text-gray-400">{p.remainingDays} days left</div>
          </div>
          <div className="rounded-lg bg-teal-600 p-3 shadow-sm">
            <div className="text-[9px] font-bold uppercase tracking-wider text-teal-100">Monthly Avg (Wtd)</div>
            <div className="mt-0.5 text-xl font-bold text-white">{fmtCr(p.weightedMonthlyAvg)}</div>
            <div className="text-[10px] font-medium text-teal-100/70">Recent {Math.min(p.currentMonth - 1, 3)} months</div>
          </div>
          <div className="rounded-lg bg-black p-3 shadow-sm">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Achievement</div>
            <div className="mt-0.5 text-xl font-bold text-white">{progress.toFixed(1)}%</div>
            <div className="text-[10px] font-medium text-gray-500">of Yearly Est.</div>
          </div>
        </div>

        {/* Monthly bar chart */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Month-wise Breakdown — 2026</span>
            <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wide">
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-teal-600" />Actual</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-orange-400" />Current (est.)</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-gray-300" />Projected</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(20,184,166,0.06)' }} />
              <ReferenceLine
                x={p.monthlyBreakdown[p.currentMonth - 1]?.name}
                stroke="#f97316"
                strokeDasharray="4 3"
                strokeWidth={1.5}
              />
              <Bar dataKey="barValue" radius={[4, 4, 0, 0]} maxBarSize={52}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.isComplete ? '#0d9488'
                      : entry.isCurrent ? '#f97316'
                      : '#d1d5db'
                    }
                    opacity={entry.isComplete ? 1 : entry.isCurrent ? 0.9 : 0.7}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>

          {/* Month detail row */}
          <div className="mt-3 grid grid-cols-12 gap-0.5">
            {p.monthlyBreakdown.map((m) => (
              <div
                key={m.month}
                className={`text-center text-[9px] font-semibold px-0.5 py-1 rounded ${
                  m.isCurrent ? 'bg-orange-50 text-orange-600' : m.isComplete ? 'text-teal-700' : 'text-gray-400'
                }`}
              >
                {m.isComplete && fmtAxis(m.actual ?? 0)}
                {m.isCurrent && <span title={`${m.daysElapsed}/${m.totalDays} days`}>{fmtAxis(m.projected ?? 0)}*</span>}
                {!m.isComplete && !m.isCurrent && fmtAxis(m.projected ?? 0)}
              </div>
            ))}
          </div>
        </div>

        {/* Year progress bar */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Year Progress</span>
            <div className="text-right">
              <span className="text-[10px] font-bold text-teal-700">{progress.toFixed(1)}% Revenue</span>
              <span className="text-[10px] font-bold text-gray-300 mx-1.5">/</span>
              <span className="text-[10px] font-bold text-gray-500">{timeProgress.toFixed(1)}% Time</span>
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden relative">
            <div className="h-full bg-teal-600 transition-all duration-1000 ease-out" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] font-bold text-gray-300 uppercase tracking-widest">
            <span>Jan 1</span><span>Dec 31</span>
          </div>
        </div>

        {/* Methodology note */}
        <p className="mt-3 text-[10px] text-gray-400 italic">
          * Projection uses a weighted average of the last {Math.min(p.currentMonth - 1, 3)} complete months
          (newest month weighted highest). Current month is extrapolated from {p.monthlyBreakdown[p.currentMonth - 1]?.daysElapsed ?? '?'} of {p.monthlyBreakdown[p.currentMonth - 1]?.totalDays ?? '?'} days recorded.
        </p>
      </div>
    </div>
  );
}
