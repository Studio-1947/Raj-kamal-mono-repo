import React, { useState, useMemo, useEffect } from "react";
import { DISTRICT_PATHS, OFFICIAL_MAP_CENTROIDS, StateCentroid } from "./indiaMapData";
import { FiZoomIn, FiZoomOut, FiMaximize2, FiMapPin, FiX } from "react-icons/fi";

export interface StateMetrics {
  state: string;
  orders: number;
  revenue: number;
}

export const STATE_ALIAS_MAP: Record<string, string> = {
  "AP": "AP", "ANDHRA PRADESH": "AP", "ANDHRA": "AP", "A.P.": "AP", "A.P": "AP", "A P": "AP",
  "AR": "AR", "ARUNACHAL PRADESH": "AR", "ARUNACHAL": "AR",
  "AS": "AS", "ASSAM": "AS",
  "BR": "BR", "BIHAR": "BR",
  "CG": "CG", "CHHATTISGARH": "CG", "CHATTISGARH": "CG", "C.G.": "CG", "C G": "CG",
  "GA": "GA", "GOA": "GA",
  "GJ": "GJ", "GUJARAT": "GJ",
  "HR": "HR", "HARYANA": "HR",
  "HP": "HP", "HIMACHAL PRADESH": "HP", "HIMACHAL": "HP", "H.P.": "HP", "H P": "HP",
  "JH": "JH", "JHARKHAND": "JH",
  "KA": "KA", "KARNATAKA": "KA",
  "KL": "KL", "KERALA": "KL",
  "MP": "MP", "MADHYA PRADESH": "MP", "MADHYAPRADESH": "MP", "M.P.": "MP", "M P": "MP",
  "MH": "MH", "MAHARASHTRA": "MH", "MAHARASTRA": "MH", "M.H.": "MH", "M H": "MH",
  "MN": "MN", "MANIPUR": "MN",
  "ML": "ML", "MEGHALAYA": "ML",
  "MZ": "MZ", "MIZORAM": "MZ",
  "NL": "NL", "NAGALAND": "NL",
  "OR": "OR", "OD": "OR", "ODISHA": "OR", "ORISSA": "OR",
  "PB": "PB", "PUNJAB": "PB",
  "RJ": "RJ", "RAJASTHAN": "RJ",
  "SK": "SK", "SIKKIM": "SK",
  "TN": "TN", "TAMIL NADU": "TN", "TAMILNADU": "TN", "T.N.": "TN", "T N": "TN",
  "TS": "TS", "TG": "TS", "TELANGANA": "TS",
  "TR": "TR", "TRIPURA": "TR",
  "UP": "UP", "UTTAR PRADESH": "UP", "UTTARPRADESH": "UP", "U.P.": "UP", "U.P": "UP", "U P": "UP",
  "UK": "UK", "UA": "UK", "UTTARAKHAND": "UK", "U.K.": "UK", "U K": "UK",
  "WB": "WB", "WEST BENGAL": "WB", "WESTBENGAL": "WB", "W.B.": "WB", "W B": "WB",
  "DL": "DL", "DELHI": "DL", "NEW DELHI": "DL", "NCT OF DELHI": "DL", "D.L.": "DL",
  "JK": "JK", "JAMMU AND KASHMIR": "JK", "JAMMU & KASHMIR": "JK", "J&K": "JK", "J & K": "JK", "J.K.": "JK",
  "LA": "LA", "LADAKH": "LA",
};

export function normalizeStateCode(input: string | null | undefined): string {
  if (!input) return "UNKNOWN";
  const trimmed = input.trim().toUpperCase();
  if (STATE_ALIAS_MAP[trimmed]) return STATE_ALIAS_MAP[trimmed];
  const clean = trimmed.replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ");
  return STATE_ALIAS_MAP[clean] || "UNKNOWN";
}

export type BoundingBox = { minX: number; minY: number; maxX: number; maxY: number };

