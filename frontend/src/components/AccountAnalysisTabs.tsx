import { useState, useMemo } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    AreaChart,
    Area,
    Line,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import { FaArrowUp, FaArrowDown, FaChevronDown, FaInfoCircle } from "react-icons/fa";

interface AccountAnalysisTabsProps {
    overview: any;
    growth: any;
    engagement?: any;
    /** Per-content-type totals and series from fetchContentTypeBreakdown. */
    contentTypes?: any;
    from: string;
    to: string;
    platform?: "instagram" | "facebook" | "youtube";
}

type SubTab = "general" | "reach" | "interactions" | "profile";

const NO_DATA = "—";

function formatLargeNum(val?: number | null): string {
    if (val === undefined || val === null || Number.isNaN(val)) return NO_DATA;
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(2) + "M";
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(2) + "K";
    return val.toLocaleString("en-IN");
}

function formatInt(val?: number | null): string {
    if (val === undefined || val === null || Number.isNaN(val)) return NO_DATA;
    return Math.round(val).toLocaleString("en-IN");
}

function asPoints(candidate: any): { dateTime?: string; value?: number }[] {
    if (Array.isArray(candidate)) return candidate;
    if (Array.isArray(candidate?.values)) return candidate.values;
    return [];
}

function TrendArrow({ value }: { value?: number | null }) {
    if (value === null || value === undefined || value === 0) return null;
    return value > 0 ? <FaArrowUp className="h-2.5 w-2.5" /> : <FaArrowDown className="h-2.5 w-2.5" />;
}

/** Shown in place of a chart whose breakdown the network does not report. */
function UnavailablePanel({ title, detail }: { title: string; detail: string }) {
    return (
        <div className="h-full w-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6">
            <div className="flex items-start gap-3 max-w-md">
                <FaInfoCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-xs font-extrabold text-slate-700">{title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{detail}</p>
                </div>
            </div>
        </div>
    );
}

