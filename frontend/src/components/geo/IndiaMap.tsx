import React, { useEffect, useMemo, useRef, useState } from 'react';
import indiaGeoData from '../../assets/india.json';

type MapPoint = {
  pincode: string;
  city: string;
  state: string;
  orders: number;
  total: number;
  kind: 'top' | 'bottom';
};

type Props = {
  points: MapPoint[];
  topN?: number;
  className?: string;
  onPointClick?: (p: MapPoint) => void;
  filterKind?: 'both' | 'top' | 'bottom';
  choropleth?: boolean;
  onStateClick?: (stateName: string) => void;
};

// Minimal India bounds (lon/lat) used for simple projection and fallback
const INDIA_BOUNDS = {
  minLon: 68,
  maxLon: 97.5,
  minLat: 6,
  maxLat: 37.5,
};

// State centroids (approx) for placing markers when exact pincode lat/lng is unavailable
const STATE_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  'andhra pradesh': { lat: 15.9, lon: 79.7 },
  'arunachal pradesh': { lat: 28.2, lon: 94.6 },
  'assam': { lat: 26.2, lon: 92.9 },
  'bihar': { lat: 25.9, lon: 85.2 },
  'chhattisgarh': { lat: 21.3, lon: 82.0 },
  'goa': { lat: 15.4, lon: 74.0 },
  'gujarat': { lat: 22.7, lon: 71.6 },
  'haryana': { lat: 29.0, lon: 76.0 },
  'himachal pradesh': { lat: 31.9, lon: 77.3 },
  'jharkhand': { lat: 23.6, lon: 85.3 },
  'karnataka': { lat: 15.3, lon: 75.7 },
  'kerala': { lat: 10.4, lon: 76.3 },
  'madhya pradesh': { lat: 23.5, lon: 78.6 },
  'maharashtra': { lat: 19.3, lon: 75.2 },
  'manipur': { lat: 24.7, lon: 93.9 },
  'meghalaya': { lat: 25.5, lon: 91.3 },
  'mizoram': { lat: 23.2, lon: 92.7 },
  'nagaland': { lat: 26.1, lon: 94.5 },
  'odisha': { lat: 20.2, lon: 85.5 },
  'punjab': { lat: 31.0, lon: 75.4 },
  'rajasthan': { lat: 26.9, lon: 73.8 },
  'sikkim': { lat: 27.5, lon: 88.5 },
  'tamil nadu': { lat: 11.1, lon: 78.6 },
  'telangana': { lat: 17.6, lon: 79.1 },
  'tripura': { lat: 23.8, lon: 91.3 },
  'uttar pradesh': { lat: 27.0, lon: 80.7 },
  'uttarakhand': { lat: 30.1, lon: 79.1 },
  'west bengal': { lat: 23.3, lon: 87.9 },
  // UTs
  'andaman and nicobar islands': { lat: 11.7, lon: 92.7 },
  'chandigarh': { lat: 30.7, lon: 76.8 },
  'dadra and nagar haveli and daman and diu': { lat: 20.3, lon: 73.0 },
  'delhi': { lat: 28.6, lon: 77.2 },
  'jammu and kashmir': { lat: 33.5, lon: 75.0 },
  'ladakh': { lat: 34.3, lon: 78.0 },
  'lakshadweep': { lat: 10.6, lon: 72.6 },
  'puducherry': { lat: 11.9, lon: 79.8 },
};

