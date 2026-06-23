import React, { useEffect, useMemo, useRef, useState } from 'react';
import indiaGeoData from '../../assets/india.json';
import { canonState } from './geoNames';

type MapPoint = {
  pincode: string;
  city: string;
  state: string;
  orders: number;
  total: number;
  kind: 'top' | 'bottom';
  // Optional channel classification — when set (and channelMode is on) the
  // marker is coloured by online vs offline instead of top/bottom performance.
  channelType?: 'online' | 'offline';
};

type StateDatum = { state: string; revenue: number; qty: number };

type Props = {
  points: MapPoint[];
  topN?: number;
  className?: string;
  onPointClick?: (p: MapPoint) => void;
  filterKind?: 'both' | 'top' | 'bottom';
  choropleth?: boolean;
  onStateClick?: (stateName: string) => void;
  // When true, markers are coloured by channelType (online/offline) and the
  // legend switches to an Online / Offline key.
  channelMode?: boolean;
  // Real per-state totals — drives the choropleth, ranks and state tooltips.
  // Falls back to deriving totals from `points` when not supplied.
  stateData?: StateDatum[];
  // Which value to colour / rank / display by.
  metric?: 'revenue' | 'volume';
  // Controlled selection: the selected state gets a persistent highlight, the
  // map frames (zooms to) it, and the rest of the country dims back.
  selectedState?: string | null;
  // Transient highlight driven from outside (e.g. hovering a side-panel row).
  hoveredState?: string | null;
  // Transient marker emphasis driven from outside (hovering a city row).
  hoveredCity?: string | null;
  // Notify parent when a state is hovered on the map (for two-way linking).
  onStateHover?: (stateName: string | null) => void;
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

// Approx lat/lon for major Indian cities so markers sit on the actual city
// rather than the state's geometric centre. Falls back to state centroid when
// a city isn't listed here.
const CITY_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  'new delhi': { lat: 28.61, lon: 77.21 }, 'delhi': { lat: 28.66, lon: 77.23 },
  'noida': { lat: 28.54, lon: 77.39 }, 'ghaziabad': { lat: 28.67, lon: 77.45 },
  'gurugram': { lat: 28.46, lon: 77.03 }, 'faridabad': { lat: 28.41, lon: 77.31 },
  'mumbai': { lat: 19.08, lon: 72.88 }, 'pune': { lat: 18.52, lon: 73.86 },
  'nagpur': { lat: 21.15, lon: 79.09 }, 'nashik': { lat: 19.99, lon: 73.79 },
  'aurangabad': { lat: 19.88, lon: 75.34 }, 'thane': { lat: 19.22, lon: 72.98 },
  'kolkata': { lat: 22.57, lon: 88.36 }, 'siliguri': { lat: 26.73, lon: 88.40 },
  'howrah': { lat: 22.59, lon: 88.31 },
  'chennai': { lat: 13.08, lon: 80.27 }, 'coimbatore': { lat: 11.02, lon: 76.96 },
  'madurai': { lat: 9.93, lon: 78.12 }, 'tiruchirappalli': { lat: 10.79, lon: 78.70 },
  'salem': { lat: 11.66, lon: 78.15 },
  'bengaluru': { lat: 12.97, lon: 77.59 }, 'bangalore': { lat: 12.97, lon: 77.59 },
  'mysuru': { lat: 12.30, lon: 76.64 }, 'mangaluru': { lat: 12.91, lon: 74.86 },
  'hyderabad': { lat: 17.39, lon: 78.49 }, 'warangal': { lat: 17.97, lon: 79.59 },
  'visakhapatnam': { lat: 17.69, lon: 83.22 }, 'vijayawada': { lat: 16.51, lon: 80.65 },
  'guntur': { lat: 16.31, lon: 80.44 },
  'ahmedabad': { lat: 23.03, lon: 72.58 }, 'surat': { lat: 21.17, lon: 72.83 },
  'vadodara': { lat: 22.31, lon: 73.18 }, 'rajkot': { lat: 22.30, lon: 70.80 },
  'jaipur': { lat: 26.91, lon: 75.79 }, 'jodhpur': { lat: 26.24, lon: 73.02 },
  'udaipur': { lat: 24.58, lon: 73.71 }, 'ajmer': { lat: 26.45, lon: 74.64 },
  'kota': { lat: 25.21, lon: 75.86 }, 'bikaner': { lat: 28.02, lon: 73.31 },
  'lucknow': { lat: 26.85, lon: 80.95 }, 'kanpur': { lat: 26.45, lon: 80.33 },
  'prayagraj': { lat: 25.44, lon: 81.85 }, 'allahabad': { lat: 25.44, lon: 81.85 },
  'varanasi': { lat: 25.32, lon: 82.97 }, 'agra': { lat: 27.18, lon: 78.01 },
  'meerut': { lat: 28.98, lon: 77.71 }, 'gorakhpur': { lat: 26.76, lon: 83.37 },
  'bareilly': { lat: 28.37, lon: 79.43 }, 'aligarh': { lat: 27.90, lon: 78.08 },
  'patna': { lat: 25.59, lon: 85.14 }, 'gaya': { lat: 24.80, lon: 85.00 },
  'muzaffarpur': { lat: 26.12, lon: 85.39 }, 'bhagalpur': { lat: 25.24, lon: 86.98 },
  'bhopal': { lat: 23.26, lon: 77.41 }, 'indore': { lat: 22.72, lon: 75.86 },
  'gwalior': { lat: 26.22, lon: 78.18 }, 'jabalpur': { lat: 23.18, lon: 79.99 },
  'raipur': { lat: 21.25, lon: 81.63 },
  'ranchi': { lat: 23.34, lon: 85.31 }, 'jamshedpur': { lat: 22.80, lon: 86.20 },
  'dhanbad': { lat: 23.80, lon: 86.43 },
  'bhubaneswar': { lat: 20.30, lon: 85.82 }, 'cuttack': { lat: 20.46, lon: 85.88 },
  'thiruvananthapuram': { lat: 8.52, lon: 76.94 }, 'kochi': { lat: 9.93, lon: 76.27 },
  'kozhikode': { lat: 11.25, lon: 75.78 },
  'chandigarh': { lat: 30.73, lon: 76.78 }, 'amritsar': { lat: 31.63, lon: 74.87 },
  'ludhiana': { lat: 30.90, lon: 75.85 }, 'jalandhar': { lat: 31.33, lon: 75.58 },
  'dehradun': { lat: 30.32, lon: 78.03 }, 'haridwar': { lat: 29.95, lon: 78.16 },
  'guwahati': { lat: 26.14, lon: 91.74 }, 'shillong': { lat: 25.58, lon: 91.89 },
  'jammu': { lat: 32.73, lon: 74.87 }, 'srinagar': { lat: 34.08, lon: 74.80 },
  // Additional towns that show up with meaningful revenue in the real data.
  'jamui': { lat: 24.92, lon: 86.22 }, 'kaimur': { lat: 25.04, lon: 83.61 },
  'bhabua': { lat: 25.04, lon: 83.61 }, 'begusarai': { lat: 25.42, lon: 86.13 },
  'purnia': { lat: 25.78, lon: 87.47 }, 'hajipur': { lat: 25.69, lon: 85.21 },
  'bettiah': { lat: 26.80, lon: 84.50 }, 'chhapra': { lat: 25.78, lon: 84.75 },
  'darbhanga': { lat: 26.15, lon: 85.90 }, 'sasaram': { lat: 24.95, lon: 84.03 },
  'hazaribagh': { lat: 23.99, lon: 85.36 }, 'bokaro': { lat: 23.67, lon: 86.15 },
  'sonipat': { lat: 28.99, lon: 77.02 }, 'rohtak': { lat: 28.90, lon: 76.61 },
  'hisar': { lat: 29.15, lon: 75.72 }, 'karnal': { lat: 29.69, lon: 76.99 },
  'rishikesh': { lat: 30.10, lon: 78.29 }, 'haldwani': { lat: 29.22, lon: 79.51 },
  'bilaspur': { lat: 22.08, lon: 82.15 }, 'bhilai': { lat: 21.21, lon: 81.38 },
  'faizabad': { lat: 26.78, lon: 82.13 }, 'ayodhya': { lat: 26.80, lon: 82.20 },
  'jaunpur': { lat: 25.75, lon: 82.68 }, 'ballia': { lat: 25.76, lon: 84.15 },
  'jhansi': { lat: 25.45, lon: 78.57 }, 'moradabad': { lat: 28.84, lon: 78.77 },
  'saharanpur': { lat: 29.97, lon: 77.55 }, 'mathura': { lat: 27.49, lon: 77.67 },
  'firozabad': { lat: 27.16, lon: 78.40 }, 'muzaffarnagar': { lat: 29.47, lon: 77.70 },
  'durgapur': { lat: 23.55, lon: 87.31 }, 'asansol': { lat: 23.68, lon: 86.97 },
  'kolhapur': { lat: 16.70, lon: 74.24 }, 'solapur': { lat: 17.66, lon: 75.91 },
  'bhavnagar': { lat: 21.76, lon: 72.15 }, 'jamnagar': { lat: 22.47, lon: 70.06 },
};

