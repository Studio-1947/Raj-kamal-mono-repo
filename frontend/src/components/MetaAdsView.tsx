import { useEffect, useMemo, useState } from "react";
import {
    fetchMetaAdsOverview,
    fetchMetaAdsCampaigns,
    sortSeriesByDate,
    type MetaAdsCampaign,
} from "../services/metricoolApi";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import { LoadingSpinner, SampleDataBadge } from "./LoadingSkeletons";
import SocialCommonHeader from "./SocialCommonHeader";
import TablePagination from "./TablePagination";
import {
    metaAdsOverviewMock,
    metaAdsSeriesMock,
    metaAdsCampaignsMock,
} from "./socialMockData";
import { FaBullhorn, FaDollarSign, FaMousePointer, FaEye } from "react-icons/fa";

type TimeRangeKey = "7d" | "30d" | "90d" | "custom";
type MetaAdsSection = "overview" | "performance" | "campaigns";

function computeRangeDates(key: TimeRangeKey, customFrom?: string, customTo?: string) {
    if (key === "custom" && customFrom && customTo) {
        return { from: customFrom, to: customTo };
    }
    const to = new Date();
    const from = new Date();
    if (key === "7d") {
        from.setDate(to.getDate() - 7);
    } else if (key === "30d") {
        from.setDate(to.getDate() - 30);
    } else if (key === "90d") {
        from.setDate(to.getDate() - 90);
    } else if (customFrom && customTo) {
        return { from: customFrom, to: customTo };
    }
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
    };
}

// "—" rather than "0"/"₹0": Meta not reporting a metric is not the same as the
// metric being zero, and the ads tiles were the worst offender for this.
const NO_DATA = "—";

