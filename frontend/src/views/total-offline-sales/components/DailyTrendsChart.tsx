import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { REGIONAL_COLORS, CHART_KEYS, KEY_MAP, formatINR } from './utils';

interface DailyTrendsChartProps {
  timeSeries: any[];
  dateRange: string;
}

export const DailyTrendsChart: React.FC<DailyTrendsChartProps> = ({ timeSeries, dateRange }) => {
  return (
    <div className="lg:col-span-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-normal text-gray-800">Unified Daily Sales Trends</h3>
          <p className="text-xs text-gray-400">
            Regional sales volumes over the selected range ({dateRange === 'all' ? 'All Time' : `Last ${dateRange} Days`})
          </p>
        </div>
      </div>
      <div style={{ height: 320 }} className="w-full">
        {timeSeries && timeSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                {CHART_KEYS.map((key) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={REGIONAL_COLORS[KEY_MAP[key]]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={REGIONAL_COLORS[KEY_MAP[key]]} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickFormatter={(v) => formatINR(v)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl space-y-2 max-h-80 overflow-y-auto text-left">
                        <p className="text-xs font-normal text-gray-400">{label}</p>
                        <div className="space-y-1.5">
                          {payload.map((p: any) => (
                            <div key={p.name} className="flex items-center gap-6 justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                <span className="font-normal text-gray-600">{KEY_MAP[p.name]}</span>
                              </div>
                              <span className="font-normal text-gray-900">{formatINR(p.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {CHART_KEYS.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={REGIONAL_COLORS[KEY_MAP[key]]}
                  fill={`url(#grad-${key})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">No daily aggregation data found.</div>
        )}
      </div>
    </div>
  );
};
