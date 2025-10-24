import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { IoMdInformationCircle } from "react-icons/io";
import {
  MdOutlineKeyboardArrowUp,
  MdOutlineKeyboardArrowDown,
  MdRefresh,
} from "react-icons/md";
import { apiClient } from "../../lib/apiClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

/**
 * Interactive Sales Dashboard with Real Data
 * - Fetches live data from online sales API
 * - Interactive cards with hover effects
 * - Animated transitions
 * - Quick actions and filters
 */

/*******************************\
|* Tiny Icon Set (inline SVGs) *|
\*******************************/
const ArrowUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
    <path d="M10 3l5 6h-3v8H8V9H5l5-6z" fill="currentColor" />
  </svg>
);

const InfoCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a1.25 1.25 0 110 2.5A1.25 1.25 0 0112 6zm-1.5 5h3v7h-3v-7z"
    />
  </svg>
);

const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M9 3l1.5 2H14l1.5-2H18a3 3 0 013 3v11a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3h3zM12 8a5 5 0 100 10 5 5 0 000-10z"
    />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M22 12a10 10 0 10-11.6 9.9v-7h-2.3V12h2.3V9.8c0-2.3 1.4-3.6 3.5-3.6 1 0 1.9.08 2.2.11v2.6h-1.5c-1.2 0-1.5.73-1.5 1.5V12h2.7l-.43 2.9h-2.3v7A10 10 0 0022 12z"
    />
  </svg>
);

