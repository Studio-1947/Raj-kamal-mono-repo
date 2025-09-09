import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/**
 * Hindi Books Sales Dashboard
 * ------------------------------------------------------------
 * - One-file, drop-in component.
 * - Uses TailwindCSS for layout & styling.
 * - Uses Recharts for the main revenue chart.
 * - Fully responsive. Cards never overflow the viewport width.
 * - Accessible: semantic headings, aria-labels, focus states.
 * - Commented for quick edits.
 *
 * Usage:
 * 1) npm i recharts
 * 2) Ensure Tailwind is set up.
 * 3) Import and render <HindiBooksSalesDashboard /> anywhere.
 */

// ---- Mock data -------------------------------------------------------------

// Revenue trend (X = day index; adapt to your labels)
const revenueData = [
  { x: "1", online: 0, offline: 0 },
  { x: "2", online: 12000, offline: 500 },
  { x: "3", online: 45000, offline: 1500 },
  { x: "4", online: 110000, offline: 8000 },
  { x: "5", online: 180000, offline: 25000 },
  { x: "6", online: 175000, offline: 26000 },
  { x: "7", online: 70000, offline: 50000 },
  { x: "8", online: 50000, offline: 35000 },
  { x: "9", online: 25000, offline: 5000 },
  { x: "10", online: 95000, offline: 20000 },
  { x: "11", online: 180000, offline: 100000 },
];

// Inventory tiles data
const inventory = [
  {
    id: 1,
    title: "Sophie Ka Sansar",
    author: "Jostein Gaarder",
    cover:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=256&q=80&auto=format&fit=crop",
    stock: 23,
    daysLeft: 0.5,
    critical: true,
  },
  {
    id: 2,
    title: "Azadi",
    author: "Arundhati Roy",
    cover:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=256&q=80&auto=format&fit=crop",
    stock: 89,
    daysLeft: 5,
    critical: true,
  },
];

// Simple utility to format INR using Indian grouping
const formatINR = (num: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);

// Recharts tooltip content (accessible & compact)
const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload.reduce(
    (acc: any, cur: any) => ({ ...acc, [cur.dataKey]: cur.value }),
    {}
  );
  return (
    <div className="rounded-xl border border-black/5 bg-white/90 dark:bg-zinc-900/90 p-2 text-xs shadow-md">
      <div className="font-medium">Day {payload[0].payload.x}</div>
      <div className="mt-1 space-y-0.5">
        <div>
          Online: <span className="font-semibold">{formatINR(p.online)}</span>
        </div>
        <div>
          Offline: <span className="font-semibold">{formatINR(p.offline)}</span>
        </div>
      </div>
    </div>
  );
};

// ---- Small, reusable UI bits ----------------------------------------------

const Card: React.FC<
  React.PropsWithChildren<{
    className?: string;
    title?: React.ReactNode;
    footer?: React.ReactNode;
  }>
> = ({ className = "", title, children, footer }) => (
  <section
    className={
      "h-full rounded-2xl border border-black/5 bg-white/70 shadow-sm backdrop-blur p-4 dark:bg-white/5 " +
      className
    }
    aria-label={typeof title === "string" ? title : undefined}
  >
    {title ? (
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
          {title}
        </h2>
      </header>
    ) : null}
    <div>{children}</div>
    {footer ? <div className="mt-3">{footer}</div> : null}
  </section>
);

const Badge: React.FC<
  React.PropsWithChildren<{ tone?: "slate" | "green" | "red" | "blue" }>
