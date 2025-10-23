/**
 * Inventory Component
 *
 * Displays sales data organized by geographical location (pincode/city/state)
 * to identify areas with maximum and minimum sales performance.
 *
 * Features:
 * - Aggregated sales by location
 * - Toggle between highest and lowest performing pincodes
 * - Sortable columns
 * - Search filter
 * - Time range filter
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "totalAmount",
    direction: "desc",
  });
  const [days, setDays] = useState(90);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"top" | "bottom">("top");

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
          limit: "10000",
          startDate: since.toISOString(),
          endDate: now.toISOString(),
        }).toString();

        // Unified endpoint for all channels
        const salesRes = await apiClient.get<{ items: SaleItem[] }>(
          `sales?${qs}`
        );
        const allSales: SaleItem[] = salesRes?.items || [];

        const locationMap = new Map<string, LocationSales>();
        const customerSets = new Map<string, Set<string>>();

        allSales.forEach((sale) => {
          const raw = sale.rawJson || {};
          const pincode =
            normalizePincode(
              extractValueFlexible(raw, [
                "pincode",
                "pin",
                "postal_code",
                "zip",
                "postcode",
                "billing pincode",
                "shipping pincode",
              ]) ||
                extractPincodeFromText(
                  extractValueFlexible(raw, [
                    "address",
                    "shipping address",
                    "billing address",
                  ]) || ""
                )
            ) || "Unknown";

          const city =
            normalizeText(
              extractValueFlexible(raw, [
                "city",
                "district",
                "town",
                "billing city",
                "shipping city",
              ])
            ) || "Unknown";

          const state =
            normalizeText(
              extractValueFlexible(raw, [
                "state",
                "province",
                "region",
                "billing state",
                "shipping state",
              ])
            ) || "Unknown";

          const amount = sale.amount ? Number(sale.amount) : 0;
          const customer = (sale.customerName || sale.mobile || "unknown")
            .toString()
            .trim()
            .toLowerCase();

          const key = `${pincode}-${city}-${state}`;

          if (locationMap.has(key)) {
            const existing = locationMap.get(key)!;
            existing.totalAmount += amount;
            existing.orderCount += 1;
            const set = customerSets.get(key) ?? new Set<string>();
            set.add(customer);
            customerSets.set(key, set);
          } else {
            locationMap.set(key, {
              pincode,
              city,
              state,
              totalAmount: amount,
              orderCount: 1,
              avgOrderValue: amount,
              customerCount: 1,
            });
            customerSets.set(key, new Set(customer ? [customer] : []));
          }
        });

        const locationArray: LocationSales[] = Array.from(
          locationMap.entries()
        ).map(([key, loc]) => ({
          ...loc,
          avgOrderValue:
            loc.orderCount > 0 ? loc.totalAmount / loc.orderCount : 0,
          customerCount: customerSets.get(key)?.size || 0,
        }));

        setLocationData(locationArray);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch geo insights data");
      } finally {
        setLoading(false);
      }
    }

    fetchGeoData();
  }, [days]);

  /**
   * Helper extractors and formatters
   */
  function extractValueFlexible(
    obj: Record<string, any>,
    candidates: string[]
  ): string | null {
    if (!obj) return null;
    const lowerMap = new Map<string, any>();
    for (const [k, v] of Object.entries(obj)) lowerMap.set(k.toLowerCase(), v);
    for (const name of candidates) {
      const key = name.toLowerCase();
      if (lowerMap.has(key)) {
        const v = lowerMap.get(key);
        if (v != null && String(v).trim()) return String(v).trim();
      }
    }
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

  const fmtINR = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const handleSort = (key: keyof LocationSales) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));

  /**
   * Data derivations
   */
  const sortedAndFilteredData = useMemo(() => {
    let filtered = [...locationData];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.pincode.toLowerCase().includes(query) ||
          loc.city.toLowerCase().includes(query) ||
          loc.state.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      const key = sortConfig.key;
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      const aVal = a[key] as any;
      const bVal = b[key] as any;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }
      return String(aVal).localeCompare(String(bVal)) * dir;
    });

    return filtered;
  }, [locationData, sortConfig, searchQuery]);

  const topPerformers = useMemo(
    () =>
      [...locationData]
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5),
    [locationData]
  );

  const bottomPerformers = useMemo(
    () =>
      [...locationData]
        .filter((loc) => loc.totalAmount > 0)
        .sort((a, b) => a.totalAmount - b.totalAmount)
        .slice(0, 5),
    [locationData]
  );

  const totalMetrics = useMemo(
    () => ({
      totalSales: locationData.reduce((sum, loc) => sum + loc.totalAmount, 0),
      totalOrders: locationData.reduce((sum, loc) => sum + loc.orderCount, 0),
      totalLocations: locationData.length,
    }),
    [locationData]
  );

  return (
    <AppLayout>
      {/* Header */}
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
          value={fmtINR(totalMetrics.totalSales)}
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

      {/* Toggle Section */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-md border border-gray-300 bg-white shadow-sm">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${
              viewMode === "top"
                ? "bg-green-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setViewMode("top")}
          >
            Highest Sales
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${
              viewMode === "bottom"
                ? "bg-orange-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setViewMode("bottom")}
          >
            Lowest Sales
          </button>
        </div>
      </div>

      {/* Toggleable List */}
      {!loading && locationData.length > 0 && (
        <div
          className={`rounded-lg p-4 border mb-6 ${
            viewMode === "top"
              ? "bg-green-50 border-green-200"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
              viewMode === "top" ? "text-green-900" : "text-orange-900"
            }`}
          >
            <span className="text-2xl">{viewMode === "top" ? "🏆" : "📉"}</span>
            {viewMode === "top"
              ? "Top 5 Performing Locations"
              : "Bottom 5 Performing Locations"}
          </h3>

          <div className="space-y-2">
            {(viewMode === "top" ? topPerformers : bottomPerformers).map(
              (loc, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-white rounded p-2 shadow-sm hover:shadow transition-shadow"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {loc.city}, {loc.state}
                    </p>
                    <p className="text-xs text-gray-500">
                      Pin: {loc.pincode} • {loc.orderCount} orders
                    </p>
                  </div>
                  <p
                    className={`font-bold ${
                      viewMode === "top" ? "text-green-700" : "text-orange-700"
                    }`}
                  >
                    {fmtINR(loc.totalAmount)}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by pincode, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

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

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : sortedAndFilteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No location data available
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
                {sortedAndFilteredData.map((loc, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {loc.pincode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {loc.city}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {loc.state}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                      {fmtINR(loc.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">
                      {loc.orderCount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">
                      {fmtINR(loc.avgOrderValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Count */}
      {!loading && sortedAndFilteredData.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {sortedAndFilteredData.length}{" "}
          {sortedAndFilteredData.length === 1 ? "location" : "locations"}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}
    </AppLayout>
  );
}

/**
 * Supporting UI Components
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
          {isActive ? (isAsc ? "↑" : "↓") : "↕"}
        </span>
      </div>
    </th>
  );
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded flex-1 animate-pulse"
          ></div>
        ))}
      </div>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex gap-4">
          {[...Array(6)].map((_, j) => (
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
