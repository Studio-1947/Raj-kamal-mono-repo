
import React from 'react';
import type { OfflineSheetSummaryResponse } from './offlineSheetTypes';

interface Props {
  data?: OfflineSheetSummaryResponse;
  isLoading?: boolean;
}

export default function OfflineSheetProjection({ data, isLoading }: Props) {
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
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="rounded-2xl border-4 border-teal-600 bg-white p-8 shadow-2xl relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-teal-50 opacity-50" />
      
      <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-medium tracking-tight text-black uppercase">
              2026 Revenue Projection
            </h2>
            <span className="rounded-full bg-teal-600 px-4 py-1 text-sm font-medium text-white shadow-lg">
              Live Forecast
            </span>
          </div>
          <p className="mt-2 text-lg font-medium text-gray-500">
            Based on current run rate of <span className="text-teal-700 font-bold">{formatCr(p.dailyAvg)}</span> per day
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium uppercase tracking-widest text-gray-400">Total Year Estimate</div>
          <div className="text-5xl font-black text-black">
            {formatCr(p.totalProjected)}
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-2xl bg-gray-50 p-6 border-2 border-gray-100">
          <div className="text-sm font-medium uppercase tracking-wider text-gray-500">Actual So Far</div>
          <div className="mt-2 text-3xl font-bold text-teal-800">{formatCr(p.totalSoFar)}</div>
          <div className="mt-1 text-sm font-medium text-gray-400">{p.daysElapsed} days elapsed</div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl bg-gray-50 p-6 border-2 border-gray-100">
          <div className="text-sm font-medium uppercase tracking-wider text-gray-500">Projected (Remaining)</div>
          <div className="mt-2 text-3xl font-bold text-gray-800">{formatCr(p.projectedRemaining)}</div>
          <div className="mt-1 text-sm font-medium text-gray-400">{p.remainingDays} days to go</div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl bg-teal-600 p-6 shadow-xl">
          <div className="text-sm font-medium uppercase tracking-wider text-teal-100">Daily Run Rate</div>
          <div className="mt-2 text-3xl font-bold text-white">{formatCr(p.dailyAvg)}</div>
          <div className="mt-1 text-sm font-medium text-teal-200">Across {p.daysElapsed} days</div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl bg-black p-6 shadow-xl">
          <div className="text-sm font-medium uppercase tracking-wider text-gray-400">Target Achievement</div>
          <div className="mt-2 text-3xl font-bold text-white">{progress.toFixed(1)}%</div>
          <div className="mt-1 text-sm font-medium text-gray-500">of year forecast met</div>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium uppercase tracking-wider text-gray-500">Year Progress Curve</span>
          <span className="text-sm font-bold text-teal-700">{progress.toFixed(1)}% REVENUE / {timeProgress.toFixed(1)}% TIME</span>
        </div>
        <div className="h-4 w-full rounded-full bg-gray-100 overflow-hidden border-2 border-gray-50">
          <div 
            className="h-full bg-teal-600 shadow-[0_0_20px_rgba(13,148,136,0.3)] transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs font-medium text-gray-400 uppercase tracking-tighter">
          <span>JAN 1</span>
          <div className="flex flex-col items-center">
            <div className="h-2 w-0.5 bg-teal-600 mb-1" style={{ marginLeft: `${timeProgress}%` }} />
            <span style={{ marginLeft: `${timeProgress}%` }}>TODAY</span>
          </div>
          <span>DEC 31</span>
        </div>
      </div>
    </div>
  );
}