function normStateName(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function project(lon: number, lat: number, width: number, height: number, bounds = INDIA_BOUNDS) {
  const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width;
  const y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
  return [x, y] as const;
}

// Convert GeoJSON MultiPolygon/Polygon to SVG path using our simple projection
function toSvgPath(geom: any, width: number, height: number, bounds = INDIA_BOUNDS): string {
  const polys: number[][][][] = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  const parts: string[] = [];
  for (const poly of polys) {
    for (const ring of poly) {
      if (!ring || ring.length === 0) continue;
      const [x0, y0] = project(ring[0][0], ring[0][1], width, height, bounds);
      const segs = [`M${x0.toFixed(2)},${y0.toFixed(2)}`];
      for (let i = 1; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const [x, y] = project(lon, lat, width, height, bounds);
        segs.push(`L${x.toFixed(2)},${y.toFixed(2)}`);
      }
      segs.push('Z');
      parts.push(segs.join(' '));
    }
  }
  return parts.join(' ');
}

export default function IndiaMap({ points, topN = 10, className, onPointClick, filterKind = 'both', choropleth = true, onStateClick }: Props) {
  const [geo, setGeo] = useState<any | null>(null);
  const [bounds, setBounds] = useState(INDIA_BOUNDS);
  const [hover, setHover] = useState<{ x: number; y: number; p: MapPoint } | null>(null);
  const [hoverState, setHoverState] = useState<string | null>(null);
  // View controls
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  // Load local GeoJSON
  useEffect(() => {
    // Use the imported JSON directly
    const gj = indiaGeoData as any;
    setGeo(gj);

    // Compute bounds from data
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    for (const f of gj.features || []) {
      const geom = f.geometry;
      const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
      for (const poly of polys) {
        for (const ring of poly) {
          for (const [lon, lat] of ring) {
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        }
      }
    }
    // Add some padding
    const pad = 0.5;
    setBounds({ minLon: minLon - pad, maxLon: maxLon + pad, minLat: minLat - pad, maxLat: maxLat + pad });
  }, []);

  const w = 800;
  const h = 650; // Increased height for better aspect ratio

  const resetView = () => { setScale(1); setTx(0); setTy(0); };
  const zoomBy = (dz: number, cx = w / 2, cy = h / 2) => {
    const ns = Math.min(8, Math.max(1, scale * dz));
    // Zoom toward cursor: adjust translate so the point under cursor stays fixed
    const dx = cx - (cx - tx) * (ns / scale);
    const dy = cy - (cy - ty) * (ns / scale);
    setScale(ns);
    setTx(dx);
    setTy(dy);
  };

  const limited = useMemo(() => {
    const tops = points.filter((p) => p.kind === 'top').slice(0, topN);
    const lows = points.filter((p) => p.kind === 'bottom').slice(0, topN);
    const combined = filterKind === 'both' ? [...tops, ...lows] : (filterKind === 'top' ? tops : lows);
    return combined;
  }, [points, topN, filterKind]);

  const markers = useMemo(() => {
    const arr = limited
      .map((p) => {
        const s = STATE_CENTROIDS[normStateName(p.state)];
        if (!s) return null;
        const [x, y] = project(s.lon, s.lat, w, h, bounds);
        return { ...p, x, y } as const;
      })
      .filter(Boolean) as Array<MapPoint & { x: number; y: number }>;
    const vals = arr.map((m) => Math.max(1, m.total));
    const vmin = Math.min(...vals, 1);
    const vmax = Math.max(...vals, 1);
    const radius = (v: number) => {
      if (vmax === vmin) return 8;
      const t = (v - vmin) / (vmax - vmin);
      return 6 + t * 10; // 6..16 px
    };
    return arr.map((m) => ({ ...m, r: radius(m.total) }));
  }, [limited, bounds]);

  // Compute simple state totals for choropleth from available points
  const stateTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of points) {
      const key = normStateName(p.state);
      map.set(key, (map.get(key) || 0) + (p.total || 0));
    }
    const entries = Array.from(map.entries());
    let min = Infinity;
    let max = 0;
    for (const [, v] of entries) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 0;

    const scaleColor = (v: number) => {
      if (max <= 0) return '#f8fafc';
      const t = Math.max(0, Math.min(1, v / max));
      // Premium Blue Gradient: #EEF2FF (indigo-50) to #4338CA (indigo-700)
      const c1 = [238, 242, 255];
      const c2 = [67, 56, 202];
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      return `rgb(${r}, ${g}, ${b})`;
    };
    return { map, min, max, scaleColor };
  }, [points]);

  // Tooltip element
  const tipRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className={`${className} relative overflow-hidden rounded-3xl bg-white shadow-xl border border-gray-100`} style={{ height: '600px' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-50 pointer-events-none" />

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-full cursor-move"
        onWheel={(e) => {
          e.preventDefault();
          const svg = e.currentTarget;
          const rect = svg.getBoundingClientRect();
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;
          zoomBy(e.deltaY < 0 ? 1.1 : 0.9, cx, cy);
        }}
        onMouseDown={(e) => {
          setDrag({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => {
          if (drag) {
            setTx((v) => v + (e.clientX - drag.x));
            setTy((v) => v + (e.clientY - drag.y));
            setDrag({ x: e.clientX, y: e.clientY });
          }
        }}
        onMouseUp={() => setDrag(null)}
        onMouseLeave={() => setDrag(null)}
      >
        <defs>
          <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>

        <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
          {/* Map background */}
          {geo ? (
            <g>
              {(geo.features || []).map((f: any, idx: number) => {
                const nm = (f.properties?.st_nm || f.properties?.NAME_1 || '').toString().toLowerCase();
                const total = stateTotals.map.get(nm) || 0;
                const base = choropleth ? stateTotals.scaleColor(total) : 'url(#mapGrad)';
                const isHovered = hoverState === nm;

                return (
                  <path
                    key={idx}
                    d={toSvgPath(f.geometry, w, h, bounds)}
                    fill={isHovered ? '#818cf8' : base}
                    fillOpacity={isHovered ? 0.4 : 1}
                    stroke={isHovered ? '#4f46e5' : '#cbd5e1'}
                    strokeWidth={isHovered ? 1.5 / scale : 0.8 / scale}
                    className="transition-colors duration-200 ease-in-out"
                    onMouseEnter={() => setHoverState(nm)}
                    onMouseLeave={() => setHoverState(null)}
                    onClick={() => onStateClick?.((f.properties?.st_nm || f.properties?.NAME_1 || '').toString())}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
            </g>
          ) : (
            // Fallback placeholder
            <g>
              <text x={w / 2} y={h / 2} textAnchor="middle" fill="#94a3b8">Loading Map Data...</text>
            </g>
          )}

          {/* Markers */}
          {markers.map((m, i) => (
            <g key={`${m.pincode}-${i}`} className="transition-all duration-300">
              <circle
                cx={m.x}
                cy={m.y}
                r={m.r / scale}
                filter="url(#markerGlow)"
                fill={m.kind === 'top' ? '#10b981' : '#f43f5e'}
                fillOpacity={0.85}
                stroke="#ffffff"
                strokeWidth={2 / scale}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  const ex = e.clientX - rect.left;
                  const ey = e.clientY - rect.top;
                  setHover({ x: ex, y: ey, p: m });
                }}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPointClick?.(m)}
                style={{ cursor: 'pointer' }}
                className="hover:fill-opacity-100 transition-all"
              />
              {/* Top 3 labels for each kind */}
              {i < Math.min(3, topN) && (
                <text
                  x={m.x + (12 / scale)}
                  y={m.y}
                  fontSize={11 / scale}
                  fontWeight="600"
                  fill="#1e293b"
                  style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                  dominantBaseline="middle"
                >
                  {m.city}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-gray-100 flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span>
          <span className="font-medium text-gray-700">Top Performing</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"></span>
          <span className="font-medium text-gray-700">Low Performing</span>
        </div>
        {choropleth && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="mb-1 font-medium text-gray-500">Sales Intensity</div>
            <div className="h-2 w-32 rounded-full bg-gradient-to-r from-indigo-50 to-indigo-700"></div>
            <div className="flex justify-between mt-1 text-[10px] text-gray-400">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <button onClick={() => zoomBy(1.3)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-100 hover:bg-gray-50 text-gray-700 font-bold transition-transform active:scale-95">+</button>
        <button onClick={() => zoomBy(1 / 1.3)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-100 hover:bg-gray-50 text-gray-700 font-bold transition-transform active:scale-95">-</button>
        <button onClick={resetView} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-100 hover:bg-gray-50 text-gray-600 text-[10px] font-medium transition-transform active:scale-95">Fit</button>
      </div>

      {/* Tooltip */}
      {hover && (
        <div
          ref={tipRef}
          style={{
            position: 'absolute',
            left: hover.x,
            top: hover.y,
            transform: 'translate(10px, 10px)',
          }}
          className="pointer-events-none z-50 min-w-[180px]"
        >
          <div className="bg-gray-900/90 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-white/10">
            <div className="font-bold text-sm mb-1">
              {hover.p.city}, {hover.p.state}
            </div>
            <div className="text-xs text-gray-300 mb-2">PIN: {hover.p.pincode}</div>
            <div className="flex justify-between items-center text-xs border-t border-white/10 pt-2 mt-1">
              <span className="text-gray-400">Orders</span>
              <span className="font-mono">{hover.p.orders.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-gray-400">Revenue</span>
              <span className="font-mono font-semibold text-emerald-400">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(hover.p.total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
