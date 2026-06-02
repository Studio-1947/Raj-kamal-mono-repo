import React, { useState } from 'react';
import { FiBookOpen, FiChevronDown } from 'react-icons/fi';
import { formatINR } from './utils';

interface BestsellersTableProps {
  topItems: { title: string; total: number; qty: number }[];
  channelLabel?: string;
}


export const BestsellersTable: React.FC<BestsellersTableProps> = ({ topItems, channelLabel }) => {
  const [sortBy, setSortBy] = useState<'revenue' | 'volume'>('revenue');

  const sorted = [...(topItems ?? [])].sort((a, b) =>
    sortBy === 'revenue' ? b.total - a.total : b.qty - a.qty
  );

  const maxRevenue = Math.max(...sorted.map(i => i.total), 1);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-normal text-gray-800 flex items-center gap-2">
          <FiBookOpen className="text-indigo-600" />
          Top 10 Bestsellers
          {channelLabel && (
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {channelLabel}
            </span>
          )}
        </h3>

        {/* Sort toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          {(['revenue', 'volume'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 text-xs font-normal rounded-lg transition-all ${
                sortBy === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'revenue' ? '₹ Revenue' : '# Volume'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/50 text-xs font-normal text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 rounded-l-2xl">#</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 text-right">Copies</th>
              <th className="px-4 py-3 text-right rounded-r-2xl">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length > 0 ? sorted.map((item, idx) => {
              const pct = (item.total / maxRevenue) * 100;
              return (
                <tr key={idx} className="hover:bg-gray-50/40 transition-colors group">
                  <td className="px-4 py-3 text-center w-10">
                    {idx < 3 ? (
                      <span
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-normal text-white"
                        style={{ backgroundColor: idx === 0 ? '#B8960C' : idx === 1 ? '#6B7280' : '#92400E' }}
                      >
                        {idx + 1}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-normal text-gray-900 max-w-[220px]">
                    <p className="truncate" title={item.title}>{item.title}</p>
                    {/* Revenue bar */}
                    <div className="mt-1 h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-normal text-gray-600">
                    {item.qty.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-normal text-indigo-600">
                    {formatINR(item.total)}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No bestseller data computed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
