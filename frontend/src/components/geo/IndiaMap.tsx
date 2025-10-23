import React, { useEffect, useMemo, useRef, useState } from 'react';

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
// Source: compiled from public domain references (approximate midpoints)
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

  // Try to fetch a public India states GeoJSON; fallback gracefully if blocked
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Multiple mirrors; first that works wins
        const urls = [
          'https://unpkg.com/india-geojson@1.0.6/india.geojson',
          'https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson',
        ];
        for (const u of urls) {
          try {
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 5000);
            const r = await fetch(u, { signal: ctl.signal });
            clearTimeout(t);
            if (r.ok) {
              const gj = await r.json();
              if (!alive) return;
              setGeo(gj);
              // Compute bounds from data if possible
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
              setBounds({ minLon, maxLon, minLat, maxLat });
              return;
            }
          } catch {}
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const w = 760;
  const h = 560;

  const resetView = () => { setScale(1); setTx(0); setTy(0); };
  const zoomBy = (dz: number, cx = w/2, cy = h/2) => {
    const ns = Math.min(6, Math.max(1, scale * dz));
    // Zoom toward cursor: adjust translate so the point under cursor stays fixed
    const dx = cx - (cx - tx) * (ns/scale);
    const dy = cy - (cy - ty) * (ns/scale);
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
      if (vmax === vmin) return 7;
      const t = (v - vmin) / (vmax - vmin);
      return 6 + t * 8; // 6..14 px
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
      // Blend from light theme blue to darker brand (#526BA3)
      const c1 = [219, 234, 254]; // #DBEAFE
      const c2 = [82, 107, 163]; // #526BA3
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
    <div className={className} style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50 shadow-sm"
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
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
          {/* Map background */}
          {geo ? (
            <g>
              {(geo.features || []).map((f: any, idx: number) => (
                <path
                  key={idx}
                  d={toSvgPath(f.geometry, w, h, bounds)}
                  fill={(() => {
                    const nm = (f.properties?.st_nm || f.properties?.NAME_1 || '').toString().toLowerCase();
                    const total = stateTotals.map.get(nm) || 0;
                    const base = choropleth ? stateTotals.scaleColor(total) : '#f8fafc';
                    return hoverState === nm ? '#eef2ff' : base;
                  })()}
                  stroke="#94a3b8"
                  strokeWidth={hoverState ? 1.1 : 0.8}
                  onMouseEnter={() => setHoverState((f.properties?.st_nm || f.properties?.NAME_1 || '').toString().toLowerCase())}
                  onMouseLeave={() => setHoverState(null)}
                  onClick={() => onStateClick?.((f.properties?.st_nm || f.properties?.NAME_1 || '').toString())}
                />
              ))}
            </g>
          ) : (
            // Fallback placeholder grid
            <g>
              <rect x={0} y={0} width={w} height={h} fill="#ffffff" />
              {Array.from({ length: 10 }).map((_, i) => (
                <line key={`v${i}`} x1={(i * w) / 10} y1={0} x2={(i * w) / 10} y2={h} stroke="#eef2f7" />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={(i * h) / 8} x2={w} y2={(i * h) / 8} stroke="#eef2f7" />
              ))}
              <text x={12} y={22} fontSize={12} fill="#64748b">India (outline unavailable)</text>
            </g>
          )}

          {/* Markers */}
          {markers.map((m, i) => (
            <g key={`${m.pincode}-${i}`}>
              <circle
                cx={m.x}
                cy={m.y}
                r={m.r}
                filter="url(#markerGlow)"
                fill={m.kind === 'top' ? '#16a34a' : '#f97316'}
                fillOpacity={0.9}
                stroke="#ffffff"
                strokeWidth={1.5 / scale}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  const ex = e.clientX - rect.left;
                  const ey = e.clientY - rect.top;
                  setHover({ x: ex, y: ey, p: m });
                }}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPointClick?.(m)}
                style={{ cursor: 'pointer' }}
              />
              {/* Top 3 labels for each kind */}
              {i < Math.min(3, topN) && (
                <text x={m.x + 10} y={m.y - 10} fontSize={12/scale} fill={m.kind === 'top' ? '#065f46' : '#7c2d12'}>
                  {m.city}
                </text>
              )}
            </g>
          ))}
        </g>

        {/* Legend */}
        <g transform={`translate(${w - 190}, ${20})`}>
          <rect x={0} y={-12} width={180} height={42} rx={10} fill="#ffffff" stroke="#e5e7eb" />
          <circle cx={18} cy={8} r={7} fill="#16a34a" />
          <text x={32} y={12} fontSize={12} fill="#065f46">Top</text>
          <circle cx={96} cy={8} r={7} fill="#f97316" />
          <text x={110} y={12} fontSize={12} fill="#7c2d12">Bottom</text>
        </g>
        {choropleth && (
          <g transform={`translate(${20}, ${20})`}>
            <rect x={0} y={-12} width={220} height={42} rx={10} fill="#ffffff" stroke="#e5e7eb" />
            <text x={12} y={12} fontSize={12} fill="#334155">State total</text>
            {/* gradient */}
            <defs>
              <linearGradient id="totGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#DBEAFE" />
                <stop offset="100%" stopColor="#526BA3" />
              </linearGradient>
            </defs>
            <rect x={100} y={-4} width={100} height={12} fill="url(#totGrad)" stroke="#e5e7eb" />
            <text x={96} y={24} fontSize={10} fill="#475569">0</text>
            <text x={196} y={24} fontSize={10} fill="#475569" textAnchor="end">max</text>
          </g>
        )}
      </svg>

      {/* Zoom controls */}
      <div className="pointer-events-auto absolute right-3 top-3 flex gap-2">
        <button onClick={() => zoomBy(1.2)} className="rounded-lg bg-white px-2 py-1 shadow border border-gray-200 hover:bg-gray-50">+</button>
        <button onClick={() => zoomBy(1/1.2)} className="rounded-lg bg-white px-2 py-1 shadow border border-gray-200 hover:bg-gray-50">-</button>
        <button onClick={resetView} className="rounded-lg bg-white px-2 py-1 shadow border border-gray-200 hover:bg-gray-50">Reset</button>
      </div>

      {/* Tooltip */}
      {hover && (
        <div
          ref={tipRef}
          style={{
            position: 'absolute',
            left: Math.min(Math.max(hover.x + 12, 8), w - 220),
            top: Math.min(Math.max(hover.y + 12, 8), h - 60),
          }}
          className="pointer-events-none rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg"
        >
          <div className="font-semibold text-gray-900">
            {hover.p.city}, {hover.p.state}
          </div>
          <div>PIN: {hover.p.pincode}</div>
          <div>
            Orders: {hover.p.orders.toLocaleString('en-IN')} · Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(hover.p.total)}
          </div>
        </div>
      )}
    </div>
  );
}
