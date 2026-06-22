import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatINR, formatChartValue, formatLakhsAndCrores } from './utils';
import { FiTrendingUp, FiShoppingBag, FiInfo, FiActivity, FiLayers, FiBookOpen } from 'react-icons/fi';
import { apiClient } from '../../../lib/apiClient';

interface CategoryDetail {
  revenue: number;
  qty: number;
  topBooks: { title: string; revenue: number; qty: number }[];
}

interface CategorySalesData {
  fiction: CategoryDetail;
  nonFiction: CategoryDetail;
  monthlySeries: { month: string; fiction: number; nonFiction: number }[];
}

interface CategorySalesViewProps {
  channel: string;
}

export const CategorySalesView: React.FC<CategorySalesViewProps> = ({ channel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CategorySalesData | null>(null);
  const [metric, setMetric] = useState<'revenue' | 'qty'>('revenue');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<any>(
        `total-offline-sales/category-sales?channel=${channel}&range=all`
      );
      if (res.ok) {
        setData(res);
      } else {
        throw new Error(res.error || 'Failed to fetch category sales analysis');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading category sales analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [channel]);

  // Derived values for category share
  const totals = useMemo(() => {
    if (!data) return { totalRevenue: 0, totalQty: 0, fictionRevPct: 0, nonFictionRevPct: 0, fictionQtyPct: 0, nonFictionQtyPct: 0 };
    const fictionRev = data.fiction.revenue;
    const nonFictionRev = data.nonFiction.revenue;
    const fictionQty = data.fiction.qty;
    const nonFictionQty = data.nonFiction.qty;

    const totalRevenue = fictionRev + nonFictionRev;
    const totalQty = fictionQty + nonFictionQty;

    return {
      totalRevenue,
      totalQty,
      fictionRevPct: totalRevenue > 0 ? (fictionRev / totalRevenue) * 100 : 0,
      nonFictionRevPct: totalRevenue > 0 ? (nonFictionRev / totalRevenue) * 100 : 0,
      fictionQtyPct: totalQty > 0 ? (fictionQty / totalQty) * 100 : 0,
      nonFictionQtyPct: totalQty > 0 ? (nonFictionQty / totalQty) * 100 : 0
    };
  }, [data]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: 'Fiction',
        value: metric === 'revenue' ? data.fiction.revenue : data.fiction.qty,
        percentage: metric === 'revenue' ? totals.fictionRevPct : totals.fictionQtyPct,
        color: '#6366F1' // Indigo
      },
      {
        name: 'Non-Fiction',
        value: metric === 'revenue' ? data.nonFiction.revenue : data.nonFiction.qty,
        percentage: metric === 'revenue' ? totals.nonFictionRevPct : totals.nonFictionQtyPct,
        color: '#0D9488' // Teal
      }
    ].filter(d => d.value > 0);
  }, [data, metric, totals]);

  const formattedChartData = useMemo(() => {
    if (!data?.monthlySeries) return [];
    // Transform monthly totals into selected metric (revenue or qty)
    return data.monthlySeries.map(pt => ({
      month: pt.month,
      Fiction: pt.fiction,
      'Non-Fiction': pt.nonFiction
    }));
  }, [data, metric]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-gray-500">Classifying sales genres and compiling category matrices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center text-sm text-red-600">
        ⚠️ {error}
        <button onClick={fetchData} className="ml-2 underline hover:text-red-950 font-normal">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPI cohort cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fiction Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <FiBookOpen className="h-3 w-3" />
              Fiction Segment
            </span>
          </div>
          <h3 className="text-3xl font-semibold text-gray-900 mt-5">{formatINR(data.fiction.revenue)}</h3>
          <p className="text-xs text-indigo-500 font-semibold mt-1">
            {totals.fictionRevPct.toFixed(1)}% of Revenue share
          </p>
          <div className="mt-5 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
            <span>Physical Copies Sold:</span>
            <span className="font-semibold text-gray-800">
              {data.fiction.qty.toLocaleString('en-IN')} ({totals.fictionQtyPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Non-Fiction Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-300" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <FiLayers className="h-3 w-3" />
              Non-Fiction Segment
            </span>
          </div>
          <h3 className="text-3xl font-semibold text-gray-900 mt-5">{formatINR(data.nonFiction.revenue)}</h3>
          <p className="text-xs text-teal-600 font-semibold mt-1">
            {totals.nonFictionRevPct.toFixed(1)}% of Revenue share
          </p>
          <div className="mt-5 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
            <span>Physical Copies Sold:</span>
            <span className="font-semibold text-gray-800">
              {data.nonFiction.qty.toLocaleString('en-IN')} ({totals.nonFictionQtyPct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Share Donut */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-normal text-gray-800">Category Share Split</h3>
            <p className="text-xs text-gray-400 mt-0.5">Proportional comparison of genres</p>
          </div>

          <div style={{ height: 220 }} className="relative flex items-center justify-center my-4">
            <div className="relative z-10 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
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
                          <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl space-y-1 relative z-50 text-left min-w-[150px]">
                            <p className="text-xs font-bold text-gray-800">{d.name}</p>
                            <p className="text-base font-bold text-black mt-1">
                              {metric === 'revenue' ? formatINR(d.value) : `${d.value.toLocaleString('en-IN')} copies`}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">{d.percentage.toFixed(1)}% Share</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Center Summary Label */}
            <div className="absolute text-center z-0 pointer-events-none">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest block font-bold">Total Sales</span>
              <span className="text-xl font-bold text-black block mt-0.5 tracking-tight">
                {metric === 'revenue' ? formatLakhsAndCrores(totals.totalRevenue) : totals.totalQty.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="flex justify-center gap-6 border-t border-gray-50 pt-4 text-center">
            {pieData.map((d, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs font-semibold text-gray-700">{d.name}</span>
                <span className="text-xs font-bold text-gray-900">({d.percentage.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Monthly comparison */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 className="text-base font-normal text-gray-800">Monthly Sales Trends by Segment</h3>
              <p className="text-xs text-gray-400 mt-0.5">Seasonal pattern comparison of Fiction vs Non-Fiction</p>
            </div>

            {/* Toggle metric */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg shrink-0">
              <button
                onClick={() => setMetric('revenue')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  metric === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setMetric('qty')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  metric === 'qty' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Volume
              </button>
            </div>
          </div>

          <div style={{ height: 210 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorFiction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNonFiction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F9FAFB" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={metric === 'revenue' ? formatChartValue : (v) => v.toLocaleString('en-IN')}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-gray-50 p-4 rounded-2xl shadow-xl space-y-2 text-left">
                          <p className="text-[10px] font-semibold text-gray-400 border-b border-gray-50 pb-1">Month: {payload[0].payload.month}</p>
                          {payload.map((p: any, idx: number) => (
                            <div key={idx} className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-medium">{p.name}</span>
                              <span className="text-xs font-semibold text-gray-800 mt-0.5" style={{ color: p.color }}>
                                {metric === 'revenue' ? formatINR(p.value) : `${p.value.toLocaleString('en-IN')} copies`}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="Fiction" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorFiction)" />
                <Area type="monotone" dataKey="Non-Fiction" stroke="#0D9488" strokeWidth={2} fillOpacity={1} fill="url(#colorNonFiction)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 Bestsellers split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
        {/* Top Fiction Books */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-base font-normal text-gray-800 flex items-center gap-1.5">
              <FiBookOpen className="text-indigo-500" />
              Top Fiction Books
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Top-performing fiction titles by revenue</p>
          </div>

          <div className="mt-4 flex-1 overflow-x-auto">
            {data.fiction.topBooks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 py-10">
                No fiction titles found.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-50 text-xs">
                <thead>
                  <tr className="text-gray-400 font-semibold text-[10px] uppercase text-left">
                    <th className="pb-3">Title</th>
                    <th className="pb-3 text-right">Copies Sold</th>
                    <th className="pb-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {data.fiction.topBooks.slice(0, 5).map((b, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/20">
                      <td className="py-3 font-semibold text-gray-900 line-clamp-1 pr-4">{b.title}</td>
                      <td className="py-3 text-right font-medium">{b.qty.toLocaleString('en-IN')}</td>
                      <td className="py-3 text-right font-semibold text-gray-900">{formatINR(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top Non-Fiction Books */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-base font-normal text-gray-800 flex items-center gap-1.5">
              <FiLayers className="text-teal-500" />
              Top Non-Fiction Books
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Top-performing non-fiction titles by revenue</p>
          </div>

          <div className="mt-4 flex-1 overflow-x-auto">
            {data.nonFiction.topBooks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 py-10">
                No non-fiction titles found.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-50 text-xs">
                <thead>
                  <tr className="text-gray-400 font-semibold text-[10px] uppercase text-left">
                    <th className="pb-3">Title</th>
                    <th className="pb-3 text-right">Copies Sold</th>
                    <th className="pb-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {data.nonFiction.topBooks.slice(0, 5).map((b, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/20">
                      <td className="py-3 font-semibold text-gray-900 line-clamp-1 pr-4">{b.title}</td>
                      <td className="py-3 text-right font-medium">{b.qty.toLocaleString('en-IN')}</td>
                      <td className="py-3 text-right font-semibold text-gray-900">{formatINR(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex items-start gap-2.5 text-xs text-gray-500 leading-normal">
        <FiInfo className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
        <span>
          <strong>Categorization Methodology</strong>: Segments use the explicit <em>Fiction / Non-Fiction</em> label imported from the source sheet. Where that label is blank or marked "Other", the item falls back to SKU mapping from the catalog, then title keyword patterns (e.g. poetry, novels, biographies) and a stable hash to maintain complete coverage.
        </span>
      </div>
    </div>
  );
};
