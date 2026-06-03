import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { FiTrendingUp } from 'react-icons/fi';
import { formatINR, formatLakhsAndCrores, formatChartValue } from './utils';

interface ForecastSectionProps {
  projectionData: any;
}

export const ForecastSection: React.FC<ForecastSectionProps> = ({ projectionData }) => {
  if (!projectionData) return null;

  return (
    <div className="space-y-6 border-t border-gray-100 pt-8 animate-fadeIn">
      {/* Header Box containing title and large Yearly Estimate circle */}
      <div className="rounded-3xl border border-teal-100 bg-white p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
        <div className="space-y-2.5 z-10">
          <h2 className="text-2xl sm:text-3xl font-normal text-gray-900 tracking-tight flex items-center gap-2">
            {projectionData.year} Revenue Projection Analysis
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-teal-500 text-white tracking-widest uppercase animate-pulse">
              Live
            </span>
          </h2>
          <p className="text-sm font-normal text-gray-500">
            Weighted run rate (last 3 months):{' '}
            <span className="text-teal-600 font-normal">
              {formatLakhsAndCrores(projectionData.weightedMonthlyAvg)}
            </span>{' '}
            / month
          </p>
        </div>

        {/* Circle Card on Right */}
        <div className="flex items-center gap-4 bg-teal-50/40 border border-teal-100/50 rounded-2xl p-6 z-10 w-full md:w-auto justify-between md:justify-start">
          <div className="text-left">
            <p className="text-xs font-normal text-gray-400 uppercase tracking-widest">Yearly Estimate</p>
            <p className="text-2xl sm:text-3xl font-normal text-gray-950 mt-1">
              {formatLakhsAndCrores(projectionData.yearlyEstimate)}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
            <FiTrendingUp className="h-5 w-5 animate-bounce" />
          </div>
        </div>

        {/* Elegant background glowing design */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Projections Secondary Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Actual so far */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-normal text-gray-400 uppercase tracking-wider">Actual So Far</p>
            <p className="text-3xl font-normal text-teal-600 mt-2">
              {formatLakhsAndCrores(projectionData.actualSoFar)}
            </p>
          </div>
          <p className="text-xs font-normal text-gray-400 mt-4 bg-gray-50 px-3 py-1 rounded-full w-fit">
            {projectionData.daysElapsed} days in
          </p>
        </div>

        {/* Projected Remainder */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-normal text-gray-400 uppercase tracking-wider">Projected Rem.</p>
            <p className="text-3xl font-normal text-gray-900 mt-2">
              {formatLakhsAndCrores(projectionData.projectedRemaining)}
            </p>
          </div>
          <p className="text-xs font-normal text-gray-400 mt-4 bg-gray-50 px-3 py-1 rounded-full w-fit">
            {projectionData.daysLeft} days left
          </p>
        </div>

        {/* Monthly Average */}
        <div className="rounded-3xl bg-teal-600 p-6 shadow-md shadow-teal-100 flex flex-col justify-between hover:shadow-lg transition-all text-white text-left">
          <div>
            <p className="text-xs font-normal opacity-80 uppercase tracking-wider">Monthly Avg (WTD)</p>
            <p className="text-3xl font-normal mt-2">
              {formatLakhsAndCrores(projectionData.weightedMonthlyAvg)}
            </p>
          </div>
          <p className="text-xs font-normal bg-white/20 text-white mt-4 px-3 py-1 rounded-full w-fit">
            Recent 3 months
          </p>
        </div>

        {/* Achievement */}
        <div className="rounded-3xl bg-slate-900 p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-all text-white text-left relative overflow-hidden">
          <div className="z-10">
            <p className="text-xs font-normal opacity-80 uppercase tracking-wider">Achievement</p>
            <p className="text-4xl font-normal mt-2">
              {projectionData.achievementPercent.toFixed(1)}%
            </p>
          </div>
          <p className="text-xs font-normal bg-white/10 text-white mt-4 px-3 py-1 rounded-full w-fit z-10">
            of Yearly Est.
          </p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
        </div>
      </div>

      {/* Month-wise breakdown Recharts chart */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-normal text-gray-800">Month-Wise Breakdown — {projectionData.year}</h3>
            <p className="text-xs text-gray-400">
              Teal = actual revenue · Grey = projected · Current month = actual recorded + velocity extrapolation
            </p>
          </div>
          
          {/* Custom Legend */}
          <div className="flex items-center gap-4 text-xs font-normal text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-teal-600" />
              Actual
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-400" />
              Current (partial)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-gray-200" />
              Projected
            </div>
          </div>
        </div>

        <div style={{ height: 320 }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectionData.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontWeight: 'semibold', fontSize: 13 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickFormatter={(v) => formatChartValue(v)}
              />
              <Tooltip
                cursor={{ fill: '#F9FAFB', radius: 12 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const isCurrent   = d.type === 'current';
                    const isProjected = d.type === 'projected';

                    const currentMonthIndex = new Date().getMonth();
                    const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
                    const febDays = isLeapYear(new Date().getFullYear()) ? 29 : 28;
                    const daysInMonths = [31, febDays, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
                    const currentDayInMonth = projectionData.currentDayInMonth ?? new Date().getDate();
                    const dim = daysInMonths[currentMonthIndex] ?? 30;
                    const daysLeft = Math.max(0, dim - currentDayInMonth);

                    // Robust fallback for old/uncached API models
                    const actualVal = d.actual !== undefined ? d.actual : (projectionData.currentMonthActual ?? 0);
                    const projectedVal = d.projected !== undefined ? d.projected : Math.max(0, d.value - actualVal);

                    return (
                      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl text-left min-w-[200px] space-y-2">
                        <p className="text-xs font-normal text-gray-400 uppercase tracking-wide">
                          {d.name} {projectionData.year}
                        </p>

                        {isCurrent ? (
                          <>
                            {/* Split view for current month */}
                            <div className="space-y-1.5 border-b border-gray-100 pb-2">
                              <div className="flex items-center justify-between gap-6">
                                <span className="text-xs text-gray-500">Recorded (actual)</span>
                                <span className="text-sm font-normal text-teal-700">{formatINR(actualVal)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-6">
                                <span className="text-xs text-gray-400">
                                  Projected ({daysLeft} days left)
                                </span>
                                <span className="text-sm font-normal text-gray-400">{formatINR(projectedVal)}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                              <span className="text-xs font-normal text-gray-600">Full Month Estimate</span>
                              <span className="text-sm font-normal text-gray-900">{formatINR(d.value)}</span>
                            </div>
                            <span className="inline-block text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                              Partial — {currentDayInMonth} days recorded
                            </span>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-normal text-gray-900">{formatINR(d.value)}</p>
                            <span className={`inline-block text-[10px] font-normal uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isProjected ? 'bg-gray-100 text-gray-500' : 'bg-teal-50 text-teal-700'
                            }`}>
                              {isProjected ? 'Projected' : 'Actual'}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={44}>
                {projectionData.chartData.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.type === 'projected' ? '#E5E7EB'
                      : entry.type === 'current'  ? '#F59E0B'
                      : '#0D9488'
                    }
                    className="transition-all duration-300 hover:opacity-85"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Month Label values below */}
        <div className="grid grid-cols-12 text-center text-[10px] sm:text-xs font-normal text-gray-600 mt-4 border-t border-gray-50 pt-4">
          {projectionData.chartData.map((d: any, i: number) => (
            <div key={i} className="space-y-1">
              <p className={`${
                d.type === 'projected' ? 'text-gray-400'
                : d.type === 'current'  ? 'text-amber-600'
                : 'text-teal-600'
              } font-normal`}>
                {formatChartValue(d.value)}
              </p>
              {d.type === 'current' && (
                <p className="text-[9px] text-amber-400 leading-tight">
                  {projectionData.currentDayInMonth ?? new Date().getDate()}d actual
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Year Progress Container */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center text-sm font-normal">
          <span className="text-gray-400 uppercase tracking-widest text-xs">Year Progress</span>
          <span className="text-gray-700">
            <span className="text-teal-600">{projectionData.achievementPercent.toFixed(1)}% Revenue</span>
            {' '}/{' '}
            <span className="text-gray-500">{projectionData.timeElapsedPercent.toFixed(1)}% Time</span>
          </span>
        </div>

        {/* Gorgeous progress bar */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-1000 shadow-sm shadow-teal-200"
              style={{ width: `${Math.min(100, projectionData.achievementPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-normal text-gray-400 uppercase tracking-widest px-1">
            <span>Apr 1</span>
            <span>Mar 31</span>
          </div>
        </div>
      </div>
    </div>
  );
};