// Compute state bounding boxes from centroids and district path points
export const STATE_BOUNDING_BOXES: Record<string, BoundingBox> = (() => {
  const map: Record<string, BoundingBox> = {};
  for (const st of OFFICIAL_MAP_CENTROIDS) {
    map[st.code] = {
      minX: st.cx - 180,
      minY: st.cy - 180,
      maxX: st.cx + 180,
      maxY: st.cy + 180,
    };
  }
  for (const p of DISTRICT_PATHS) {
    const code = p.stateCode;
    const b = map[code] || { minX: p.cx - 60, minY: p.cy - 60, maxX: p.cx + 60, maxY: p.cy + 60 };
    if (p.cx < b.minX) b.minX = p.cx;
    if (p.cx > b.maxX) b.maxX = p.cx;
    if (p.cy < b.minY) b.minY = p.cy;
    if (p.cy > b.maxY) b.maxY = p.cy;
    map[code] = b;
  }
  return map;
})();

const FULL_VIEWBOX = { x: 0, y: 0, w: 1977, h: 2313 };

interface IndiaSvgMapProps {
  metricsByState: Map<string, { orders: number; revenue: number }>;
  maxMetricValue: number;
  activeMetric: "revenue" | "orders";
  selectedStateCode: string | null;
  onSelectState: (stateCode: string | null) => void;
  hoveredStateCode: string | null;
  onHoverState: (stateCode: string | null, event?: React.MouseEvent) => void;
  pincodeMarkers?: {
    postalCode: string;
    city: string | null;
    state: string | null;
    orders: number;
    revenue: number;
    x: number;
    y: number;
  }[];
}

function getFillColor(value: number, max: number, isSelected: boolean): string {
  if (isSelected) return "#312E81"; // Deep Indigo 900
  if (!value || max <= 0) return "#F8FAFC";
  
  const ratio = Math.min(1, Math.max(0.08, value / max));
  
  if (ratio < 0.2) return "#E0E7FF"; // Indigo 100
  if (ratio < 0.4) return "#A5B4FC"; // Indigo 300
  if (ratio < 0.65) return "#6366F1"; // Indigo 500
  if (ratio < 0.85) return "#4338CA"; // Indigo 700
  return "#2E1065"; // Purple 950
}

