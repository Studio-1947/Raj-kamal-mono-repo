/**
 * Geo Insights Component
 *
 * Displays sales data organized by geographical location (pincode/city/state)
 * to identify areas with maximum and minimum sales performance.
 *
 * Features:
 * - Aggregated sales by location
 * - Sortable columns
 * - Top and bottom performing regions
 * - Multi-channel data (Online, Offline, Events)
 * - Loading skeletons
 */

import { useEffect, useState, useMemo } from "react";
import AppLayout from "../shared/AppLayout";
import { useLang } from "../modules/lang/LangContext";
import { apiClient } from "../lib/apiClient";

/**
 * Type definition for location-based sales data
 */
type LocationSales = {
  pincode: string;
  city: string;
  state: string;
  totalAmount: number;
  orderCount: number;
  avgOrderValue: number;
  customerCount: number;
};

/**
 * API response type for sales data
 */
type SaleItem = {
  id: string;
  amount?: number | null;
  customerName?: string | null;
  mobile?: string | null;
  rawJson: Record<string, any>;
};

/**
 * Sort configuration
 */
type SortConfig = {
  key: keyof LocationSales;
  direction: "asc" | "desc";
};

export default function Inventory() {
  const { t } = useLang();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationData, setLocationData] = useState<LocationSales[]>([]);
  type Channel = "all" | "online" | "offline" | "lok" | "rajradha";
  const [byChannel, setByChannel] = useState<Record<Channel, LocationSales[]>>({
    all: [],
    online: [],
    offline: [],
    lok: [],
    rajradha: [],
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "totalAmount",
    direction: "desc",
  });
  const [days, setDays] = useState(90);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<Channel>("all");
  const [perfFilter, setPerfFilter] = useState<"all" | "top" | "low">("all");
  const [topN, setTopN] = useState(10);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /**
   * Fetch sales data from all channels and aggregate by location
   */
  useEffect(() => {
    async function fetchGeoData() {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        const since = new Date(now.getTime() - days * 86400000);
        const qs = new URLSearchParams({
          // Backend caps max page size at 1000
          limit: "1000",
          startDate: since.toISOString(),
          endDate: now.toISOString(),
        }).toString();

        // Fetch from all sale channels
        const [onlineRes, offlineRes, lokRes, rajradhaRes] =
          await Promise.allSettled([
            apiClient.get<{ items: SaleItem[] }>(`online-sales?${qs}`),
            apiClient.get<{ items: SaleItem[] }>(`offline-sales?${qs}`),
            apiClient.get<{ items: SaleItem[] }>(`lok-event-sales?${qs}`),
            apiClient.get<{ items: SaleItem[] }>(`rajradha-event-sales?${qs}`),
          ]);

        // Collect per-channel items
        const onlineItems =
          onlineRes.status === "fulfilled" && onlineRes.value?.items
            ? onlineRes.value.items
            : [];
        const offlineItems =
          offlineRes.status === "fulfilled" && offlineRes.value?.items
            ? offlineRes.value.items
            : [];
        const lokItems =
          lokRes.status === "fulfilled" && lokRes.value?.items
            ? lokRes.value.items
            : [];
        const rajradhaItems =
          rajradhaRes.status === "fulfilled" && rajradhaRes.value?.items
            ? rajradhaRes.value.items
            : [];

        // Combine all sales data
        const allSales: SaleItem[] = [
          ...onlineItems,
          ...offlineItems,
          ...lokItems,
          ...rajradhaItems,
        ];

        // Extract and aggregate location data
        const locationMap = new Map<string, LocationSales>();
        // Track unique customers per location for correct counts
        const customerSets = new Map<string, Set<string>>();

        allSales.forEach((sale) => {
          // Extract location from rawJson (various possible field names)
          const raw = sale.rawJson || {};
          const pincode =
            normalizePincode(
              extractValueFlexible(raw, [
                "pincode",
                "pin",
                "pin code",
                "postal_code",
                "postal code",
                "zip",
                "zip code",
                "post code",
                "postcode",
                "shipping pincode",
                "billing pincode",
                "delivery pincode",
                "p.o. code",
              ]) ||
                extractPincodeFromText(
                  extractValueFlexible(raw, [
                    "address",
                    "shipping address",
                    "billing address",
                    "delivery address",
                  ]) || ""
                )
            ) || "Unknown";

          const city =
            normalizeText(
              extractValueFlexible(raw, [
                "city",
                "town",
                "district",
                "shipping city",
                "billing city",
                "delivery city",
                "place",
              ])
            ) || "Unknown";

          const state =
            normalizeText(
              extractValueFlexible(raw, [
                "state",
                "province",
                "region",
                "state/province",
                "shipping state",
                "billing state",
                "delivery state",
              ])
            ) || "Unknown";
          const amount = sale.amount ? Number(sale.amount) : 0;
          const customer = (sale.customerName || sale.mobile || "unknown")
            .toString()
            .trim()
            .toLowerCase();

          // Create location key
          const locationKey = `${pincode}-${city}-${state}`;

          // Aggregate data
          if (locationMap.has(locationKey)) {
            const existing = locationMap.get(locationKey)!;
            existing.totalAmount += amount;
            existing.orderCount += 1;
            // Track unique customers
            const set = customerSets.get(locationKey) ?? new Set<string>();
            set.add(customer);
            customerSets.set(locationKey, set);
          } else {
            locationMap.set(locationKey, {
              pincode,
              city,
              state,
              totalAmount: amount,
              orderCount: 1,
              avgOrderValue: amount,
              customerCount: 1,
            });
            customerSets.set(locationKey, new Set(customer ? [customer] : []));
          }
        });

        // Calculate average order values and convert to array
        const locationArray: LocationSales[] = Array.from(
          locationMap.entries()
        ).map(([key, loc]) => ({
          ...loc,
          avgOrderValue:
            loc.orderCount > 0 ? loc.totalAmount / loc.orderCount : 0,
          customerCount: customerSets.get(key)?.size || 0,
        }));

        setLocationData(locationArray);

        // Helper aggregator for per-channel sets (duplicates logic above)
        const aggregate = (sales: SaleItem[]): LocationSales[] => {
          const lmap = new Map<string, LocationSales>();
          const csets = new Map<string, Set<string>>();
          sales.forEach((sale) => {
            const raw = sale.rawJson || {};
            const pincode =
              normalizePincode(
                extractValueFlexible(raw, [
                  "pincode",
                  "pin",
                  "pin code",
                  "postal_code",
                  "postal code",
                  "zip",
                  "zip code",
                  "post code",
                  "postcode",
                  "shipping pincode",
                  "billing pincode",
                  "delivery pincode",
                  "p.o. code",
                ]) ||
                  extractPincodeFromText(
                    extractValueFlexible(raw, [
                      "address",
                      "shipping address",
                      "billing address",
                      "delivery address",
                    ]) || ""
                  )
              ) || "Unknown";
            const city =
              normalizeText(
                extractValueFlexible(raw, [
                  "city",
                  "town",
                  "district",
                  "shipping city",
                  "billing city",
                  "delivery city",
                  "place",
                ])
              ) || "Unknown";
            const state =
              normalizeText(
                extractValueFlexible(raw, [
                  "state",
                  "province",
                  "region",
                  "state/province",
                  "shipping state",
                  "billing state",
                  "delivery state",
                ])
              ) || "Unknown";
            const amount = sale.amount ? Number(sale.amount) : 0;
            const customer = (sale.customerName || sale.mobile || "unknown")
              .toString()
              .trim()
              .toLowerCase();
            const key = `${pincode}-${city}-${state}`;
            if (lmap.has(key)) {
              const ex = lmap.get(key)!;
              ex.totalAmount += amount;
              ex.orderCount += 1;
              const set = csets.get(key) ?? new Set<string>();
              set.add(customer);
              csets.set(key, set);
            } else {
              lmap.set(key, {
                pincode,
                city,
                state,
                totalAmount: amount,
                orderCount: 1,
                avgOrderValue: amount,
                customerCount: 1,
              });
              csets.set(key, new Set(customer ? [customer] : []));
            }
          });
          return Array.from(lmap.entries()).map(([k, loc]) => ({
            ...loc,
            avgOrderValue:
              loc.orderCount > 0 ? loc.totalAmount / loc.orderCount : 0,
            customerCount: csets.get(k)?.size || 0,
          }));
        };

        // Build per-channel aggregates and then enrich unknown city/state via pincode
        let nextByChannel: Record<Channel, LocationSales[]> = {
          all: locationArray,
          online: aggregate(onlineItems),
          offline: aggregate(offlineItems),
          lok: aggregate(lokItems),
          rajradha: aggregate(rajradhaItems),
        };
        nextByChannel = await enrichCitiesFromPincode(nextByChannel);
        setByChannel(nextByChannel);
        setLocationData(nextByChannel.all);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch geo insights data");
        console.error("Geo insights fetch error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchGeoData();
  }, [days]);

  /**
   * Helper function to extract values from rawJson with multiple possible keys
   */
  function extractValue(
    obj: Record<string, any>,
    keys: string[]
  ): string | null {
    for (const key of keys) {
      if (obj[key] && String(obj[key]).trim()) {
        return String(obj[key]).trim();
      }
    }
    return null;
  }

  // Case-insensitive extractor that also searches shallow nested keys and common variations
  function extractValueFlexible(
    obj: Record<string, any>,
    candidates: string[]
  ): string | null {
    if (!obj) return null;
    const lowerMap = new Map<string, string | number | null | undefined>();
    for (const [k, v] of Object.entries(obj)) {
      lowerMap.set(k.toLowerCase(), v as any);
    }
    for (const name of candidates) {
      const key = name.toLowerCase();
      if (lowerMap.has(key)) {
        const v = lowerMap.get(key);
        if (v != null && String(v).trim()) return String(v).trim();
      }
    }
    // Search inside a shallow nested address object if present
    const addr =
      obj.address || obj.Address || obj.shippingAddress || obj.billingAddress;
    if (addr && typeof addr === "object") {
      return extractValueFlexible(addr as Record<string, any>, candidates);
    }
    return null;
  }

  function normalizePincode(raw?: string | null): string | null {
    if (!raw) return null;
    const digits =
      String(raw)
        .match(/\d{3,}/g)
        ?.join("") || "";
    // Prefer 6-digit Indian PIN; if more, take last 6 which often is the actual PIN in addresses
    if (digits.length >= 6) return digits.slice(-6);
    return digits || null;
  }

  function extractPincodeFromText(text?: string | null): string | null {
    if (!text) return null;
    const m = String(text).match(/(\d{6})(?!\d)/);
    return m ? m[1] : null;
  }

  function normalizeText(raw?: string | null): string | null {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;
    return s.replace(/\s+/g, " ");
  }

  /**
   * Format currency in Indian Rupees
   */
  const fmtINR = (n: number) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `â‚¹${Math.round(n).toLocaleString("en-IN")}`;
    }
  };

  /**
   * Handle column sorting
   */
  const handleSort = (key: keyof LocationSales) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  /**
   * Sort and filter data
   */
  const sortedAndFilteredData = useMemo(() => {
    const base: LocationSales[] =
      selectedChannel === "all" ? locationData : byChannel[selectedChannel] || [];
    let filtered = [...base];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.pincode.toLowerCase().includes(query) ||
          loc.city.toLowerCase().includes(query) ||
          loc.state.toLowerCase().includes(query)
      );
    }

    // Apply performance pill (based on totalAmount)
    if (perfFilter === "top") {
      filtered = [...filtered]
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, topN);
    } else if (perfFilter === "low") {
      filtered = [...filtered]
        .filter((x) => x.totalAmount > 0)
        .sort((a, b) => a.totalAmount - b.totalAmount)
        .slice(0, topN);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const key = sortConfig.key;
      const dir = sortConfig.direction === "asc" ? 1 : -1;

      if (key === "pincode") {
        const aNum = parseInt((a.pincode || "").replace(/\D/g, ""), 10);
        const bNum = parseInt((b.pincode || "").replace(/\D/g, ""), 10);
        const aValid = Number.isFinite(aNum);
        const bValid = Number.isFinite(bNum);
        if (aValid && bValid) return (aNum - bNum) * dir;
        return String(a.pincode).localeCompare(String(b.pincode)) * dir;
      }

      const aVal = a[key] as any;
      const bVal = b[key] as any;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }
      return String(aVal).localeCompare(String(bVal)) * dir;
    });

    return filtered;
  }, [locationData, byChannel, selectedChannel, perfFilter, topN, sortConfig, searchQuery]);

  // Reset to first page when filters/sorts change
  useEffect(() => {
    setPage(1);
  }, [selectedChannel, searchQuery, perfFilter, topN, sortConfig]);

  // Pagination derivations
  const totalRows = sortedAndFilteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  // Cache pincode -> city/state for enrichment
  const getPinCache = (): Record<string, { city?: string; state?: string }> => {
    try { return JSON.parse(localStorage.getItem("rk_pin_meta") || "{}"); } catch { return {}; }
  };
  const setPinCache = (map: Record<string, { city?: string; state?: string }>) => {
    try { localStorage.setItem("rk_pin_meta", JSON.stringify(map)); } catch {}
  };

  async function lookupPin(pin: string): Promise<{ city?: string; state?: string } | null> {
    if (!pin || pin.length !== 6) return null;
    const cache = getPinCache();
    if (cache[pin]) return cache[pin];
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!resp.ok) return null;
      const json: any[] = await resp.json();
      const first = json?.[0];
      if (first?.Status === "Success" && Array.isArray(first?.PostOffice) && first.PostOffice.length > 0) {
        const po = first.PostOffice[0];
        const city = String(po?.District || po?.Block || po?.Name || "").trim() || undefined;
        const state = String(po?.State || "").trim() || undefined;
        const val = { city, state };
        cache[pin] = val; setPinCache(cache);
        return val;
      }
    } catch {}
    return null;
  }

  async function enrichCitiesFromPincode(
    data: Record<Channel, LocationSales[]>
  ): Promise<Record<Channel, LocationSales[]>> {
    const pins = new Set<string>();
    for (const arr of Object.values(data)) {
      for (const row of arr) {
        if ((row.city === "Unknown" || row.state === "Unknown") && /^(\d){6}$/.test(row.pincode)) {
          pins.add(row.pincode);
        }
      }
    }
    if (pins.size === 0) return data;

    const pinList = Array.from(pins).slice(0, 200);
    const results = await Promise.all(pinList.map(async (p) => ({ pin: p, meta: await lookupPin(p) })));
    const map = new Map<string, { city?: string; state?: string }>();
    for (const r of results) if (r.meta) map.set(r.pin, r.meta);
    if (map.size === 0) return data;

    const apply = (arr: LocationSales[]): LocationSales[] => arr.map((row) => {
      const m = map.get(row.pincode);
      if (!m) return row;
      return {
        ...row,
        city: row.city === "Unknown" && m.city ? m.city : row.city,
        state: row.state === "Unknown" && m.state ? m.state : row.state,
      };
    });

    return {
      all: apply(data.all),
      online: apply(data.online),
      offline: apply(data.offline),
      lok: apply(data.lok),
      rajradha: apply(data.rajradha),
    };
  }
  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedAndFilteredData.slice(start, end);
  }, [sortedAndFilteredData, page, pageSize]);

  /**
   * Get top and bottom performers
   */
  const topPerformers = useMemo(
    () =>
      [...(selectedChannel === "all" ? locationData : byChannel[selectedChannel] || [])]
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5),
    [locationData, byChannel, selectedChannel]
  );

  const bottomPerformers = useMemo(
    () =>
      [...(selectedChannel === "all" ? locationData : byChannel[selectedChannel] || [])]
        .filter((loc) => loc.totalAmount > 0) // Exclude zero sales
        .sort((a, b) => a.totalAmount - b.totalAmount)
        .slice(0, 5),
    [locationData, byChannel, selectedChannel]
  );

  /**
   * Calculate total metrics
   */
  const totalMetrics = useMemo(
    () => ({
      totalSales: locationData.reduce((sum, loc) => sum + loc.totalAmount, 0),
      totalOrders: locationData.reduce((sum, loc) => sum + loc.orderCount, 0),
      totalLocations: locationData.length,
    }),
    [locationData]
  );

  // Safer currency formatter used in UI to avoid mojibake
  const formatINR = (n: number) => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
    } catch {
      return `₹${Math.round(n).toLocaleString("en-IN")}`;
    }
  };

  return (
    <AppLayout>
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("geo_insights")}
        </h1>
        <p className="mt-2 text-gray-600">
          Analyze sales performance across different geographical locations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <SummaryCard
          label="Total Sales"
          value={formatINR(totalMetrics.totalSales)}
          loading={loading}
        />
        <SummaryCard
          label="Total Orders"
          value={totalMetrics.totalOrders.toLocaleString("en-IN")}
          loading={loading}
        />
        <SummaryCard
          label="Unique Locations"
          value={totalMetrics.totalLocations.toLocaleString("en-IN")}
          loading={loading}
        />
      </div>

      {/* Top and Bottom Performers */}
      {!loading && locationData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Performers */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">▲</span>
              Top 5 Performing Locations
            </h3>
            <div className="space-y-2">
              {topPerformers.map((loc, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-white rounded p-2"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {loc.city}, {loc.state}
                    </p>
                    <p className="text-xs text-gray-500">
                      Pin: {loc.pincode} • {loc.orderCount} orders
                    </p>
                  </div>
                  <p className="font-bold text-green-700">
                    {formatINR(loc.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Performers */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">▼</span>
              Bottom 5 Performing Locations
            </h3>
            <div className="space-y-2">
              {bottomPerformers.map((loc, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-white rounded p-2"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {loc.city}, {loc.state}
                    </p>
                    <p className="text-xs text-gray-500">
                      Pin: {loc.pincode} • {loc.orderCount} orders
                    </p>
                  </div>
                  <p className="font-bold text-orange-700">
                    {formatINR(loc.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 space-y-3">
        {/* Channel pills */}
        <div className="flex flex-wrap gap-2">
          {([
            { id: "all", label: "All" },
            { id: "online", label: "Online" },
            { id: "offline", label: "Offline" },
            { id: "lok", label: "Lok Event" },
            { id: "rajradha", label: "RajRadha" },
          ] as { id: Channel; label: string }[]).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChannel(c.id)}
              className={
                "rounded-full px-3 py-1 text-sm border transition-colors " +
                (selectedChannel === c.id
                  ? "bg-rose-100 text-rose-700 border-rose-200"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")
              }
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by pincode, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Performance pills + TopN */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Performance:</span>
            {([
              { id: "all", label: "All" },
              { id: "top", label: `Top ${topN}` },
              { id: "low", label: `Bottom ${topN}` },
            ] as { id: "all" | "top" | "low"; label: string }[]).map((p) => (
              <button
                key={p.id}
                onClick={() => setPerfFilter(p.id)}
                className={
                  "rounded-full px-3 py-1 text-sm border transition-colors " +
                  (perfFilter === p.id
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")
                }
              >
                {p.label}
              </button>
            ))}
            {perfFilter !== "all" && (
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            )}
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Time Range:</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={180}>Last 6 Months</option>
              <option value={365}>Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 mb-2">Error loading data</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        ) : sortedAndFilteredData.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No location data available</p>
            <p className="text-sm text-gray-400 mt-2">
              {searchQuery
                ? "Try adjusting your search query"
                : "Sales data may not contain location information"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader
                    label="Pincode"
                    sortKey="pincode"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="City"
                    sortKey="city"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="State"
                    sortKey="state"
                    currentSort={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Total Sales"
                    sortKey="totalAmount"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Orders"
                    sortKey="orderCount"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Avg Order Value"
                    sortKey="avgOrderValue"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagedData.map((loc, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {loc.pincode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {loc.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {loc.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatINR(loc.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      {loc.orderCount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                      {formatINR(loc.avgOrderValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && sortedAndFilteredData.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="text-gray-600">
            Rows per page:{" "}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="ml-2 rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="text-gray-600 order-first sm:order-none">
            {(() => {
              const start = (page - 1) * pageSize + 1;
              const end = Math.min(page * pageSize, totalRows);
              return `Showing ${start}-${end} of ${totalRows}`;
            })()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="rounded-md border px-2 py-1 disabled:opacity-50"
              title="First page"
            >
              Â«
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              title="Previous page"
            >
              Prev
            </button>
            <span className="min-w-[6rem] text-center text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border px-3 py-1 disabled:opacity-50"
              title="Next page"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="rounded-md border px-2 py-1 disabled:opacity-50"
              title="Last page"
            >
              Â»
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

/**
 * Summary Card Component
 * Displays a metric with loading state
 */
function SummaryCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
      ) : (
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      )}
    </div>
  );
}

/**
 * Sortable Table Header Component
 */
function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: keyof LocationSales;
  currentSort: SortConfig;
  onSort: (key: keyof LocationSales) => void;
  align?: "left" | "right";
}) {
  const isActive = currentSort.key === sortKey;
  const isAsc = isActive && currentSort.direction === "asc";

  return (
    <th
      className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={() => onSort(sortKey)}
    >
      <div
        className={`flex items-center gap-1 ${
          align === "right" ? "justify-end" : "justify-start"
        }`}
      >
        <span>{label}</span>
        <span className="text-gray-400">
          {isActive ? (isAsc ? "▲" : "▼") : "↕"}
        </span>
      </div>
    </th>
  );
}

/**
 * Table Loading Skeleton Component
 */
function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {/* Header skeleton */}
      <div className="flex gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded flex-1 animate-pulse"
          ></div>
        ))}
      </div>
      {/* Row skeletons */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex gap-4">
          {[1, 2, 3, 4, 5, 6].map((j) => (
            <div
              key={j}
              className="h-6 bg-gray-100 rounded flex-1 animate-pulse"
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}


