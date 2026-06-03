import React, { useState } from 'react';
import { REGIONAL_COLORS, formatLakhsAndCrores, formatINR } from './utils';
import { apiClient } from '../../../lib/apiClient';
import { FiTrendingUp, FiTrendingDown, FiX, FiActivity, FiLoader } from 'react-icons/fi';

interface PublisherEntry {
  publisher: string;
  revenue: number;
  qty: number;
}

interface BookDetails {
  title: string;
  revenue: number;
  qty: number;
}

interface PublisherDetailsResponse {
  ok: boolean;
  topBooks: BookDetails[];
  bottomBooks: BookDetails[];
}

interface TopPublishersPanelProps {
  topPublishersByChannel: Record<string, PublisherEntry[]>;
  activeChannel: string;
  activeTab: 'revenue' | 'volume';
  dateRange: string;
}

const REGION_LABEL: Record<string, string> = {
  Delhi:     'Delhi Offline',
  Mumbai:    'Mumbai Offline',
  Patna:     'Patna Offline',
  Online:    'Online - Website',
  BookFair:  'BookFair Offline',
  Lokbharti: 'Lokbharti - Allahabad',
};

export const TopPublishersPanel: React.FC<TopPublishersPanelProps> = ({
  topPublishersByChannel,
  activeChannel,
  activeTab,
  dateRange,
}) => {
  const [selectedPub, setSelectedPub] = useState<{ channel: string; publisher: string } | null>(null);
  const [details, setDetails] = useState<PublisherDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const channelsToShow = activeChannel === 'all'
    ? Object.keys(topPublishersByChannel).filter(ch => (topPublishersByChannel[ch] ?? []).length > 0)
    : [activeChannel].filter(ch => (topPublishersByChannel[ch] ?? []).length > 0);

  const handlePublisherClick = async (channel: string, publisher: string) => {
    setSelectedPub({ channel, publisher });
    setLoadingDetails(true);
    setDetails(null);
    setErrorDetails(null);

    try {
      const response = await apiClient.get<PublisherDetailsResponse>(
        `total-offline-sales/publisher-details?channel=${channel}&publisher=${encodeURIComponent(publisher)}&range=${dateRange}`
      );
      if (response.ok) {
        setDetails(response);
      } else {
        setErrorDetails('Failed to retrieve book metrics.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorDetails('Failed to connect to the analysis engine.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setSelectedPub(null);
    setDetails(null);
    setErrorDetails(null);
  };

  if (channelsToShow.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-normal text-gray-500 uppercase tracking-widest">
        Channel-wise Publisher Breakdown — Top Publications
      </h3>

      <div className={`grid grid-cols-1 gap-4 ${channelsToShow.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
        {channelsToShow.map((ch) => {
          const pubs = topPublishersByChannel[ch] ?? [];
          const color  = REGIONAL_COLORS[REGION_LABEL[ch]] ?? '#6366F1';
          const maxVal = Math.max(...pubs.map(p => activeTab === 'revenue' ? p.revenue : p.qty), 1);

          return (
            <div
              key={ch}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <p className="text-sm font-normal text-gray-700">{ch} Publisher Split</p>
                </div>

                <div className="space-y-3">
                  {pubs.length > 0 ? pubs.map((p, i) => {
                    const val       = activeTab === 'revenue' ? p.revenue : p.qty;
                    const pct       = maxVal > 0 ? (val / maxVal) * 100 : 0;
                    const rankColors = ['#B8960C', '#6B7280', '#92400E'];

                    return (
                      <div
                        key={p.publisher}
                        onClick={() => handlePublisherClick(ch, p.publisher)}
                        className="group cursor-pointer hover:bg-gray-50/70 p-2 -m-2 rounded-2xl transition-all"
                        title="Click to view Top & Bottom Books"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1.5 text-gray-700 truncate max-w-[65%] group-hover:text-gray-900 font-normal transition-colors">
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
                            {p.publisher}
                          </span>
                          <span className="font-normal text-gray-900 shrink-0 flex items-center gap-1.5">
                            <span className="group-hover:text-teal-600 transition-colors">
                              {activeTab === 'revenue'
                                ? formatLakhsAndCrores(val)
                                : `${val.toLocaleString('en-IN')} copies`}
                            </span>
                            <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              details →
                            </span>
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
                    <p className="text-xs text-gray-400 italic">No publisher data available</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Details Modal for Top and Bottom Books ──────────────────────────── */}
      {selectedPub && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
          onClick={closeDetails}
        >
          <div 
            className="bg-white border border-gray-100 rounded-3xl max-w-4xl w-full p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between max-h-[85vh] animate-scaleUp cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <div>
                <span className="inline-block text-[10px] font-normal uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 mb-1.5">
                  {selectedPub.channel} Channel Analysis
                </span>
                <h4 className="text-xl font-normal text-gray-950 tracking-tight">{selectedPub.publisher}</h4>
              </div>
              <button
                onClick={closeDetails}
                className="h-8 w-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            {/* Dynamic Content */}
            <div className="overflow-y-auto pr-1 flex-1">
              {loadingDetails && (
                <div className="h-60 flex flex-col items-center justify-center gap-3">
                  <FiLoader className="h-8 w-8 text-teal-600 animate-spin" />
                  <p className="text-xs text-gray-400">Aggregating publisher book performance...</p>
                </div>
              )}

              {errorDetails && (
                <div className="h-60 flex items-center justify-center text-xs text-rose-500">
                  {errorDetails}
                </div>
              )}

              {details && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Top Books */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-normal text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5 uppercase tracking-wider">
                      <FiTrendingUp className="h-3.5 w-3.5" />
                      Top Performing Titles
                    </h5>
                    <div className="space-y-3">
                      {details.topBooks.length > 0 ? details.topBooks.map((b, i) => (
                        <div key={b.title} className="p-3 bg-gray-50/50 rounded-2xl border border-gray-50 flex flex-col justify-between min-h-[80px]">
                          <p className="text-xs font-normal text-gray-800 line-clamp-2 leading-relaxed">
                            {b.title}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/50 text-[10px] font-normal text-gray-500">
                            <span>#{i + 1} Best Seller</span>
                            <span className="text-teal-700 font-normal">
                              {formatINR(b.revenue)} ({b.qty} sold)
                            </span>
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs text-gray-400 italic pt-2">No best-selling records found.</p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Books */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-normal text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5 uppercase tracking-wider">
                      <FiTrendingDown className="h-3.5 w-3.5" />
                      Attention Required (Bottom)
                    </h5>
                    <div className="space-y-3">
                      {details.bottomBooks.length > 0 ? details.bottomBooks.map((b, i) => (
                        <div key={b.title} className="p-3 bg-gray-50/50 rounded-2xl border border-gray-50 flex flex-col justify-between min-h-[80px]">
                          <p className="text-xs font-normal text-gray-800 line-clamp-2 leading-relaxed">
                            {b.title}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/50 text-[10px] font-normal text-gray-500">
                            <span>Lowest Revenue #{i + 1}</span>
                            <span className="text-amber-700 font-normal">
                              {formatINR(b.revenue)} ({b.qty} sold)
                            </span>
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs text-gray-400 italic pt-2">No low-performing records found.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 pt-5 mt-6 flex items-center justify-between text-[10px] font-normal text-gray-400">
              <span className="flex items-center gap-1">
                <FiActivity className="h-3 w-3 text-teal-600" />
                Live Database Analysis
              </span>
              <span>Based on active filters & selected YTD range</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
