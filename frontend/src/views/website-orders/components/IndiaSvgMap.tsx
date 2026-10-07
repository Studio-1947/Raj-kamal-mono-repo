import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { FiZoomIn, FiZoomOut, FiMaximize2, FiMapPin, FiX } from "react-icons/fi";
import { INDIA_STATE_SHAPES, INDIA_VIEWBOX } from "./indiaStateShapes";

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
  "CH": "CH", "CHANDIGARH": "CH",
  "AN": "AN", "ANDAMAN AND NICOBAR ISLANDS": "AN", "ANDAMAN & NICOBAR": "AN", "ANDAMAN AND NICOBAR": "AN",
  "PY": "PY", "PUDUCHERRY": "PY", "PONDICHERRY": "PY",
  "LD": "LD", "LAKSHADWEEP": "LD",
  "DD": "DD", "DN": "DD", "DAMAN AND DIU": "DD", "DADRA AND NAGAR HAVELI": "DD",
  "DADRA & NAGAR HAVELI & DAMAN & DIU": "DD", "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "DD",
};

export function normalizeStateCode(input: string | null | undefined): string {
  if (!input) return "UNKNOWN";
  const trimmed = input.trim().toUpperCase();
  if (STATE_ALIAS_MAP[trimmed]) return STATE_ALIAS_MAP[trimmed];
  const clean = trimmed.replace(/[^A-Z\s]/g, "").replace(/\s+/g, " ");
  return STATE_ALIAS_MAP[clean] || "UNKNOWN";
}

function getFillColor(value: number, max: number): string {
  if (!value || max <= 0) return "#E2E8F0";
  const ratio = value / max;
  if (ratio < 0.2) return "#E0E7FF"; // Indigo 100
  if (ratio < 0.4) return "#A5B4FC"; // Indigo 300
  if (ratio < 0.65) return "#6366F1"; // Indigo 500
  if (ratio < 0.85) return "#4338CA"; // Indigo 700
  return "#2E1065"; // Purple 950
}

type ViewBox = { x: number; y: number; w: number; h: number };

const FULL_VIEWBOX: ViewBox = { ...INDIA_VIEWBOX };
const ASPECT = FULL_VIEWBOX.w / FULL_VIEWBOX.h;
const MAX_ZOOM = 14;

// Pincode -> [x, y] in the same coordinate space as the state shapes (lazy-loaded, ~400KB)
let centroidCache: Record<string, [number, number]> | null = null;
let centroidPromise: Promise<Record<string, [number, number]>> | null = null;
function loadPincodeCentroids() {
  if (centroidCache) return Promise.resolve(centroidCache);
  centroidPromise ||= fetch("/data/pincode_centroids.json")
    .then((r) => r.json())
    .then((j) => (centroidCache = j))
    .catch(() => {
      centroidPromise = null;
      return {} as Record<string, [number, number]>;
    });
  return centroidPromise;
}

type PincodeArea = [pincode: string, office: string, d: string];
const pincodeAreaCache = new Map<string, PincodeArea[]>();

// Per-state pincode boundaries (split from india_states_pincodes.svg), fetched on demand
function loadPincodeAreas(code: string): Promise<PincodeArea[]> {
  const hit = pincodeAreaCache.get(code);
  if (hit) return Promise.resolve(hit);
  return fetch(`/data/pincodes/${code}.json`)
    .then((r) => (r.ok ? r.json() : []))
    .then((j: PincodeArea[]) => {
      pincodeAreaCache.set(code, j);
      return j;
    })
    .catch(() => [] as PincodeArea[]);
}

function clampView(v: ViewBox): ViewBox {
  const w = Math.min(FULL_VIEWBOX.w, Math.max(FULL_VIEWBOX.w / MAX_ZOOM, v.w));
  const h = w / ASPECT;
  return {
    w,
    h,
    x: Math.max(FULL_VIEWBOX.x, Math.min(FULL_VIEWBOX.x + FULL_VIEWBOX.w - w, v.x)),
    y: Math.max(FULL_VIEWBOX.y, Math.min(FULL_VIEWBOX.y + FULL_VIEWBOX.h - h, v.y)),
  };
}

function fitBBox([x0, y0, x1, y1]: [number, number, number, number]): ViewBox {
  const pad = 0.18;
  let w = (x1 - x0) * (1 + pad * 2);
  let h = (y1 - y0) * (1 + pad * 2);
  if (w / h < ASPECT) w = h * ASPECT;
  w = Math.max(w, 500);
  h = w / ASPECT;
  return clampView({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h });
}

export interface PincodeMarker {
  postalCode: string;
  city: string | null;
  state: string | null;
  orders: number;
  revenue: number;
}

