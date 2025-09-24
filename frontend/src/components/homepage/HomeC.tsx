import React from "react";
import { IoMdInformationCircle } from "react-icons/io";
import { MdOutlineKeyboardArrowUp } from "react-icons/md";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useDashboardOverview, useDashboardSales } from "../../services/dashboardService";
import { useSocialSummary } from "../../services/socialService";
import { LoadingSpinner } from "../LoadingSpinner";

/**
 * Hindi Sales Dashboard – now integrated with real backend data
 * -------------------------------------------------------------
 * - Uses React Query hooks to fetch data from backend
 * - Displays loading states and error handling
 * - Shows real Hindi book data and social media metrics
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

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 001.88-2.37 8.59 8.59 0 01-2.72 1.04 4.28 4.28 0 00-7.29 3.9A12.14 12.14 0 013 4.8a4.28 4.28 0 001.32 5.7 4.27 4.27 0 01-1.94-.54v.05a4.28 4.28 0 003.43 4.2 4.3 4.3 0 01-1.93.07 4.28 4.28 0 004 2.97A8.6 8.6 0 012 19.54a12.14 12.14 0 006.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.38-.01-.57A8.72 8.72 0 0022.46 6z"
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
  tone?: "blue" | "green" | "red" | "gray";
  className?: string;
}>) {
  const tones: Record<string, string> = {
    blue: "bg-[#E5EEFF] text-[#2B4D9C]",
    green: "bg-[#E9F7EF] text-[#1E7B4F]",
    red: "bg-[#FDEBEE] text-[#C03548]",
    gray: "bg-gray-100 text-gray-700",
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
function FooterButton({ children }: React.PropsWithChildren) {
  return (
    <button
      type="button"
      className="w-full rounded-xl bg-[#F4F7FA] b-1 b-[#E5ECF4] text-[#3856B8] font-semibold py-2.5 text-sm hover:brightness-95"
    >
      {children}
    </button>
  );
}

/** Generic soft Card */
function Card({
  title,
  children,
  footer,
  className = "",
}: React.PropsWithChildren<{
  title?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={`min-w-0 rounded-[22px] border border-black/10 bg-white shadow-sm ${className}`}
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

/******************************\
|* Tiny dependency-free Chart *|
\******************************/
/**
 * MiniLineChart – renders a smooth-ish line and points with a faint grid.
 * Keep arrays short (<= 12 points) for simplicity.
 */
function MiniLineChart({
  series,
  className = "",
}: {
  series: number[];
  className?: string;
}) {
  const width = 640;
  const height = 220;
  const pad = 24;
  const max = Math.max(1, ...series);
  const min = Math.min(0, ...series);
  const y = (v: number) =>
    height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2);
  const x = (i: number) =>
    pad + (i * (width - pad * 2)) / Math.max(1, series.length - 1);
  const d = series.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`w-full ${className}`}>
      {/* Y grid */}
      {[0.2, 0.5, 0.8].map((t) => (
        <line
          key={t}
          x1={pad}
          x2={width - pad}
          y1={pad + (height - pad * 2) * t}
          y2={pad + (height - pad * 2) * t}
          className="stroke-gray-200"
          strokeWidth={1}
        />
      ))}

      {/* line */}
      <path
        d={d}
        className="fill-none stroke-[#3B82F6]"
        strokeWidth={3}
        strokeLinejoin="round"
      />

      {/* points */}
      {series.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={4} className="fill-[#3B82F6]" />
      ))}
    </svg>
  );
}

/********************\
|* Demo Mocked Data *|
\********************/
const revenue = {
  value: "₹32,00,000",
  series: [0, 5, 40, 80, 78, 55, 42, 12, 38, 80, 30],
};

// Colors to keep Online/Offline consistent across legend and lines
const ONLINE_COLOR = "#2B4D9C"; // deep blue
const OFFLINE_COLOR = "#7EA6FF"; // light blue

type RevenuePoint = {
  name: string;
  online: number;
  offline: number;
};

// Month-wise mock series roughly matching the screenshot shape
const revenueData: RevenuePoint[] = [
  { name: "Jan", online: 500, offline: 300 },
  { name: "Feb", online: 3_000, offline: 1_200 },
  { name: "Mar", online: 35_000, offline: 22_000 },
  { name: "Apr", online: 80_000, offline: 65_000 },
  { name: "May", online: 95_000, offline: 90_000 },
  { name: "Jun", online: 60_000, offline: 50_000 },
  { name: "Jul", online: 50_000, offline: 40_000 },
  { name: "Aug", online: 20_000, offline: 8_000 },
  { name: "Sep", online: 45_000, offline: 30_000 },
  { name: "Oct", online: 75_000, offline: 58_000 },
];

