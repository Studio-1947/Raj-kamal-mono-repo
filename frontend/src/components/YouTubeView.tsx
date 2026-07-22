import { useEffect, useState } from "react";
import { fetchYoutubeOverview, fetchYoutubeGrowth } from "../services/metricoolApi";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import { LoadingSpinner, SampleDataBadge } from "./LoadingSkeletons";
import { youtubeOverviewMock, youtubeGrowthMock } from "./socialMockData";
import SocialCommonHeader from "./SocialCommonHeader";

type TimeRangeKey = "7d" | "30d" | "90d" | "custom";

function computeRangeDates(key: TimeRangeKey, customFrom?: string, customTo?: string) {
    if (customFrom && customTo) {
        return { from: customFrom, to: customTo };
    }
    const to = new Date();
    const from = new Date();
    if (key === "7d") {
        from.setDate(to.getDate() - 7);
    } else if (key === "30d") {
        from.setDate(to.getDate() - 30);
    } else {
        from.setDate(to.getDate() - 90);
    }
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
    };
}

function formatNumber(value?: number | null, fallback = "—") {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return fallback;
    }
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// YouTube's series come back as plain arrays (see fetchYoutubeGrowth), but this
// stays defensive about a {values: [...]} wrapper too.
function asSeriesArray(candidate: any): any[] {
    if (Array.isArray(candidate)) return candidate;
    if (Array.isArray(candidate?.values)) return candidate.values;
    return [];
}

function toChartPoints(points: any[]) {
    return points.map((point) => ({
        date: point.dateTime?.slice(0, 10) ?? "",
        value: typeof point.value === "number" ? point.value : 0,
    }));
}

function overviewIsEmpty(data: any) {
    return !data || (!data.subscribers && !data.views && !data.totalVideos);
}

function growthIsEmpty(data: any) {
    const container = data?.series ?? data?.data?.series ?? data;
    const subscribers = asSeriesArray(container?.subscribers);
    const views = asSeriesArray(container?.views);
    return subscribers.length === 0 && views.length === 0;
}

interface YouTubeViewProps {
    range: TimeRangeKey;
    onRangeChange: (range: TimeRangeKey) => void;
    customFrom?: string;
    customTo?: string;
    blogId?: string;
    onDateRangeChange?: (from: string, to: string, presetKey?: string) => void;
}

export default function YouTubeView({ range, onRangeChange, customFrom, customTo, blogId, onDateRangeChange }: YouTubeViewProps) {
    const [loading, setLoading] = useState(false);
    const [usingMock, setUsingMock] = useState(false);
    const [overview, setOverview] = useState<any>(null);
    const [growth, setGrowth] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setUsingMock(false);
            try {
                const { from, to } = computeRangeDates(range, customFrom, customTo);
                const [overviewRes, growthRes] = await Promise.all([
                    fetchYoutubeOverview({ from, to, blogId }),
                    fetchYoutubeGrowth({ from, to, blogId }),
                ]);

                if (!cancelled) {
                    const emptyOverview = overviewIsEmpty(overviewRes.data);
                    const emptyGrowth = growthIsEmpty(growthRes.data);
                    setOverview(emptyOverview ? youtubeOverviewMock(range) : overviewRes.data);
                    setGrowth(emptyGrowth ? youtubeGrowthMock(range) : growthRes.data ?? null);
                    if (emptyOverview || emptyGrowth) setUsingMock(true);
                }
            } catch {
                // Live data failed (offline backend, rate limit, not connected):
                // fall back to sample data so the layout still previews correctly.
                if (!cancelled) {
                    setUsingMock(true);
                    setOverview(youtubeOverviewMock(range));
                    setGrowth(youtubeGrowthMock(range));
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

    const growthSeriesContainer = growth?.series ?? growth?.data?.series ?? growth;
    const subscribersPoints = toChartPoints(asSeriesArray(growthSeriesContainer?.subscribers));
    const viewsPoints = toChartPoints(asSeriesArray(growthSeriesContainer?.views));
    const gainedPoints = toChartPoints(asSeriesArray(growthSeriesContainer?.subscribersGained));
    const lostPoints = toChartPoints(asSeriesArray(growthSeriesContainer?.subscribersLost));

    const activeDates = computeRangeDates(range, customFrom, customTo);

    return (
        <div className="space-y-6">
            <SocialCommonHeader
                sections={[{ key: "channel_overview", label: "CHANNEL OVERVIEW" }]}
                activeSection="channel_overview"
                onSelectSection={() => {}}
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
                brandColor="#FF0000"
            />

            {loading && <LoadingSpinner size="md" message="Loading YouTube metrics..." />}

            {!loading && usingMock && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-xs text-amber-800">
                    <SampleDataBadge />
                    <span>
                        Live YouTube metrics aren't available right now — showing sample data so you
                        can preview how this section looks.
                    </span>
                </div>
            )}

            <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-center shadow-inner border border-red-100">
                        <p className="text-xs font-normal text-gray-900">Subscribers</p>
                        <p className="text-xl font-normal text-gray-900">
                            {formatNumber(overview?.subscribers, "0")}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-center shadow-inner border border-red-100">
                        <p className="text-xs font-normal text-gray-900">Views (this period)</p>
                        <p className="text-xl font-normal text-gray-900">
                            {formatNumber(overview?.views, "0")}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-center shadow-inner border border-red-100">
                        <p className="text-xs font-normal text-gray-900">Videos published</p>
                        <p className="text-xl font-normal text-gray-900">
                            {formatNumber(overview?.totalVideos, "0")}
                        </p>
                    </div>
                </div>

                <div className="mt-6">
                    <h3 className="text-sm font-normal text-gray-900 mb-2">Growth</h3>
                    <div className="h-72">
                        {subscribersPoints.length || viewsPoints.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="date"
                                        type="category"
                                        allowDuplicatedCategory={false}
                                        tick={{ fontSize: 10 }}
                                        tickMargin={6}
                                    />
                                    <YAxis tick={{ fontSize: 10 }} tickMargin={4} width={60} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                                        labelStyle={{ color: "#111827", fontWeight: 600, marginBottom: 4 }}
                                    />
                                    <Line
                                        dataKey="value"
                                        data={viewsPoints}
                                        name="Views"
                                        stroke="#fbbf24"
                                        dot={false}
                                    />
                                    <Line
                                        dataKey="value"
                                        data={subscribersPoints}
                                        name="Subscribers"
                                        stroke="#dc2626"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm text-gray-900">No growth data for this period.</p>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5 space-y-4">
                <p className="text-sm font-normal text-gray-900">Balance of Subscribers</p>
                <div className="h-64">
                    {gainedPoints.length || lostPoints.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="date"
                                    type="category"
                                    allowDuplicatedCategory={false}
                                    tick={{ fontSize: 10 }}
                                    tickMargin={6}
                                />
                                <YAxis tick={{ fontSize: 10 }} tickMargin={4} width={60} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                                    labelStyle={{ color: "#111827", fontWeight: 600, marginBottom: 4 }}
                                />
                                <Line dataKey="value" data={gainedPoints} name="Gained" stroke="#0ea5e9" dot={false} />
                                <Line dataKey="value" data={lostPoints} name="Lost" stroke="#f97316" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-gray-900">No subscriber balance data.</p>
                    )}
                </div>
            </section>

            <p className="text-xs text-gray-400">
                Metricool doesn't provide a per-video list or audience demographics for YouTube —
                only these channel-level metrics are available.
            </p>
        </div>
    );
}