export default function AccountAnalysisTabs({
    overview,
    growth,
    engagement,
    contentTypes,
    from,
    to,
    platform = "instagram",
}: AccountAnalysisTabsProps) {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>("general");

    const [reachMetric, setReachMetric] = useState<"Views" | "Reach">("Views");
    const [interactionMetric, setInteractionMetric] = useState("Total interactions");

    const networkLabel = platform === "instagram" ? "Instagram" : platform === "facebook" ? "Facebook" : "YouTube";

    const daysCount = useMemo(() => {
        if (!from || !to) return 0;
        const d1 = new Date(from);
        const d2 = new Date(to);
        const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, diff);
    }, [from, to]);

    // Daily points joined on date from the API's own series. No interpolation,
    // no synthetic wobble: a day a metric didn't report stays undefined.
    const chartTimeline = useMemo(() => {
        const container = growth?.series ?? growth?.data?.series ?? growth;
        const ctSeries = contentTypes?.series ?? {};

        const seriesMap: Record<string, { dateTime?: string; value?: number }[]> = {
            views: asPoints(container?.views ?? container?.impressions),
            reach: asPoints(container?.reach),
            interactions: asPoints(container?.interactions),
            content: asPoints(container?.postsCount ?? container?.totalVideos),
            postsInteractions: asPoints(ctSeries.postsInteractions),
            reelsInteractions: asPoints(ctSeries.reelsInteractions),
            postsViews: asPoints(ctSeries.postsViews),
            reelsViews: asPoints(ctSeries.reelsViews),
            storiesViews: asPoints(ctSeries.storiesViews),
        };

        const byDate = new Map<string, any>();
        for (const [key, points] of Object.entries(seriesMap)) {
            for (const point of points) {
                const dateStr = point?.dateTime?.slice(0, 10);
                if (!dateStr) continue;
                if (!byDate.has(dateStr)) {
                    byDate.set(dateStr, {
                        dateStr,
                        date: new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    });
                }
                if (typeof point.value === "number") {
                    byDate.get(dateStr)[key] = point.value;
                }
            }
        }
        return Array.from(byDate.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    }, [growth, contentTypes]);

    const hasSeries = (key: string) => chartTimeline.some((point) => typeof point[key] === "number");

    const totals = useMemo(() => {
        const views: number | null = overview?.views ?? overview?.impressions ?? null;
        const reach: number | null = overview?.reach ?? null;
        return {
            views,
            reach,
            avgReachPerDay: reach !== null && daysCount ? reach / daysCount : null,
            accountsEngaged: overview?.accountsEngaged ?? engagement?.accountsEngaged ?? null,
            interactions: overview?.interactions ?? engagement?.interactions ?? null,
            totalContent: overview?.totalVideos ?? overview?.totalContent ?? engagement?.postsCount ?? null,
        };
    }, [overview, engagement, daysCount]);

    const ctViews = contentTypes?.views ?? {};
    const ctInteractions = contentTypes?.interactions ?? {};
    const hasContentTypeViews = hasSeries("postsViews") || hasSeries("reelsViews") || hasSeries("storiesViews");
    const hasContentTypeInteractions = hasSeries("postsInteractions") || hasSeries("reelsInteractions");

    const tabs: { key: SubTab; label: string }[] = [
        { key: "general", label: "General evolution" },
        { key: "reach", label: "Reach / Views" },
        { key: "interactions", label: "Interactions" },
        ...(platform !== "youtube" ? [{ key: "profile" as const, label: "Profile activity" }] : []),
    ];

    const tooltipProps = {
        contentStyle: { borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", fontSize: 12 },
        labelStyle: { fontWeight: 700, color: "#0F172A", marginBottom: 4 },
        formatter: (value: any, name: any) => [formatInt(value as number), name] as [string, any],
    };

    const axisProps = {
        tick: { fontSize: 11, fill: "#94A3B8" },
        axisLine: false as const,
        tickLine: false as const,
    };

    return (
        <div className="rounded-3xl border border-gray-200/80 bg-white/95 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-6">
            {/* Top Segmented Sub-Tab Switcher */}
            <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap items-center gap-1 border border-slate-200/80">
                {tabs.map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveSubTab(key)}
                        className={`flex-1 min-w-[120px] text-center py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                            activeSubTab === key
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Filter Dropdowns Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex flex-wrap items-center gap-4">
                    {activeSubTab !== "profile" && activeSubTab !== "general" && (
                        <div className="flex flex-col space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Metric</label>
                            <div className="relative">
                                <select
                                    value={activeSubTab === "reach" ? reachMetric : interactionMetric}
                                    onChange={(e) => {
                                        if (activeSubTab === "reach") setReachMetric(e.target.value as "Views" | "Reach");
                                        else setInteractionMetric(e.target.value);
                                    }}
                                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer"
                                >
                                    {activeSubTab === "reach" && (
                                        <>
                                            <option value="Views">Views</option>
                                            {totals.reach !== null && <option value="Reach">Reach</option>}
                                        </>
                                    )}
                                    {activeSubTab === "interactions" && (
                                        <option value="Total interactions">Total interactions</option>
                                    )}
                                </select>
                                <FaChevronDown className="absolute right-3 top-3 h-2.5 w-2.5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Only breakdown Metricool actually reports: by content type. */}
                    {(activeSubTab === "reach" || activeSubTab === "interactions") && (
                        <div className="flex flex-col space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Divide by</label>
                            <div className="relative">
                                <select
                                    value="Content type"
                                    disabled
                                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-gray-800 shadow-sm"
                                >
                                    <option value="Content type">Content type</option>
                                </select>
                                <FaChevronDown className="absolute right-3 top-3 h-2.5 w-2.5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Color-Coded Stat Cards Row */}
                <div className="flex flex-wrap items-center gap-3">
                    {activeSubTab === "general" && (
                        <>
                            <div className="bg-indigo-500 text-white rounded-2xl px-5 py-3 shadow-sm min-w-[120px] text-center">
                                <p className="text-xl font-black tracking-tight">{formatLargeNum(totals.views)}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-0.5">Views</p>
                            </div>
                            <div
                                className="bg-emerald-500 text-white rounded-2xl px-5 py-3 shadow-sm min-w-[120px] text-center"
                                title={totals.reach === null ? `Reach is not reported by ${networkLabel} via Metricool` : undefined}
                            >
                                <p className="text-xl font-black tracking-tight">{formatInt(totals.avgReachPerDay)}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-0.5">Avg. reach per day</p>
                            </div>
                            <div className="bg-pink-500 text-white rounded-2xl px-5 py-3 shadow-sm min-w-[120px] text-center">
                                <p className="text-xl font-black tracking-tight">{formatLargeNum(totals.accountsEngaged ?? totals.interactions)}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-0.5">
                                    {totals.accountsEngaged !== null ? "Accounts engaged" : "Interactions"}
                                </p>
                            </div>
                            <div className="bg-amber-500 text-white rounded-2xl px-5 py-3 shadow-sm min-w-[120px] text-center">
                                <p className="text-xl font-black tracking-tight">{formatInt(totals.totalContent)}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-0.5">Total content</p>
                            </div>
                        </>
                    )}

                    {activeSubTab === "reach" && (
                        <>
                            <div className="bg-emerald-400/90 text-slate-900 rounded-2xl px-5 py-3 shadow-sm min-w-[110px] text-center font-black">
                                <p className="text-xl tracking-tight">{formatLargeNum(ctViews.posts)}</p>
                                <p className="text-[10px] uppercase font-bold opacity-80 mt-0.5">Posts</p>
                            </div>
                            <div className="bg-pink-300 text-slate-900 rounded-2xl px-5 py-3 shadow-sm min-w-[110px] text-center font-black">
                                <p className="text-xl tracking-tight">{formatLargeNum(ctViews.reels)}</p>
                                <p className="text-[10px] uppercase font-bold opacity-80 mt-0.5">Reels</p>
                            </div>
                            <div className="bg-indigo-400 text-white rounded-2xl px-5 py-3 shadow-sm min-w-[110px] text-center font-black">
                                <p className="text-xl tracking-tight">{formatLargeNum(ctViews.stories)}</p>
                                <p className="text-[10px] uppercase font-bold opacity-90 mt-0.5">Stories</p>
                            </div>
                        </>
                    )}

                    {activeSubTab === "interactions" && (
                        <>
                            <div className="bg-purple-400 text-slate-900 rounded-2xl px-5 py-3 shadow-sm min-w-[110px] text-center font-black">
                                <p className="text-xl tracking-tight">{formatLargeNum(ctInteractions.posts)}</p>
                                <p className="text-[10px] uppercase font-bold opacity-80 mt-0.5">Posts</p>
                            </div>
                            <div className="bg-pink-300 text-slate-900 rounded-2xl px-5 py-3 shadow-sm min-w-[110px] text-center font-black">
                                <p className="text-xl tracking-tight">{formatLargeNum(ctInteractions.reels)}</p>
                                <p className="text-[10px] uppercase font-bold opacity-80 mt-0.5">Reels</p>
                            </div>
                            <div
                                className="bg-indigo-400 text-white rounded-2xl px-5 py-3 shadow-sm min-w-[110px] text-center font-black"
                                title={`${networkLabel} reports no interaction metric for stories`}
                            >
                                <p className="text-xl tracking-tight">{formatLargeNum(ctInteractions.stories)}</p>
                                <p className="text-[10px] uppercase font-bold opacity-90 mt-0.5">Stories</p>
                            </div>
                            <div className="bg-slate-100 text-slate-900 rounded-2xl px-5 py-3 shadow-sm min-w-[110px] text-center font-black border border-slate-200">
                                <p className="text-xl tracking-tight flex items-center justify-center gap-1">
                                    {formatLargeNum(totals.interactions)}
                                    <TrendArrow value={null} />
                                </p>
                                <p className="text-[10px] uppercase font-bold opacity-60 mt-0.5">Account total</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Interactive Recharts Graph */}
            <div className="h-72 w-full pt-2">
                {activeSubTab === "general" && (
                    chartTimeline.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="date" {...axisProps} minTickGap={16} />
                                <YAxis yAxisId="left" {...axisProps} tickFormatter={(v) => formatLargeNum(v)} />
                                <YAxis yAxisId="right" orientation="right" {...axisProps} />
                                <Tooltip {...tooltipProps} />
                                {hasSeries("content") && (
                                    <Bar yAxisId="right" dataKey="content" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={18} name="Total content" />
                                )}
                                {hasSeries("views") && (
                                    <Line yAxisId="left" type="monotone" dataKey="views" name="Views" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366F1", strokeWidth: 0 }} connectNulls />
                                )}
                                {hasSeries("reach") && (
                                    <Line yAxisId="left" type="monotone" dataKey="reach" name="Reach" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }} connectNulls />
                                )}
                                {hasSeries("interactions") && (
                                    <Line yAxisId="right" type="monotone" dataKey="interactions" name="Interactions" stroke="#EC4899" strokeWidth={2.5} dot={{ r: 3, fill: "#EC4899", strokeWidth: 0 }} connectNulls />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <UnavailablePanel
                            title="No daily data for this period"
                            detail={`Metricool returned no ${networkLabel} account timeline for the selected date range.`}
                        />
                    )
                )}

                {activeSubTab === "reach" && (
                    reachMetric === "Reach" ? (
                        hasSeries("reach") ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="date" {...axisProps} minTickGap={16} />
                                    <YAxis {...axisProps} tickFormatter={(v) => formatLargeNum(v)} />
                                    <Tooltip {...tooltipProps} />
                                    <Area type="monotone" dataKey="reach" stroke="#10B981" fill="#A7F3D0" name="Reach" fillOpacity={0.6} connectNulls />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <UnavailablePanel
                                title="Reach is not available"
                                detail={`${networkLabel} does not report an account-level reach metric through Metricool for this profile.`}
                            />
                        )
                    ) : hasContentTypeViews ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="date" {...axisProps} minTickGap={16} />
                                <YAxis {...axisProps} tickFormatter={(v) => formatLargeNum(v)} />
                                <Tooltip {...tooltipProps} />
                                <Area type="monotone" dataKey="postsViews" stackId="1" stroke="#10B981" fill="#A7F3D0" name="Posts" fillOpacity={0.6} />
                                <Area type="monotone" dataKey="reelsViews" stackId="1" stroke="#EC4899" fill="#FBCFE8" name="Reels" fillOpacity={0.6} />
                                <Area type="monotone" dataKey="storiesViews" stackId="1" stroke="#8B5CF6" fill="#C7D2FE" name="Stories" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <UnavailablePanel
                            title="No per-content-type views for this period"
                            detail="Metricool returned no post, reel or story view series for the selected date range."
                        />
                    )
                )}

                {activeSubTab === "interactions" && (
                    hasContentTypeInteractions ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="date" {...axisProps} minTickGap={16} />
                                <YAxis {...axisProps} tickFormatter={(v) => formatLargeNum(v)} />
                                <Tooltip {...tooltipProps} />
                                <Area type="monotone" dataKey="postsInteractions" stackId="1" stroke="#8B5CF6" fill="#DDD6FE" name="Posts" fillOpacity={0.6} />
                                <Area type="monotone" dataKey="reelsInteractions" stackId="1" stroke="#EC4899" fill="#FBCFE8" name="Reels" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <UnavailablePanel
                            title="No per-content-type interactions for this period"
                            detail="Metricool returned no post or reel interaction series for the selected date range."
                        />
                    )
                )}

                {activeSubTab === "profile" && (
                    <UnavailablePanel
                        title="Profile activity is not available"
                        detail={`Metricool exposes profile button clicks (call, email, directions, text) for ${networkLabel}, but this profile's connection returns no data for them — most often because the linked account is not a Business/Creator profile with those actions enabled.`}
                    />
                )}
            </div>
        </div>
    );
}
