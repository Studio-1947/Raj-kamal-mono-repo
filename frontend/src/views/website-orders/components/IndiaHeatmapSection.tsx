import React, { useState, useMemo } from "react";
import {
  FiMapPin,
  FiSearch,
  FiTrendingUp,
  FiPieChart,
  FiLayers,
  FiX,
  FiMap,
  FiGlobe,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { OrdersSummary } from "../../../services/websiteOrdersService";
import { INDIA_STATE_SHAPES } from "./indiaStateShapes";
import {
  IndiaSvgMap,
  normalizeStateCode,
  StateMetrics,
} from "./IndiaSvgMap";

interface IndiaHeatmapSectionProps {
  summary: OrdersSummary | undefined;
  isLoading: boolean;
}

function stateCodeFromPincode(postalCode: string): string | null {
  if (!postalCode) return null;
  const prefix = postalCode.trim().slice(0, 2);
  switch (prefix) {
    case "11": return "DL";
    case "12": case "13": return "HR";
    case "14": case "15": case "16": return "PB";
    case "17": return "HP";
    case "18": case "19": return "JK";
    case "20": case "21": case "22": case "23": case "24": case "25": case "26": case "27": case "28": return "UP";
    case "30": case "31": case "32": case "33": case "34": return "RJ";
    case "36": case "37": case "38": case "39": return "GJ";
    case "40": case "41": case "42": case "43": case "44": return "MH";
    case "45": case "46": case "47": case "48": return "MP";
    case "49": return "CG";
    case "50": case "51": case "52": case "53": return "TS";
    case "56": case "57": case "58": case "59": return "KA";
    case "60": case "61": case "62": case "63": case "64": return "TN";
    case "67": case "68": case "69": return "KL";
    case "70": case "71": case "72": case "73": case "74": return "WB";
    case "75": case "76": case "77": return "OR";
    case "78": return "AS";
    case "79": return "TR";
    case "80": case "81": case "82": case "83": case "84": case "85": return "BR";
    default: return null;
  }
}

export const IndiaHeatmapSection: React.FC<IndiaHeatmapSectionProps> = ({
  summary,
  isLoading,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMetric, setActiveMetric] = useState<"revenue" | "orders">("revenue");
  const [viewMode, setViewMode] = useState<"state" | "pincode">("state");
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [hoveredStateCode, setHoveredStateCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Map state metrics normalized by state code
  const metricsByState = useMemo(() => {
    const map = new Map<string, StateMetrics>();
    if (!summary?.topStates) return map;

    for (const item of summary.topStates) {
      const code = normalizeStateCode(item.state);
      if (code === "UNKNOWN") continue;

      const existing = map.get(code) || { state: item.state, orders: 0, revenue: 0 };
      map.set(code, {
        state: item.state,
        orders: existing.orders + item.orders,
        revenue: existing.revenue + item.revenue,
      });
    }
    return map;
  }, [summary?.topStates]);

  // Max value for map color scaling
  const maxMetricValue = useMemo(() => {
    let max = 0;
    for (const m of metricsByState.values()) {
      const val = activeMetric === "revenue" ? m.revenue : m.orders;
      if (val > max) max = val;
    }
    return max || 1;
  }, [metricsByState, activeMetric]);

  // Top state for summary bar
  const topStateInfo = useMemo(() => {
    if (metricsByState.size === 0) return null;
    let topCode = "";
    let maxRev = -1;
    for (const [code, m] of metricsByState.entries()) {
      if (m.revenue > maxRev) {
        maxRev = m.revenue;
        topCode = code;
      }
    }
    const path = INDIA_STATE_SHAPES.find((s) => s.code === topCode);
    return { name: path?.name || topCode, code: topCode, revenue: maxRev };
  }, [metricsByState]);

  // Pincode dots: every top pincode in Pincode view, or just the selected state's in State view
  const pincodeMarkers = useMemo(() => {
    if (!summary?.topPincodes) return [];
    if (viewMode !== "pincode" && !selectedStateCode) return [];
    const q = searchQuery.toLowerCase().trim();
    return summary.topPincodes.filter((pin) => {
      if (selectedStateCode) {
        const code = normalizeStateCode(pin.state);
        const resolved = code !== "UNKNOWN" ? code : stateCodeFromPincode(pin.postalCode);
        if (resolved !== selectedStateCode) return false;
      }
      if (!q) return true;
      return (
        pin.postalCode.includes(q) ||
        (pin.city && pin.city.toLowerCase().includes(q)) ||
        (pin.state && pin.state.toLowerCase().includes(q))
      );
    });
  }, [summary?.topPincodes, searchQuery, viewMode, selectedStateCode]);

  // Hover state details
  const hoveredStateObj = useMemo(() => {
    if (!hoveredStateCode) return null;
    const path = INDIA_STATE_SHAPES.find((s) => s.code === hoveredStateCode);
    const metrics = metricsByState.get(hoveredStateCode);
    return {
      name: path?.name || hoveredStateCode,
      code: hoveredStateCode,
      orders: metrics?.orders || 0,
      revenue: metrics?.revenue || 0,
      pctRevenue: summary?.revenue ? (((metrics?.revenue || 0) / summary.revenue) * 100).toFixed(1) : "0",
    };
  }, [hoveredStateCode, metricsByState, summary?.revenue]);

  const handleHoverState = (code: string | null, event?: React.MouseEvent) => {
    setHoveredStateCode(code);
    if (code && event) {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    } else {
      setTooltipPos(null);
    }
  };

  const filteredPincodes = useMemo(() => {
    if (!summary?.topPincodes) return [];
    let list = summary.topPincodes;
    if (selectedStateCode) {
      list = list.filter((p) => normalizeStateCode(p.state) === selectedStateCode);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.postalCode.includes(q) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.state && p.state.toLowerCase().includes(q))
      );
    }
    return list.slice(0, 10);
  }, [summary?.topPincodes, selectedStateCode, searchQuery]);

  const topPincodeMaxRevenue = useMemo(() => {
    return filteredPincodes[0]?.revenue || 1;
  }, [filteredPincodes]);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm space-y-5 transition-all duration-300">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50/80 text-blue-600 border border-blue-100/50 shadow-2xs">
              <FiGlobe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  India Sales & Pincode Heatmap
                </h3>
                {isCollapsed && topStateInfo && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                    Top Region: {topStateInfo.name} (₹{topStateInfo.revenue.toLocaleString("en-IN")})
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Geographic distribution of customer orders and revenue across Indian states and pincodes.
              </p>
            </div>
          </div>

          {/* Collapse Toggle Button (Mobile/Desktop Header Trigger) */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex lg:hidden items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition active:scale-95"
          >
            {isCollapsed ? (
              <>
                <span>Expand</span>
                <FiChevronDown className="h-4 w-4 text-blue-600" />
              </>
            ) : (
              <>
                <span>Collapse</span>
                <FiChevronUp className="h-4 w-4 text-gray-500" />
              </>
            )}
          </button>
        </div>

        {/* Controls Toolbar (Only shown when expanded) */}
        {!isCollapsed && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Metric Selector */}
            <div className="flex items-center rounded-xl border border-gray-200/80 bg-gray-50/80 p-1">
              <button
                type="button"
                onClick={() => setActiveMetric("revenue")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeMetric === "revenue"
                    ? "bg-white text-blue-700 shadow-2xs border border-gray-200/80"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FiTrendingUp className="h-3.5 w-3.5" />
                <span>Revenue (₹)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("orders")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeMetric === "orders"
                    ? "bg-white text-blue-700 shadow-2xs border border-gray-200/80"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FiPieChart className="h-3.5 w-3.5" />
                <span>Orders</span>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-gray-200/80 bg-gray-50/80 p-1">
              <button
                type="button"
                onClick={() => setViewMode("state")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "state"
                    ? "bg-white text-gray-900 shadow-2xs border border-gray-200/80"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FiMap className="h-3.5 w-3.5" />
                <span>State View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pincode")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "pincode"
                    ? "bg-white text-gray-900 shadow-2xs border border-gray-200/80"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FiLayers className="h-3.5 w-3.5 text-red-500" />
                <span>Pincode Heatmap</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative min-w-[170px]">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter state/pincode..."
                className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition active:scale-95"
              title="Collapse Heatmap Section"
            >
              <span>Collapse</span>
              <FiChevronUp className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Collapsed Header Expand Button */}
        {isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="hidden lg:flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition active:scale-95 shadow-2xs"
          >
            <span>Expand Heatmap</span>
            <FiChevronDown className="h-4 w-4 text-blue-600" />
          </button>
        )}
      </div>

      {/* Main Collapsible Content Body */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          {/* SVG Map Container (7 cols) */}
          <div className="lg:col-span-7 bg-slate-50/40 rounded-3xl p-3 sm:p-4 border border-gray-100 flex flex-col items-center justify-center relative min-h-[460px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
                <span className="text-xs font-medium text-gray-500">Loading geographic sales map…</span>
              </div>
            ) : (
              <>
                <IndiaSvgMap
                  metricsByState={metricsByState}
                  maxMetricValue={maxMetricValue}
                  activeMetric={activeMetric}
                  selectedStateCode={selectedStateCode}
                  onSelectState={setSelectedStateCode}
                  hoveredStateCode={hoveredStateCode}
                  onHoverState={handleHoverState}
                  pincodeMarkers={pincodeMarkers}
                />

                {/* Map Legend */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs border border-gray-200/90 rounded-2xl px-3.5 py-2 text-[11px] shadow-sm flex items-center gap-3">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Density:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-medium">Low</span>
                    <div className="h-2.5 w-20 rounded-full bg-gradient-to-r from-indigo-100 via-indigo-400 to-indigo-800" />
                    <span className="text-indigo-950 font-black">High</span>
                  </div>
                </div>
              </>
            )}

            {/* Floating Tooltip */}
            {hoveredStateObj && (
              <div
                style={
                  tooltipPos
                    ? {
                        position: "fixed",
                        left: `${Math.min(window.innerWidth - 230, tooltipPos.x + 15)}px`,
                        top: `${Math.min(window.innerHeight - 160, tooltipPos.y + 15)}px`,
                      }
                    : undefined
                }
                className={`pointer-events-none ${
                  tooltipPos ? "z-50" : "absolute top-4 right-4 z-30"
                } bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700/80 min-w-[190px] transition-all duration-75`}
              >
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-2">
                  <span className="font-bold text-xs text-blue-400">{hoveredStateObj.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-bold">
                    {hoveredStateObj.code}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Revenue:</span>
                    <span className="font-bold text-white">
                      ₹{hoveredStateObj.revenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Orders:</span>
                    <span className="font-bold text-white">
                      {hoveredStateObj.orders.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px] pt-1.5 border-t border-slate-800">
                    <span>Share of Total:</span>
                    <span className="text-blue-400 font-bold">{hoveredStateObj.pctRevenue}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Pincodes & States Side Leaderboard (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* State Filter Badge */}
            {selectedStateCode && (
              <div className="flex items-center justify-between bg-blue-50/90 border border-blue-200/80 rounded-2xl px-4 py-2.5 text-xs text-blue-900 font-semibold shadow-2xs">
                <span>
                  Filtered by State: <strong className="text-blue-700 font-black">{selectedStateCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStateCode(null)}
                  className="text-blue-600 hover:text-blue-950 font-bold underline underline-offset-2"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Leaderboard Table Card */}
            <div className="border border-gray-100 rounded-3xl bg-white p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-50 text-red-500">
                    <FiMapPin className="h-4 w-4" />
                  </div>
                  <span>Top Performing Pincodes</span>
                </h4>
                <span className="text-[11px] text-gray-400 font-mono font-medium">
                  {summary?.topPincodes?.length || 0} recorded
                </span>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                {filteredPincodes.length === 0 ? (
                  <div className="py-10 text-center text-xs text-gray-400 italic">
                    No pincode data matched your current filter criteria.
                  </div>
                ) : (
                  filteredPincodes.map((item, idx) => {
                    const pctWidth = Math.min(100, Math.max(8, (item.revenue / topPincodeMaxRevenue) * 100));
                    const isTop3 = idx < 3;
                    const badgeClass =
                      idx === 0
                        ? "bg-amber-100 text-amber-800 border-amber-300 font-black"
                        : idx === 1
                        ? "bg-slate-200 text-slate-700 border-slate-300 font-bold"
                        : idx === 2
                        ? "bg-orange-100 text-orange-800 border-orange-300 font-bold"
                        : "bg-slate-100 text-slate-600 border-slate-200 font-medium";

                    return (
                      <div
                        key={`${item.postalCode}-${idx}`}
                        onClick={() => {
                          const code = normalizeStateCode(item.state);
                          if (code !== "UNKNOWN") setSelectedStateCode(code);
                        }}
                        className="group relative p-3 rounded-2xl border border-gray-100 bg-gray-50/40 hover:bg-white hover:border-gray-200 hover:shadow-xs hover:border-indigo-200 transition-all duration-200 space-y-2 cursor-pointer"
                        title={`Click to zoom into ${item.state || item.city}`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className={`h-5 w-5 rounded-lg border text-[10px] flex items-center justify-center font-mono ${badgeClass}`}>
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-gray-900 text-xs">
                                  {item.postalCode}
                                </span>
                                <span className="font-semibold text-gray-700 truncate max-w-[130px] text-xs">
                                  {item.city || item.state || "India"}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {item.state ? `${item.state}` : "Region"}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-bold text-gray-900 text-xs">
                              ₹{item.revenue.toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] text-gray-500 font-medium">
                              {item.orders} {item.orders === 1 ? "order" : "orders"}
                            </div>
                          </div>
                        </div>

                        {/* Revenue Bar visualization */}
                        <div className="w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTop3
                                ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                                : "bg-gradient-to-r from-slate-400 to-slate-500"
                            }`}
                            style={{ width: `${pctWidth}%` }}
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
      )}
    </div>
  );
};