> = ({ children, tone = "slate" }) => {
  const tones: Record<"slate" | "green" | "red" | "blue", string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    green:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const LinkButton = ({
  children,
  href = "#",
}: {
  children: React.ReactNode;
  href?: string;
}) => (
  <a
    href={href}
    className="inline-flex w-full items-center justify-center rounded-xl border border-black/5 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-800/50 dark:text-slate-200"
  >
    {children}
  </a>
);

// ---- Feature cards ---------------------------------------------------------

function RevenueOverview() {
  return (
    <Card title="Revenue Overview" className="lg:col-span-2">
      {/* Tabs row */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            className="rounded-full bg-slate-900/5 px-3 py-1 font-medium text-slate-700 dark:text-slate-300"
            aria-pressed
          >
            This Month
          </button>
          <span className="text-slate-500">Total</span>
          <span className="text-slate-500">Online</span>
          <span className="text-slate-500">Offline</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge tone="green">+2.05% vs last month</Badge>
          <Badge>+0.05% vs January</Badge>
          <Badge tone="blue">5.25% vs target</Badge>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={revenueData}
            margin={{ top: 10, left: 0, right: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,6,23,0.05)" />
            <XAxis
              dataKey="x"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                new Intl.NumberFormat("en-IN", {
                  maximumFractionDigits: 0,
                }).format(v)
              }
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={150000}
              stroke="#93c5fd"
              strokeDasharray="4 4"
              label={{
                value: "Target",
                position: "insideTopRight",
                fill: "#64748b",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="online"
              name="Online"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="offline"
              name="Offline"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Note bar */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white">
          i
        </span>
        Amazon contributed 25% of this month’s growth.
      </div>
    </Card>
  );
}

function TopBook() {
  return (
    <Card title="Top Book" footer={<LinkButton>See More</LinkButton>}>
      <div className="mb-2 flex items-start gap-3">
        <img
          src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=96&q=80&auto=format&fit=crop"
          alt="Khilega To Dekhenge book cover"
          className="h-16 w-12 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            Khilega To Dekhenge
          </div>
          <div className="text-xs text-slate-500">Vinod Kumar Shukla</div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span className="font-medium">ISBN:</span> 978-0143030607 &nbsp;{" "}
            <span className="font-medium">Language:</span> Hindi
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            25%
          </div>
          <div className="text-[11px] text-slate-500">+ ₹1,83,000</div>
        </div>
      </div>
    </Card>
  );
}

function TopAuthor() {
  return (
    <Card title="Top Author" footer={<LinkButton>See More</LinkButton>}>
      <div className="mb-2 flex items-start gap-3">
        <img
          src="https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=96&q=80&auto=format&fit=crop"
          alt="Vinod Kumar Shukla portrait"
          className="h-16 w-16 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            Vinod Kumar Shukla
          </div>
          <div className="text-xs text-slate-500">1 Jan 1937 - Present</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            5%
          </div>
          <div className="text-[11px] text-slate-500">+ 800 followers</div>
        </div>
      </div>
    </Card>
  );
}

function InventoryTile({ book }: { book: (typeof inventory)[number] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-black/5 bg-white/60 p-3 shadow-sm dark:bg-white/5">
      <div className="flex items-start gap-3">
        <img
          src={book.cover}
          alt="Book cover"
          className="h-24 w-16 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{book.title}</h3>
            {book.critical && <Badge tone="red">Critical</Badge>}
          </div>
          <div className="text-xs text-slate-500">{book.author}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-slate-500">Stock Available</div>
              <div className="text-base font-semibold">{book.stock}</div>
            </div>
            <div>
              <div className="text-slate-500">Days left</div>
              <div className="text-base font-semibold">{book.daysLeft}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert action */}
      <button
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:bg-red-900/30 dark:text-red-200"
        aria-label="Refill stock"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
        Refill your stock for smooth operation
      </button>
    </div>
  );
}

function Inventory() {
  return (
    <Card
      title="Inventory"
      className="lg:col-span-2"
      footer={<LinkButton>Know More</LinkButton>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {inventory.map((b) => (
          <InventoryTile key={b.id} book={b} />
        ))}
      </div>
    </Card>
  );
}

function SocialKpi({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/60 p-3 text-center shadow-sm dark:bg-white/5">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
        {delta}
      </div>
    </div>
  );
}

function SocialMedia() {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span>Social Media</span>
          <Badge tone="green">All Good</Badge>
        </div>
      }
      footer={<LinkButton>Know More</LinkButton>}
    >
      <div className="grid gap-3">
        {/* Channel header row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <span aria-hidden>📷</span> Instagram
            </div>
            <div className="grid grid-cols-3 gap-3">
              <SocialKpi
                label="Followers from previous month"
                value="+835"
                delta="+20%"
              />
              <SocialKpi
                label="Views from previous month"
                value="+835"
                delta="+20%"
              />
              <SocialKpi
                label="Followers from previous month"
                value="+835"
                delta="+20%"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-black/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <span aria-hidden>📷</span> Instagram
            </div>
            <div className="grid grid-cols-3 gap-3">
              <SocialKpi
                label="Followers from previous month"
                value="+835"
                delta="+20%"
              />
              <SocialKpi
                label="Views from previous month"
                value="+835"
                delta="+20%"
              />
              <SocialKpi
                label="Followers from previous month"
                value="+835"
                delta="+20%"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---- Page wrapper ----------------------------------------------------------

export default function HomeDashboard() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6 text-slate-800 dark:text-slate-100">
      {/* Header numbers (kept simple; edit freely) */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <h1 className="text-2xl font-bold text-[#43547E]">₹32,00,000</h1>
        <Badge> This Month </Badge>
      </div>

      {/*
        Layout grid
        - Use CSS Grid for consistent equal-height cards.
        - auto-rows-[minmax(0,1fr)] makes each implicit row stretch equally.
      */}
      <div className="grid auto-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
        <RevenueOverview />
        <div className="grid gap-4">
          <TopBook />
          <TopAuthor />
        </div>

        <Inventory />
        <SocialMedia />
      </div>

      {/*
        TIP: If columns ever misalign in height
        - Ensure the parent grid has auto-rows-[minmax(0,1fr)] or content-stretch
        - Add h-full to each Card to make them stretch.
      */}
    </main>
  );
}