function formatCurrency(value?: number | null): string {
    if (value === undefined || value === null || Number.isNaN(value)) return NO_DATA;
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatNumber(value?: number | null): string {
    if (value === undefined || value === null || Number.isNaN(value)) return NO_DATA;
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
    return value.toLocaleString("en-IN");
}

function formatRate(value?: number | null, suffix = "%"): string {
    if (value === undefined || value === null || Number.isNaN(value)) return NO_DATA;
    return `${value.toFixed(2)}${suffix}`;
}

const compareValue = (campaign: any, key: string): number => {
    const value = campaign?.[key];
    return typeof value === "number" ? value : -Infinity;
};

// Sorted because Metricool returns timeline points out of chronological order.
function toChartPoints(points: any[]) {
    if (!Array.isArray(points)) return [];
    return sortSeriesByDate(points).map((point: any) => ({
        fullDate: point.dateTime?.slice(0, 10) ?? point.date ?? "",
        date: point.date ?? point.dateTime?.slice(5, 10) ?? "",
        dateTime: point.dateTime,
        value: typeof point.value === "number" ? point.value : 0,
    }));
}

interface MetaAdsViewProps {
    range: TimeRangeKey;
    onRangeChange: (range: TimeRangeKey) => void;
    customFrom?: string;
    customTo?: string;
    blogId?: string;
    onDateRangeChange?: (from: string, to: string, presetKey?: string) => void;
}

export default function MetaAdsView({
    range,
    onRangeChange,
    customFrom,
    customTo,
    blogId,
    onDateRangeChange,
}: MetaAdsViewProps) {
    const [activeSection, setActiveSection] = useState<MetaAdsSection>("overview");
    const [loading, setLoading] = useState(false);
    const [usingMock, setUsingMock] = useState(false);

    const [overviewData, setOverviewData] = useState<any>(null);
    const [seriesData, setSeriesData] = useState<any>(null);
    const [campaigns, setCampaigns] = useState<any[]>(metaAdsCampaignsMock);

    // Interactive chart toggles
    const [showSpend, setShowSpend] = useState(true);
    const [showImpressions, setShowImpressions] = useState(true);
    const [showClicks, setShowClicks] = useState(true);

    // AD PERFORMANCE comparison switcher
    const [compareMetric, setCompareMetric] = useState<"spend" | "clicks" | "impressions" | "conversions">("spend");

    const [bannerDismissed, setBannerDismissed] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("spend_desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [chartPage, setChartPage] = useState(1);
    const chartPageSize = 10;

    const sections: { key: MetaAdsSection; label: string }[] = [
        { key: "overview", label: "CAMPAIGN OVERVIEW" },
        { key: "performance", label: "AD PERFORMANCE" },
        { key: "campaigns", label: "CAMPAIGNS & ADS" },
    ];

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setUsingMock(false);

            try {
                const { from, to } = computeRangeDates(range, customFrom, customTo);

                // Campaigns come from Metricool's own campaigns endpoint — the
                // real source for ads. (The posts endpoint 404s for
                // facebookads, and routing meta_ads through Facebook posts
                // returns Page posts, not ads.)
                const [overviewRes, campaignsRes] = await Promise.all([
                    fetchMetaAdsOverview({ from, to, blogId }),
                    fetchMetaAdsCampaigns({ from, to, blogId }).catch(() => ({ data: [] as MetaAdsCampaign[] })),
                ]);

                if (!cancelled) {
                    const overview = overviewRes.data;
                    const hasSpend = overview.spend !== null;
                    const hasImpressions = overview.impressions !== null;
                    const hasClicks = overview.clicks !== null;

                    if (!hasSpend && !hasImpressions && !hasClicks && campaignsRes.data.length === 0) {
                        setUsingMock(true);
                        setOverviewData(metaAdsOverviewMock(range));
                        setSeriesData(metaAdsSeriesMock(range));
                        setCampaigns(metaAdsCampaignsMock);
                    } else {
                        setUsingMock(false);
                        setOverviewData(overview);
                        setSeriesData({
                            spend: toChartPoints(overview.series.spend),
                            impressions: toChartPoints(overview.series.impressions),
                            reach: toChartPoints(overview.series.reach),
                            clicks: toChartPoints(overview.series.clicks),
                        });
                        setCampaigns(campaignsRes.data);
                    }
                }
            } catch {
                if (!cancelled) {
                    setUsingMock(true);
                    setOverviewData(metaAdsOverviewMock(range));
                    setSeriesData(metaAdsSeriesMock(range));
                    setCampaigns(metaAdsCampaignsMock);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [range, customFrom, customTo, blogId]);

    const activeDates = computeRangeDates(range, customFrom, customTo);

function extractDateStr(item: any): string {
    if (!item) return "";
    if (typeof item === "string") return item.slice(0, 10);
    const raw = item.fullDate || item.dateTime || item.date || (Array.isArray(item) ? item[0] : "");
    if (!raw) return "";
    const str = String(raw).trim();
    if (str.length >= 10 && str.match(/^\d{4}[-/.]\d{2}[-/.]\d{2}/)) {
        return str.slice(0, 10).replace(/[/.]/g, "-");
    }
    return str;
}

function extractNumValue(item: any): number | null {
    if (item === null || item === undefined) return null;
    if (typeof item === "number") return Number.isNaN(item) ? null : item;
    if (typeof item.value === "number") return Number.isNaN(item.value) ? null : item.value;
    if (Array.isArray(item) && typeof item[1] === "number") return Number.isNaN(item[1]) ? null : item[1];
    return null;
}

function buildDateMap(arr: any[]) {
    const map = new Map<string, number>();
    if (!Array.isArray(arr)) return map;
    for (const item of arr) {
        const rawDate = extractDateStr(item);
        const val = extractNumValue(item);
        if (rawDate && val !== null) {
            const isoKey = rawDate.length >= 10 ? rawDate.slice(0, 10) : "";
            const shortKey = rawDate.length === 5 ? rawDate : rawDate.length >= 10 ? rawDate.slice(5, 10) : "";
            if (isoKey) map.set(isoKey, val);
            if (shortKey) map.set(shortKey, val);
        }
    }
    return map;
}

    // Daily points are the API's own values joined on date. Days Meta reported
    // nothing for stay absent rather than being back-filled from the period
    // total — a spend curve invented from an average is not a spend curve.
    const combinedChartData = useMemo(() => {
        const spendMap = buildDateMap(seriesData?.spend?.values ?? seriesData?.spend ?? []);
        const impMap = buildDateMap(seriesData?.impressions?.values ?? seriesData?.impressions ?? []);
        const clickMap = buildDateMap(seriesData?.clicks?.values ?? seriesData?.clicks ?? []);

        const isoDays = new Set<string>();
        for (const map of [spendMap, impMap, clickMap]) {
            for (const key of map.keys()) {
                if (key.length === 10) isoDays.add(key);
            }
        }

        return Array.from(isoDays)
            .sort()
            .map((isoKey) => ({
                date: new Date(isoKey + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                fullDate: isoKey,
                spend: spendMap.get(isoKey),
                impressions: impMap.get(isoKey),
                clicks: clickMap.get(isoKey),
            }));
    }, [seriesData]);

    const filteredCampaigns = useMemo(() => {
        let result = campaigns.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const key =
            sortBy === "clicks_desc" ? "clicks"
                : sortBy === "impressions_desc" ? "impressions"
                    : sortBy === "ctr_desc" ? "ctr"
                        : "spend";

        return result.sort((a, b) => compareValue(b, key) - compareValue(a, key));
    }, [campaigns, searchQuery, sortBy]);

    const paginatedCampaigns = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredCampaigns.slice(start, start + pageSize);
    }, [filteredCampaigns, currentPage, pageSize]);

    const paginatedChartCampaigns = useMemo(() => {
        const start = (chartPage - 1) * chartPageSize;
        return campaigns.slice(start, start + chartPageSize);
    }, [campaigns, chartPage, chartPageSize]);

    return (
        <div className="space-y-6">
            <SocialCommonHeader
                sections={sections}
                activeSection={activeSection}
                onSelectSection={(key) => setActiveSection(key as MetaAdsSection)}
                from={activeDates.from}
                to={activeDates.to}
                onDateChange={(newFrom, newTo, presetKey) => {
                    if (onDateRangeChange) {
                        onDateRangeChange(newFrom, newTo, presetKey);
                    } else {
                        onRangeChange("custom");
                    }
                }}
                activePresetKey={range}
                brandColor="#0668E1"
            />

            {loading && <LoadingSpinner size="md" message="Loading Meta Ads metrics..." />}

            {!loading && usingMock && !bannerDismissed && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-900 shadow-sm">
                    <div className="flex items-center gap-2">
                        <SampleDataBadge />
                        <span>
                            Live Meta Ads metrics aren't active on this account — showing sample campaign data for preview.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setBannerDismissed(true)}
                        className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5 rounded-lg hover:bg-amber-100/60 transition-all text-xs"
                        title="Dismiss banner"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* SECTION 1: CAMPAIGN OVERVIEW */}
            {activeSection === "overview" && (
                <div className="space-y-6">
                    {/* Top Ad KPI Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* Spend Card */}
                        <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between text-blue-600">
                                <span className="text-xs font-bold uppercase tracking-wider">Total Ad Spend</span>
                                <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center font-bold">
                                    <FaDollarSign className="h-4 w-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">
                                {formatCurrency(overviewData?.spend)}
                            </p>
                            <p className="text-[11px] text-gray-500 font-semibold">
                                {activeDates.from} → {activeDates.to}
                            </p>
                        </div>

                        {/* Impressions Card */}
                        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between text-emerald-600">
                                <span className="text-xs font-bold uppercase tracking-wider">Impressions</span>
                                <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center font-bold">
                                    <FaEye className="h-4 w-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">
                                {formatNumber(overviewData?.impressions)}
                            </p>
                            <p className="text-[11px] text-gray-500 font-semibold">
                                Reach: {formatNumber(overviewData?.reach)}
                            </p>
                        </div>

                        {/* Clicks Card */}
                        <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between text-amber-600">
                                <span className="text-xs font-bold uppercase tracking-wider">Link Clicks</span>
                                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center font-bold">
                                    <FaMousePointer className="h-4 w-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">
                                {formatNumber(overviewData?.clicks)}
                            </p>
                            <p className="text-[11px] text-gray-500 font-semibold">
                                Conversions: {formatNumber(overviewData?.conversions)}
                            </p>
                        </div>

                        {/* Average CTR Card */}
                        <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50/80 to-white p-5 shadow-sm space-y-2">
                            <div className="flex items-center justify-between text-purple-600">
                                <span className="text-xs font-bold uppercase tracking-wider">Click Rate (CTR)</span>
                                <div className="h-8 w-8 rounded-xl bg-purple-100 flex items-center justify-center font-bold">
                                    <FaBullhorn className="h-4 w-4" />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">
                                {formatRate(overviewData?.ctr)}
                            </p>
                            <p className="text-[11px] text-purple-700 font-semibold">
                                CPC: {formatCurrency(overviewData?.cpc)}
                            </p>
                        </div>
                    </div>

                    {/* Spend & Performance Interactive Line Chart */}
                    <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 sm:p-7 space-y-6">
                        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Ad Performance Trends</h2>
                                <p className="text-xs text-gray-500 font-medium">Spend, impressions, and clicks over time</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSpend(!showSpend)}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                        showSpend ? "bg-blue-50 border-blue-300 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-400"
                                    }`}
                                >
                                    Spend (₹)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowImpressions(!showImpressions)}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                        showImpressions ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-400"
                                    }`}
                                >
                                    Impressions
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowClicks(!showClicks)}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                        showClicks ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-gray-50 border-gray-200 text-gray-400"
                                    }`}
                                >
                                    Clicks
                                </button>
                            </div>
                        </header>

                        <div className="h-72 w-full pt-2">
                            {combinedChartData.length === 0 ? (
                                <div className="h-full w-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-500">
                                    No daily ad delivery data returned for this period.
                                </div>
                            ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={combinedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#0668E1", fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#10B981", fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", fontSize: 12, backgroundColor: "#FFFFFF" }}
                                        labelStyle={{ fontWeight: 800, color: "#0F172A", fontSize: 13, marginBottom: 4 }}
                                        itemStyle={{ fontWeight: 600, fontSize: 12 }}
                                    />
                                    {showSpend && <Line yAxisId="left" type="monotone" dataKey="spend" name="Spend (₹)" stroke="#0668E1" strokeWidth={3} dot={false} connectNulls />}
                                    {showImpressions && <Line yAxisId="right" type="monotone" dataKey="impressions" name="Impressions" stroke="#10B981" strokeWidth={3} dot={false} connectNulls />}
                                    {showClicks && <Line yAxisId="left" type="monotone" dataKey="clicks" name="Link Clicks" stroke="#F59E0B" strokeWidth={3} dot={false} connectNulls />}
                                </LineChart>
                            </ResponsiveContainer>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* SECTION 2: AD PERFORMANCE COST ANALYSIS */}
            {activeSection === "performance" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 space-y-2 text-center">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Cost Per Click (CPC)</p>
                            <p className="text-3xl font-black text-gray-900">{formatCurrency(overviewData?.cpc)}</p>
                            <p className="text-xs text-emerald-600 font-medium">Efficient cost per visitor click</p>
                        </div>

                        <div className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 space-y-2 text-center">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Cost Per 1K Impressions (CPM)</p>
                            <p className="text-3xl font-black text-gray-900">{formatCurrency(overviewData?.cpm)}</p>
                            <p className="text-xs text-blue-600 font-medium">Broad audience reach cost</p>
                        </div>

                        <div className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 space-y-2 text-center">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Return on Ad Spend (ROAS)</p>
                            <p className="text-3xl font-black text-gray-900">
                                {overviewData?.roas === null || overviewData?.roas === undefined
                                    ? NO_DATA
                                    : `${overviewData.roas.toFixed(2)}x`}
                            </p>
                            <p className="text-xs text-gray-500 font-medium">
                                {overviewData?.roas === null || overviewData?.roas === undefined
                                    ? "No purchase value reported by Meta for this ad account"
                                    : "Revenue per rupee of ad spend"}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 space-y-4">
                        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Campaign Comparison</h3>
                                <p className="text-xs text-gray-500 font-medium">Compare performance metrics across active ad campaigns</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCompareMetric("spend")}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                        compareMetric === "spend" ? "bg-blue-50 border-blue-300 text-blue-800" : "bg-gray-50 border-gray-200 text-gray-400"
                                    }`}
                                >
                                    Spend (₹)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCompareMetric("clicks")}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                        compareMetric === "clicks" ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-gray-50 border-gray-200 text-gray-400"
                                    }`}
                                >
                                    Clicks
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCompareMetric("impressions")}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                        compareMetric === "impressions" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-gray-50 border-gray-200 text-gray-400"
                                    }`}
                                >
                                    Impressions
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCompareMetric("conversions")}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                        compareMetric === "conversions" ? "bg-purple-50 border-purple-300 text-purple-800" : "bg-gray-50 border-gray-200 text-gray-400"
                                    }`}
                                >
                                    Conversions
                                </button>
                            </div>
                        </header>

                        <div className="w-full pt-2 overflow-hidden" style={{ height: Math.max(260, paginatedChartCampaigns.length * 36) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={paginatedChartCampaigns.map((c) => ({
                                        ...c,
                                        shortName: c.name.length > 26 ? c.name.slice(0, 26) + "..." : c.name,
                                    }))}
                                    margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 10, fill: "#475569" }}
                                        tickFormatter={(v) => {
                                            if (compareMetric === "spend") {
                                                if (v >= 100000) return `₹${(v / 1000).toFixed(0)}K`;
                                                if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
                                                return `₹${Math.round(v)}`;
                                            }
                                            return formatNumber(v);
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="shortName"
                                        tick={{ fontSize: 11, fill: "#0F172A", fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={170}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", fontSize: 12 }}
                                        labelStyle={{ fontWeight: 800, color: "#0F172A", fontSize: 13, marginBottom: 4 }}
                                        formatter={(val: any) => [
                                            compareMetric === "spend" ? formatCurrency(val) : formatNumber(val),
                                            compareMetric.toUpperCase(),
                                        ]}
                                    />
                                    <Bar
                                        dataKey={compareMetric}
                                        fill={
                                            compareMetric === "spend"
                                                ? "#0668E1"
                                                : compareMetric === "clicks"
                                                ? "#F59E0B"
                                                : compareMetric === "impressions"
                                                ? "#10B981"
                                                : "#8B5CF6"
                                        }
                                        radius={[0, 6, 6, 0]}
                                        barSize={18}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {campaigns.length > 10 && (
                            <TablePagination
                                currentPage={chartPage}
                                totalItems={campaigns.length}
                                pageSize={chartPageSize}
                                onPageChange={setChartPage}
                                pageSizeOptions={[5, 10]}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* SECTION 3: CAMPAIGNS & ADS TABLE + VISUAL CREATIVES */}
            {activeSection === "campaigns" && (
                <div className="space-y-6">
                    {/* Campaign cards. Metricool's campaigns payload carries no
                        creative image or ad permalink, so this shows the campaign
                        objective and delivery figures it does report instead of a
                        thumbnail gallery. */}
                    <div className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 space-y-4">
                        <header className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Campaign Detail</h3>
                                <p className="text-xs text-gray-500 font-medium">Objective, delivery and cost per campaign</p>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-extrabold border border-blue-200">
                                {filteredCampaigns.length} campaigns
                            </span>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {paginatedCampaigns.map((ad: any) => (
                                <div key={`campaign-${ad.id}`} className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-all space-y-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <h4 className="text-sm font-bold text-gray-900 line-clamp-2">{ad.name}</h4>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                                ad.status === "ACTIVE"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-gray-100 text-gray-600"
                                            }`}
                                        >
                                            {ad.status ?? NO_DATA}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                        {ad.objective && (
                                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                                {String(ad.objective).replace(/_/g, " ")}
                                            </span>
                                        )}
                                        {ad.buyingType && (
                                            <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                                                {ad.buyingType}
                                            </span>
                                        )}
                                        {ad.startedAt && (
                                            <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-semibold border border-slate-200">
                                                from {String(ad.startedAt).slice(0, 10)}
                                            </span>
                                        )}
                                    </div>

                                    {ad.resultsLabel && (
                                        <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-200/60 font-medium">
                                            <span className="font-extrabold text-gray-900">{formatNumber(ad.results)}</span>
                                            {" "}
                                            {String(ad.resultsLabel).replace(/\./g, " ").toLowerCase()}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-center text-xs">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Spend</p>
                                            <p className="font-extrabold text-blue-600 mt-0.5">{formatCurrency(ad.spend)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Clicks</p>
                                            <p className="font-extrabold text-amber-600 mt-0.5">{formatNumber(ad.clicks)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">CTR</p>
                                            <p className="font-extrabold text-purple-600 mt-0.5">{formatRate(ad.ctr)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Reach</p>
                                            <p className="font-extrabold text-emerald-600 mt-0.5">{formatNumber(ad.reach)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <TablePagination
                            currentPage={currentPage}
                            totalItems={filteredCampaigns.length}
                            pageSize={pageSize}
                            pageSizeOptions={[5, 10]}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={(sz) => {
                                setPageSize(Math.min(10, sz));
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    {/* Table View */}
                    <div className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 space-y-4">
                        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Meta Ad Campaigns Table</h3>
                                <p className="text-xs text-gray-500 font-medium">Performance summary by ad campaign</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    placeholder="Search campaign..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none"
                                >
                                    <option value="spend_desc">Highest Spend</option>
                                    <option value="clicks_desc">Most Clicks</option>
                                    <option value="impressions_desc">Most Impressions</option>
                                    <option value="ctr_desc">Highest CTR</option>
                                </select>
                            </div>
                        </header>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase text-[10px]">
                                        <th className="py-3 px-2">Campaign Name</th>
                                        <th className="py-3 px-2">Status</th>
                                        <th className="py-3 px-2">Objective</th>
                                        <th className="py-3 px-2 text-right">Spend (₹)</th>
                                        <th className="py-3 px-2 text-right">Impressions</th>
                                        <th className="py-3 px-2 text-right">Clicks</th>
                                        <th className="py-3 px-2 text-right">CTR</th>
                                        <th className="py-3 px-2 text-right">CPC</th>
                                        <th className="py-3 px-2 text-right">Conversions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCampaigns.map((ad: any) => (
                                        <tr key={ad.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="py-3 px-2 text-gray-900 font-semibold max-w-xs truncate">
                                                {ad.name}
                                            </td>
                                            <td className="py-3 px-2">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        ad.status === "ACTIVE"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : "bg-gray-100 text-gray-600"
                                                    }`}
                                                >
                                                    {ad.status ?? NO_DATA}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-gray-600 font-semibold text-[11px] uppercase tracking-wide">
                                                {ad.objective ? String(ad.objective).replace(/_/g, " ") : NO_DATA}
                                            </td>
                                            <td className="py-3 px-2 text-right font-bold text-blue-600">
                                                {formatCurrency(ad.spend)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-semibold text-gray-900">
                                                {formatNumber(ad.impressions)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-semibold text-gray-900">
                                                {formatNumber(ad.clicks)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-semibold text-purple-600">
                                                {formatRate(ad.ctr)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-semibold text-gray-700">
                                                {formatCurrency(ad.cpc)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-extrabold text-emerald-600">
                                                {formatNumber(ad.conversions)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <TablePagination
                                currentPage={currentPage}
                                totalItems={filteredCampaigns.length}
                                pageSize={pageSize}
                                pageSizeOptions={[5, 10]}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={(sz) => {
                                    setPageSize(Math.min(10, sz));
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
