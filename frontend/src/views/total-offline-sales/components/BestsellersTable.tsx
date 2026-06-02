import React from 'react';
import { FiBookOpen } from 'react-icons/fi';
import { formatINR } from './utils';

interface BestsellersTableProps {
  topItems: any[];
}

export const BestsellersTable: React.FC<BestsellersTableProps> = ({ topItems }) => {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FiBookOpen className="text-indigo-600" />
        Top 10 Bestsellers
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 rounded-l-2xl">Title</th>
              <th className="px-4 py-3 text-right">Copies Sold</th>
              <th className="px-4 py-3 text-right rounded-r-2xl">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {topItems && topItems.length > 0 ? (
              topItems.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-gray-900 truncate max-w-xs">{item.title}</td>
                  <td className="px-4 py-3.5 text-right font-medium">{item.qty.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-indigo-600">{formatINR(item.total)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">No bestseller data computed yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
