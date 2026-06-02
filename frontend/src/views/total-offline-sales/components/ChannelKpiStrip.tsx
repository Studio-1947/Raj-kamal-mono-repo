import React from 'react';
import { REGIONAL_COLORS, formatINR, formatLakhsAndCrores } from './utils';

interface ChannelStat {
  region: string;
  channel: string;
  revenue: number;
  qty: number;
  count: number;
  avgTicket: number;
  shareRevenue: number;
  shareQty: number;
}

interface ChannelKpiStripProps {
  breakdown: ChannelStat[];
  activeChannel: string;
  activeTab: 'revenue' | 'volume';
  onChannelSelect: (ch: string) => void;
}

export const ChannelKpiStrip: React.FC<ChannelKpiStripProps> = ({
  breakdown,
  activeChannel,
  activeTab,
  onChannelSelect,
}) => {
  const totalRevenue = breakdown.reduce((s, r) => s + r.revenue, 0);
  const totalQty     = breakdown.reduce((s, r) => s + r.qty,     0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-normal text-gray-500 uppercase tracking-widest">
          Channel Breakdown
        </h3>
        {activeChannel !== 'all' && (
          <button
            onClick={() => onChannelSelect('all')}
            className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors underline underline-offset-2"
          >
            ← Show All Channels
          </button>
        )}
      </div>

      {/* Summary total pill */}
      <button
        onClick={() => onChannelSelect('all')}
        className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 transition-all hover:shadow-md ${
          activeChannel === 'all'
            ? 'border-indigo-300 bg-indigo-50 shadow-sm shadow-indigo-100'
            : 'border-gray-100 bg-white hover:border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500" />
          <span className="text-sm font-normal text-gray-800">All Channels</span>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Revenue</p>
            <p className="text-sm font-normal text-gray-900">{formatLakhsAndCrores(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Volume</p>
            <p className="text-sm font-normal text-gray-900">{totalQty.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </button>

      {/* Per-channel cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {breakdown.map((ch) => {
          const color    = REGIONAL_COLORS[ch.region];
          const isActive = activeChannel === ch.channel;
          const share    = activeTab === 'revenue' ? ch.shareRevenue : ch.shareQty;
          const primary  = activeTab === 'revenue' ? ch.revenue : ch.qty;

          return (
            <button
              key={ch.channel}
              onClick={() => onChannelSelect(isActive ? 'all' : ch.channel)}
              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                isActive
                  ? 'border-transparent shadow-lg scale-[1.02]'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
              style={isActive ? { backgroundColor: `${color}12`, borderColor: `${color}40` } : {}}
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-0 h-1 w-full"
                style={{ backgroundColor: color }}
              />

              <p className="mt-1 text-[10px] font-normal uppercase tracking-wider text-gray-400 truncate">
                {ch.channel}
              </p>

              <p
                className="mt-1.5 text-base font-normal truncate"
                style={{ color: isActive ? color : '#111827' }}
              >
                {activeTab === 'revenue'
                  ? formatLakhsAndCrores(primary)
                  : primary.toLocaleString('en-IN')}
              </p>

              {/* Share badge */}
              <div
                className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-normal"
                style={{ backgroundColor: `${color}18`, color }}
              >
                {share.toFixed(1)}%
              </div>

              {/* Mini progress bar */}
              <div className="mt-2 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, share)}%`, backgroundColor: color }}
                />
              </div>

              {/* Avg ticket */}
              <p className="mt-2 text-[10px] text-gray-400">
                Avg ₹{Math.round(ch.avgTicket).toLocaleString('en-IN')}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