/*********************\
|* Basic UI Primitives *|
\*********************/
/** Rounded pill with tone */
function Pill({
  children,
  tone = "gray",
  className = "",
}: React.PropsWithChildren<{
  tone?: "blue" | "green" | "red" | "gray" | "amber";
  className?: string;
}>) {
  const tones: Record<string, string> = {
    blue: "bg-[#E5EEFF] text-[#2B4D9C]",
    green: "bg-[#E9F7EF] text-[#1E7B4F]",
    red: "bg-[#FDEBEE] text-[#C03548]",
    gray: "bg-gray-100 text-gray-700",
    amber: "bg-[#FFF4DE] text-[#A35C00]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border border-black/5 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Understated button used in card footers */
function FooterButton({
  children,
  onClick,
}: React.PropsWithChildren<{ onClick?: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl bg-[#F4F7FA] b-1 b-[#E5ECF4] text-[#3856B8] font-semibold py-2.5 text-sm hover:brightness-95 transition-all hover:shadow-md"
    >
      {children}
    </button>
  );
}

/** Generic soft Card with hover effect */
function Card({
  title,
  children,
  footer,
  className = "",
  hoverable = false,
  onClick,
}: React.PropsWithChildren<{
  title?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}>) {
  return (
    <section
      onClick={onClick}
      className={`min-w-0 rounded-[22px] border border-black/10 bg-white shadow-sm transition-all duration-300 flex flex-col h-full ${
        hoverable ? "hover:shadow-xl cursor-pointer" : ""
      } ${className}`}
    >
      {title && (
        <header className="px-4 sm:px-5 py-2 sm:py-3 flex-shrink-0">
          {typeof title === "string" ? (
            <h2 className="text-sm sm:text-[15px] font-semibold text-gray-900">
              {title}
            </h2>
          ) : (
            title
          )}
        </header>
      )}

      <div className="px-4 sm:px-5 pb-3 sm:pb-4">{children}</div>

      {footer && (
        <footer className="px-4 sm:px-5 py-2 border-t border-black/5 flex-shrink-0">
          {footer}
        </footer>
      )}
    </section>
  );
}

/***********************\
|* Types & API Fetching *|
\***********************/
// Summary shape used by both online and offline endpoints
// Note: offline summary does not include paymentMode; mark it optional
type SummaryResponse = {
  ok: boolean;
  paymentMode?: { paymentMode: string; total: number }[];
  timeSeries: { date: string; total: number }[];
  topItems: {
    title: string;
    total: number;
    qty: number;
    isbn?: string;
    author?: string;
    language?: string;
  }[];
};

type CountsResponse = {
  ok: boolean;
  totalCount: number;
  totalAmount: number;
  uniqueCustomers?: number;
  refundCount?: number;
};

function formatINR(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }
}

function formatIN(tick: number) {
  try {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
      tick
    );
  } catch {
    return tick.toString();
  }
}

// Colors for Online/Offline
const ONLINE_COLOR = "#2B4D9C";
const OFFLINE_COLOR = "#7EA6FF";

// Channel filter for Top Book/Author
type Channel = 'all' | 'online' | 'offline';

function SegmentedTabs({
  value,
  onChange,
}: { value: Channel; onChange: (v: Channel) => void }) {
  const options: { key: Channel; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'online', label: 'Online' },
    { key: 'offline', label: 'Offline' },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
      {options.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
            value === t.key ? 'bg-white text-[#1e3a8a] shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**********************\
|* Section Components *|
\**********************/
function RevenueCard({
  days,
  setDays,
  onlineSummary,
  offlineSummary,
  onlineCounts,
  offlineCounts,
  loading,
  onRefresh,
}: {
  days: number;
  setDays: (d: number) => void;
  onlineSummary: SummaryResponse | null;
  offlineSummary: SummaryResponse | null;
  onlineCounts: CountsResponse | null;
  offlineCounts: CountsResponse | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [activeView, setActiveView] = useState<"total" | "online" | "offline">("total");
  
  const totalAmount = useMemo(() => {
    const online = onlineCounts?.totalAmount || 0;
    const offline = offlineCounts?.totalAmount || 0;
    if (activeView === 'online') return online;
    if (activeView === 'offline') return offline;
    return online + offline;
  }, [activeView, onlineCounts, offlineCounts]);

  const totalOrders = useMemo(() => {
    const online = onlineCounts?.totalCount || 0;
    const offline = offlineCounts?.totalCount || 0;
    if (activeView === 'online') return online;
    if (activeView === 'offline') return offline;
    return online + offline;
  }, [activeView, onlineCounts, offlineCounts]);

  const uniqueCustomers = useMemo(() => {
    const online = onlineCounts?.uniqueCustomers || 0;
    const offline = offlineCounts?.uniqueCustomers || 0;
    if (activeView === 'online') return online;
    if (activeView === 'offline') return offline;
    return online + offline;
  }, [activeView, onlineCounts, offlineCounts]);
  
  // Calculate growth
  const growth = useMemo(() => {
    // Build series according to activeView
    const onlineSeries = onlineSummary?.timeSeries || [];
    const offlineSeries = offlineSummary?.timeSeries || [];
    // sum by date for total view
    const mergedTotal = new Map<string, number>();
    for (const r of onlineSeries) mergedTotal.set(r.date, (mergedTotal.get(r.date) || 0) + (r.total || 0));
    for (const r of offlineSeries) mergedTotal.set(r.date, (mergedTotal.get(r.date) || 0) + (r.total || 0));

    const series = activeView === 'online' ? onlineSeries : activeView === 'offline' ? offlineSeries : Array.from(mergedTotal.entries()).sort(([a],[b]) => a < b ? -1 : 1).map(([date,total]) => ({ date, total }));
    if (series.length < 2) return { pct: 0, dir: "flat" as "up" | "down" | "flat" };
  const [activeView, setActiveView] = useState<"total" | "online" | "offline">(
    "total"
  );

  const totalAmount = counts?.totalAmount || 0;
  const totalOrders = counts?.totalCount || 0;

  // Calculate growth
  const growth = useMemo(() => {
    const series = summary?.timeSeries || [];
    if (series.length < 2)
      return { pct: 0, dir: "flat" as "up" | "down" | "flat" };
    const recent = series.slice(-Math.ceil(series.length / 2));
    const prev = series.slice(0, Math.floor(series.length / 2));
    const sum = (arr: { total: number }[]) =>
      arr.reduce((a, b) => a + (b.total || 0), 0);
    const a = sum(recent);
    const b = sum(prev) || 1;
    const pct = ((a - b) / b) * 100;
    return { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
  }, [activeView, onlineSummary, offlineSummary]);

  const chartData = useMemo(() => {
    const online = onlineSummary?.timeSeries || [];
    const offline = offlineSummary?.timeSeries || [];
    const byDate = new Map<string, { online: number; offline: number }>();
    for (const r of online) {
      const key = r.date;
      const prev = byDate.get(key) || { online: 0, offline: 0 };
      prev.online += r.total || 0;
      byDate.set(key, prev);
    }
    for (const r of offline) {
      const key = r.date;
      const prev = byDate.get(key) || { online: 0, offline: 0 };
      prev.offline += r.total || 0;
      byDate.set(key, prev);
    }
    return Array.from(byDate.entries())
      .sort(([a],[b]) => a < b ? -1 : 1)
      .map(([date, vals]) => ({
        name: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        online: vals.online,
        offline: vals.offline,
      }));
  }, [onlineSummary, offlineSummary]);
    return (summary?.timeSeries || []).map((d) => ({
      name: new Date(d.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      online: d.total,
      offline: d.total * 0.3, // Mock offline as 30% of online for demo
    }));
  }, [summary]);

  return (
    <Card
      title={
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[#292929] font-semibold">Revenue Overview</span>

          {/* View tabs */}
          <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
            {[
              { label: "Total", value: "total" as const },
              { label: "Online", value: "online" as const },
              { label: "Offline", value: "offline" as const },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setActiveView(t.value)}
                className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                  activeView === t.value
                    ? "bg-white text-[#1e3a8a] shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Days selector */}
          <div className="ml-auto flex items-center gap-2">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[30, 60, 90, 180, 365].map((d) => (
                <option key={d} value={d}>
                  {d === 30 ? "This Month" : `${d} days`}
                </option>
              ))}
            </select>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
              title="Refresh data"
            >
              <MdRefresh
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      }
    >
      {/* headline row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-3xl sm:text-4xl font-extrabold text-[#43547E] transition-all">
          {loading ? (
            <span className="animate-pulse bg-gray-200 rounded px-8 py-2 inline-block">
              Reading...
            </span>
          ) : (
            formatINR(totalAmount)
          )}
        </div>
        <Pill tone="blue" className="py-2 bg-[East Bay/100] text-[#526BA3]">
          {days === 30 ? "This Month" : `Last ${days} days`}
        </Pill>

        {/* legend */}
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1 text-gray-700">
            <span
              className="size-2 rounded-full inline-block"
              style={{ backgroundColor: ONLINE_COLOR }}
            />{" "}
            Online
          </span>
          <span className="inline-flex items-center gap-1 text-gray-700">
            <span
              className="size-2 rounded-full inline-block"
              style={{ backgroundColor: OFFLINE_COLOR }}
            />{" "}
            Offline
          </span>
        </div>
      </div>

      {/* deltas */}
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-2 ${
            growth.dir === "up"
              ? "text-green-700"
              : growth.dir === "down"
              ? "text-red-700"
              : "text-gray-700"
          }`}
        >
          {growth.dir === "up" ? (
            <MdOutlineKeyboardArrowUp className="w-5 h-5 text-[#2EC700]" />
          ) : growth.dir === "down" ? (
            <MdOutlineKeyboardArrowDown className="w-5 h-5 text-red-600" />
          ) : null}
          <span className="font-semibold text-[#43547E]">
            {Math.abs(growth.pct).toFixed(2)}%
          </span>
          <span className="text-gray-500">from previous period</span>
        </span>
        <span className="inline-flex items-center gap-2 text-gray-700">
          <span className="font-semibold text-[#43547E]">
            {formatIN(totalOrders)}
          </span>
          <span className="text-gray-500">total orders</span>
        </span>
        {uniqueCustomers > 0 && (
        <span className="inline-flex items-center gap-2">
            <span className="font-semibold text-[#43547E]">{formatIN(uniqueCustomers)}</span>
        {counts?.uniqueCustomers && (
          <span className="inline-flex items-center gap-2">
            <span className="font-semibold text-[#43547E]">
              {formatIN(counts.uniqueCustomers)}
            </span>
            <span className="text-gray-500">customers</span>
          </span>
        )}
      </div>

      {/* chart */}
      <div className="mt-2 rounded-2xl border border-black/5 bg-white overflow-hidden">
        {chartData.length > 0 ? (
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 12, left: 5, bottom: 0 }}
              >
                <CartesianGrid stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatIN}
                  width={48}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatINR(value)}
                  labelClassName="text-xs"
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                {(activeView === 'total' || activeView === 'online') && (
                  <Line
                    type="monotone"
                    dataKey="online"
                    name="Online"
                    stroke={ONLINE_COLOR}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: ONLINE_COLOR }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {(activeView === 'total' || activeView === 'offline') && (
                  <Line
                    type="monotone"
                    dataKey="offline"
                    name="Offline"
                    stroke={OFFLINE_COLOR}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: OFFLINE_COLOR }}
                    activeDot={{ r: 6 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="online"
                  name="Online"
                  stroke={ONLINE_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: ONLINE_COLOR }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="offline"
                  name="Offline"
                  stroke={OFFLINE_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: OFFLINE_COLOR }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-gray-500 text-sm">
            {loading ? "Reading chart..." : "No data available"}
          </div>
        )}
      </div>

      {/* info chip */}
      {(() => {
        const onAmt = onlineCounts?.totalAmount || 0;
        const offAmt = offlineCounts?.totalAmount || 0;
        const leader = onAmt >= offAmt ? { label: 'Online', amt: onAmt } : { label: 'Offline', amt: offAmt };
        const denom = (onAmt + offAmt) || 1;
        const pct = Math.round((leader.amt / denom) * 100);
        return (
          <div className="mt-3 rounded-2xl bg-gray-100 text-gray-700 px-4 py-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full bg-[#E5EEFF] text-[#43547E] w-6 h-6">
              <IoMdInformationCircle className="w-8 h-8" />
            </span>
            <span className="text-sm">
              {leader.label} contributed {pct}% of revenue.
            </span>
          </div>
        );
      })()}
      {summary?.paymentMode && summary.paymentMode.length > 0 && (
        <div className="mt-2 rounded-xl bg-gray-100 text-gray-700 px-3 py-2 flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-full bg-[#E5EEFF] text-[#43547E] w-5 h-5">
            <IoMdInformationCircle className="w-6 h-6" />
          </span>
          <span className="text-xs">
            {summary.paymentMode[0]?.paymentMode || "Online"} contributed{" "}
            {summary.paymentMode[0]
              ? Math.round((summary.paymentMode[0].total / totalAmount) * 100)
              : 0}
            % of revenue.
          </span>
        </div>
      )}
    </Card>
  );
}

function TopBookCard({ summary, loading, counts, channel, onChannelChange }: { summary: SummaryResponse | null; loading: boolean; counts: CountsResponse | null; channel: Channel; onChannelChange: (v: Channel) => void }) {
function TopBookCard({
  summary,
  loading,
  counts,
}: {
  summary: SummaryResponse | null;
  loading: boolean;
  counts: CountsResponse | null;
}) {
  // Get the top book - accept items with revenue OR quantity
  const topBook = useMemo(() => {
    console.log("📚 All topItems received:", summary?.topItems);

    const validBooks =
      summary?.topItems?.filter(
        (item) =>
          item && // Item exists
          item.title && // Has a title
          item.total > 0 // Has revenue (qty can be 0)
      ) || [];

    console.log("🔍 Filtered valid books:", validBooks);
    return validBooks[0] || null;
  }, [summary]);

  // Calculate growth percentage based on contribution to total revenue
  const growthPercent = useMemo(() => {
    if (!topBook || !counts?.totalAmount) return 0;
    return Math.round((topBook.total / counts.totalAmount) * 100);
  }, [topBook, counts]);

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[16px] text-[#000000]">Top Book</span>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <SegmentedTabs value={channel} onChange={onChannelChange} />
            <span className="font-semibold text-[#43547E] text-[16px]">This Period</span>
        <div className="flex items-center">
          <span className="font-semibold text-[16px] text-[#000000]">
            Top Book
          </span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#43547E] text-[16px]">
              This Period
            </span>
          </div>
        </div>
      }
      hoverable
      footer={
        <FooterButton onClick={() => (window.location.href = "/dashboard")}>
          See More
        </FooterButton>
      }
    >
      {loading ? (
        <div className="animate-pulse flex items-start gap-5">
          <div className="h-16 w-12 bg-gray-200 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ) : topBook ? (
        <div className="flex items-start gap-5">
          <div className="h-16 w-12 rounded-md bg-gradient-to-br from-indigo-100 to-purple-200 flex items-center justify-center text-2xl font-bold text-indigo-700 shadow-sm">
            {topBook.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900">{topBook.title}</div>
            <div className="text-sm text-gray-600">
              {topBook.author || "Author not specified"}
            </div>
            <div className="mt-1 space-y-1">
              {(topBook.isbn || topBook.language) && (
                <p className="text-xs text-gray-500">
                  {topBook.isbn && (
                    <>
                      <span className="font-semibold text-[#43547E]">
                        ISBN:
                      </span>{" "}
                      {topBook.isbn}
                      {topBook.language && " • "}
                    </>
                  )}
                  {topBook.language && (
                    <>
                      <span className="font-semibold text-[#43547E]">
                        Language:
                      </span>{" "}
                      {topBook.language}
                    </>
                  )}
                </p>
              )}
              <p className="text-xs text-gray-500">
                {topBook.qty > 0 && (
                  <>
                    <span className="font-semibold text-[#43547E]">Sold:</span>{" "}
                    {topBook.qty} units •{" "}
                  </>
                )}
                <span className="font-semibold text-[#43547E]">Revenue:</span>{" "}
                {formatINR(topBook.total)}
              </p>
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-3xl font-extrabold text-[#43547E] inline-flex items-center gap-1">
              {growthPercent}%
              <ArrowUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-[13px] text-gray-500 text-left">
              {formatINR(topBook.total)}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-6">
          <div className="text-2xl mb-2">📚</div>
          <div className="text-sm font-medium">No sales data available</div>
          <div className="text-xs mt-1">
            Start selling to see your top books!
          </div>
        </div>
      )}
    </Card>
  );
}

function TopAuthorCard({ summary, loading, days, channel, onChannelChange }: { summary: SummaryResponse | null; loading: boolean; days: number; channel: Channel; onChannelChange: (v: Channel) => void }) {
function TopAuthorCard({
  summary,
  loading,
}: {
  summary: SummaryResponse | null;
  loading: boolean;
}) {
  // Aggregate sales by author from real data and pick a single top author
  const topAuthor = useMemo(() => {
    if (!summary?.topItems || summary.topItems.length === 0) return null;

    const validItems = summary.topItems.filter(
      (item) => item && item.title && item.total > 0
    );
    if (validItems.length === 0) return null;

    const authorSales = new Map<
      string,
      { total: number; qty: number; books: number }
    >();
    validItems.forEach((item) => {
      const author =
        item.author && item.author.trim() !== ""
          ? item.author
          : "Unknown Author";
      const current = authorSales.get(author) || { total: 0, qty: 0, books: 0 };
      current.total += item.total;
      current.qty += item.qty;
      current.books += 1;
      authorSales.set(author, current);
    });

    const allAuthors = Array.from(authorSales.entries()).sort(
      (a, b) => b[1].total - a[1].total
    );
    const knownAuthor = allAuthors.find(([name]) => name !== "Unknown Author");
    const topEntry = knownAuthor || allAuthors[0];
    if (!topEntry) return null;

    const [name, stats] = topEntry;
    const totalRevenue = validItems.reduce((sum, item) => sum + item.total, 0);
    const contributionPercent =
      totalRevenue > 0 ? Math.round((stats.total / totalRevenue) * 100) : 0;

    return {
      name,
      books: stats.books,
      totalQty: stats.qty,
      contributionPercent,
    };
  }, [summary]);

  // Fallback enrichment: if we don't have a known author, try inferring from latest orders
  const [enriched, setEnriched] = useState<{
    name: string; books: number; totalQty: number; contributionPercent: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (topAuthor && topAuthor.name !== 'Unknown Author') { setEnriched(null); return; }
      try {
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);
        const qs = new URLSearchParams({ limit: String(1500), startDate: since.toISOString(), endDate: now.toISOString() }).toString();

        type ListItem = { title?: string|null; qty?: number|null; amount?: number|null; rate?: number|null; rawJson?: Record<string, any> };
        type ListResp = { ok: boolean; items: ListItem[] };

        // Fetch only what is needed for the selected channel
        let o: ListResp | null = null;
        let f: ListResp | null = null;
        if (channel === 'online') {
          o = await apiClient.get<ListResp>(`online-sales?${qs}`);
        } else if (channel === 'offline') {
          f = await apiClient.get<ListResp>(`offline-sales?${qs}`);
        } else {
          [o, f] = await Promise.all([
            apiClient.get<ListResp>(`online-sales?${qs}`),
            apiClient.get<ListResp>(`offline-sales?${qs}`),
          ]);
        }

        const extractAuthor = (raw?: Record<string, any>, title?: string|null): string | null => {
          if (raw) {
            const candidates = [
              'Author','author','AUTHOR','Author Name','AuthorName','Author(s)',
              'Writer','writer','Writer Name','WriterName','WRITER','AUTHORS','AUTH'
            ];
            for (const k of Object.keys(raw)) {
              if (candidates.some(c => c.toLowerCase() === k.toLowerCase())) {
                const v = (raw as any)[k];
                if (typeof v === 'string' && v.trim()) return v.trim();
              }
            }
          }
          // Heuristic: look for " by " in title
          const t = (title || '').toString();
          const byIdx = t.toLowerCase().lastIndexOf(' by ');
          if (byIdx > -1) {
            const guess = t.slice(byIdx + 4).trim();
            if (guess) return guess;
          }
          return null;
        };

        const num = (v: any): number => {
          if (v == null || v === '') return 0;
          const n = typeof v === 'string' ? Number(v.replace(/[\s,]/g, '')) : Number(v);
          return Number.isFinite(n) ? n : 0;
        };

        const computeAmount = (it: ListItem): number => {
          const d = num(it.amount);
          if (d) return d;
          const r = num(it.rate); const q = num(it.qty);
          return r * q;
        };

        const authorAgg = new Map<string, { total: number; qty: number; books: number }>();
        const seenTitles = new Map<string, Set<string>>();
        const all = [...(o?.items || []), ...(f?.items || [])];
        for (const it of all) {
          const a = extractAuthor(it.rawJson, it.title);
          if (!a) continue;
          const key = a.trim();
          const cur = authorAgg.get(key) || { total: 0, qty: 0, books: 0 };
          cur.total += computeAmount(it);
          cur.qty += num(it.qty);
          // unique title per author
          const t = (it.title || '').toString().trim();
          if (t) {
            const set = seenTitles.get(key) || new Set<string>();
            if (!set.has(t)) { cur.books += 1; set.add(t); seenTitles.set(key, set); }
          }
          authorAgg.set(key, cur);
        }

        const arr = Array.from(authorAgg.entries()).sort((a,b) => (b[1].total - a[1].total) || (b[1].qty - a[1].qty));
        const best = arr[0];
        if (!best) { setEnriched(null); return; }

        const totalRevenue = Array.from(authorAgg.values()).reduce((s, x) => s + x.total, 0) || 1;
        const pct = Math.round((best[1].total / totalRevenue) * 100);
        if (!cancelled) setEnriched({ name: best[0], books: best[1].books, totalQty: best[1].qty, contributionPercent: pct });
      } catch (e) {
        if (!cancelled) setEnriched(null);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [topAuthor, days, channel]);

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#000000] text-[16px]">Top Author</span>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <SegmentedTabs value={channel} onChange={onChannelChange} />
            <span className="font-semibold text-[#43547E] text-[16px]">This Period</span>
        <div className="flex items-center">
          <span className="font-semibold text-[#000000] text-[16px]">
            Top Author
          </span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#43547E] text-[16px]">
              This Period
            </span>
          </div>
        </div>
      }
      hoverable
      footer={
        <FooterButton onClick={() => (window.location.href = "/dashboard")}>
          See More
        </FooterButton>
      }
    >
      {loading ? (
        <div className="animate-pulse flex items-start gap-3">
          <div className="h-12 w-12 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
      ) : (topAuthor && topAuthor.name !== 'Unknown Author') ? (
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-xl font-bold text-green-700 shadow-sm">
            {topAuthor.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900">{topAuthor.name}</div>
            <div className="text-xs text-gray-600">
              {topAuthor.books} book{topAuthor.books !== 1 ? "s" : ""} in top 10
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-3xl font-extrabold text-[#43547E] inline-flex items-center gap-1">
              {topAuthor.contributionPercent}%
              <ArrowUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-[11px] text-gray-500">
              {topAuthor.totalQty > 0
                ? `${topAuthor.totalQty} units sold`
                : "Top seller"}
            </div>
          </div>
        </div>
      ) : enriched ? (
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-xl font-bold text-green-700 shadow-sm">
            {enriched.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900">{enriched.name}</div>
            <div className="text-xs text-gray-600">{enriched.books} book{enriched.books !== 1 ? 's' : ''} in top 10</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-3xl font-extrabold text-[#43547E] inline-flex items-center gap-1">
              {enriched.contributionPercent}%
              <ArrowUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-[11px] text-gray-500">
              {enriched.totalQty > 0 ? `${enriched.totalQty} units sold` : 'Top seller'}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-6">
          <div className="text-2xl mb-2">✍️</div>
          <div className="text-sm font-medium">No author data available</div>
          <div className="text-xs mt-1">
            Authors will appear as sales data grows
          </div>
        </div>
      )}
    </Card>
  );
}

function InventoryCard({
  summary,
  loading,
}: {
  summary: SummaryResponse | null;
  loading: boolean;
}) {
  // Get top items that might need restocking based on high sales
  const inventoryItems = useMemo(() => {
    if (!summary?.topItems || summary.topItems.length === 0) return [];

    // Filter out invalid items - accept items with revenue (qty can be 0)
    const validItems = summary.topItems.filter(
      (item) =>
        item && // Item exists
        item.title && // Has a title
        item.total > 0 // Has revenue
    );

    console.log("📦 Valid items for inventory:", validItems);

    if (validItems.length === 0) return [];

    return validItems.slice(0, 2).map((item, idx) => {
      // Estimate days left based on qty sold (simple heuristic: high sales = low days left)
      const daysLeft =
        item.qty > 50
          ? Math.ceil(30 / (item.qty / 30))
          : Math.max(5, Math.ceil(Math.random() * 10));
      const available = Math.max(10, Math.floor(100 - item.qty * 0.5)); // Estimate stock based on sales

      return {
        id: idx + 1,
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        available,
        daysLeft: `${Math.max(0.5, daysLeft).toFixed(1)} days left`,
        qtySold: item.qty,
        revenue: item.total,
        alert: {
          tone: idx === 0 ? ("red" as const) : ("amber" as const),
          text: "Refill your stock for smooth operation",
        },
      };
    });
  }, [summary]);

  return (
    <Card
      title={
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#000000]">Inventory</span>
          <Pill tone="red">Critical</Pill>
        </div>
      }
      className="flex items-stretch flex-col"
      hoverable
      footer={<FooterButton>Know More</FooterButton>}
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl bg-gray-100 p-3 h-32"
            />
          ))}
        </div>
      ) : inventoryItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {inventoryItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[#F3F6FD]/60 border border-black/10 p-3 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="h-20 w-16 rounded-md bg-gradient-to-br from-orange-100 to-red-200 flex items-center justify-center text-2xl font-bold text-orange-700 shadow-sm">
                  {item.title.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="font-semibold text-[#163060] truncate"
                    title={item.title}
                  >
                    {item.title}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {item.author || "Author not specified"}
                  </div>
                  {item.isbn && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      ISBN: {item.isbn}
                    </div>
                  )}
                  <div className="text-xs text-gray-600 mt-1">
                    {item.qtySold > 0 ? (
                      <span>
                        <span className="font-semibold text-[#163060]">
                          Sold:
                        </span>{" "}
                        {item.qtySold} units
                      </span>
                    ) : (
                      <span>
                        <span className="font-semibold text-[#163060]">
                          Revenue:
                        </span>{" "}
                        {formatINR(item.revenue)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="text-[11px] text-[#C03548] font-semibold">
                      Stock Available (Est.)
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-2xl font-extrabold text-[#971A34]">
                        {item.available}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {item.daysLeft}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* alert strip */}
              <div
                className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium flex items-start gap-2 ${
                  item.alert.tone === "red"
                    ? "bg-[#FDEBEE] text-[#A12B3A]"
                    : "bg-[#FFF4DE] text-[#A35C00]"
                }`}
              >
                <span className="mt-0.5">•</span>
                <span>{item.alert.text}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <div className="text-3xl mb-2">📦</div>
          <div className="text-sm font-medium">No inventory alerts</div>
          <div className="text-xs mt-1">
            Your best-selling items will appear here
          </div>
        </div>
      )}
    </Card>
  );
}

function TopLocationsCard({ days }: { days: number }) {
  type SaleItem = {
    amount?: number | null;
    customerName?: string | null;
    mobile?: string | null;
    rawJson: Record<string, any>;
  };

  type LocationRow = {
    pincode: string;
    city: string;
    state: string;
    totalAmount: number;
    orderCount: number;
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LocationRow[]>([]);

  // Helpers similar to Geo Insights page
  function extractValueFlexible(
    obj: Record<string, any>,
    candidates: string[]
  ): string | null {
    if (!obj) return null;
    const lowerMap = new Map<string, any>();
    for (const [k, v] of Object.entries(obj)) lowerMap.set(k.toLowerCase(), v);
    for (const name of candidates) {
      const key = name.toLowerCase();
      if (lowerMap.has(key)) {
        const v = lowerMap.get(key);
        if (v != null && String(v).trim()) return String(v).trim();
      }
    }
    const addr =
      (obj as any).address ||
      (obj as any).Address ||
      (obj as any).shippingAddress ||
      (obj as any).billingAddress;
    if (addr && typeof addr === "object") {
      return extractValueFlexible(addr as Record<string, any>, candidates);
    }
    return null;
  }

  function normalizeText(v?: string | null): string | null {
    if (!v) return null;
    const s = String(v).replace(/\s+/g, " ").trim();
    if (!s) return null;
    return s
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  }

  function normalizePincode(raw?: string | null): string | null {
    if (!raw) return null;
    const digits =
      String(raw)
        .match(/\d{3,}/g)
        ?.join("") || "";
    if (digits.length >= 6) return digits.slice(-6);
    return digits || null;
  }

  function extractPincodeFromText(text?: string | null): string | null {
    if (!text) return null;
    const m = String(text).match(/\b(\d{6})\b/);
    return m ? m[1] : null;
  }

  useEffect(() => {
    async function fetchTopLocations() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);
        const qs = new URLSearchParams({
          limit: "1000",
          startDate: since.toISOString(),
          endDate: now.toISOString(),
        }).toString();

        const [onlineRes, offlineRes, lokRes, rajradhaRes] =
          await Promise.allSettled([
            apiClient.get<{ items: SaleItem[] }>(`online-sales?${qs}`),
            apiClient.get<{ items: SaleItem[] }>(`offline-sales?${qs}`),
            apiClient.get<{ items: SaleItem[] }>(`lok-event-sales?${qs}`),
            apiClient.get<{ items: SaleItem[] }>(`rajradha-event-sales?${qs}`),
          ]);

        const items: SaleItem[] = [];
        if (onlineRes.status === "fulfilled")
          items.push(...onlineRes.value.items);
        if (offlineRes.status === "fulfilled")
          items.push(...offlineRes.value.items);
        if (lokRes.status === "fulfilled") items.push(...lokRes.value.items);
        if (rajradhaRes.status === "fulfilled")
          items.push(...rajradhaRes.value.items);

        // Aggregate by pincode-city-state
        const map = new Map<string, LocationRow>();
        items.forEach((sale) => {
          const raw = sale.rawJson || {};
          const pincode =
            normalizePincode(
              extractValueFlexible(raw, [
                "pincode",
                "pin code",
                "postal code",
                "postcode",
                "shipping pincode",
                "billing pincode",
                "delivery pincode",
                "p.o. code",
              ]) ||
                extractPincodeFromText(
                  extractValueFlexible(raw, [
                    "address",
                    "shipping address",
                    "billing address",
                    "delivery address",
                  ]) || ""
                )
            ) || "Unknown";
          const city =
            normalizeText(
              extractValueFlexible(raw, [
                "city",
                "town",
                "district",
                "shipping city",
                "billing city",
                "delivery city",
                "place",
              ])
            ) || "Unknown";
          const state =
            normalizeText(
              extractValueFlexible(raw, [
                "state",
                "province",
                "region",
                "state/province",
                "shipping state",
                "billing state",
                "delivery state",
              ])
            ) || "Unknown";
          const amount = sale.amount ? Number(sale.amount) : 0;

          const key = `${pincode}-${city}-${state}`;
          const ex = map.get(key);
          if (ex) {
            ex.totalAmount += amount;
            ex.orderCount += 1;
          } else {
            map.set(key, {
              pincode,
              city,
              state,
              totalAmount: amount,
              orderCount: 1,
            });
          }
        });

        const all = Array.from(map.values());
        const top5 = all
          .filter((r) => r.pincode !== "Unknown")
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 5);
        setRows(top5);
      } catch (e: any) {
        setError(e?.message || "Failed to load locations");
      } finally {
        setLoading(false);
      }
    }
    fetchTopLocations();
  }, [days]);

  return (
    <Card
      title={
        <span className="font-semibold text-[#000000]">
          Top 5 Performing Locations
        </span>
      }
      className=""
      footer={
        <Link to="/inventory#geo-table">
          <FooterButton>View more</FooterButton>
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-1.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-xs text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-gray-500">No location data available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="py-1 pr-2 text-left font-medium">#</th>
                <th className="py-1 pr-2 text-left font-medium">Pincode</th>
                <th className="py-1 pr-2 text-left font-medium">City</th>
                <th className="py-1 pr-2 text-left font-medium">State</th>
                <th className="py-1 pl-2 text-right font-medium">Sales</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.pincode}-${r.city}-${r.state}`}
                  className="border-t border-gray-100"
                >
                  <td className="py-1 pr-2">{idx + 1}</td>
                  <td className="py-1 pr-2 font-semibold text-gray-900">
                    {r.pincode}
                  </td>
                  <td className="py-1 pr-2 text-gray-700">{r.city}</td>
                  <td className="py-1 pr-2 text-gray-700">{r.state}</td>
                  <td className="py-1 pl-2 text-right font-semibold text-gray-900">
                    {formatINR(r.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SocialMediaCard() {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="font-semibold">Social Media</span>
          <Pill tone="green">All Good</Pill>
        </div>
      }
      className=""
      hoverable
      footer={<FooterButton>Know More</FooterButton>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Panel 1 - Instagram */}
        <div className="rounded-xl border border-black/10 p-3 hover:shadow-md transition-all">
          <div className="flex flex-col items-center gap-1 text-xs font-medium text-gray-700 mb-3">
            <CameraIcon className="w-5 h-5" />
            <span>Instagram</span>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg bg-[#EAF1FF] px-3 py-2">
              <div className="text-2xl font-extrabold text-gray-900">+835</div>
              <div className="text-[11px] text-gray-600">Followers</div>
            </div>
            <div className="rounded-lg bg-[#EAF1FF] px-3 py-2">
              <div className="text-2xl font-extrabold text-gray-900">+20%</div>
              <div className="text-[11px] text-gray-600">Views</div>
            </div>
          </div>
        </div>

        {/* Panel 2 - Facebook */}
        <div className="rounded-xl border border-black/10 p-3 hover:shadow-md transition-all">
          <div className="flex flex-col items-center gap-1 text-xs font-medium text-gray-700 mb-3">
            <FacebookIcon className="w-5 h-5" />
            <span>Facebook</span>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg bg-[#EAF1FF] px-3 py-2">
              <div className="text-2xl font-extrabold text-gray-900">+635</div>
              <div className="text-[11px] text-gray-600">Followers</div>
            </div>
            <div className="rounded-lg bg-[#EAF1FF] px-3 py-2">
              <div className="text-2xl font-extrabold text-gray-900">+15%</div>
              <div className="text-[11px] text-gray-600">Engagement</div>
            </div>
          </div>
        </div>

        {/* Panel 3 - Twitter/X */}
        <div className="rounded-xl border border-black/10 p-3 hover:shadow-md transition-all">
          <div className="flex flex-col items-center gap-1 text-xs font-medium text-gray-700 mb-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Twitter/X</span>
          </div>
          <div className="space-y-2">
            <div className="rounded-lg bg-[#EAF1FF] px-3 py-2">
              <div className="text-2xl font-extrabold text-gray-900">+1.2K</div>
              <div className="text-[11px] text-gray-600">Followers</div>
            </div>
            <div className="rounded-lg bg-[#EAF1FF] px-3 py-2">
              <div className="text-2xl font-extrabold text-gray-900">+25%</div>
              <div className="text-[11px] text-gray-600">Impressions</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/*******************\
|* Page Entry Point *|
\*******************/
export default function HindiBooksSalesDashboard() {
  const [days, setDays] = useState(90);
  const [summary, setSummary] = useState<SummaryResponse | null>(null); // combined summary
  const [counts, setCounts] = useState<CountsResponse | null>(null); // combined counts
  const [onlineSummary, setOnlineSummary] = useState<SummaryResponse | null>(null);
  const [offlineSummary, setOfflineSummary] = useState<SummaryResponse | null>(null);
  const [onlineCounts, setOnlineCounts] = useState<CountsResponse | null>(null);
  const [offlineCounts, setOfflineCounts] = useState<CountsResponse | null>(null);
  const [topChannel, setTopChannel] = useState<Channel>('online');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ days: String(days) }).toString();
      const [onlineSum, onlineCnt, offlineSum, offlineCnt] = await Promise.all([
        apiClient.get<SummaryResponse>(`online-sales/summary?${qs}`),
        apiClient.get<CountsResponse>(`online-sales/counts?${qs}`),
        apiClient.get<SummaryResponse>(`offline-sales/summary?${qs}`),
        apiClient.get<CountsResponse>(`offline-sales/counts?${qs}`),
      ]);

      // Debug: Log what we received
      console.log('📊 Online summary:', onlineSum);
      console.log('📈 Online counts:', onlineCnt);
      console.log('🧾 Offline summary:', offlineSum);
      console.log('🧮 Offline counts:', offlineCnt);

      setOnlineSummary(onlineSum);
      setOfflineSummary(offlineSum);
      setOnlineCounts(onlineCnt);
      setOfflineCounts(offlineCnt);

      // Build combined counts
      const combinedCounts: CountsResponse = {
        ok: true,
        totalCount: (onlineCnt?.totalCount || 0) + (offlineCnt?.totalCount || 0),
        totalAmount: (onlineCnt?.totalAmount || 0) + (offlineCnt?.totalAmount || 0),
        uniqueCustomers: (onlineCnt?.uniqueCustomers || 0) + (offlineCnt?.uniqueCustomers || 0),
        refundCount: (onlineCnt?.refundCount || 0) + (offlineCnt?.refundCount || 0),
      };

      // Combine summaries: merge time series and top items
      const seriesMap = new Map<string, number>();
      for (const r of onlineSum?.timeSeries || []) seriesMap.set(r.date, (seriesMap.get(r.date) || 0) + (r.total || 0));
      for (const r of offlineSum?.timeSeries || []) seriesMap.set(r.date, (seriesMap.get(r.date) || 0) + (r.total || 0));
      const timeSeries = Array.from(seriesMap.entries())
        .sort(([a],[b]) => a < b ? -1 : 1)
        .map(([date,total]) => ({ date, total }));

      const topMap = new Map<string, { total: number; qty: number; author?: string; isbn?: string; language?: string }>();
      const addTop = (arr?: SummaryResponse['topItems']) => {
        (arr || []).forEach((i) => {
          const key = i.title || 'Untitled';
          const cur = topMap.get(key) || { total: 0, qty: 0 };
          cur.total += i.total || 0;
          cur.qty += i.qty || 0;
          // Fill missing metadata from any source encountered
          if (!cur.author && i.author) cur.author = i.author;
          if (!cur.isbn && i.isbn) cur.isbn = i.isbn;
          if (!cur.language && i.language) cur.language = i.language;
          topMap.set(key, cur);
        });
      };
      addTop(onlineSum?.topItems);
      addTop(offlineSum?.topItems);
      const topItems = Array.from(topMap.entries())
        .map(([title, v]) => ({ title, total: v.total, qty: v.qty, author: v.author, isbn: v.isbn, language: v.language }))
        .sort((a, b) => (b.total || 0) - (a.total || 0))
        .slice(0, 10);

      const combinedSummary: SummaryResponse = {
        ok: true,
        // Provide a simple paymentMode-like breakdown to feed the info chip
        paymentMode: [
          { paymentMode: 'Online', total: onlineCnt?.totalAmount || 0 },
          { paymentMode: 'Offline', total: offlineCnt?.totalAmount || 0 },
        ],
        timeSeries,
        topItems,
      };

      setSummary(combinedSummary);
      setCounts(combinedCounts);
      console.log("📊 Summary data received:", summaryData);
      console.log("📈 Counts data received:", countsData);
      console.log("📚 Top items:", summaryData?.topItems);

      setSummary(summaryData);
      setCounts(countsData);
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.details ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to load data";
      setError(errorMsg);
      console.error("Failed to fetch dashboard data:", e);
      console.error("Error response:", e?.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  return (
    <main className="mx-auto w-full min-h-screen p-4 text-slate-800 dark:text-slate-100">
      {error && (
        <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 flex items-center gap-2 flex-shrink-0">
          <IoMdInformationCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">
            {error} - Showing cached data if available.
          </span>
        </div>
      )}

      {/* Row 1: Revenue + (Top Book, Top Author) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7">
          <RevenueCard
            days={days}
            setDays={setDays}
            onlineSummary={onlineSummary}
            offlineSummary={offlineSummary}
            onlineCounts={onlineCounts}
            offlineCounts={offlineCounts}
            loading={loading}
            onRefresh={fetchData}
          />
        </div>
        <div className="grid gap-4">
          <TopBookCard
            summary={topChannel==='online'? onlineSummary : topChannel==='offline'? offlineSummary : summary}
            loading={loading}
            counts={topChannel==='online'? onlineCounts : topChannel==='offline'? offlineCounts : counts}
            channel={topChannel}
            onChannelChange={setTopChannel}
          />
          <TopAuthorCard
            summary={topChannel==='online'? onlineSummary : topChannel==='offline'? offlineSummary : summary}
            loading={loading}
            days={days}
            channel={topChannel}
            onChannelChange={setTopChannel}
          />
        <div className="lg:col-span-5 grid grid-cols-1 gap-3">
          <TopBookCard summary={summary} loading={loading} counts={counts} />
          <TopAuthorCard summary={summary} loading={loading} />
        </div>
      </div>

      {/* Row 2: Top Performing Locations + Social Media */}
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7">
          <TopLocationsCard days={days} />
        </div>
        <div className="lg:col-span-5">
          <SocialMediaCard />
        </div>
      </div>

      {/* Row 3: Inventory full-width last */}
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-12">
          <InventoryCard summary={summary} loading={loading} />
        </div>
      </div>
    </main>
  );
}
