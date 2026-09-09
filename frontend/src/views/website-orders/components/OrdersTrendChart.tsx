import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { formatINR, formatChartValue } from "../../total-offline-sales/components";
import type { OrdersSummary } from "../../../services/websiteOrdersService";
import { formatDate, formatShortDate, formatNumber } from "./utils";

interface OrdersTrendChartProps {
  summary: OrdersSummary | undefined;
  isLoading: boolean;
}

/**
 * Revenue and order count share an x-axis but not a scale — revenue is in thousands
 * of rupees, counts in tens — so the count rides a second, right-hand axis. Plotting
 * both is what makes a day of "few orders, high value" legible.
 */
export const OrdersTrendChart: React.FC<OrdersTrendChartProps> = ({ summary, isLoading }) => {
  const data = summary?.daily ?? [];

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-normal text-gray-800">Daily orders &amp; revenue</h3>
        <p className="text-xs text-gray-400">Website orders over the selected date range</p>
      </div>

      <div style={{ height: 300 }} className="w-full">
        {isLoading && data.length === 0 ? (
          <div className="h-full w-full animate-pulse rounded-2xl bg-gray-50" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No orders in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="wo-revenue-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0067B5" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0067B5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                tickFormatter={formatShortDate}
                dy={10}
                minTickGap={24}
              />
              <YAxis
                yAxisId="revenue"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                tickFormatter={formatChartValue}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as OrdersSummary["daily"][number];
                  return (
                    <div className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-xl">
                      <p className="text-xs font-normal text-gray-400">
                        {formatDate(String(label))}
                      </p>
                      <div className="flex items-center justify-between gap-6 text-xs">
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#0067B5]" />
                          Revenue
                        </span>
                        <span className="text-gray-900">{formatINR(point.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-6 text-xs">
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          Orders
                        </span>
                        <span className="text-gray-900">{formatNumber(point.orders)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#0067B5"
                strokeWidth={2}
                fill="url(#wo-revenue-grad)"
              />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
