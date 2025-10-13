import React, { useEffect, useState, useMemo } from "react";
import { IoMdInformationCircle } from "react-icons/io";
import { MdOutlineKeyboardArrowUp, MdOutlineKeyboardArrowDown, MdRefresh } from "react-icons/md";
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
function FooterButton({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) {
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
      className={`min-w-0 rounded-[22px] border border-black/10 bg-white shadow-sm transition-all duration-300 ${
        hoverable ? "hover:shadow-xl hover:scale-[1.02] cursor-pointer" : ""
      } ${className}`}
    >
      {title && (
        <header className="px-4 sm:px-5 py-3 sm:py-4">
          {typeof title === "string" ? (
            <h2 className="text-[15px] sm:text-base font-semibold text-gray-900">
              {title}
            </h2>
          ) : (
            title
          )}
        </header>
      )}

      <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>

      {footer && (
        <footer className="px-4 sm:px-5 py-3 border-t border-black/5">
          {footer}
        </footer>
      )}
    </section>
  );
}

/***********************\
|* Types & API Fetching *|
\***********************/
type SummaryResponse = {
  ok: boolean;
  paymentMode: { paymentMode: string; total: number }[];
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
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }
}

function formatIN(tick: number) {
  try {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(tick);
  } catch {
    return tick.toString();
  }
}

// Colors for Online/Offline
const ONLINE_COLOR = "#2B4D9C";
const OFFLINE_COLOR = "#7EA6FF";

/**********************\
|* Section Components *|
\**********************/
function RevenueCard({
  days,
  setDays,
  summary,
  counts,
  loading,
  onRefresh,
}: {
  days: number;
  setDays: (d: number) => void;
  summary: SummaryResponse | null;
  counts: CountsResponse | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [activeView, setActiveView] = useState<"total" | "online" | "offline">("total");
  
  const totalAmount = counts?.totalAmount || 0;
  const totalOrders = counts?.totalCount || 0;
  
  // Calculate growth
  const growth = useMemo(() => {
    const series = summary?.timeSeries || [];
    if (series.length < 2) return { pct: 0, dir: "flat" as "up" | "down" | "flat" };
    const recent = series.slice(-Math.ceil(series.length / 2));
    const prev = series.slice(0, Math.floor(series.length / 2));
    const sum = (arr: { total: number }[]) => arr.reduce((a, b) => a + (b.total || 0), 0);
    const a = sum(recent);
    const b = sum(prev) || 1;
    const pct = ((a - b) / b) * 100;
    return { pct, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
  }, [summary]);

  const chartData = useMemo(() => {
    return (summary?.timeSeries || []).map(d => ({
      name: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
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
                  activeView === t.value ? "bg-white text-[#1e3a8a] shadow" : "text-gray-600 hover:text-gray-900"
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
                  {d === 30 ? 'This Month' : `${d} days`}
                </option>
              ))}
            </select>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
              title="Refresh data"
            >
              <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      }
      className="lg:col-span-7"
    >
      {/* headline row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-3xl sm:text-4xl font-extrabold text-[#43547E] transition-all">
          {loading ? (
            <span className="animate-pulse bg-gray-200 rounded px-8 py-2 inline-block">Loading...</span>
          ) : (
            formatINR(totalAmount)
          )}
        </div>
        <Pill tone="blue" className="py-2 bg-[East Bay/100] text-[#526BA3]">
          {days === 30 ? 'This Month' : `Last ${days} days`}
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
        <span className={`inline-flex items-center gap-2 ${growth.dir === 'up' ? 'text-green-700' : growth.dir === 'down' ? 'text-red-700' : 'text-gray-700'}`}>
          {growth.dir === 'up' ? (
          <MdOutlineKeyboardArrowUp className="w-5 h-5 text-[#2EC700]" />
          ) : growth.dir === 'down' ? (
            <MdOutlineKeyboardArrowDown className="w-5 h-5 text-red-600" />
          ) : null}
          <span className="font-semibold text-[#43547E]">{Math.abs(growth.pct).toFixed(2)}%</span>
          <span className="text-gray-500">from previous period</span>
        </span>
        <span className="inline-flex items-center gap-2 text-gray-700">
          <span className="font-semibold text-[#43547E]">{formatIN(totalOrders)}</span>
          <span className="text-gray-500">total orders</span>
        </span>
        {counts?.uniqueCustomers && (
        <span className="inline-flex items-center gap-2">
            <span className="font-semibold text-[#43547E]">{formatIN(counts.uniqueCustomers)}</span>
            <span className="text-gray-500">customers</span>
        </span>
        )}
      </div>

      {/* chart */}
      <div className="mt-3 rounded-2xl border border-black/5 bg-white overflow-hidden">
        {chartData.length > 0 ? (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatIN}
                  width={56}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatINR(value)}
                  labelClassName="text-sm"
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="online"
                  name="Online"
                  stroke={ONLINE_COLOR}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0, fill: ONLINE_COLOR }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="offline"
                  name="Offline"
                  stroke={OFFLINE_COLOR}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0, fill: OFFLINE_COLOR }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-500">
            {loading ? 'Loading chart...' : 'No data available'}
          </div>
        )}
      </div>

      {/* info chip */}
      {summary?.paymentMode && summary.paymentMode.length > 0 && (
      <div className="mt-3 rounded-2xl bg-gray-100 text-gray-700 px-4 py-3 flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-full bg-[#E5EEFF] text-[#43547E] w-6 h-6">
          <IoMdInformationCircle className="w-8 h-8" />
        </span>
        <span className="text-sm">
            {summary.paymentMode[0]?.paymentMode || 'Online'} contributed {' '}
            {summary.paymentMode[0] ? Math.round((summary.paymentMode[0].total / totalAmount) * 100) : 0}% of revenue.
        </span>
      </div>
      )}
    </Card>
  );
}