const CITY_ALIASES: Record<string, string> = {
  bombay: 'mumbai', calcutta: 'kolkata', madras: 'chennai',
  gurgaon: 'gurugram', trivandrum: 'thiruvananthapuram',
  pondicherry: 'puducherry', vizag: 'visakhapatnam',
  // Common misspellings / variants seen in the real data.
  ahemdabad: 'ahmedabad', ahmadabad: 'ahmedabad', sonepat: 'sonipat',
  bhabhua: 'bhabua', banaras: 'varanasi', benaras: 'varanasi',
  prayagraj: 'prayagraj', allahabad: 'allahabad', bengaluru: 'bengaluru',
};

function normCity(s: string) {
  const k = (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return CITY_ALIASES[k] || k;
}

// Web-Mercator raw projection (radians). Preserves India's true shape instead
// of stretching the lon/lat bounding box to fill the viewBox (which distorted it).
function mercatorRaw(lon: number, lat: number): [number, number] {
  const clampLat = Math.max(-85, Math.min(85, lat));
  const x = (lon * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + (clampLat * Math.PI) / 360));
  return [x, y];
}

type Fit = { scale: number; ox: number; oy: number; xMin: number; yMax: number };

// Build an aspect-ratio-preserving, centred fit transform for the given bounds.
function makeFit(bounds: typeof INDIA_BOUNDS, width: number, height: number, pad = 26): Fit {
  const [xMin] = mercatorRaw(bounds.minLon, 0);
  const [xMax] = mercatorRaw(bounds.maxLon, 0);
  const [, yMinB] = mercatorRaw(0, bounds.minLat); // bottom
  const [, yMaxB] = mercatorRaw(0, bounds.maxLat); // top
  const projW = xMax - xMin;
  const projH = yMaxB - yMinB;
  const scale = Math.min((width - 2 * pad) / projW, (height - 2 * pad) / projH);
  const ox = (width - projW * scale) / 2;
  const oy = (height - projH * scale) / 2;
  return { scale, ox, oy, xMin, yMax: yMaxB };
}

