import React, { useState, useMemo } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    LineChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import { FaArrowUp, FaArrowDown, FaQuestionCircle, FaChartLine, FaUsers, FaEye } from "react-icons/fa";
import AccountAnalysisTabs from "./AccountAnalysisTabs";

interface SocialPageOverviewProps {
    platform: "instagram" | "facebook" | "youtube";
    overview: any;
    growth: any;
    engagement?: any;
    contentTypes?: any;
    from: string;
    to: string;
}

const NO_DATA = "—";

function formatLargeNum(val?: number | null): string {
    if (val === undefined || val === null || Number.isNaN(val)) return NO_DATA;
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + "M";
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(1) + "K";
    return val.toLocaleString("en-IN");
}

function formatDecimal(val?: number | null): string {
    if (val === undefined || val === null || Number.isNaN(val) || !Number.isFinite(val)) return NO_DATA;
    return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInt(val?: number | null): string {
    if (val === undefined || val === null || Number.isNaN(val)) return NO_DATA;
    return val.toLocaleString("en-IN");
}

/** Divide only when both sides are real numbers — never fall back to a stand-in. */
function safeDivide(numerator?: number | null, denominator?: number | null): number | null {
    if (numerator === null || numerator === undefined) return null;
    if (!denominator) return null;
    return numerator / denominator;
}

function asPoints(candidate: any): { dateTime?: string; value?: number }[] {
    if (Array.isArray(candidate)) return candidate;
    if (Array.isArray(candidate?.values)) return candidate.values;
    return [];
}

function TrendArrow({ value, className = "" }: { value?: number | null; className?: string }) {
    if (value === null || value === undefined || value === 0) return null;
    return value > 0
        ? <FaArrowUp className={`h-2.5 w-2.5 ${className}`} />
        : <FaArrowDown className={`h-2.5 w-2.5 ${className}`} />;
}

export default function SocialPageOverview({
    platform,
    overview,
    growth,
    engagement,
    contentTypes,
    from,
    to,
}: SocialPageOverviewProps) {
    // Interactive Toggles for Growth Chart
    const [showFollowers, setShowFollowers] = useState(true);
    const [showViews, setShowViews] = useState(true);
    const [showPageVisits, setShowPageVisits] = useState(true);
    const [showTotalContent, setShowTotalContent] = useState(true);

    // Hover state for Total Content breakdown popover
    const [showContentPopover, setShowContentPopover] = useState(false);

    // Calculate number of days in range
    const daysCount = useMemo(() => {
        if (!from || !to) return 0;
        const d1 = new Date(from);
        const d2 = new Date(to);
        const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, diff);
    }, [from, to]);

    // Platform-specific label formatting
    const isYoutube = platform === "youtube";
    const followersLabel = isYoutube ? "Subscribers" : "Followers";
    const contentLabel = isYoutube ? "Videos published" : "Total content";
    const acquiredLabel = isYoutube ? "Subscribers Gained" : "Acquired";
    const lostLabel = isYoutube ? "Subscribers Lost" : "Lost";

    const unsupported: string[] = overview?.unsupported ?? [];
    const isUnsupported = (key: string) => unsupported.includes(key);
    const unavailableHint = (key: string, label: string) =>
        isUnsupported(key)
            ? `${label} is not reported by ${platform} via Metricool`
            : `No ${label.toLowerCase()} data returned for this period`;

    // Core metrics — read straight from the API response. A null here means the
    // network returned nothing for the period, and is rendered as "—": never
    // substituted with a placeholder number.
    const totalFollowers: number | null = overview?.subscribers ?? overview?.followers ?? null;
    const followersChange: number | null = overview?.followersChange ?? null;
    const totalViews: number | null = overview?.views ?? overview?.impressions ?? null;
    const pageVisits: number | null = overview?.pageVisits ?? null;
    const totalContent: number | null =
        overview?.totalVideos ?? overview?.totalContent ?? engagement?.postsCount ?? null;
    const following: number | null = overview?.following ?? null;

    const breakdown = overview?.contentBreakdown ?? {};
    const postsCount: number | null = breakdown.posts ?? null;
    const reelsCount: number | null = breakdown.reels ?? null;
    const storiesCount: number | null = breakdown.stories ?? null;
    const hasContentBreakdown = [postsCount, reelsCount, storiesCount].some(
        (value) => typeof value === "number",
    );

    // Derived averages — null-propagating, so a missing input yields "—"
    const avgDailyNewFollowers = safeDivide(followersChange, daysCount);
    const dailyPosts = safeDivide(totalContent, daysCount);
    const postsPerWeek = dailyPosts === null ? null : dailyPosts * 7;
    const followersPerPost = safeDivide(followersChange, totalContent);

    const acquiredSum: number | null = overview?.followersGained ?? null;
    const lostSum: number | null = overview?.followersLost ?? null;
    const interactionsSum: number | null = overview?.interactions ?? engagement?.interactions ?? null;
    const reactionsSum: number | null = overview?.reactions ?? engagement?.reactions ?? null;

    // Chart points are the API's own daily values, joined on date. Days a metric
    // didn't report are left undefined so Recharts draws a gap rather than a
    // fabricated interpolation.
    const chartData = useMemo(() => {
        const container = growth?.series ?? growth?.data?.series ?? growth;
        if (!container) return [];

        const seriesMap: Record<string, { dateTime?: string; value?: number }[]> = {
            followers: asPoints(container.followers ?? container.subscribers),
            views: asPoints(container.views ?? container.impressions),
            pageVisits: asPoints(container.pageViews),
            totalContent: asPoints(container.postsCount ?? container.totalVideos),
            acquired: asPoints(container.newFollowers ?? container.subscribersGained),
            lost: asPoints(container.lostFollowers ?? container.subscribersLost),
            net: asPoints(container.netFollowers),
            interactions: asPoints(container.interactions),
        };

        const byDate = new Map<string, any>();
        for (const [key, points] of Object.entries(seriesMap)) {
            for (const point of points) {
                const dateStr = point?.dateTime?.slice(0, 10);
                if (!dateStr) continue;
                if (!byDate.has(dateStr)) {
                    byDate.set(dateStr, {
                        dateStr,
                        date: new Date(dateStr).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                        }),
                    });
                }
                if (typeof point.value === "number") {
                    byDate.get(dateStr)[key] = point.value;
                }
            }
        }

        return Array.from(byDate.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    }, [growth]);

    const hasSeries = (key: string) => chartData.some((point) => typeof point[key] === "number");
    const hasChartData = chartData.length > 0;
    // Instagram reports only a net daily delta, so there is no acquired/lost split.
    const hasFollowerSplit = hasSeries("acquired") || hasSeries("lost");
    const hasNetFollowerSeries = hasSeries("net");

    return (
        <div className="space-y-8">
            {/* 1. GROWTH SECTION */}
            <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                            <FaChartLine className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Growth Overview</h2>
                            <p className="text-xs text-gray-500 font-medium">Performance trends for your account</p>
                        </div>
                    </div>

                    {/* Elevated Glassmorphism Metric Badges / Toggles */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Followers / Subscribers Badge */}
                        <button
                            type="button"
                            onClick={() => setShowFollowers(!showFollowers)}
                            title={`${followersLabel} on the latest day in range`}
                            className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs transition-all duration-200 ${
                                showFollowers
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm font-semibold ring-2 ring-emerald-500/20"
                                    : "bg-gray-50 border-gray-200 text-gray-400 opacity-60 hover:opacity-100"
                            }`}
                        >
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <div className="text-left">
                                <p className="text-xs font-bold leading-none flex items-center gap-1">
                                    {formatLargeNum(totalFollowers)}
                                    <TrendArrow value={followersChange} className="text-emerald-600" />
                                </p>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">{followersLabel}</p>
                            </div>
                        </button>

                        {/* Views Badge */}
                        <button
                            type="button"
                            onClick={() => setShowViews(!showViews)}
                            title={
                                totalViews === null
                                    ? unavailableHint("views", "Views")
                                    : overview?.viewsSource === "page_media_view"
                                        ? "Total content views in the selected period (Meta's page_media_view — page impressions are no longer reported)"
                                        : "Total views/impressions in the selected period"
                            }
                            className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs transition-all duration-200 ${
                                showViews
                                    ? "bg-rose-50 border-rose-300 text-rose-900 shadow-sm font-semibold ring-2 ring-rose-500/20"
                                    : "bg-gray-50 border-gray-200 text-gray-400 opacity-60 hover:opacity-100"
                            }`}
                        >
                            <div className="h-2 w-2 rounded-full bg-rose-500" />
                            <div className="text-left">
                                <p className="text-xs font-bold leading-none flex items-center gap-1">
                                    {formatLargeNum(totalViews)}
                                    <FaQuestionCircle className="h-2.5 w-2.5 text-rose-400 ml-0.5" />
                                </p>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Views</p>
                            </div>
                        </button>

                        {/* Page Visits Badge */}
                        {!isYoutube && (
                            <button
                                type="button"
                                onClick={() => setShowPageVisits(!showPageVisits)}
                                title={
                                    pageVisits === null
                                        ? unavailableHint("pageVisits", "Page visits")
                                        : "Profile/page visits in the selected period"
                                }
                                className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs transition-all duration-200 ${
                                    showPageVisits
                                        ? "bg-purple-50 border-purple-300 text-purple-900 shadow-sm font-semibold ring-2 ring-purple-500/20"
                                        : "bg-gray-50 border-gray-200 text-gray-400 opacity-60 hover:opacity-100"
                                }`}
                            >
                                <div className="h-2 w-2 rounded-full bg-purple-500" />
                                <div className="text-left">
                                    <p className="text-xs font-bold leading-none">
                                        {formatLargeNum(pageVisits)}
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">Page visits</p>
                                </div>
                            </button>
                        )}

                        {/* Total Content / Videos Published Badge with breakdown popover */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowTotalContent(!showTotalContent)}
                                onMouseEnter={() => setShowContentPopover(true)}
                                onMouseLeave={() => setShowContentPopover(false)}
                                className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs transition-all duration-200 ${
                                    showTotalContent
                                        ? "bg-amber-500 border-amber-600 text-white shadow-sm font-semibold ring-2 ring-amber-500/30"
                                        : "bg-gray-50 border-gray-200 text-gray-400 opacity-60 hover:opacity-100"
                                }`}
                            >
                                <div className="h-2 w-2 rounded-full bg-white" />
                                <div className="text-left">
                                    <p className="text-xs font-bold leading-none">{formatInt(totalContent)}</p>
                                    <p className="text-[10px] text-amber-100 font-medium mt-0.5">{contentLabel}</p>
                                </div>
                            </button>

                            {/* Per-type counts, only when the network reports them
                                (YouTube has no posts/reels/stories split). */}
                            {showContentPopover && hasContentBreakdown && (
                                <div className="absolute right-0 top-full mt-2 z-30 w-56 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200 p-4 shadow-2xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                        <span className="font-extrabold text-gray-900">{contentLabel}</span>
                                        <span className="font-extrabold text-gray-900">{formatInt(totalContent)}</span>
                                    </div>

                                    <div className="space-y-2 pt-1">
                                        {[
                                            { label: "Posts", value: postsCount, bar: "from-amber-500 to-amber-600" },
                                            { label: "Reels", value: reelsCount, bar: "from-purple-500 to-indigo-600" },
                                            { label: "Stories", value: storiesCount, bar: "from-rose-500 to-pink-600" },
                                        ].map(({ label, value, bar }) => (
                                            <div key={label}>
                                                <div className="flex items-center justify-between text-gray-700 font-semibold text-[11px] mb-1">
                                                    <span>{label}</span>
                                                    <span>{formatInt(value)}</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full bg-gradient-to-r ${bar} rounded-full`}
                                                        style={{
                                                            width:
                                                                value !== null && totalContent
                                                                    ? `${Math.min(100, (value / totalContent) * 100)}%`
                                                                    : "0%",
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Growth Line Chart — one Y axis per magnitude class, so follower
                    counts and daily post counts stay readable on the same plot. */}
                <div className="h-72 w-full pt-2">
                    {hasChartData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} minTickGap={16} />
                                <YAxis
                                    yAxisId="left"
                                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => formatLargeNum(v)}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", fontSize: 12 }}
                                    labelStyle={{ fontWeight: 700, color: "#0F172A", marginBottom: 4 }}
                                    formatter={(value: any, name: any) => [formatInt(value as number), name]}
                                />
                                {showFollowers && hasSeries("followers") && (
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="followers"
                                        name={followersLabel}
                                        stroke="#10B981"
                                        strokeWidth={3}
                                        dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                )}
                                {showViews && hasSeries("views") && (
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="views"
                                        name="Views"
                                        stroke="#F43F5E"
                                        strokeWidth={3}
                                        dot={{ r: 3, fill: "#F43F5E", strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                )}
                                {showPageVisits && !isYoutube && hasSeries("pageVisits") && (
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="pageVisits"
                                        name="Page visits"
                                        stroke="#8B5CF6"
                                        strokeWidth={3}
                                        dot={{ r: 3, fill: "#8B5CF6", strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                )}
                                {showTotalContent && hasSeries("totalContent") && (
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="totalContent"
                                        name={contentLabel}
                                        stroke="#F59E0B"
                                        strokeWidth={3}
                                        dot={{ r: 3, fill: "#F59E0B", strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-500">
                            No daily trend data returned for this period.
                        </div>
                    )}
                </div>

                {/* 6 Summary Stat Cards — every value derived from the API response */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-2">
                    {[
                        { value: formatInt(followersChange), label: `Net ${followersLabel.toLowerCase()}` },
                        { value: formatDecimal(avgDailyNewFollowers), label: `Daily ${followersLabel.toLowerCase()}` },
                        { value: formatDecimal(followersPerPost), label: `${followersLabel} per post` },
                        { value: formatInt(following), label: "Following" },
                        { value: formatDecimal(dailyPosts), label: "Daily posts" },
                        { value: formatDecimal(postsPerWeek), label: "Posts per week" },
                    ].map(({ value, label }) => (
                        <div
                            key={label}
                            className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/60 rounded-2xl p-4 text-center transition-all duration-200 shadow-sm hover:shadow"
                        >
                            <p className="text-xl font-extrabold text-slate-900 tracking-tight">{value}</p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-1">{label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 2. BALANCE OF FOLLOWERS / SUBSCRIBERS SECTION */}
            <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                            <FaUsers className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Balance of {followersLabel}</h2>
                            <p className="text-xs text-gray-500 font-medium">
                                {hasFollowerSplit
                                    ? `${acquiredLabel} vs ${lostLabel.toLowerCase()} dynamics`
                                    : `Net daily change — ${platform === "instagram" ? "Instagram" : platform} reports no gained/lost split`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Net Followers Badge */}
                        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-500 border border-emerald-600 text-white shadow-sm font-semibold">
                            <div className="h-2 w-2 rounded-full bg-white" />
                            <div className="text-left">
                                <p className="text-xs font-bold leading-none flex items-center gap-1">
                                    {formatInt(followersChange)}
                                    <TrendArrow value={followersChange} className="text-white" />
                                </p>
                                <p className="text-[10px] text-emerald-100 font-medium mt-0.5">Net {followersLabel.toLowerCase()}</p>
                            </div>
                        </div>

                        {/* Acquired / Lost badges only when the network reports them */}
                        {acquiredSum !== null && (
                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-sm font-semibold">
                                <div className="h-2 w-2 rounded-full bg-indigo-600" />
                                <div className="text-left">
                                    <p className="text-xs font-bold leading-none flex items-center gap-1">
                                        {formatInt(acquiredSum)} <FaArrowUp className="h-2.5 w-2.5 text-indigo-600" />
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">{acquiredLabel}</p>
                                </div>
                            </div>
                        )}

                        {lostSum !== null && (
                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-pink-50 border border-pink-200 text-pink-900 shadow-sm font-semibold">
                                <div className="h-2 w-2 rounded-full bg-pink-500" />
                                <div className="text-left">
                                    <p className="text-xs font-bold leading-none flex items-center gap-1">
                                        {formatInt(lostSum)} <FaArrowDown className="h-2.5 w-2.5 text-pink-600" />
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">{lostLabel}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <div className="h-72 w-full pt-2">
                    {hasFollowerSplit || hasNetFollowerSeries ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} minTickGap={16} />
                                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", fontSize: 12 }}
                                    labelStyle={{ fontWeight: 700, color: "#0F172A", marginBottom: 4 }}
                                    formatter={(value: any, name: any) => [formatInt(value as number), name]}
                                />
                                {hasFollowerSplit ? (
                                    <>
                                        <Bar dataKey="acquired" fill="#A7F3D0" radius={[4, 4, 0, 0]} barSize={14} name={acquiredLabel} />
                                        <Bar dataKey="lost" fill="#FBCFE8" radius={[4, 4, 0, 0]} barSize={14} name={lostLabel} />
                                    </>
                                ) : (
                                    <Bar dataKey="net" fill="#A7F3D0" radius={[4, 4, 0, 0]} barSize={14} name={`Net ${followersLabel.toLowerCase()}`} />
                                )}
                                {hasNetFollowerSeries && hasFollowerSplit && (
                                    <Line
                                        type="monotone"
                                        dataKey="net"
                                        name={`Net ${followersLabel.toLowerCase()}`}
                                        stroke="#10B981"
                                        strokeWidth={2.5}
                                        dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
                                        connectNulls
                                    />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-500">
                            No follower balance data returned for this period.
                        </div>
                    )}
                </div>
            </section>

            {/* 3. INTERACTIONS IN PERIOD SECTION */}
            <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
                            <FaEye className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Interactions in period</h2>
                            <p className="text-xs text-gray-500 font-medium">Daily interactions on published content</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 shadow-sm font-semibold">
                            <div className="h-2 w-2 rounded-full bg-teal-500" />
                            <div className="text-left">
                                <p className="text-xs font-bold leading-none">{formatLargeNum(interactionsSum)}</p>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Interactions</p>
                            </div>
                        </div>

                        {reactionsSum !== null && (
                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 shadow-sm font-semibold">
                                <div className="h-2 w-2 rounded-full bg-sky-500" />
                                <div className="text-left">
                                    <p className="text-xs font-bold leading-none">{formatLargeNum(reactionsSum)}</p>
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">Reactions</p>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <div className="h-72 w-full pt-2">
                    {hasSeries("interactions") ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} minTickGap={16} />
                                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatLargeNum(v)} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", fontSize: 12 }}
                                    labelStyle={{ fontWeight: 700, color: "#0F172A", marginBottom: 4 }}
                                    formatter={(value: any, name: any) => [formatInt(value as number), name]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="interactions"
                                    name="Interactions"
                                    stroke="#0D9488"
                                    strokeWidth={3}
                                    dot={{ r: 3, fill: "#0D9488", strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-500">
                            No interaction data returned for this period.
                        </div>
                    )}
                </div>
            </section>

            {/* 4. ACCOUNT SEGMENTED ANALYSIS SUB-TABS SECTION */}
            <AccountAnalysisTabs
                overview={overview}
                growth={growth}
                engagement={engagement}
                contentTypes={contentTypes}
                from={from}
                to={to}
                platform={platform}
            />

            {/* 5. METRICS SCOPE & DATA GUIDE BANNER */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 shadow-sm">
                <div className="flex items-start gap-2.5">
                    <span className="text-base leading-none shrink-0 mt-0.5">💡</span>
                    <div>
                        <p className="font-extrabold text-slate-900">Understanding Your Social Analytics</p>
                        <p className="text-slate-600 mt-0.5">
                            Values come directly from Metricool for the selected date range; a “{NO_DATA}” means the
                            network reported nothing for that metric.
                            {platform === "facebook" && " Meta requires Facebook Page admin access for full reach & impressions."}
                            {platform === "instagram" && " Instagram reach & demographics require an Instagram Business/Creator account connected via a Facebook Page."}
                            {platform === "youtube" && " YouTube analytics provide channel-wide subscriber and view trends."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