interface IndiaSvgMapProps {
  metricsByState: Map<string, { orders: number; revenue: number }>;
  maxMetricValue: number;
  activeMetric: "revenue" | "orders";
  selectedStateCode: string | null;
  onSelectState: (stateCode: string | null) => void;
  hoveredStateCode: string | null;
  onHoverState: (stateCode: string | null, event?: React.MouseEvent) => void;
  pincodeMarkers?: PincodeMarker[];
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewBox>(FULL_VIEWBOX);
  const viewRef = useRef(view);
  viewRef.current = view;
  const animRef = useRef<number>();
  const dragRef = useRef<{ px: number; py: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [centroids, setCentroids] = useState<Record<string, [number, number]> | null>(centroidCache);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  const [areas, setAreas] = useState<{ code: string; list: PincodeArea[] } | null>(null);

  useEffect(() => {
    if (!selectedStateCode) {
      setAreas(null);
      return;
    }
    let active = true;
    loadPincodeAreas(selectedStateCode).then((list) => active && setAreas({ code: selectedStateCode, list }));
    return () => {
      active = false;
    };
  }, [selectedStateCode]);

  const zoomScale = Number((FULL_VIEWBOX.w / view.w).toFixed(1));

  useEffect(() => {
    if (pincodeMarkers.length === 0 || centroids) return;
    let active = true;
    loadPincodeCentroids().then((c) => active && setCentroids(c));
    return () => {
      active = false;
    };
  }, [pincodeMarkers.length, centroids]);

  const stopAnim = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  const animateTo = useCallback((target: ViewBox, duration = 450) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const from = viewRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setView({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      });
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => stopAnim(), []);

  // Zoom to the selected state (or back out when cleared)
  useEffect(() => {
    if (!selectedStateCode) {
      animateTo(FULL_VIEWBOX);
      return;
    }
    const shape = INDIA_STATE_SHAPES.find((s) => s.code === selectedStateCode);
    if (shape) animateTo(fitBBox(shape.bbox));
  }, [selectedStateCode, animateTo]);

  const zoomBy = useCallback((factor: number, focus?: { fx: number; fy: number }) => {
    const v = viewRef.current;
    const nw = Math.min(FULL_VIEWBOX.w, Math.max(FULL_VIEWBOX.w / MAX_ZOOM, v.w * factor));
    const nh = nw / ASPECT;
    const fx = focus?.fx ?? 0.5;
    const fy = focus?.fy ?? 0.5;
    stopAnim();
    setView(
      clampView({
        x: v.x + v.w * fx - nw * fx,
        y: v.y + v.h * fy - nh * fy,
        w: nw,
        h: nh,
      })
    );
  }, []);

  // Wheel zoom around the cursor (needs a non-passive listener)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const { w, h } = viewRef.current;
      // account for letterboxing from preserveAspectRatio="meet"
      const scale = Math.min(r.width / w, r.height / h);
      const offX = (r.width - w * scale) / 2;
      const offY = (r.height - h * scale) / 2;
      const fx = Math.min(1, Math.max(0, (e.clientX - r.left - offX) / (w * scale)));
      const fy = Math.min(1, Math.max(0, (e.clientY - r.top - offY) / (h * scale)));
      zoomBy(e.deltaY > 0 ? 1.18 : 0.85, { fx, fy });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    dragRef.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d || !svgRef.current) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      onHoverState(null);
      stopAnim();
    }
    const r = svgRef.current.getBoundingClientRect();
    const scale = Math.min(r.width / view.w, r.height / view.h);
    setView((v) => clampView({ ...v, x: d.vx - dx / scale, y: d.vy - dy / scale }));
  };

  const endDrag = () => {
    // keep `moved` readable for the click that follows pointerup
    const d = dragRef.current;
    if (d?.moved) setTimeout(() => (dragRef.current = null), 0);
    else dragRef.current = null;
    setDragging(false);
  };

  const handleStateClick = (code: string) => {
    if (dragRef.current?.moved) return;
    onSelectState(selectedStateCode === code ? null : code);
  };

  const handleResetZoom = () => {
    if (selectedStateCode) onSelectState(null);
    else animateTo(FULL_VIEWBOX);
  };

  const selectedStateName = useMemo(
    () =>
      selectedStateCode
        ? INDIA_STATE_SHAPES.find((s) => s.code === selectedStateCode)?.name || selectedStateCode
        : null,
    [selectedStateCode]
  );

  // Paint selected/hovered states last so their outlines aren't covered by neighbours
  const orderedShapes = useMemo(() => {
    const rank = (code: string) => (code === selectedStateCode ? 2 : code === hoveredStateCode ? 1 : 0);
    return [...INDIA_STATE_SHAPES].sort((a, b) => rank(a.code) - rank(b.code));
  }, [selectedStateCode, hoveredStateCode]);

  const placedMarkers = useMemo(() => {
    if (!centroids) return [];
    const maxVal = Math.max(1, ...pincodeMarkers.map((m) => (activeMetric === "revenue" ? m.revenue : m.orders)));
    return pincodeMarkers
      .map((m) => {
        const pos = centroids[m.postalCode];
        if (!pos) return null;
        const val = activeMetric === "revenue" ? m.revenue : m.orders;
        return { ...m, x: pos[0], y: pos[1], ratio: val / maxVal };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.ratio - a.ratio);
  }, [centroids, pincodeMarkers, activeMetric]);

  // Marker/stroke sizes are authored in screen px; convert to user units for the current zoom
  const unit = view.w / 700;
  const strokeUnit = view.w / 900;
  const stateAreas = areas && areas.code === selectedStateCode ? areas.list : null;
  // With pincode boundaries drawn, highlight the real areas instead of dots
  const showDots = !stateAreas;
  const hasMarkers = pincodeMarkers.length > 0;
  const markerByPin = useMemo(() => new Map(pincodeMarkers.map((m) => [m.postalCode, m])), [pincodeMarkers]);
  const maxMarkerVal = useMemo(
    () => Math.max(1, ...pincodeMarkers.map((m) => (activeMetric === "revenue" ? m.revenue : m.orders))),
    [pincodeMarkers, activeMetric]
  );

  return (
    <div className="relative w-full flex flex-col items-center justify-center select-none bg-gradient-to-b from-slate-50/90 via-white to-blue-50/30 rounded-3xl p-3 sm:p-5 border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Zoom badge */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {selectedStateCode ? (
          <div className="flex items-center gap-2 bg-indigo-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-semibold shadow-lg border border-indigo-700">
            <FiMapPin className="h-3.5 w-3.5 text-amber-300" />
            <span>
              Zoomed into {selectedStateName} ({selectedStateCode})
            </span>
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

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl p-1.5 shadow-md">
        <button
          type="button"
          onClick={() => zoomBy(0.7)}
          className="p-2 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition active:scale-95"
          title="Zoom In"
        >
          <FiZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          className="p-2 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition active:scale-95"
          title="Zoom Out"
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

      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className={`w-full h-auto max-h-[580px] touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        role="img"
        aria-label="Interactive Heatmap of India"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={() => {
          endDrag();
          onHoverState(null);
        }}
      >
        <g strokeLinejoin="round" style={{ filter: "drop-shadow(0 2px 4px rgba(15,23,42,0.18))" }}>
          {orderedShapes.map((shape) => {
            const isSelected = selectedStateCode === shape.code;
            const isHovered = hoveredStateCode === shape.code;
            const m = metricsByState.get(shape.code);
            const val = m ? (activeMetric === "revenue" ? m.revenue : m.orders) : 0;
            let fill = getFillColor(val, maxMetricValue);
            // Keep the selected state light when pincode dots sit on top of it
            if (isSelected && (hasMarkers || stateAreas)) fill = "#E0E7FF";
            else if (isSelected) fill = "#312E81";
            else if (isHovered) fill = "#4F46E5";
            return (
              <path
                key={shape.code}
                d={shape.d}
                fill={fill}
                fillOpacity={selectedStateCode && !isSelected ? 0.55 : 1}
                stroke={isSelected ? "#F59E0B" : isHovered ? "#1D4ED8" : "#475569"}
                strokeWidth={(isSelected ? 2.5 : isHovered ? 2 : 1.1) * strokeUnit}
                className="transition-[fill,fill-opacity] duration-200"
                onMouseMove={(e) => !dragRef.current?.moved && onHoverState(shape.code, e)}
                onMouseLeave={() => onHoverState(null)}
                onClick={() => handleStateClick(shape.code)}
              />
            );
          })}
        </g>

        {/* Pincode boundaries for the selected state */}
        {stateAreas && (
          <g strokeLinejoin="round">
            {stateAreas.map(([pin, office, d], i) => {
              const mk = markerByPin.get(pin);
              if (!mk) {
                return (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke="#312E81"
                    strokeOpacity={0.35}
                    strokeWidth={0.6 * strokeUnit}
                    pointerEvents="none"
                  />
                );
              }
              const val = activeMetric === "revenue" ? mk.revenue : mk.orders;
              const ratio = val / maxMarkerVal;
              return (
                <path
                  key={i}
                  d={d}
                  fill="#EF4444"
                  fillOpacity={0.35 + ratio * 0.6}
                  stroke="#B91C1C"
                  strokeWidth={1.2 * strokeUnit}
                  className="cursor-pointer"
                >
                  <title>
                    {`${pin} ${office} - ₹${mk.revenue.toLocaleString("en-IN")} · ${mk.orders} ${
                      mk.orders === 1 ? "order" : "orders"
                    }`}
                  </title>
                </path>
              );
            })}
          </g>
        )}

        {/* Pincode markers */}
        <g>
          {(showDots ? placedMarkers : []).map((m) => {
            const r = (4 + m.ratio * 7) * unit;
            const isHot = hoveredPin === m.postalCode;
            return (
              <g
                key={m.postalCode}
                onMouseEnter={() => setHoveredPin(m.postalCode)}
                onMouseLeave={() => setHoveredPin(null)}
                className="cursor-pointer"
              >
                <circle cx={m.x} cy={m.y} r={r * 1.9} fill="#EF4444" opacity={isHot ? 0.3 : 0.16} />
                <circle cx={m.x} cy={m.y} r={r} fill="#EF4444" stroke="#FFFFFF" strokeWidth={1.5 * unit} opacity={0.92} />
                <title>
                  {`${m.postalCode} ${m.city || ""} - ₹${m.revenue.toLocaleString("en-IN")} · ${m.orders} ${
                    m.orders === 1 ? "order" : "orders"
                  }`}
                </title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
