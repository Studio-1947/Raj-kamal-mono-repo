import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatINR, formatChartValue, formatLakhsAndCrores } from './utils';
import { FiTrendingUp, FiShoppingBag, FiInfo } from 'react-icons/fi';

interface ContributionDetail {
  revenue: number;
  qty: number;
}

interface NewOldContribution {
  new: ContributionDetail;
  old: ContributionDetail;
  unknown: ContributionDetail;
}

interface NewOldContributionViewProps {
  data: NewOldContribution | null;
  loading: boolean;
}

export const NewOldContributionView: React.FC<NewOldContributionViewProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const { new: newBooks, old: oldBooks, unknown: unkBooks } = data;

  const totalRevenue = newBooks.revenue + oldBooks.revenue + unkBooks.revenue;
  const totalQty = newBooks.qty + oldBooks.qty + unkBooks.qty;

  const newRevShare = totalRevenue > 0 ? (newBooks.revenue / totalRevenue) * 100 : 0;
  const oldRevShare = totalRevenue > 0 ? (oldBooks.revenue / totalRevenue) * 100 : 0;
  const unkRevShare = totalRevenue > 0 ? (unkBooks.revenue / totalRevenue) * 100 : 0;

  const newQtyShare = totalQty > 0 ? (newBooks.qty / totalQty) * 100 : 0;
  const oldQtyShare = totalQty > 0 ? (oldBooks.qty / totalQty) * 100 : 0;
  const unkQtyShare = totalQty > 0 ? (unkBooks.qty / totalQty) * 100 : 0;

  const pieData = [
    { name: 'Newly Launched (2025+)', value: newBooks.revenue, qty: newBooks.qty, percentage: newRevShare, color: '#6366F1' },
    { name: 'Backlist / Old Titles', value: oldBooks.revenue, qty: oldBooks.qty, percentage: oldRevShare, color: '#3B82F6' },
    { name: 'Uncategorized (No Year)', value: unkBooks.revenue, qty: unkBooks.qty, percentage: unkRevShare, color: '#9CA3AF' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Newly Launched */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            New Titles
          </span>
          <h3 className="text-2xl font-semibold text-gray-900 mt-4">{formatINR(newBooks.revenue)}</h3>
          <p className="text-xs text-indigo-500 font-semibold mt-1">
            {newRevShare.toFixed(1)}% of Revenue share
          </p>
          <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
            <span>Copies Sold:</span>
            <span className="font-semibold text-gray-800">{newBooks.qty.toLocaleString('en-IN')} ({newQtyShare.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Backlist / Old Titles */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Backlist Titles
          </span>
          <h3 className="text-2xl font-semibold text-gray-900 mt-4">{formatINR(oldBooks.revenue)}</h3>
          <p className="text-xs text-blue-500 font-semibold mt-1">
            {oldRevShare.toFixed(1)}% of Revenue share
          </p>
          <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
            <span>Copies Sold:</span>
            <span className="font-semibold text-gray-800">{oldBooks.qty.toLocaleString('en-IN')} ({oldQtyShare.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Uncategorized */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full">
            Uncategorized
          </span>
          <h3 className="text-2xl font-semibold text-gray-900 mt-4">{formatINR(unkBooks.revenue)}</h3>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            {unkRevShare.toFixed(1)}% of Revenue share
          </p>
          <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
            <span>Copies Sold:</span>
            <span className="font-semibold text-gray-800">{unkBooks.qty.toLocaleString('en-IN')} ({unkQtyShare.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Contribution Donut */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-normal text-gray-800">Revenue Contribution</h3>
            <p className="text-xs text-gray-400">Proportional split of sales revenue (INR)</p>
          </div>

          <div style={{ height: 260 }} className="relative flex items-center justify-center">
            {/* Stacking context for PieChart SVG & Tooltip to render over center label */}
            <div className="relative z-10 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 1000 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xl space-y-1 relative z-50 text-left min-w-[160px]">
                            <p className="text-xs font-bold text-black">{d.name}</p>
                            <p className="text-lg font-bold text-black mt-1">{formatINR(d.value)}</p>
                            <p className="text-[10px] font-bold text-black mt-0.5">{d.percentage.toFixed(1)}% Share</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Center Summary Label - z-0 placed behind z-10 */}
            <div className="absolute text-center z-0 pointer-events-none">
              <span className="text-[10px] text-black uppercase tracking-widest block font-bold">Total Sales</span>
              <span className="text-2xl font-bold text-black block mt-1 tracking-tight">{formatLakhsAndCrores(totalRevenue)}</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            {pieData.map((d, index) => (
              <div key={index} className="flex flex-col items-center">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] font-bold text-black leading-tight mt-1.5 px-1 min-h-[32px] flex items-center justify-center">{d.name}</span>
                <span className="text-sm font-bold text-black mt-1">{d.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Volume Contribution Bar */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-normal text-gray-800">Sales Volume Contribution</h3>
            <p className="text-xs text-gray-400">Total physical books (copies) dispatched share</p>
          </div>

          <div className="space-y-6 my-auto py-6">
            {/* Newly Launched Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-gray-700">Newly Launched (2025+)</span>
                <span className="font-semibold text-indigo-600">{newBooks.qty.toLocaleString('en-IN')} ({newQtyShare.toFixed(1)}%)</span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${newQtyShare}%` }} />
              </div>
            </div>

            {/* Old Titles Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-gray-700">Backlist Titles (2024 and older)</span>
                <span className="font-semibold text-blue-600">{oldBooks.qty.toLocaleString('en-IN')} ({oldQtyShare.toFixed(1)}%)</span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${oldQtyShare}%` }} />
              </div>
            </div>

            {/* Uncategorized Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-gray-700">Uncategorized / Unknown Edition</span>
                <span className="font-semibold text-gray-500">{unkBooks.qty.toLocaleString('en-IN')} ({unkQtyShare.toFixed(1)}%)</span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-400 rounded-full" style={{ width: `${unkQtyShare}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-start gap-2 text-[11px] text-gray-500 leading-normal">
            <FiInfo className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
            <span>
              <strong>Launch Date tracking</strong>: "Newly Launched" refers to publications from the year 2025 and 2026. This allows comparing performance of new acquisitions against the core backlist.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
