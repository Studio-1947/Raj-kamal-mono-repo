import React from 'react';

const Bone: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded-2xl ${className}`} />
);

const KpiCardSkeleton: React.FC = () => (
  <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
    <Bone className="absolute top-4 right-4 h-16 w-16 opacity-50 rounded-full" />
    <Bone className="h-3 w-2/5 mb-3" />
    <Bone className="h-8 w-3/5 mb-4" />
    <Bone className="h-5 w-1/2 rounded-full" />
  </div>
);

const ChannelKpiStripSkeleton: React.FC = () => (
  <div className="space-y-3 border-t border-gray-100 pt-8">
    <Bone className="h-4 w-40" />
    <Bone className="h-14 w-full rounded-2xl" />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
          <Bone className="h-2.5 w-16" />
          <Bone className="h-6 w-20" />
          <Bone className="h-4 w-12 rounded-full" />
          <Bone className="h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

const ComparisonChartSkeleton: React.FC = () => (
  <div className="lg:col-span-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
    <div className="flex items-center justify-between">
      <Bone className="h-5 w-48" />
      <Bone className="h-8 w-48 rounded-xl" />
    </div>
    <Bone className="h-64 w-full" />
  </div>
);

const DonutSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
    <Bone className="h-5 w-36" />
    <div className="flex justify-center">
      <Bone className="h-44 w-44 rounded-full" />
    </div>
    <div className="space-y-2">
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="h-3 w-3 rounded-full shrink-0" />
          <Bone className="h-3 flex-1" />
          <Bone className="h-3 w-14" />
        </div>
      ))}
    </div>
  </div>
);

const TrendChartSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
    <div className="flex items-center justify-between">
      <Bone className="h-5 w-40" />
      <Bone className="h-5 w-20 rounded-full" />
    </div>
    <Bone className="h-64 w-full" />
  </div>
);

const ForecastSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
    <div className="flex items-center justify-between">
      <Bone className="h-5 w-48" />
      <Bone className="h-5 w-24 rounded-full" />
    </div>
    <Bone className="h-56 w-full" />
    <div className="flex gap-4">
      <Bone className="h-4 w-24 rounded-full" />
      <Bone className="h-4 w-24 rounded-full" />
      <Bone className="h-4 w-24 rounded-full" />
    </div>
  </div>
);

const MonthlyTableSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4 border-t border-gray-100 pt-8">
    <div className="flex items-center justify-between">
      <Bone className="h-5 w-56" />
      <Bone className="h-8 w-36 rounded-xl" />
    </div>
    {/* header row */}
    <div className="flex gap-2">
      <Bone className="h-3 w-20 shrink-0" />
      {Array(12).fill(0).map((_, i) => <Bone key={i} className="h-3 flex-1" />)}
    </div>
    {/* data rows */}
    {[1,2,3].map(i => (
      <div key={i} className="flex gap-2 items-center">
        <Bone className="h-4 w-20 shrink-0" />
        {Array(12).fill(0).map((_, j) => <Bone key={j} className="h-5 flex-1 rounded-lg" />)}
      </div>
    ))}
  </div>
);

const StatesPanelSkeleton: React.FC = () => (
  <div className="border-t border-gray-100 pt-8 space-y-4">
    <Bone className="h-4 w-56" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1,2,3].map(i => (
        <div key={i} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <Bone className="h-4 w-24" />
          {[1,2,3,4,5].map(j => (
            <div key={j} className="space-y-1">
              <div className="flex justify-between">
                <Bone className="h-3 w-24" />
                <Bone className="h-3 w-16" />
              </div>
              <Bone className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const TableSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
    <Bone className="h-5 w-40" />
    <div className="flex gap-4">
      <Bone className="h-3 flex-1" />
      <Bone className="h-3 w-20" />
      <Bone className="h-3 w-20" />
    </div>
    {[1,2,3,4,5].map(i => (
      <div key={i} className="flex gap-4 items-center">
        <Bone className="h-8 w-8 rounded-xl shrink-0" />
        <Bone className="h-3 flex-1" />
        <Bone className="h-3 w-16" />
        <Bone className="h-3 w-16" />
      </div>
    ))}
  </div>
);

export const LoadingSkeleton: React.FC = () => (
  <div className="space-y-10">
    {/* KPI cards */}
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[1,2,3,4].map(i => <KpiCardSkeleton key={i} />)}
    </div>

    {/* Channel strip */}
    <ChannelKpiStripSkeleton />

    {/* Comparison + Donut */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 border-t border-gray-100 pt-8">
      <ComparisonChartSkeleton />
      <DonutSkeleton />
    </div>

    {/* Trends */}
    <div className="border-t border-gray-100 pt-8">
      <TrendChartSkeleton />
    </div>

    {/* Forecast */}
    <ForecastSkeleton />

    {/* Monthly table */}
    <MonthlyTableSkeleton />

    {/* States */}
    <StatesPanelSkeleton />

    {/* Bottom tables */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 border-t border-gray-100 pt-8">
      <TableSkeleton />
      <TableSkeleton />
    </div>
  </div>
);
