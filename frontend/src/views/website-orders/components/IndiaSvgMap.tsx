import React, { useMemo } from "react";
import { DISTRICT_PATHS, OFFICIAL_MAP_CENTROIDS } from "./indiaMapData";

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

/**
 * Generates a color gradient for choropleth mapping.
 */
function getFillColor(value: number, max: number, isSelected: boolean): string {
  if (isSelected) return "#1E1B4B"; // Premium Dark Indigo
  if (!value || max <= 0) return "#F8FAFC"; // Ultra Light Slate
  
  const ratio = Math.min(1, Math.max(0.08, value / max));
  
  if (ratio < 0.2) return "#E0E7FF"; // Indigo 100
  if (ratio < 0.4) return "#C7D2FE"; // Indigo 200
  if (ratio < 0.65) return "#818CF8"; // Indigo 400
  if (ratio < 0.85) return "#4F46E5"; // Indigo 600
  return "#3730A3"; // Indigo 800
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

  return (
    <div className="relative w-full flex items-center justify-center select-none bg-gradient-to-b from-slate-50/90 via-white to-blue-50/30 rounded-3xl p-3 sm:p-5 border border-slate-200/80 shadow-xs overflow-hidden">
      <svg
        viewBox="0 0 1977 2313"
        className="w-full h-auto max-h-[580px] drop-shadow-sm transition-all duration-300"
        aria-label="Detailed Map of India"
      >
        <defs>
          <radialGradient id="pincodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* State & Inner District Polygons */}
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
              >
                {/* Inner District Polygons */}
                {paths.map((p) => (
                  <path
                    key={p.idx}
                    d={p.d}
                    fill={isHovered ? "#3563E9" : fillColor}
                    stroke={isHovered ? "#1D4ED8" : isSelected ? "#0F172A" : "rgba(255, 255, 255, 0.45)"}
                    strokeWidth={isHovered || isSelected ? 1.2 : 0.4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className="transition-all duration-150"
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

            return (
              <g
                key={`label-${st.code}`}
                className="pointer-events-none"
              >
                {/* Text halo outline */}
                <text
                  x={st.cx}
                  y={st.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-black text-[22px] fill-white stroke-white stroke-[5] opacity-95 select-none"
                >
                  {st.code}
                </text>
                <text
                  x={st.cx}
                  y={st.cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`font-black text-[22px] transition-all select-none ${
                    isHovered || isSelected
                      ? "fill-amber-300"
                      : hasSales
                      ? "fill-slate-900"
                      : "fill-slate-400 opacity-70"
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
              const radius = Math.min(42, Math.max(14, Math.sqrt(pin.orders) * 9));
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
                    r={7}
                    fill="#DC2626"
                    stroke="#FFFFFF"
                    strokeWidth={2.5}
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