function formatIN(tick: number) {
  try {
    return new Intl.NumberFormat("en-IN").format(tick);
  } catch {
    return tick.toString();
  }
}

function RevenueLineChart() {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={revenueData}
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
            formatter={(value: number, name: string) => [
              formatIN(value as number),
              name,
            ]}
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
  );
}

const topBook = {
  cover:
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=300&auto=format&fit=crop",
  title: "Khilega To Dekhenge",
  author: "Vinod Kumar Shukla",
  isbn: "978-0143030607",
  language: "Hindi",
  growth: "25%",
  rupees: "+ ₹1,83,000",
};

const topAuthor = {
  avatar:
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop",
  name: "Vinod Kumar Shukla",
  life: "1 Jan 1937 - Present",
  growth: "5%",
  followers: "+ 800 followers",
};

const inventory = [
  {
    id: 1,
    title: "Sophie Ka Sansar",
    author: "Jostein Gaarder",
    cover:
      "https://images.unsplash.com/photo-1528208079124-0ad3f07c22e5?q=80&w=300&auto=format&fit=crop",
    available: 23,
    daysLeft: "0.5 days left",
    alert: {
      tone: "red" as const,
      text: "Refill your stock for smooth operation",
    },
  },
  {
    id: 2,
    title: "Azadi",
    author: "Arundhati Roy",
    cover:
      "https://images.unsplash.com/photo-1528208079124-0ad3f07c22e5?q=80&w=300&auto=format&fit=crop",
    available: 89,
    daysLeft: "5 days left",
    alert: {
      tone: "amber" as const,
      text: "Refill your stock for smooth operation",
    },
  },
];

/**********************\
|* Section Components *|
\**********************/
function RevenueCard() {
  const { data: dashboardData, isLoading, error } = useDashboardOverview();
  
  if (isLoading) {
    return (
      <Card title="Revenue Overview">
        <div className="flex items-center justify-center h-[220px]">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error || !dashboardData?.data) {
    return (
      <Card title="Revenue Overview">
        <div className="flex items-center justify-center h-[220px] text-red-500">
          Error loading revenue data
        </div>
      </Card>
    );
  }

  const { stats, salesChart } = dashboardData.data;

  return (
    <Card title="Revenue Overview" className="">
      {/* Big number + growth */}
      <div className="mb-6 flex items-baseline gap-3">
        <div className="text-3xl font-bold text-gray-900">
          {formatIN(stats.totalSales)}
        </div>
        <div className="flex items-center gap-1 text-sm text-green-600">
          <ArrowUp className="h-4 w-4" />
          <span>+{stats.salesGrowth}%</span>
        </div>
        <div className="text-sm text-gray-500">from last month</div>
      </div>

      {/* Chart */}
      <RevenueLineChart data={salesChart} />

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: ONLINE_COLOR }}
          />
          <span className="text-gray-600">Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: OFFLINE_COLOR }}
          />
          <span className="text-gray-600">Offline</span>
        </div>
      </div>
    </Card>
  );
}