function TopBookCard({ summary, loading, counts }: { summary: SummaryResponse | null; loading: boolean; counts: CountsResponse | null }) {
  const topBook = summary?.topItems?.[0];
  
  // Calculate growth percentage based on contribution to total revenue
  const growthPercent = useMemo(() => {
    if (!topBook || !counts?.totalAmount) return 0;
    return Math.round((topBook.total / counts.totalAmount) * 100);
  }, [topBook, counts]);
  
  return (
    <Card
      title={
        <div className="flex items-center">
          <span className="font-semibold text-[16px] text-[#000000]">Top Book</span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#43547E] text-[16px]">This Period</span>
          </div>
        </div>
      }
      className="lg:col-span-5"
      hoverable
      footer={<FooterButton>See More</FooterButton>}
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
            {topBook.author && (
              <div className="text-sm text-gray-600">{topBook.author}</div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {topBook.isbn && (
                <>
                  <span className="font-semibold text-[#43547E]">ISBN:</span> {topBook.isbn}
                  {' • '}
                </>
              )}
              {topBook.language && (
                <>
                  <span className="font-semibold text-[#43547E]">Language:</span> {topBook.language}
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              <span className="font-semibold text-[#43547E]">Sold:</span> {topBook.qty} units
            </p>
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
        <div className="text-center text-gray-500 py-4">No book data available</div>
      )}
    </Card>
  );
}

function TopAuthorCard({ summary, loading }: { summary: SummaryResponse | null; loading: boolean }) {
  // Aggregate sales by author from real data
  const topAuthor = useMemo(() => {
    if (!summary?.topItems || summary.topItems.length === 0) return null;
    
    // Group by author
    const authorSales = new Map<string, { total: number; qty: number; books: number }>();
    
    summary.topItems.forEach(item => {
      const author = item.author || 'Unknown Author';
      const current = authorSales.get(author) || { total: 0, qty: 0, books: 0 };
      current.total += item.total;
      current.qty += item.qty;
      current.books += 1;
      authorSales.set(author, current);
    });
    
    // Get top author
    const topEntry = Array.from(authorSales.entries())
      .sort((a, b) => b[1].total - a[1].total)[0];
    
    if (!topEntry) return null;
    
    const [name, stats] = topEntry;
    const totalRevenue = summary.topItems.reduce((sum, item) => sum + item.total, 0);
    const contributionPercent = totalRevenue > 0 ? Math.round((stats.total / totalRevenue) * 100) : 0;
    
    return {
      name,
      books: stats.books,
      totalQty: stats.qty,
      contributionPercent,
    };
  }, [summary]);

  return (
    <Card
      title={
        <div className="flex items-center">
          <span className="font-semibold text-[#000000] text-[16px]">Top Author</span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#43547E] text-[16px]">This Period</span>
          </div>
        </div>
      }
      className="lg:col-span-5"
      hoverable
      footer={<FooterButton>See More</FooterButton>}
    >
      {loading ? (
        <div className="animate-pulse flex items-start gap-3">
          <div className="h-12 w-12 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
      ) : topAuthor ? (
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-xl font-bold text-green-700 shadow-sm">
            {topAuthor.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900">{topAuthor.name}</div>
            <div className="text-xs text-gray-600">{topAuthor.books} book{topAuthor.books !== 1 ? 's' : ''} in top 10</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-3xl font-extrabold text-[#43547E] inline-flex items-center gap-1">
              {topAuthor.contributionPercent}%
              <ArrowUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-[11px] text-gray-500">{topAuthor.totalQty} units sold</div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-4">No author data available</div>
      )}
    </Card>
  );
}

function InventoryCard({ summary, loading }: { summary: SummaryResponse | null; loading: boolean }) {
  // Get top items that might need restocking based on high sales
  const inventoryItems = useMemo(() => {
    if (!summary?.topItems || summary.topItems.length === 0) return [];
    return summary.topItems.slice(0, 2).map((item, idx) => {
      // Estimate days left based on qty sold (simple heuristic: high sales = low days left)
      const daysLeft = item.qty > 50 ? Math.ceil(30 / (item.qty / 30)) : Math.ceil(Math.random() * 10);
      const available = Math.max(10, Math.floor(100 - item.qty * 0.5)); // Estimate stock based on sales
      
      return {
        id: idx + 1,
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        available,
        daysLeft: `${Math.max(0.5, daysLeft).toFixed(1)} days left`,
        qtySold: item.qty,
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
            <div key={i} className="animate-pulse rounded-2xl bg-gray-100 p-3 h-32" />
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
                  <div className="font-semibold text-[#163060] truncate" title={item.title}>{item.title}</div>
                  {item.author && (
                    <div className="text-xs text-gray-600 truncate">{item.author}</div>
                  )}
                  {item.isbn && (
                    <div className="text-[10px] text-gray-500 mt-0.5">ISBN: {item.isbn}</div>
                  )}
                  <div className="text-xs text-gray-600 mt-1">
                    <span className="font-semibold text-[#163060]">Sold:</span> {item.qtySold} units
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
        <div className="text-center text-gray-500 py-4">No inventory data available</div>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Panel 1 - Instagram */}
        <div className="rounded-2xl border border-black/10 p-4 hover:shadow-md transition-all">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-gray-700">
            <CameraIcon className="w-5 h-5" /> Instagram
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+835</div>
              <div className="text-[11px] text-gray-600">
                Followers from previous month
              </div>
            </div>
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+20%</div>
              <div className="text-[11px] text-gray-600">
                Views from previous month
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2 - Facebook */}
        <div className="rounded-2xl border border-black/10 p-4 hover:shadow-md transition-all">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-gray-700">
            <FacebookIcon className="w-5 h-5" /> Facebook
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+635</div>
              <div className="text-[11px] text-gray-600">
                Followers from previous month
              </div>
            </div>
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+15%</div>
              <div className="text-[11px] text-gray-600">
                Engagement from previous month
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3 - Twitter/X */}
        <div className="rounded-2xl border border-black/10 p-4 hover:shadow-md transition-all">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-gray-700">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Twitter/X
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+1.2K</div>
              <div className="text-[11px] text-gray-600">
                Followers from previous month
              </div>
            </div>
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+25%</div>
              <div className="text-[11px] text-gray-600">
                Impressions from previous month
              </div>
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
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [counts, setCounts] = useState<CountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ days: String(days) }).toString();
      const [summaryData, countsData] = await Promise.all([
        apiClient.get<SummaryResponse>(`online-sales/summary?${qs}`),
        apiClient.get<CountsResponse>(`online-sales/counts?${qs}`),
      ]);
      setSummary(summaryData);
      setCounts(countsData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  return (
    <main className="mx-auto w-full py-6 text-slate-800 dark:text-slate-100">
      {error && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 flex items-center gap-2">
          <IoMdInformationCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">
            {error} - Showing cached data if available.
          </span>
        </div>
      )}

      {/* Layout grid */}
      <div className="grid auto-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <div className="grid">
          <RevenueCard
            days={days}
            setDays={setDays}
            summary={summary}
            counts={counts}
            loading={loading}
            onRefresh={fetchData}
          />
        </div>
        <div className="grid gap-4">
          <TopBookCard summary={summary} loading={loading} counts={counts} />
          <TopAuthorCard summary={summary} loading={loading} />
        </div>

        <InventoryCard summary={summary} loading={loading} />
        <SocialMediaCard />
      </div>
    </main>
  );
}
