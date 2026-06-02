import React, { useState } from 'react';
import { REGIONAL_COLORS, formatLakhsAndCrores } from './utils';

interface MonthData { revenue: number; qty: number; }

interface MonthlyBreakdownTableProps {
  monthlyByChannel: Record<string, MonthData[]>;
  activeChannel: string;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CHANNELS = ['Delhi','Mumbai','Patna','Online','BookFair','Lokbharti'] as const;
const REGION_LABEL: Record<string, string> = {
  Delhi:     'Delhi Offline',
  Mumbai:    'Mumbai Offline',
  Patna:     'Patna Offline',
  Online:    'Online - Website',
  BookFair:  'BookFair Offline',
  Lokbharti: 'Lokbharti - Allahabad',
};

export const MonthlyBreakdownTable: React.FC<MonthlyBreakdownTableProps> = ({
  monthlyByChannel,
  activeChannel,
}) => {
  const [mode, setMode] = useState<'revenue' | 'volume'>('revenue');

  const visibleChannels = activeChannel === 'all'
    ? CHANNELS.filter(ch => monthlyByChannel[ch])
    : CHANNELS.filter(ch => ch === activeChannel && monthlyByChannel[ch]);

  // Find max value for heat-map intensity
  let maxVal = 1;
  for (const ch of visibleChannels) {
    for (const m of (monthlyByChannel[ch] ?? [])) {
      const v = mode === 'revenue' ? m.revenue : m.qty;
      if (v > maxVal) maxVal = v;
    }
  }

  // Compute month totals
  const monthTotals = MONTH_NAMES.map((_, mi) =>
    visibleChannels.reduce((s, ch) => {
      const m = (monthlyByChannel[ch] ?? [])[mi];
      return s + (m ? (mode === 'revenue' ? m.revenue : m.qty) : 0);
    }, 0)
  );

  const currentMonth = new Date().getMonth();

  if (visibleChannels.length === 0) return null;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-normal text-gray-800">Monthly Breakdown by Channel</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Heat intensity reflects relative performance
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          {(['revenue','volume'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-normal rounded-lg transition-all ${
                mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'revenue' ? 'Revenue' : 'Volume'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-3 pr-4 font-normal text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Channel
              </th>
              {MONTH_NAMES.map((m, i) => (
                <th
                  key={m}
                  className={`pb-3 px-2 text-center font-normal uppercase tracking-wider whitespace-nowrap ${
                    i === currentMonth ? 'text-indigo-500' : 'text-gray-400'
                  }`}
                >
                  {m}
                  {i === currentMonth && (
                    <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 align-middle" />
                  )}
                </th>
              ))}
              <th className="pb-3 pl-2 font-normal text-gray-400 uppercase tracking-wider whitespace-nowrap text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleChannels.map((ch) => {
              const color   = REGIONAL_COLORS[REGION_LABEL[ch]];
              const monthly = monthlyByChannel[ch] ?? [];
              const rowTotal = monthly.reduce((s, m) => s + (mode === 'revenue' ? m.revenue : m.qty), 0);

              return (
                <tr key={ch} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-normal text-gray-700">{ch}</span>
                    </div>
                  </td>
                  {MONTH_NAMES.map((_, mi) => {
                    const cell = monthly[mi];
                    const val  = cell ? (mode === 'revenue' ? cell.revenue : cell.qty) : 0;
                    const intensity = maxVal > 0 ? val / maxVal : 0;
                    const bg   = val > 0 ? `${color}${Math.round(intensity * 30 + 8).toString(16).padStart(2,'0')}` : 'transparent';

                    return (
                      <td
                        key={mi}
                        className={`py-3 px-2 text-center whitespace-nowrap rounded-lg transition-colors ${
                          mi === currentMonth ? 'ring-1 ring-inset ring-indigo-100' : ''
                        }`}
                        style={{ backgroundColor: bg }}
                      >
                        {val > 0 ? (
                          <span className="font-normal text-gray-800">
                            {mode === 'revenue'
                              ? formatLakhsAndCrores(val)
                              : val.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 pl-2 text-right whitespace-nowrap font-normal" style={{ color }}>
                    {mode === 'revenue'
                      ? formatLakhsAndCrores(rowTotal)
                      : rowTotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr className="bg-gray-50/70 font-normal">
              <td className="py-3 pr-4 text-gray-500 uppercase tracking-wider text-[10px]">Total</td>
              {monthTotals.map((total, mi) => (
                <td key={mi} className="py-3 px-2 text-center text-gray-700 whitespace-nowrap">
                  {total > 0
                    ? mode === 'revenue'
                      ? formatLakhsAndCrores(total)
                      : total.toLocaleString('en-IN')
                    : <span className="text-gray-300">—</span>
                  }
                </td>
              ))}
              <td className="py-3 pl-2 text-right text-gray-800">
                {mode === 'revenue'
                  ? formatLakhsAndCrores(monthTotals.reduce((a, b) => a + b, 0))
                  : monthTotals.reduce((a, b) => a + b, 0).toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
