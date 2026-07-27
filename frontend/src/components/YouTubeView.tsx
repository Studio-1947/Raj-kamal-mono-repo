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
import SocialPageOverview from "./SocialPageOverview";

type TimeRangeKey = "7d" | "30d" | "90d" | "custom";

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

            <SocialPageOverview
                platform="youtube"
                overview={overview}
                growth={growth}
                from={activeDates.from}
                to={activeDates.to}
            />

            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-4 flex items-start gap-3 text-xs text-blue-900 shadow-sm">
                <span className="text-base leading-none shrink-0 mt-0.5">ℹ️</span>
                <div>
                    <p className="font-extrabold text-blue-950">About YouTube Analytics Scope</p>
                    <p className="mt-0.5 text-blue-800 font-medium">
                        Metricool's YouTube integration provides channel-level metrics (Subscribers, Channel Views, Video Count, and Subscriber Growth). Per-video lists and audience demographics are restricted by YouTube's platform API rules and are not exposed here.
                    </p>
                </div>
            </div>
        </div>
    );
}
