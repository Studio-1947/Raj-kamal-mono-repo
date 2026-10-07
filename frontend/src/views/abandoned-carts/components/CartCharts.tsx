import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { formatINR, formatChartValue } from "../../total-offline-sales/components";
import type { CartsSummary } from "../../../services/websiteCartsService";
import { formatDate, formatNumber, formatShortDate } from "../../website-orders/components/utils";

interface ChartProps {
  summary: CartsSummary | undefined;
  isLoading: boolean;
}

function ChartCard({
  title,
  subtitle,
  height,
  loading,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  height: number;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div style={{ height }} className="w-full">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-2xl bg-gray-50" />
        ) : empty ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No carts match.</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// Explicit colours: the page's inherited text colour is too pale for the tooltip's
// title line, which made it read as washed out against the white card.
const tooltipProps = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    backgroundColor: "#FFFFFF",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  labelStyle: { color: "#111827", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "#374151" },
};

/** Carts and rupees share an x-axis but not a scale, so the count rides a right-hand axis. */
export const CartTrendChart: React.FC<ChartProps> = ({ summary, isLoading }) => {
  const data = summary?.daily ?? [];
  return (
    <ChartCard
      title="Cart activity by day"
      subtitle="When carts were last touched, and what they were worth"
      height={280}
      loading={isLoading && !summary}
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="cartValueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis yAxisId="value" tickFormatter={(v) => formatChartValue(v)} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={52} />
          <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            {...tooltipProps}
            labelFormatter={(l) => formatDate(String(l))}
            formatter={(v: number, name: string) => (name === "Value" ? [formatINR(v), name] : [formatNumber(v), name])}
          />
          <Area yAxisId="value" type="monotone" dataKey="value" name="Value" stroke="#6366F1" strokeWidth={2} fill="url(#cartValueFill)" />
          <Line yAxisId="count" type="monotone" dataKey="carts" name="Carts" stroke="#F59E0B" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const BAND_COLORS = ["#C7D2FE", "#A5B4FC", "#818CF8", "#6366F1", "#4338CA"];

/**
 * Horizontal bars: the category labels sit on the left axis, so they never collide
 * however narrow the card gets (vertical bars overlapped their own labels).
 */
function BandsChart({
  title,
  subtitle,
  data,
  summary,
  isLoading,
}: {
  title: string;
  subtitle: string;
  data: { label: string; count: number; value: number }[];
  summary: CartsSummary | undefined;
  isLoading: boolean;
}) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      height={230}
      loading={isLoading && !summary}
      empty={!summary || summary.cartCount === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={78}
            tick={{ fontSize: 11, fill: "#4B5563" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            {...tooltipProps}
            cursor={{ fill: "#F9FAFB" }}
            formatter={(v: number, _n, item) => [`${formatNumber(v)} carts · ${formatINR(item.payload.value)}`, "Carts"]}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BAND_COLORS[i % BAND_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export const CartValueBandsChart: React.FC<ChartProps> = ({ summary, isLoading }) => (
  <BandsChart
    title="Cart value distribution"
    subtitle="How many carts sit in each price band"
    data={summary?.valueBands ?? []}
    summary={summary}
    isLoading={isLoading}
  />
);

export const CartSizeBandsChart: React.FC<ChartProps> = ({ summary, isLoading }) => (
  <BandsChart
    title="Cart size"
    subtitle="Books per cart"
    data={summary?.sizeBands ?? []}
    summary={summary}
    isLoading={isLoading}
  />
);

export const CartWeekdayChart: React.FC<ChartProps> = ({ summary, isLoading }) => {
  const data = summary?.byWeekday ?? [];
  const max = Math.max(1, ...data.map((d) => d.carts));
  return (
    <ChartCard
      title="Busiest days"
      subtitle="Day of week carts were last active (IST)"
      height={230}
      loading={isLoading && !summary}
      empty={!summary || summary.cartCount === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={34} />
          <Tooltip
            {...tooltipProps}
            cursor={{ fill: "#F9FAFB" }}
            formatter={(v: number, _n, item) => [`${formatNumber(v)} carts · ${formatINR(item.payload.value)}`, "Carts"]}
          />
          <Bar dataKey="carts" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.day} fill={d.carts === max ? "#F59E0B" : "#FCD34D"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export const CartHourChart: React.FC<ChartProps> = ({ summary, isLoading }) => {
  const data = (summary?.byHour ?? []).map((d) => ({ ...d, label: `${d.hour}:00` }));
  const max = Math.max(1, ...data.map((d) => d.carts));
  return (
    <ChartCard
      title="Time of day"
      subtitle="Hour carts were last active (IST), a guide for when to send reminders"
      height={230}
      loading={isLoading && !summary}
      empty={!summary || summary.cartCount === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} interval={2} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={34} />
          <Tooltip
            {...tooltipProps}
            cursor={{ fill: "#F9FAFB" }}
            labelFormatter={(h) => `${String(h).padStart(2, "0")}:00 – ${String(h).padStart(2, "0")}:59`}
            formatter={(v: number) => [formatNumber(v), "Carts"]}
          />
          <Bar dataKey="carts" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.hour} fill={d.carts === max ? "#10B981" : "#A7F3D0"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
