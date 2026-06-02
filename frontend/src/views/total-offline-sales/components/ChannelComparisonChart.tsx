import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { REGIONAL_COLORS, formatINR, formatChartValue, formatLakhsAndCrores } from './utils';

interface ChannelStat {
  region: string;
  channel: string;
  revenue: number;
  qty: number;
  avgTicket: number;
  shareRevenue: number;
  shareQty: number;
}

interface ChannelComparisonChartProps {
  breakdown: ChannelStat[];
  activeChannel: string;
  onChannelSelect: (ch: string) => void;
}

type MetricKey = 'revenue' | 'volume' | 'avgTicket';

const METRIC_CONFIG: Record<MetricKey, { label: string; format: (n: number) => string }> = {
  revenue:   { label: 'Revenue',       format: formatLakhsAndCrores },
  volume:    { label: 'Books Sold',    format: (n) => n.toLocaleString('en-IN') },
  avgTicket: { label: 'Avg Ticket',    format: formatINR },
};

export const ChannelComparisonChart: React.FC<ChannelComparisonChartProps> = ({
  breakdown,
  activeChannel,
  onChannelSelect,
}) => {
  const [metric, setMetric] = useState<MetricKey>('revenue');

  const chartData = breakdown.map((ch) => ({
    name:   ch.channel,
    region: ch.region,
    value: metric === 'revenue'   ? ch.revenue
          : metric === 'volume'    ? ch.qty
          : ch.avgTicket,
  })).sort((a, b) => b.value - a.value);

  const fmt = METRIC_CONFIG[metric].format;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-normal text-gray-800">Channel Comparison</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Click a bar to drill into that channel
          </p>
        </div>

        {/* Metric toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setMetric(k)}
              className={`px-3 py-1.5 text-xs font-normal rounded-lg transition-all ${
                metric === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {METRIC_CONFIG[k].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 260 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 5, bottom: 10 }}
            onClick={(data: any) => {
              if (data?.activePayload?.[0]) {
                const ch = data.activePayload[0].payload.name as string;
                onChannelSelect(activeChannel === ch ? 'all' : ch);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={formatChartValue}
            />
            <Tooltip
              cursor={{ fill: '#F9FAFB', radius: 8 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  const color = REGIONAL_COLORS[d.region];
                  return (
                    <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl text-left space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <p className="text-xs font-normal text-gray-500">{d.region}</p>
                      </div>
                      <p className="text-lg font-normal text-gray-900">{fmt(d.value)}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{METRIC_CONFIG[metric].label}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={36} cursor="pointer">
              {chartData.map((entry) => {
                const color    = REGIONAL_COLORS[entry.region];
                const isActive = activeChannel === 'all' || activeChannel === entry.name;
                return (
                  <Cell
                    key={entry.name}
                    fill={color}
                    opacity={isActive ? 1 : 0.35}
                    className="transition-all duration-300"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
