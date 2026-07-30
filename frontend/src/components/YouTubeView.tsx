import { useEffect, useMemo, useState } from "react";
import {
    fetchYoutubeOverview,
    fetchYoutubeGrowth,
    fetchYoutubeVideos,
    type YoutubeVideo,
} from "../services/metricoolApi";
import { LoadingSpinner, SampleDataBadge } from "./LoadingSkeletons";
import { youtubeOverviewMock, youtubeGrowthMock } from "./socialMockData";
import SocialCommonHeader from "./SocialCommonHeader";
import { formatDateISO } from "./SocialDatePicker";
import SocialPageOverview from "./SocialPageOverview";
import TablePagination from "./TablePagination";

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
        from: formatDateISO(from),
        to: formatDateISO(to),
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

function formatDuration(seconds?: number | null): string {
    if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
}

// `totalVideos` returns no points on this channel, so an empty video count is
// not a signal that the whole response is empty.
function overviewIsEmpty(data: any) {
    if (!data) return true;
    return typeof data.subscribers !== "number" && typeof data.views !== "number";
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

type YouTubeSection = "channel_overview" | "videos";

export default function YouTubeView({ range, onRangeChange, customFrom, customTo, blogId, onDateRangeChange }: YouTubeViewProps) {
    const [activeSection, setActiveSection] = useState<YouTubeSection>("channel_overview");
    const [loading, setLoading] = useState(false);
    const [usingMock, setUsingMock] = useState(false);
    // Request succeeded, but Metricool reported nothing for this date range.
    const [noDataForRange, setNoDataForRange] = useState(false);
    const [overview, setOverview] = useState<any>(null);
    const [growth, setGrowth] = useState<any>(null);
    const [videos, setVideos] = useState<YoutubeVideo[]>([]);
    const [videoSort, setVideoSort] = useState<"date_desc" | "views_desc" | "likes_desc">("date_desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setUsingMock(false);
            setNoDataForRange(false);
            try {
                const { from, to } = computeRangeDates(range, customFrom, customTo);
                const [overviewRes, growthRes, videosRes] = await Promise.all([
                    fetchYoutubeOverview({ from, to, blogId }),
                    fetchYoutubeGrowth({ from, to, blogId }),
                    fetchYoutubeVideos({ from, to, blogId }).catch(() => ({
                        data: { items: [] as YoutubeVideo[], publishedInRange: null },
                    })),
                ]);

                if (!cancelled) {
                    const emptyOverview = overviewIsEmpty(overviewRes.data);
                    const emptyGrowth = growthIsEmpty(growthRes.data);
                    // Metricool's `totalVideos` timeline is empty for this
                    // channel, so the published-in-period count is derived from
                    // the video catalogue instead of left blank.
                    setOverview({
                        ...overviewRes.data,
                        totalVideos: overviewRes.data.totalVideos ?? videosRes.data.publishedInRange,
                        totalContent: overviewRes.data.totalContent ?? videosRes.data.publishedInRange,
                    });
                    setGrowth(growthRes.data ?? null);
                    setVideos(videosRes.data.items);
                    setNoDataForRange(emptyOverview && emptyGrowth);
                }
            } catch {
                // Live data failed (offline backend, rate limit, not connected):
                // fall back to sample data so the layout still previews correctly.
                if (!cancelled) {
                    setUsingMock(true);
                    setOverview(youtubeOverviewMock(range));
                    setGrowth(youtubeGrowthMock(range));
                    setVideos([]);
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

    // Metricool returns videos that accrued views in the window — including
    // older uploads — so the table lists all of them and the "published"
    // count is derived separately by publish date.
    const sortedVideos = useMemo(() => {
        const sorted = [...videos];
        if (videoSort === "views_desc") sorted.sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
        else if (videoSort === "likes_desc") sorted.sort((a, b) => (b.likes ?? -1) - (a.likes ?? -1));
        else sorted.sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")));
        return sorted;
    }, [videos, videoSort]);

    const publishedInRangeCount = useMemo(
        () =>
            videos.filter((video) => {
                const day = video.publishedAt?.slice(0, 10);
                return Boolean(day && day >= activeDates.from && day <= activeDates.to);
            }).length,
        [videos, activeDates.from, activeDates.to],
    );

    const paginatedVideos = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedVideos.slice(start, start + pageSize);
    }, [sortedVideos, currentPage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [videoSort, activeDates.from, activeDates.to]);

    return (
        <div className="space-y-6">
            <SocialCommonHeader
                sections={[
                    { key: "channel_overview", label: "CHANNEL OVERVIEW" },
                    ...(videos.length > 0 ? [{ key: "videos", label: "VIDEOS" }] : []),
                ]}
                activeSection={activeSection}
                onSelectSection={(key) => setActiveSection(key as YouTubeSection)}
                from={activeDates.from}
                to={activeDates.to}
                onDateChange={(newFrom, newTo, presetKey) => {
                    if (onDateRangeChange) {
                        onDateRangeChange(newFrom, newTo, presetKey);
                    } else {
                        onRangeChange("custom");
                    }
                }}
                // No activePresetKey: the range prop uses a different key space
                // ("30d"/"custom") than DATE_PRESETS ("last_30_days"), which
                // suppressed the picker's own from/to inference and left every
                // preset chip unhighlighted. The picker derives it correctly.
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

            {!loading && !usingMock && noDataForRange && (
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-700">
                    <span className="text-sm leading-none shrink-0 mt-0.5">📅</span>
                    <span>
                        Metricool reported no YouTube data for{" "}
                        <strong className="font-semibold">{activeDates.from} → {activeDates.to}</strong>.
                        Its analytics lag by about a day, so a range ending today is usually still empty —
                        try a range ending yesterday or earlier.
                    </span>
                </div>
            )}

            {activeSection === "channel_overview" && (
                <SocialPageOverview
                    platform="youtube"
                    overview={overview}
                    growth={growth}
                    from={activeDates.from}
                    to={activeDates.to}
                />
            )}

            {activeSection === "videos" && (
                <div className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 space-y-4">
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Videos with views in this period</h3>
                            <p className="text-xs text-gray-500 font-medium">
                                {videos.length} videos accrued views between {activeDates.from} and{" "}
                                {activeDates.to} — {publishedInRangeCount} of them were published in that window
                            </p>
                        </div>

                        <select
                            value={videoSort}
                            onChange={(e) => setVideoSort(e.target.value as typeof videoSort)}
                            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        >
                            <option value="date_desc">Newest first</option>
                            <option value="views_desc">Most views</option>
                            <option value="likes_desc">Most likes</option>
                        </select>
                    </header>

                    {sortedVideos.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-xs font-medium text-slate-500">
                            Metricool returned no video activity for this channel between {activeDates.from} and {activeDates.to}.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase text-[10px]">
                                            <th className="py-3 px-2">Video</th>
                                            <th className="py-3 px-2">Published</th>
                                            <th className="py-3 px-2 text-right">Views</th>
                                            <th className="py-3 px-2 text-right">Watch min.</th>
                                            <th className="py-3 px-2 text-right">Avg. view</th>
                                            <th className="py-3 px-2 text-right">Likes</th>
                                            <th className="py-3 px-2 text-right">Comments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedVideos.map((video) => (
                                            <tr key={video.videoId} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                <td className="py-3 px-2">
                                                    <div className="flex items-center gap-3">
                                                        {video.thumbnailUrl && (
                                                            <img
                                                                src={video.thumbnailUrl}
                                                                alt={video.title}
                                                                className="w-20 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                                                                loading="lazy"
                                                            />
                                                        )}
                                                        {video.watchUrl ? (
                                                            <a
                                                                href={video.watchUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="font-semibold text-gray-900 hover:text-red-600 hover:underline line-clamp-2 max-w-xs"
                                                            >
                                                                {video.title}
                                                            </a>
                                                        ) : (
                                                            <span className="font-semibold text-gray-900 line-clamp-2 max-w-xs">{video.title}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2 text-gray-600 font-medium whitespace-nowrap">
                                                    {video.publishedAt?.slice(0, 10) ?? "—"}
                                                </td>
                                                <td className="py-3 px-2 text-right font-bold text-gray-900">{formatNumber(video.views)}</td>
                                                <td className="py-3 px-2 text-right font-semibold text-gray-700">{formatNumber(video.watchMinutes)}</td>
                                                <td className="py-3 px-2 text-right font-semibold text-gray-700">{formatDuration(video.averageViewDuration)}</td>
                                                <td className="py-3 px-2 text-right font-semibold text-emerald-600">{formatNumber(video.likes)}</td>
                                                <td className="py-3 px-2 text-right font-semibold text-blue-600">{formatNumber(video.comments)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <TablePagination
                                currentPage={currentPage}
                                totalItems={sortedVideos.length}
                                pageSize={pageSize}
                                pageSizeOptions={[10, 25, 50]}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={(size) => {
                                    setPageSize(size);
                                    setCurrentPage(1);
                                }}
                            />
                        </>
                    )}
                </div>
            )}

            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-4 flex items-start gap-3 text-xs text-blue-900 shadow-sm">
                <span className="text-base leading-none shrink-0 mt-0.5">ℹ️</span>
                <div>
                    <p className="font-extrabold text-blue-950">About YouTube Analytics Scope</p>
                    <p className="mt-0.5 text-blue-800 font-medium">
                        Metricool reports channel-level subscribers, views and subscriber growth, plus the
                        per-video figures shown under Videos. YouTube's channel-level video count and audience
                        demographics aren't exposed by the API, so "Videos published" is counted from the video
                        catalogue and demographics are unavailable.
                    </p>
                </div>
            </div>
        </div>
    );
}