export const IndiaSvgMap: React.FC<IndiaSvgMapProps> = ({
  metricsByState,
  maxMetricValue,
  activeMetric,
  selectedStateCode,
  onSelectState,
  hoveredStateCode,
  onHoverState,
  pincodeMarkers = [],
}) => {
  // Current viewBox state for smooth zooming and panning
  const [viewBoxState, setViewBoxState] = useState(FULL_VIEWBOX);
  const [zoomScale, setZoomScale] = useState(1);

  // Group district paths by state code
  const pathsByState = useMemo(() => {
    const map = new Map<string, typeof DISTRICT_PATHS>();
    for (const p of DISTRICT_PATHS) {
      const list = map.get(p.stateCode) || [];
      list.push(p);
      map.set(p.stateCode, list);
    }
    return map;
  }, []);

  // Update viewBox when selectedStateCode changes (Click to Zoom)
  useEffect(() => {
    if (!selectedStateCode) {
      setViewBoxState(FULL_VIEWBOX);
      setZoomScale(1);
      return;
    }

    const bounds = STATE_BOUNDING_BOXES[selectedStateCode];
    if (!bounds) {
      setViewBoxState(FULL_VIEWBOX);
      setZoomScale(1);
      return;
    }

    // Calculate padded bounding box
    const padding = 160;
    const minX = Math.max(0, bounds.minX - padding);
    const minY = Math.max(0, bounds.minY - padding);
    const maxX = Math.min(FULL_VIEWBOX.w, bounds.maxX + padding);
    const maxY = Math.min(FULL_VIEWBOX.h, bounds.maxY + padding);

    const bWidth = Math.max(450, maxX - minX);
    const bHeight = Math.max(450, maxY - minY);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Maintain 1977:2313 aspect ratio
    const targetRatio = FULL_VIEWBOX.w / FULL_VIEWBOX.h;
    let targetW = bWidth;
    let targetH = bWidth / targetRatio;

    if (targetH < bHeight) {
      targetH = bHeight;
      targetW = bHeight * targetRatio;
    }

    const vx = Math.max(0, Math.min(FULL_VIEWBOX.w - targetW, cx - targetW / 2));
    const vy = Math.max(0, Math.min(FULL_VIEWBOX.h - targetH, cy - targetH / 2));

    setViewBoxState({ x: vx, y: vy, w: targetW, h: targetH });
    setZoomScale(Number((FULL_VIEWBOX.w / targetW).toFixed(2)));
  }, [selectedStateCode]);

  // Zoom control handlers
  const handleZoomIn = () => {
    setViewBoxState((prev) => {
      const newW = Math.max(300, prev.w * 0.75);
      const newH = Math.max(350, prev.h * 0.75);
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const vx = Math.max(0, Math.min(FULL_VIEWBOX.w - newW, cx - newW / 2));
      const vy = Math.max(0, Math.min(FULL_VIEWBOX.h - newH, cy - newH / 2));
      setZoomScale(Number((FULL_VIEWBOX.w / newW).toFixed(2)));
      return { x: vx, y: vy, w: newW, h: newH };
    });
  };

  const handleZoomOut = () => {
    setViewBoxState((prev) => {
      const newW = Math.min(FULL_VIEWBOX.w, prev.w * 1.3);
      const newH = Math.min(FULL_VIEWBOX.h, prev.h * 1.3);
      if (newW >= FULL_VIEWBOX.w || newH >= FULL_VIEWBOX.h) {
        setZoomScale(1);
        return FULL_VIEWBOX;
      }
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const vx = Math.max(0, Math.min(FULL_VIEWBOX.w - newW, cx - newW / 2));
      const vy = Math.max(0, Math.min(FULL_VIEWBOX.h - newH, cy - newH / 2));
      setZoomScale(Number((FULL_VIEWBOX.w / newW).toFixed(2)));
      return { x: vx, y: vy, w: newW, h: newH };
    });
  };

  const handleResetZoom = () => {
    onSelectState(null);
    setViewBoxState(FULL_VIEWBOX);
    setZoomScale(1);
  };

  const selectedStateName = useMemo(() => {
    if (!selectedStateCode) return null;
    return OFFICIAL_MAP_CENTROIDS.find((s) => s.code === selectedStateCode)?.name || selectedStateCode;
  }, [selectedStateCode]);

  const viewBoxString = `${viewBoxState.x} ${viewBoxState.y} ${viewBoxState.w} ${viewBoxState.h}`;

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const factor = e.deltaY > 0 ? 1.15 : 0.85;
    setViewBoxState((prev) => {
      const newW = Math.min(FULL_VIEWBOX.w, Math.max(260, prev.w * factor));
      const newH = Math.min(FULL_VIEWBOX.h, Math.max(300, prev.h * factor));
      if (newW >= FULL_VIEWBOX.w || newH >= FULL_VIEWBOX.h) {
        setZoomScale(1);
        return FULL_VIEWBOX;
      }
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const vx = Math.max(0, Math.min(FULL_VIEWBOX.w - newW, cx - newW / 2));
      const vy = Math.max(0, Math.min(FULL_VIEWBOX.h - newH, cy - newH / 2));
      setZoomScale(Number((FULL_VIEWBOX.w / newW).toFixed(2)));
      return { x: vx, y: vy, w: newW, h: newH };
    });
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center select-none bg-gradient-to-b from-slate-50/90 via-white to-blue-50/30 rounded-3xl p-3 sm:p-5 border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Zoom Control Overlay & State Badge */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {selectedStateCode ? (
          <div className="flex items-center gap-2 bg-indigo-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-semibold shadow-lg border border-indigo-700 animate-in fade-in zoom-in-95 duration-200">
            <FiMapPin className="h-3.5 w-3.5 text-amber-300 animate-bounce" />
            <span>Zoomed into {selectedStateName} ({selectedStateCode})</span>
            <button
              onClick={handleResetZoom}
              className="ml-1 rounded-full p-0.5 hover:bg-indigo-700 text-indigo-200 hover:text-white transition"
              title="Reset Zoom to India Map"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : zoomScale > 1 ? (
          <div className="flex items-center gap-2 bg-slate-800/90 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-semibold shadow-lg border border-slate-700">
            <span>Zoom Level: {zoomScale}x</span>
            <button
              onClick={handleResetZoom}
              className="ml-1 rounded-full p-0.5 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Reset Zoom"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Floating Zoom Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl p-1.5 shadow-md">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition active:scale-95"
          title="Zoom In (+)"
        >
          <FiZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition active:scale-95"
          title="Zoom Out (-)"
        >
          <FiZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="p-2 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition active:scale-95"
          title="Reset Zoom (Full India Map)"
        >
          <FiMaximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* SVG Map Canvas */}
      <svg
        viewBox={viewBoxString}
        onWheel={handleWheel}
        className="w-full h-auto max-h-[580px] drop-shadow-sm transition-all duration-500 ease-out cursor-grab active:cursor-grabbing"
        aria-label="Interactive Heatmap of India"
      >
        <defs>
          <radialGradient id="pincodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>

          <filter id="shadow-selected" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#312E81" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* State & Inner District Polygons Layer */}
        <g id="states-layer">
          {[...pathsByState.entries()].map(([stateCode, paths]) => {
            const metrics = metricsByState.get(stateCode);
            const val = metrics ? (activeMetric === "revenue" ? metrics.revenue : metrics.orders) : 0;
            const isSelected = selectedStateCode === stateCode;
            const isHovered = hoveredStateCode === stateCode;
            const fillColor = getFillColor(val, maxMetricValue, isSelected);

            return (
              <g
                key={stateCode}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSelectState(isSelected ? null : stateCode)}
                onMouseEnter={(e) => onHoverState(stateCode, e)}
                onMouseMove={(e) => onHoverState(stateCode, e)}
                onMouseLeave={() => onHoverState(null)}
                filter={isSelected ? "url(#shadow-selected)" : undefined}
              >
                {/* Inner District Polygons */}
                {paths.map((p) => (
                  <path
                    key={p.idx}
                    d={p.d}
                    fill={isHovered && !isSelected ? "#4F46E5" : fillColor}
                    stroke={
                      isSelected
                        ? "#F59E0B"
                        : isHovered
                        ? "#1D4ED8"
                        : "rgba(255, 255, 255, 0.5)"
                    }
                    strokeWidth={isSelected ? 2.8 : isHovered ? 1.6 : 0.45}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className="transition-colors duration-150"
                  />
                ))}
              </g>
            );
          })}
        </g>

        {/* Clean State Code Labels on Centroids */}
        <g id="state-labels">
          {OFFICIAL_MAP_CENTROIDS.map((st) => {
            const metrics = metricsByState.get(st.code);
            const val = metrics ? (activeMetric === "revenue" ? metrics.revenue : metrics.orders) : 0;
            const isSelected = selectedStateCode === st.code;
            const isHovered = hoveredStateCode === st.code;
            const hasSales = val > 0;

            // Scale label size smoothly when zoomed in
            const fontSize = zoomScale > 1.8 ? 16 : zoomScale > 1.2 ? 19 : 22;

            return (
              <g key={`label-${st.code}`} className="pointer-events-none">
                {/* Text halo outline */}
                <text
                  x={st.cx}
                  y={st.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={fontSize}
                  className="font-black fill-white stroke-white stroke-[5] opacity-95 select-none"
                >
                  {st.code}
                </text>
                <text
                  x={st.cx}
                  y={st.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={fontSize}
                  className={`font-black transition-all select-none ${
                    isSelected
                      ? "fill-amber-300 font-extrabold"
                      : isHovered
                      ? "fill-amber-200 font-bold"
                      : hasSales
                      ? "fill-slate-900 font-bold"
                      : "fill-slate-400 opacity-60"
                  }`}
                >
                  {st.code}
                </text>
              </g>
            );
          })}
        </g>

        {/* Pincode Heatmap Density Markers */}
        {pincodeMarkers.length > 0 && (
          <g id="pincodes-overlay">
            {pincodeMarkers.map((pin, idx) => {
              const radius = Math.min(48, Math.max(16, Math.sqrt(pin.orders) * 10));
              return (
                <g key={`${pin.postalCode}-${idx}`} className="animate-pulse">
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={radius}
                    fill="url(#pincodeGlow)"
                    className="pointer-events-none"
                  />
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={6}
                    fill="#DC2626"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    className="pointer-events-none"
                  />
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
};
