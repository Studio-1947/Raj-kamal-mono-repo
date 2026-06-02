import React from 'react';
import { REGIONAL_COLORS, formatLakhsAndCrores } from './utils';

interface StateEntry {
  state: string;
  revenue: number;
  qty: number;
}

interface TopStatesPanelProps {
  topStatesByChannel: Record<string, StateEntry[]>;
  activeChannel: string;
  activeTab: 'revenue' | 'volume';
}

const REGION_LABEL: Record<string, string> = {
  Delhi:     'Delhi Offline',
  Mumbai:    'Mumbai Offline',
  Patna:     'Patna Offline',
  Online:    'Online - Website',
  BookFair:  'BookFair Offline',
  Lokbharti: 'Lokbharti - Allahabad',
};

export const TopStatesPanel: React.FC<TopStatesPanelProps> = ({
  topStatesByChannel,
  activeChannel,
  activeTab,
}) => {
  // Decide which channels to show
  const channelsToShow = activeChannel === 'all'
    ? Object.keys(topStatesByChannel).filter(ch => (topStatesByChannel[ch] ?? []).length > 0)
    : [activeChannel].filter(ch => (topStatesByChannel[ch] ?? []).length > 0);

  if (channelsToShow.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-normal text-gray-500 uppercase tracking-widest">
        Geographic Distribution — Top States
      </h3>

      <div className={`grid grid-cols-1 gap-4 ${channelsToShow.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
        {channelsToShow.map((ch) => {
          const states = topStatesByChannel[ch] ?? [];
          const color  = REGIONAL_COLORS[REGION_LABEL[ch]] ?? '#6366F1';
          const maxVal = Math.max(...states.map(s => activeTab === 'revenue' ? s.revenue : s.qty), 1);

          return (
            <div
              key={ch}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-5">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <p className="text-sm font-normal text-gray-700">{ch}</p>
              </div>

              <div className="space-y-3">
                {states.length > 0 ? states.map((s, i) => {
                  const val       = activeTab === 'revenue' ? s.revenue : s.qty;
                  const pct       = maxVal > 0 ? (val / maxVal) * 100 : 0;
                    const rankColors = ['#B8960C', '#6B7280', '#92400E'];

                  return (
                    <div key={s.state}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5 text-gray-700 truncate max-w-[60%]">
                          {i < 3 ? (
                            <span
                              className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-normal text-white shrink-0"
                              style={{ backgroundColor: rankColors[i] }}
                            >
                              {i + 1}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 w-5 text-center shrink-0">{i + 1}</span>
                          )}
                          {s.state}
                        </span>
                        <span className="font-normal text-gray-900 shrink-0">
                          {activeTab === 'revenue'
                            ? formatLakhsAndCrores(val)
                            : `${val.toLocaleString('en-IN')} copies`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-xs text-gray-400 italic">No state data available</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
