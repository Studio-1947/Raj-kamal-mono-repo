
import React, { useState } from 'react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import type { OfflineSheetSummaryResponse } from './offlineSheetTypes';

interface Props {
  data?: OfflineSheetSummaryResponse;
  isLoading?: boolean;
}

export default function OfflineSheetProjection({ data, isLoading }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border-4 border-gray-200 bg-white p-8 shadow-2xl">
        <div className="h-8 w-64 rounded-lg bg-gray-200" />
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  const p = data?.projection;
  if (!p) return null;

  const progress = (p.totalSoFar / p.totalProjected) * 100;
  const timeProgress = (p.daysElapsed / (p.daysElapsed + p.remainingDays)) * 100;

  const formatCr = (val: number) => {
    if (val === undefined || val === null) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="rounded-2xl border-4 border-teal-600 bg-white p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Background Decor */}
      <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-teal-50 opacity-40 pointer-events-none" />
      
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 capitalize">
              2026 revenue projection
            </h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-lg shadow-teal-600/10">
                Live
              </span>
              {!isExpanded && (
                <span className="rounded-full bg-black px-2.5 py-0.5 text-[9px] font-bold uppercase text-white shadow-lg">
                  {progress.toFixed(1)}% Achieved
                </span>
              )}
            </div>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-all border border-gray-100 md:hidden shadow-sm"
            >
              {isExpanded ? <HiChevronUp size={14} /> : <HiChevronDown size={14} />}
            </button>
          </div>
          <p className="mt-0.5 text-sm font-medium text-gray-400">
            Current run rate: <span className="text-teal-600 font-semibold">{formatCr(p.dailyAvg)}</span> <span className="text-[10px] opacity-60">/ day</span>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-300 mb-0.5">Yearly Estimate</div>
            <div className="text-3xl font-semibold text-black tabular-nums tracking-tight">
              {formatCr(p.totalProjected)}
            </div>
          </div>
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 hover:bg-white hover:text-teal-600 transition-all text-gray-300 border border-gray-200 hover:border-teal-500 group shadow-sm"
          >
            {isExpanded ? (
              <HiChevronUp size={18} className="transition-transform duration-300" />
            ) : (
              <HiChevronDown size={18} className="transition-transform duration-300" />
            )}
          </button>
        </div>
      </div>

      <div className={`transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden ${isExpanded ? 'max-h-[1200px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Metric 1 */}
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-200/50">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Actual So Far</div>
            <div className="mt-0.5 text-xl font-bold text-teal-800">{formatCr(p.totalSoFar)}</div>
            <div className="text-[10px] font-medium text-gray-400">{p.daysElapsed} days in</div>
          </div>

          {/* Metric 2 */}
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-200/50">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Projected Rem.</div>
            <div className="mt-0.5 text-xl font-bold text-gray-700">{formatCr(p.projectedRemaining)}</div>
            <div className="text-[10px] font-medium text-gray-400">{p.remainingDays} days left</div>
          </div>

          {/* Metric 3 */}
          <div className="rounded-lg bg-teal-600 p-3 shadow-sm">
            <div className="text-[9px] font-bold uppercase tracking-wider text-teal-100">Daily Run Rate</div>
            <div className="mt-0.5 text-xl font-bold text-white">{formatCr(p.dailyAvg)}</div>
            <div className="text-[10px] font-medium text-teal-100/70">Past {p.daysElapsed} days</div>
          </div>

          {/* Metric 4 */}
          <div className="rounded-lg bg-black p-3 shadow-sm">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Achievement</div>
            <div className="mt-0.5 text-xl font-bold text-white">{progress.toFixed(1)}%</div>
            <div className="text-[10px] font-medium text-gray-500">Yearly Goal</div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Year Progress Curve</span>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Comparing Revenue earned vs. Time elapsed</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-teal-700">{progress.toFixed(1)}% Revenue</span>
              <span className="text-[10px] font-bold text-gray-300 mx-1.5">/</span>
              <span className="text-[10px] font-bold text-gray-500">{timeProgress.toFixed(1)}% Time</span>
            </div>
          </div>
          
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden relative">
            {/* Revenue Progress Bar */}
            <div 
              className="h-full bg-teal-600 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%`, zIndex: 1 }}
            />
          </div>

          {/* Time Marker Line (Across the bar) */}
          <div 
            className="absolute top-[3.5rem] bottom-8 w-px border-l-2 border-dashed border-gray-400/50 flex flex-col items-center pointer-events-none"
            style={{ left: `${timeProgress}%`, zIndex: 2 }}
          >
            <div className="bg-gray-400 w-1.5 h-1.5 rounded-full -mt-0.5" />
            <span className="mt-auto text-[9px] font-black text-gray-400 uppercase tracking-tighter bg-white px-1">Today</span>
          </div>

          <div className="mt-2 flex justify-between text-[9px] font-bold text-gray-300 uppercase tracking-widest">
            <span>Jan 1</span>
            <span>Dec 31</span>
          </div>
        </div>
      </div>
    </div>
  );
}