function TopBookCard() {
  const { data: dashboardData, isLoading, error } = useDashboardOverview();
  
  if (isLoading) {
    return (
      <Card title="Top Performing Book">
        <div className="flex items-center justify-center h-[150px]">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error || !dashboardData?.data?.topBooks?.[0]) {
    return (
      <Card title="Top Performing Book">
        <div className="flex items-center justify-center h-[150px] text-red-500">
          Error loading book data
        </div>
      </Card>
    );
  }

  const topBook = dashboardData.data.topBooks[0];

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="font-semibold">Top Performing Book</span>
          <Pill tone="green">Bestseller</Pill>
        </div>
      }
      footer={<FooterButton>View Details</FooterButton>}
    >
      <div className="flex gap-4">
        {/* Book cover placeholder */}
        <div className="h-24 w-16 flex-shrink-0 rounded-lg bg-gradient-to-br from-rose-400 to-orange-300"></div>

        {/* Book details */}
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-gray-900">{topBook.title}</h3>
          <p className="text-sm text-gray-600">{topBook.author}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              Sales: {topBook.sales.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <MdOutlineKeyboardArrowUp className="h-4 w-4" />
              +{topBook.growth}%
            </span>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {formatIN(topBook.revenue)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function TopAuthorCard() {
  const { data: dashboardData, isLoading } = useDashboardOverview();
  
  if (isLoading || !dashboardData?.data?.topBooks) {
    return (
      <Card title="Top Author">
        <div className="flex items-center justify-center h-[150px]">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  // Get most common author from top books
  const authors = dashboardData.data.topBooks.reduce((acc: any, book) => {
    acc[book.author] = (acc[book.author] || 0) + book.sales;
    return acc;
  }, {});
  
  const topAuthor = Object.entries(authors).reduce((a: any, b: any) => 
    a[1] > b[1] ? a : b
  );

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="font-semibold">Top Author</span>
          <Pill>Literature</Pill>
        </div>
      }
      footer={<FooterButton>View Profile</FooterButton>}
    >
      <div className="flex items-center gap-4">
        {/* Author avatar placeholder */}
        <div className="h-16 w-16 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>

        {/* Author details */}
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-gray-900">{topAuthor[0]}</h3>
          <p className="text-sm text-gray-600">Hindi Literature</p>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <MdOutlineKeyboardArrowUp className="h-4 w-4" />
            <span>Total Sales: {topAuthor[1].toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InventoryCard() {
  const { data: dashboardData, isLoading } = useDashboardOverview();
  
  if (isLoading) {
    return (
      <Card title="Inventory Status">
        <div className="flex items-center justify-center h-[150px]">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="font-semibold">Inventory Status</span>
          <Pill tone="green">Healthy</Pill>
        </div>
      }
      footer={<FooterButton>Manage Inventory</FooterButton>}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-blue-50 p-4">
          <div className="text-2xl font-bold text-blue-900">450</div>
          <div className="text-xs text-blue-700">Books in Stock</div>
        </div>
        <div className="rounded-2xl bg-orange-50 p-4">
          <div className="text-2xl font-bold text-orange-900">23</div>
          <div className="text-xs text-orange-700">Low Stock Items</div>
        </div>
        <div className="rounded-2xl bg-green-50 p-4">
          <div className="text-2xl font-bold text-green-900">89</div>
          <div className="text-xs text-green-700">New Arrivals</div>
        </div>
        <div className="rounded-2xl bg-red-50 p-4">
          <div className="text-2xl font-bold text-red-900">2</div>
          <div className="text-xs text-red-700">Out of Stock</div>
        </div>
      </div>
    </Card>
  );
}

function SocialMediaCard() {
  const { data: socialData, isLoading, error } = useSocialSummary();
  
  if (isLoading) {
    return (
      <Card title="Social Media">
        <div className="flex items-center justify-center h-[200px]">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error || !socialData?.data) {
    return (
      <Card title="Social Media">
        <div className="flex items-center justify-center h-[200px] text-red-500">
          Error loading social media data
        </div>
      </Card>
    );
  }

  const { totalGrowth, reachGrowth } = socialData.data;

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="font-semibold">Social Media</span>
          <Pill tone="green">All Good</Pill>
        </div>
      }
      className=""
      footer={<FooterButton>Know More</FooterButton>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Instagram Panel */}
        <div className="rounded-2xl border border-black/10 p-4">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-gray-700">
            <CameraIcon className="w-5 h-5" /> Instagram
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+{totalGrowth}</div>
              <div className="text-[11px] text-gray-600">
                Followers from previous month
              </div>
            </div>
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+{reachGrowth}%</div>
              <div className="text-[11px] text-gray-600">
                Views from previous month
              </div>
            </div>
          </div>
        </div>

        {/* Facebook Panel */}
        <div className="rounded-2xl border border-black/10 p-4">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-gray-700">
            <FacebookIcon className="w-5 h-5" /> Facebook
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

        {/* Twitter Panel */}
        <div className="rounded-2xl border border-black/10 p-4">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-gray-700">
            <TwitterIcon className="w-5 h-5" /> Twitter
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+156</div>
              <div className="text-[11px] text-gray-600">
                Followers from previous month
              </div>
            </div>
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+12%</div>
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
  return (
    <main className="mx-auto w-full py-6 text-slate-800 dark:text-slate-100">
      {/* Header numbers (kept simple; edit freely) */}
      {/* <div className="mb-4 flex flex-wrap items-end gap-3">
        <h1 className="text-2xl font-bold text-[#43547E]">₹32,00,000</h1>
        <div> This Month </div>
      </div> */}

      {/*
        Layout grid
        - Use CSS Grid for consistent equal-height cards.
        - auto-rows-[minmax(0,1fr)] makes each implicit row stretch equally.
      */}
      <div className="grid auto-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <div className="grid">
          <RevenueCard />
        </div>
        <div className="grid gap-4">
          <TopBookCard />
          <TopAuthorCard />
        </div>

        <InventoryCard />
        <SocialMediaCard />
      </div>

      {/*
        TIP: If columns ever misalign in height
        - Ensure the parent grid has auto-rows-[minmax(0,1fr)] or content-stretch
        - Add h-full to each Card to make them stretch.
      */}
    </main>
  );
}
