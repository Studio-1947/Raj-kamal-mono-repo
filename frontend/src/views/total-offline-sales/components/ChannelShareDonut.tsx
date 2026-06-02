import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { REGIONAL_COLORS, formatINR } from './utils';

interface ChannelShareDonutProps {
  pieData: any[];
  activeTab: 'revenue' | 'volume';
  setActiveTab: (tab: 'revenue' | 'volume') => void;
}

export const ChannelShareDonut: React.FC<ChannelShareDonutProps> = ({
  pieData,
  activeTab,
  setActiveTab
}) => {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Channel Share</h3>
          <p className="text-xs text-gray-400">Contribution percentage breakdown</p>
        </div>
        {/* Tab Switch */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Revenue
          </button>
          <button
            onClick={() => setActiveTab('volume')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'volume' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Qty
          </button>
        </div>
      </div>

      <div style={{ height: 220 }} className="relative w-full">
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: REGIONAL_COLORS[data.name] }} />
                          <p className="text-xs font-bold text-gray-400 uppercase">{data.name}</p>
                        </div>
                        <p className="text-lg font-black text-gray-900">
                          {activeTab === 'revenue' ? formatINR(data.value) : `${data.value.toLocaleString('en-IN')} copies`}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={REGIONAL_COLORS[entry.name]}
                    className="transition-all duration-300 hover:opacity-80 focus:outline-none cursor-pointer"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">No breakdowns found.</div>
        )}
      </div>

      {/* Channel Legends */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-[11px] font-semibold text-gray-500">
        {pieData.map((d: any) => (
          <div key={d.name} className="flex items-center gap-1.5 truncate">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: REGIONAL_COLORS[d.name] }} />
            <span className="truncate">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
