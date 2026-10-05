import React, { useState, useEffect, useRef, useMemo } from "react";
import { FiZoomIn, FiZoomOut, FiMaximize2, FiMapPin, FiX } from "react-icons/fi";
import { OFFICIAL_MAP_CENTROIDS } from "./indiaMapData";

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

const FULL_VIEWBOX = { x: 0, y: 0, w: 4000, h: 4575 };

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [viewBoxState, setViewBoxState] = useState(FULL_VIEWBOX);
  
  const zoomScale = Number((FULL_VIEWBOX.w / viewBoxState.w).toFixed(2));

  useEffect(() => {
    let active = true;
    fetch('/images/india_states_pincodes.svg')
      .then(res => res.text())
      .then(text => {
        if (!active || !containerRef.current) return;
        containerRef.current.innerHTML = text;
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          svg.style.width = '100%';
          svg.style.height = 'auto';
          svg.style.maxHeight = '580px';
          svg.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
          svg.setAttribute('class', 'drop-shadow-sm cursor-grab active:cursor-grabbing');
        }
        setSvgLoaded(true);
      });
    return () => { active = false; };
  }, []);

  // Event Handlers for SVG Map
  useEffect(() => {
    if (!svgLoaded || !containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      if (target.tagName.toLowerCase() === 'path') {
        const stateName = target.getAttribute('data-state');
        const code = normalizeStateCode(stateName);
        if (code !== "UNKNOWN") {
          onHoverState(code, e as any);
        } else {
          onHoverState(null);
        }
      } else {
        onHoverState(null);
      }
    };
    
    const handleMouseLeave = () => {
      onHoverState(null);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      if (target.tagName.toLowerCase() === 'path') {
        const stateName = target.getAttribute('data-state');
        const code = normalizeStateCode(stateName);
        if (code !== "UNKNOWN") {
          onSelectState(selectedStateCode === code ? null : code);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.15 : 0.85;
      setViewBoxState((prev) => {
        const newW = Math.min(FULL_VIEWBOX.w, Math.max(500, prev.w * factor));
        const newH = Math.min(FULL_VIEWBOX.h, Math.max(570, prev.h * factor));
        if (newW >= FULL_VIEWBOX.w || newH >= FULL_VIEWBOX.h) return FULL_VIEWBOX;
        const cx = prev.x + prev.w / 2;
        const cy = prev.y + prev.h / 2;
        const vx = Math.max(0, Math.min(FULL_VIEWBOX.w - newW, cx - newW / 2));
        const vy = Math.max(0, Math.min(FULL_VIEWBOX.h - newH, cy - newH / 2));
        return { x: vx, y: vy, w: newW, h: newH };
      });
    };

    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('mouseleave', handleMouseLeave);
    svg.addEventListener('click', handleClick);
    svg.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      svg.removeEventListener('mousemove', handleMouseMove);
      svg.removeEventListener('mouseleave', handleMouseLeave);
      svg.removeEventListener('click', handleClick);
      svg.removeEventListener('wheel', handleWheel);
    };
  }, [svgLoaded, onHoverState, onSelectState, selectedStateCode]);

  // Sync viewBox state
  useEffect(() => {
    if (!svgLoaded || !containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (svg) {
      svg.setAttribute('viewBox', `${viewBoxState.x} ${viewBoxState.y} ${viewBoxState.w} ${viewBoxState.h}`);
    }
  }, [viewBoxState, svgLoaded]);

  // Click-to-Zoom bounding box logic
  useEffect(() => {
    if (!svgLoaded || !containerRef.current) return;
    if (!selectedStateCode) {
      setViewBoxState(FULL_VIEWBOX);
      return;
    }
    const paths = containerRef.current.querySelectorAll('path');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    paths.forEach(p => {
       if (normalizeStateCode(p.getAttribute('data-state')) === selectedStateCode) {
          const box = p.getBBox();
          if (box.x < minX) minX = box.x;
          if (box.y < minY) minY = box.y;
          if (box.x + box.width > maxX) maxX = box.x + box.width;
          if (box.y + box.height > maxY) maxY = box.y + box.height;
       }
    });
    
    if (minX !== Infinity) {
      const padding = 200;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(FULL_VIEWBOX.w, maxX + padding);
      maxY = Math.min(FULL_VIEWBOX.h, maxY + padding);
      
      const bWidth = Math.max(600, maxX - minX);
      const bHeight = Math.max(600, maxY - minY);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      
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
    }
  }, [selectedStateCode, svgLoaded]);

  // Apply Colors Imperatively
  useEffect(() => {
    if (!svgLoaded || !containerRef.current) return;
    
    const isPincodeMode = pincodeMarkers && pincodeMarkers.length > 0;
    const topPincodes = new Set(pincodeMarkers?.map(p => p.postalCode) || []);
    
    const paths = containerRef.current.querySelectorAll('path');
    paths.forEach(p => {
      const stateName = p.getAttribute('data-state');
      const pincode = p.getAttribute('data-pincode');
      const code = normalizeStateCode(stateName);
      
      const isSelected = selectedStateCode === code;
      const isHovered = hoveredStateCode === code;
      
      let stroke = isSelected ? "#F59E0B" : isHovered ? "#1D4ED8" : "rgba(255, 255, 255, 0.4)";
      let strokeWidth = isSelected ? "8" : isHovered ? "6" : "1";
      let fill = "#F8FAFC";
      
      if (isPincodeMode) {
        if (pincode && topPincodes.has(pincode)) {
          fill = "#EF4444"; // Red for top pincodes
          stroke = "#FFFFFF";
          strokeWidth = "3";
          p.style.transition = "fill 0.3s ease, stroke 0.3s ease";
          p.parentElement?.appendChild(p); // Bring to front
        } else {
          fill = "#F1F5F9"; // Faded background
          stroke = "rgba(0,0,0,0.05)";
          strokeWidth = "0.5";
        }
      } else {
        const metrics = metricsByState.get(code);
        const val = metrics ? (activeMetric === "revenue" ? metrics.revenue : metrics.orders) : 0;
        fill = getFillColor(val, maxMetricValue, isSelected);
        if (isHovered && !isSelected) {
          fill = "#4F46E5";
        }
        p.style.transition = "fill 0.2s ease, stroke 0.2s ease";
      }
      
      p.setAttribute('fill', fill);
      p.setAttribute('stroke', stroke);
      p.setAttribute('stroke-width', strokeWidth);
    });
  }, [svgLoaded, metricsByState, maxMetricValue, activeMetric, selectedStateCode, hoveredStateCode, pincodeMarkers]);

  const handleZoomIn = () => {
    setViewBoxState((prev) => {
      const newW = Math.max(500, prev.w * 0.75);
      const newH = Math.max(570, prev.h * 0.75);
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const vx = Math.max(0, Math.min(FULL_VIEWBOX.w - newW, cx - newW / 2));
      const vy = Math.max(0, Math.min(FULL_VIEWBOX.h - newH, cy - newH / 2));
      return { x: vx, y: vy, w: newW, h: newH };
    });
  };

  const handleZoomOut = () => {
    setViewBoxState((prev) => {
      const newW = Math.min(FULL_VIEWBOX.w, prev.w * 1.3);
      const newH = Math.min(FULL_VIEWBOX.h, prev.h * 1.3);
      if (newW >= FULL_VIEWBOX.w || newH >= FULL_VIEWBOX.h) return FULL_VIEWBOX;
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const vx = Math.max(0, Math.min(FULL_VIEWBOX.w - newW, cx - newW / 2));
      const vy = Math.max(0, Math.min(FULL_VIEWBOX.h - newH, cy - newH / 2));
      return { x: vx, y: vy, w: newW, h: newH };
    });
  };

  const handleResetZoom = () => {
    onSelectState(null);
    setViewBoxState(FULL_VIEWBOX);
  };

  const selectedStateName = useMemo(() => {
    if (!selectedStateCode) return null;
    return OFFICIAL_MAP_CENTROIDS.find((s) => s.code === selectedStateCode)?.name || selectedStateCode;
  }, [selectedStateCode]);

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
        ) : zoomScale > 1.05 ? (
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

      {/* Injecting DOM-managed SVG directly */}
      <div className="relative w-full h-auto min-h-[400px] max-h-[580px] drop-shadow-sm transition-all duration-500 ease-out flex items-center justify-center" aria-label="Interactive Heatmap of India">
        {!svgLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center py-24 text-gray-400 gap-3 z-10 bg-white/50">
             <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
             <span className="text-xs font-medium text-gray-500">Loading High-Res Pincode Map...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full flex items-center justify-center" style={{ opacity: svgLoaded ? 1 : 0 }} />
      </div>
    </div>
  );
};
