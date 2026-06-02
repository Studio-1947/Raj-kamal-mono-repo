import React from 'react';
import { FiDatabase } from 'react-icons/fi';
import { REGIONAL_COLORS, formatINR } from './utils';

interface RecentTransactionsTableProps {
  transactions: any[];
}

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({ transactions }) => {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FiDatabase className="text-indigo-600" />
        Live Ingestion Stream
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 rounded-l-2xl">Bill No</th>
              <th className="px-4 py-3">Book</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3 text-right rounded-r-2xl">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions && transactions.length > 0 ? (
              transactions.map((txn: any) => (
                <tr key={txn.id} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-gray-900">{txn.docNo}</td>
                  <td className="px-4 py-3.5 truncate max-w-[140px]" title={txn.title}>{txn.title}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
                      style={{
                        backgroundColor: `${REGIONAL_COLORS[txn.region]}15`,
                        color: REGIONAL_COLORS[txn.region]
                      }}
                    >
                      {txn.region}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-gray-900">{formatINR(txn.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No live transactions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
