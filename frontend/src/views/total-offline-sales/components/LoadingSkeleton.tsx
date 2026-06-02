import React from 'react';

/** A single shimmering block */
const Bone: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded-2xl ${className}`} />
);

/** Mirrors one KPI card */
const KpiCardSkeleton: React.FC = () => (
  <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
    {/* faint icon placeholder top-right */}
    <Bone className="absolute top-4 right-4 h-16 w-16 opacity-50 rounded-full" />
    <Bone className="h-3 w-2/5 mb-3" />       {/* title */}
    <Bone className="h-8 w-3/5 mb-4" />       {/* value */}
    <Bone className="h-5 w-1/2 rounded-full" />{/* badge */}
  </div>
);

/** Mirrors the ForecastSection banner */
const ForecastSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
    {/* header row */}
    <div className="flex items-center justify-between">
      <Bone className="h-5 w-48" />
      <Bone className="h-5 w-24 rounded-full" />
    </div>
    {/* big chart area */}
    <Bone className="h-56 w-full" />
    {/* bottom legend row */}
    <div className="flex gap-4">
      <Bone className="h-4 w-24 rounded-full" />
      <Bone className="h-4 w-24 rounded-full" />
      <Bone className="h-4 w-24 rounded-full" />
    </div>
  </div>
);

/** Mirrors the DailyTrendsChart (lg:col-span-2) */
const TrendChartSkeleton: React.FC = () => (
  <div className="lg:col-span-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
    <div className="flex items-center justify-between">
      <Bone className="h-5 w-40" />
      <Bone className="h-5 w-20 rounded-full" />
    </div>
    <Bone className="h-64 w-full" />
  </div>
);

/** Mirrors the ChannelShareDonut (1 col) */
const DonutSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
    <Bone className="h-5 w-36" />
    {/* circle */}
    <div className="flex justify-center">
      <Bone className="h-44 w-44 rounded-full" />
    </div>
    {/* legend items */}
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="h-3 w-3 rounded-full shrink-0" />
          <Bone className="h-3 flex-1" />
          <Bone className="h-3 w-14" />
        </div>
      ))}
    </div>
  </div>
);

/** Mirrors BestsellersTable / RecentTransactionsTable */
const TableSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
    <Bone className="h-5 w-40" />
    {/* table header row */}
    <div className="flex gap-4">
      <Bone className="h-3 flex-1" />
      <Bone className="h-3 w-20" />
      <Bone className="h-3 w-20" />
    </div>
    {/* rows */}
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex gap-4 items-center">
        <Bone className="h-8 w-8 rounded-xl shrink-0" />
        <Bone className="h-3 flex-1" />
        <Bone className="h-3 w-16" />
        <Bone className="h-3 w-16" />
      </div>
    ))}
  </div>
);

/** Full-page skeleton that maps 1-to-1 with TotalOfflineSales content */
export const LoadingSkeleton: React.FC = () => (
  <div className="space-y-10">
    {/* 1. KPI cards */}
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(i => <KpiCardSkeleton key={i} />)}
    </div>

    {/* 2. Forecast section */}
    <ForecastSkeleton />

    {/* 3. Charts row */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 border-t border-gray-100 pt-8">
      <TrendChartSkeleton />
      <DonutSkeleton />
    </div>

    {/* 4. Tables row */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 border-t border-gray-100 pt-8">
      <TableSkeleton />
      <TableSkeleton />
    </div>
  </div>
);
