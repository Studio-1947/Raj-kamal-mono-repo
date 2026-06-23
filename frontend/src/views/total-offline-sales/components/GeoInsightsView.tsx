import React, { useMemo, useState } from 'react';
import IndiaMap from '../../../components/geo/IndiaMap';
import { canonState } from '../../../components/geo/geoNames';
import { formatLakhsAndCrores } from './utils';

type ChannelKey = 'all' | 'Delhi' | 'Mumbai' | 'Patna' | 'Online' | 'BookFair' | 'Lokbharti';

interface StateEntry {
  state: string;
  revenue: number;
  qty: number;
}

interface CityEntry {
  city: string;
  state: string;
  revenue: number;
  qty: number;
}

interface GeoInsightsViewProps {
  topStatesByChannel: Record<string, StateEntry[]>;
  topCitiesByChannel: Record<string, CityEntry[]>;
  activeChannel: ChannelKey;
  activeTab: 'revenue' | 'volume';
}

const RANK_COLORS = ['#B8960C', '#6B7280', '#92400E'];

export const GeoInsightsView: React.FC<GeoInsightsViewProps> = ({
  topStatesByChannel,
  topCitiesByChannel,
  activeChannel,
  activeTab,
}) => {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity]   = useState<string | null>(null);

  const toggleState = (name: string) =>
    setSelectedState((prev) => (prev && canonState(prev) === canonState(name) ? null : name));

  const { aggregatedStates, aggregatedCities } = useMemo(() => {
    const channelKeys =
      activeChannel === 'all'
        ? Object.keys(topStatesByChannel)
        : [activeChannel];

    const stateMap = new Map<string, { revenue: number; qty: number }>();
    // Track online vs offline revenue per city so markers can be coloured by channel.
    const cityMap = new Map<string, CityEntry & { onlineRev: number; offlineRev: number }>();

    for (const ch of channelKeys) {
      const isOnline = ch === 'Online';
      for (const s of topStatesByChannel[ch] || []) {
        const prev = stateMap.get(s.state) || { revenue: 0, qty: 0 };
        stateMap.set(s.state, {
          revenue: prev.revenue + s.revenue,
          qty: prev.qty + s.qty,
        });
      }
      for (const c of topCitiesByChannel?.[ch] || []) {
        const key = `${c.city}|${c.state}`;
        const prev = cityMap.get(key) || { city: c.city, state: c.state, revenue: 0, qty: 0, onlineRev: 0, offlineRev: 0 };
        cityMap.set(key, {
          ...prev,
          revenue: prev.revenue + c.revenue,
          qty: prev.qty + c.qty,
          onlineRev: prev.onlineRev + (isOnline ? c.revenue : 0),
          offlineRev: prev.offlineRev + (isOnline ? 0 : c.revenue),
        });
      }
    }

    const sortKey = activeTab === 'revenue' ? 'revenue' : 'qty';

    const aggregatedStates = Array.from(stateMap.entries())
      .map(([state, v]) => ({ state, ...v }))
      .sort((a, b) => b[sortKey] - a[sortKey]);

    const aggregatedCities = Array.from(cityMap.values()).sort(
      (a, b) => b[sortKey] - a[sortKey]
    );

    return { aggregatedStates, aggregatedCities };
  }, [topStatesByChannel, topCitiesByChannel, activeChannel, activeTab]);

  const mapPoints = useMemo(() => {
    return aggregatedCities.slice(0, 10).map((c) => ({
      pincode: '',
      city: c.city,
      state: c.state,
      orders: c.qty,
      total: c.revenue,
      kind: 'top' as const,
      // Classify by the dominant channel for this city.
      channelType: (c.onlineRev > c.offlineRev ? 'online' : 'offline') as 'online' | 'offline',
    }));
  }, [aggregatedCities]);

  const displayCities = useMemo(() => {
    if (selectedState) {
      return aggregatedCities.filter(
        (c) => canonState(c.state) === canonState(selectedState)
      );
    }
    return aggregatedCities.slice(0, 18);
  }, [aggregatedCities, selectedState]);

  const maxStateVal = Math.max(
    ...aggregatedStates.map((s) => (activeTab === 'revenue' ? s.revenue : s.qty)),
    1
  );
  const maxCityVal = Math.max(
    ...displayCities.map((c) => (activeTab === 'revenue' ? c.revenue : c.qty)),
    1
  );

  const fmt = (val: number) =>
    activeTab === 'revenue'
      ? formatLakhsAndCrores(val)
      : val.toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'States Reached',
            value: aggregatedStates.length,
            sub: 'across all channels',
            color: 'text-indigo-600',
            bg: 'from-indigo-50 to-white',
          },
          {
            label: 'Cities Reached',
            value: aggregatedCities.length,
            sub: 'unique city–state pairs',
            color: 'text-teal-600',
            bg: 'from-teal-50 to-white',
          },
          {
            label: 'Top State',
            value: aggregatedStates[0]?.state || '—',
            sub: aggregatedStates[0]
              ? fmt(
                  activeTab === 'revenue'
                    ? aggregatedStates[0].revenue
                    : aggregatedStates[0].qty
                )
              : '',
            color: 'text-amber-600',
            bg: 'from-amber-50 to-white',
          },
          {
            label: 'Top City',
            value: aggregatedCities[0]?.city || '—',
            sub: aggregatedCities[0]
              ? `${aggregatedCities[0].state} · ${fmt(
                  activeTab === 'revenue'
                    ? aggregatedCities[0].revenue
                    : aggregatedCities[0].qty
                )}`
              : '',
            color: 'text-rose-600',
            bg: 'from-rose-50 to-white',
          },
        ].map(({ label, value, sub, color, bg }) => (
          <div
            key={label}
            className={`rounded-2xl border border-gray-100 bg-gradient-to-br ${bg} shadow-sm p-4`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              {label}
            </p>
            <p className={`text-xl font-bold ${color} truncate`}>{value}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Map + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* India Map — takes 2 columns */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <IndiaMap
            points={mapPoints}
            topN={10}
            choropleth
            filterKind="top"
            channelMode
            stateData={aggregatedStates}
            metric={activeTab}
            selectedState={selectedState}
            hoveredState={hoveredState}
            hoveredCity={hoveredCity}
            onStateHover={setHoveredState}
            onStateClick={toggleState}
            onPointClick={(p) => toggleState(p.state)}
          />
          <p className="text-[10px] text-center text-gray-400">
            {selectedState ? (
              <>
                Filtered to{' '}
                <span className="font-semibold text-indigo-600">{selectedState}</span> —{' '}
                <button
                  onClick={() => setSelectedState(null)}
                  className="underline hover:text-indigo-800"
                >
                  clear
                </button>
              </>
            ) : (
              'Click a state to drill down into its cities · Scroll / pinch to zoom'
            )}
          </p>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[680px] pr-1 custom-scrollbar">
          {/* Top States */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
              {activeTab === 'revenue' ? 'Revenue by State' : 'Copies by State'}
            </h3>
            <div className="space-y-3">
              {aggregatedStates.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No state data</p>
              ) : (
                aggregatedStates.slice(0, 10).map((s, i) => {
                  const val = activeTab === 'revenue' ? s.revenue : s.qty;
                  const pct = (val / maxStateVal) * 100;
                  const isSelected =
                    !!selectedState && canonState(selectedState) === canonState(s.state);
                  const isHovered =
                    !!hoveredState && canonState(hoveredState) === canonState(s.state);
                  return (
                    <div
                      key={s.state}
                      className={`cursor-pointer rounded-lg -mx-2 px-2 py-1 transition-all ${
                        selectedState && !isSelected ? 'opacity-40' : ''
                      } ${isHovered ? 'bg-indigo-50' : ''}`}
                      onClick={() => toggleState(s.state)}
                      onMouseEnter={() => setHoveredState(s.state)}
                      onMouseLeave={() => setHoveredState(null)}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 text-gray-700 truncate max-w-[60%]">
                          {i < 3 ? (
                            <span
                              className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: RANK_COLORS[i] }}
                            >
                              {i + 1}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 w-5 text-center shrink-0">
                              {i + 1}
                            </span>
                          )}
                          {s.state}
                        </span>
                        <span className="font-semibold text-gray-800 shrink-0">
                          {fmt(val)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isSelected ? 'bg-indigo-600' : 'bg-indigo-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cities */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {selectedState ? `Cities · ${selectedState}` : 'Top Cities'}
              </h3>
              {selectedState && (
                <button
                  onClick={() => setSelectedState(null)}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  Show all
                </button>
              )}
            </div>
            <div className="space-y-3">
              {displayCities.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No city data available</p>
              ) : (
                displayCities.map((c, i) => {
                  const val = activeTab === 'revenue' ? c.revenue : c.qty;
                  const pct = (val / maxCityVal) * 100;
                  const isHovered = hoveredCity?.toLowerCase() === c.city.toLowerCase();
                  return (
                    <div
                      key={`${c.city}-${c.state}`}
                      className={`cursor-pointer rounded-lg -mx-2 px-2 py-1 transition-all ${isHovered ? 'bg-teal-50' : ''}`}
                      onClick={() => toggleState(c.state)}
                      onMouseEnter={() => setHoveredCity(c.city)}
                      onMouseLeave={() => setHoveredCity(null)}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 text-gray-700 truncate max-w-[65%]">
                          <span className="text-[10px] text-gray-400 w-4 shrink-0">
                            {i + 1}
                          </span>
                          <span className="truncate">{c.city}</span>
                          {!selectedState && (
                            <span className="text-gray-300 text-[10px] shrink-0">
                              {c.state}
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-gray-800 shrink-0">
                          {fmt(val)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