function projectFit(lon: number, lat: number, fit: Fit): readonly [number, number] {
  const [mx, my] = mercatorRaw(lon, lat);
  return [fit.ox + (mx - fit.xMin) * fit.scale, fit.oy + (fit.yMax - my) * fit.scale] as const;
}

// Convert GeoJSON MultiPolygon/Polygon to an SVG path using the fit transform.
function toSvgPath(geom: any, fit: Fit): string {
  const polys: number[][][][] = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  const parts: string[] = [];
  for (const poly of polys) {
    for (const ring of poly) {
      if (!ring || ring.length === 0) continue;
      const [x0, y0] = projectFit(ring[0][0], ring[0][1], fit);
      const segs = [`M${x0.toFixed(2)},${y0.toFixed(2)}`];
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = projectFit(ring[i][0], ring[i][1], fit);
        segs.push(`L${x.toFixed(2)},${y.toFixed(2)}`);
      }
      segs.push('Z');
      parts.push(segs.join(' '));
    }
  }
  return parts.join(' ');
}

export default function IndiaMap({ points, topN = 10, className, onPointClick, filterKind = 'both', choropleth = true, onStateClick, channelMode = false, stateData, metric = 'revenue', selectedState = null, hoveredState = null, hoveredCity = null, onStateHover }: Props) {
  const [geo, setGeo] = useState<any | null>(null);
  const [bounds, setBounds] = useState(INDIA_BOUNDS);
  const [hover, setHover] = useState<{ x: number; y: number; p: MapPoint } | null>(null);
  const [hoverState, setHoverState] = useState<string | null>(null);
  // Cursor position (container px) for the state tooltip while hovering a state.
  const [stateTip, setStateTip] = useState<{ x: number; y: number } | null>(null);
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

  const w = 740;
  const h = 680;

  // Aspect-preserving, centred fit for the current bounds (recomputed only when
  // the data bounds change — cheap, and keeps India's true proportions).
  const fit = useMemo(() => makeFit(bounds, w, h), [bounds]);

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
        // Prefer the actual city location; fall back to the state centroid.
        const c = CITY_CENTROIDS[normCity(p.city)];
        const loc = c || STATE_CENTROIDS[normStateName(p.state)];
        if (!loc) return null;
        const [x, y] = projectFit(loc.lon, loc.lat, fit);
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
  }, [limited, fit]);

  // Per-state totals for the choropleth + tooltips. Prefers real `stateData`
  // (all states) and only falls back to deriving from the marker `points`.
  const stateTotals = useMemo(() => {
    const map = new Map<string, number>();       // normalised name → value
    const info = new Map<string, { value: number; rank: number; label: string }>();

    if (stateData && stateData.length) {
      const valOf = (s: StateDatum) => (metric === 'revenue' ? s.revenue : s.qty);
      const sorted = [...stateData].sort((a, b) => valOf(b) - valOf(a));
      sorted.forEach((s, idx) => {
        const key = canonState(s.state);
        const v = valOf(s);
        map.set(key, v);
        info.set(key, { value: v, rank: idx + 1, label: s.state });
      });
    } else {
      for (const p of points) {
        const key = canonState(p.state);
        map.set(key, (map.get(key) || 0) + (p.total || 0));
      }
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([key, v], idx) => info.set(key, { value: v, rank: idx + 1, label: key }));
    }

    let min = Infinity;
    let max = 0;
    for (const v of map.values()) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 0;

    const scaleColor = (v: number) => {
      // No-data states get a soft, unified lavender so the country always reads
      // as one cohesive shape rather than a half-empty grey blob.
      if (max <= 0 || v <= 0) return '#eceaf6';
      // Gentle non-linear ramp (sqrt) so mid-range states stay distinguishable
      // instead of all washing out near the light end. We start the ramp a little
      // above the floor so even the lowest-selling states carry visible colour.
      const t = 0.18 + 0.82 * Math.sqrt(Math.max(0, Math.min(1, v / max)));
      // Premium indigo gradient: #DDD9F5 (soft indigo) → #4338CA (indigo-700)
      const c1 = [221, 217, 245];
      const c2 = [67, 56, 202];
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      return `rgb(${r}, ${g}, ${b})`;
    };
    return { map, info, min, max, scaleColor };
  }, [points, stateData, metric]);

  // Precompute SVG path strings once per geo/bounds. toSvgPath stringifies large
  // polygon coordinate arrays, so doing it on every render (pan/zoom/hover) caused
  // noticeable lag. Pan/zoom now only updates the parent <g> transform — the path
  // geometry is reused as-is.
  const geoPaths = useMemo<Array<{ nm: string; rawName: string; d: string; box: { minX: number; minY: number; maxX: number; maxY: number } }>>(() => {
    if (!geo) return [];
    return (geo.features || []).map((f: any) => {
      const rawName = (f.properties?.st_nm || f.properties?.NAME_1 || '').toString();
      // Bounding box in viewBox coords — used to frame (zoom to) a selected state.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      for (const poly of polys) {
        for (const ring of poly) {
          for (const [lon, lat] of ring) {
            const [px, py] = projectFit(lon, lat, fit);
            if (px < minX) minX = px; if (px > maxX) maxX = px;
            if (py < minY) minY = py; if (py > maxY) maxY = py;
          }
        }
      }
      return { nm: canonState(rawName), rawName, d: toSvgPath(f.geometry, fit), box: { minX, minY, maxX, maxY } };
    });
  }, [geo, fit]);

  // Frame (zoom to) the selected state; reset when the selection is cleared.
  useEffect(() => {
    if (!selectedState) { setScale(1); setTx(0); setTy(0); return; }
    const gp = geoPaths.find((g) => g.nm === canonState(selectedState));
    if (!gp) return;
    const bw = Math.max(1, gp.box.maxX - gp.box.minX);
    const bh = Math.max(1, gp.box.maxY - gp.box.minY);
    const padFactor = 1.4; // breathing room around the framed state
    const ns = Math.max(1, Math.min(6, Math.min(w / (bw * padFactor), h / (bh * padFactor))));
    const bcx = (gp.box.minX + gp.box.maxX) / 2;
    const bcy = (gp.box.minY + gp.box.maxY) / 2;
    setScale(ns);
    setTx(w / 2 - bcx * ns);
    setTy(h / 2 - bcy * ns);
  }, [selectedState, geoPaths]);

  // Tooltip element
  const tipRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className={`${className} relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 shadow-sm border border-gray-100`} style={{ height: '600px' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.06),transparent_55%)] pointer-events-none" />

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
          {/* Soft, premium drop shadow for markers (replaces harsh glow) */}
          <filter id="markerShadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.25" />
          </filter>
          <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#eef2ff" />
          </linearGradient>
          <radialGradient id="markerTop" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0d9488" />
          </radialGradient>
          <radialGradient id="markerBottom" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e11d48" />
          </radialGradient>
          {/* Online channel marker — orange, matching the "Online - Website" brand colour */}
          <radialGradient id="markerOnline" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </radialGradient>
        </defs>

        <g
          transform={`translate(${tx} ${ty}) scale(${scale})`}
          style={{ transition: drag ? 'none' : 'transform 0.45s cubic-bezier(0.22,1,0.36,1)' }}
        >
          {/* Map background */}
          {geo ? (
            <g>
              {geoPaths.map((gp, idx) => {
                const total = stateTotals.map.get(gp.nm) || 0;
                const base = choropleth ? stateTotals.scaleColor(total) : 'url(#mapGrad)';
                const selNm = selectedState ? canonState(selectedState) : null;
                const extNm = hoveredState ? canonState(hoveredState) : null;
                const isSelected = selNm === gp.nm;
                // Active = hovered (on map or via panel) or selected.
                const isActive = hoverState === gp.nm || extNm === gp.nm || isSelected;
                // When a state is selected, the rest of the country recedes.
                const dimmed = selNm != null && !isSelected;

                return (
                  <path
                    key={idx}
                    d={gp.d}
                    fill={isActive ? '#6366f1' : base}
                    fillOpacity={dimmed ? 0.4 : 1}
                    stroke={isSelected ? '#4338ca' : isActive ? '#6366f1' : '#94a3b8'}
                    strokeWidth={(isSelected ? 2 : isActive ? 1.6 : 0.9) / scale}
                    strokeLinejoin="round"
                    strokeOpacity={dimmed ? 0.5 : isActive ? 1 : 0.7}
                    className="transition-colors duration-150 ease-in-out"
                    onMouseEnter={() => { setHoverState(gp.nm); onStateHover?.(gp.rawName); }}
                    onMouseMove={(e) => {
                      const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setStateTip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseLeave={() => { setHoverState(null); setStateTip(null); onStateHover?.(null); }}
                    onClick={() => onStateClick?.(gp.rawName)}
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

          {/* Markers — circles first so labels (next pass) always sit on top */}
          {markers.map((m, i) => {
            // Choose colour: in channel mode, online = orange, offline = teal;
            // otherwise fall back to top/bottom performance colours.
            const online = m.channelType === 'online';
            const haloColor = channelMode ? (online ? '#ea580c' : '#0d9488') : (m.kind === 'top' ? '#0d9488' : '#e11d48');
            const fillUrl = channelMode
              ? (online ? 'url(#markerOnline)' : 'url(#markerTop)')
              : (m.kind === 'top' ? 'url(#markerTop)' : 'url(#markerBottom)');
            const emphasised = (hoveredCity && normCity(hoveredCity) === normCity(m.city)) || hover?.p === m;
            // Markers outside the selected state recede along with the choropleth.
            const dimmed = selectedState != null && canonState(selectedState) !== canonState(m.state);
            const r = (m.r * (emphasised ? 1.35 : 1)) / scale;
            return (
              <g key={`${m.pincode}-${i}`} opacity={dimmed ? 0.25 : 1} style={{ transition: 'opacity 0.2s ease' }}>
                {/* Soft halo ring — grows when the marker is emphasised */}
                <circle cx={m.x} cy={m.y} r={r + (emphasised ? 7 : 4) / scale} fill={haloColor} fillOpacity={emphasised ? 0.22 : 0.12} />
                <circle
                  cx={m.x}
                  cy={m.y}
                  r={r}
                  filter="url(#markerShadow)"
                  fill={fillUrl}
                  stroke="#ffffff"
                  strokeWidth={1.75 / scale}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, p: m });
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onPointClick?.(m)}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            );
          })}

          {/* Labels for the top 3 cities — rendered as a separate top layer, centred
              ABOVE each marker so they never overlap the dot or other markers. */}
          {markers.slice(0, Math.min(3, topN)).map((m, i) => {
            const pillW = ((m.city || '').length * 6.4 + 18) / scale;
            const pillH = 18 / scale;
            const cy = m.y - (m.r + 12) / scale; // float above the marker
            return (
              <g key={`label-${i}`} style={{ pointerEvents: 'none' }}>
                <rect
                  x={m.x - pillW / 2}
                  y={cy - pillH / 2}
                  width={pillW}
                  height={pillH}
                  rx={pillH / 2}
                  fill="#ffffff"
                  stroke="#e2e8f0"
                  strokeWidth={0.75 / scale}
                  filter="url(#markerShadow)"
                />
                <text
                  x={m.x}
                  y={cy}
                  fontSize={10 / scale}
                  fontWeight="600"
                  fill="#334155"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {m.city}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/85 backdrop-blur-md p-3.5 rounded-2xl shadow-lg shadow-indigo-100/40 border border-gray-100/80 flex flex-col gap-2 text-xs">
        {channelMode ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 ring-2 ring-white shadow-sm"></span>
              <span className="font-normal text-gray-600">Offline (In-store)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 ring-2 ring-white shadow-sm"></span>
              <span className="font-normal text-gray-600">Online (Website)</span>
            </div>
          </>
        ) : (
          <>
            {filterKind !== 'bottom' && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 ring-2 ring-white shadow-sm"></span>
                <span className="font-normal text-gray-600">Top Cities</span>
              </div>
            )}
            {filterKind !== 'top' && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 ring-2 ring-white shadow-sm"></span>
                <span className="font-normal text-gray-600">Low Performing</span>
              </div>
            )}
          </>
        )}
        {choropleth && (
          <div className="mt-1.5 pt-2.5 border-t border-gray-100">
            <div className="mb-1.5 font-normal text-gray-400 uppercase tracking-wider text-[10px]">Sales Intensity</div>
            <div className="h-2 w-32 rounded-full bg-gradient-to-r from-indigo-100 to-indigo-700"></div>
            <div className="flex justify-between mt-1 text-[10px] text-gray-400">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <button onClick={() => zoomBy(1.3)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-100 hover:bg-gray-50 text-gray-700 font-normal transition-transform active:scale-95">+</button>
        <button onClick={() => zoomBy(1 / 1.3)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-100 hover:bg-gray-50 text-gray-700 font-normal transition-transform active:scale-95">-</button>
        <button onClick={resetView} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md border border-gray-100 hover:bg-gray-50 text-gray-600 text-[10px] font-normal transition-transform active:scale-95">Fit</button>
      </div>

      {/* Marker (city) tooltip */}
      {hover && (
        <div
          ref={tipRef}
          style={{ position: 'absolute', left: hover.x, top: hover.y, transform: 'translate(12px, 12px)' }}
          className="pointer-events-none z-50 min-w-[190px]"
        >
          <div className="bg-gray-900/90 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-white/10">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="font-semibold text-sm">{hover.p.city}</div>
              {hover.p.channelType && (
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    hover.p.channelType === 'online' ? 'bg-orange-500/20 text-orange-300' : 'bg-teal-500/20 text-teal-300'
                  }`}
                >
                  {hover.p.channelType === 'online' ? 'Online' : 'Offline'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-400 mb-2">{hover.p.state}{hover.p.pincode ? ` · ${hover.p.pincode}` : ''}</div>
            <div className="flex justify-between items-center text-xs border-t border-white/10 pt-2">
              <span className="text-gray-400">Copies</span>
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

      {/* State (choropleth) tooltip */}
      {hoverState && stateTip && stateTotals.info.get(hoverState) && (
        <div
          style={{ position: 'absolute', left: stateTip.x, top: stateTip.y, transform: 'translate(12px, 12px)' }}
          className="pointer-events-none z-50 min-w-[170px]"
        >
          <div className="bg-gray-900/90 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-white/10">
            {(() => {
              const si = stateTotals.info.get(hoverState)!;
              const isRev = metric === 'revenue';
              return (
                <>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="font-semibold text-sm capitalize">{si.label}</div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-200">
                      Rank #{si.rank}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-white/10 pt-2">
                    <span className="text-gray-400">{isRev ? 'Revenue' : 'Copies'}</span>
                    <span className="font-mono font-semibold text-indigo-300">
                      {isRev
                        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(si.value)
                        : si.value.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-500">Click to {selectedState && canonState(selectedState) === hoverState ? 'clear' : 'drill down'}</div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
