import { useEffect, useState } from "react";
import {
    fetchInstagramCommunity,
    fetchInstagramAccount,
    fetchInstagramPosts,
    fetchInstagramReels,
    fetchInstagramStories,
    fetchInstagramCompetitors,
    type InstagramSection,
} from "../services/metricoolApi";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

type TimeRangeKey = "7d" | "30d" | "90d";

function computeRangeDates(key: TimeRangeKey) {
    const to = new Date();
    const from = new Date();
    if (key === "7d") {
        from.setDate(to.getDate() - 7);
    } else if (key === "30d") {
        from.setDate(to.getDate() - 30);
    } else {
        from.setDate(to.getDate() - 90);
    }
    const isoFrom = from.toISOString().slice(0, 10);
    const isoTo = to.toISOString().slice(0, 10);
    return { from: isoFrom, to: isoTo };
}

function formatNumber(value?: number, fallback = "—") {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return fallback;
    }
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function extractSeriesValues(payload: any): any[] {
    if (!payload) return [];
    if (Array.isArray(payload?.data)) {
        const first = payload.data[0];
        if (Array.isArray(first?.values)) {
            return first.values;
        }
    }
    if (Array.isArray(payload?.values)) {
        return payload.values;
    }
    return [];
}

function toChartPoints(points: any[]) {
    return points.map((point) => ({
        date: point.dateTime?.slice(0, 10) ?? "",
        value: typeof point.value === "number" ? point.value : 0,
    }));
}

interface InstagramViewProps {
    range: TimeRangeKey;
    onRangeChange: (range: TimeRangeKey) => void;
}

export default function InstagramView({ range, onRangeChange }: InstagramViewProps) {
    const [activeSection, setActiveSection] = useState<InstagramSection>("account");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sectionData, setSectionData] = useState<any>(null);

    const sections: { key: InstagramSection; label: string }[] = [
        { key: "community", label: "COMMUNITY" },
        { key: "account", label: "ACCOUNT" },
        { key: "posts", label: "POSTS" },
        { key: "reels", label: "REELS" },
        { key: "stories", label: "STORIES" },
        { key: "competitors", label: "COMPETITORS" },
    ];

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const { from, to } = computeRangeDates(range);

                let result;
                switch (activeSection) {
                    case "community":
                        result = await fetchInstagramCommunity({ from, to });
                        break;
                    case "account":
                        result = await fetchInstagramAccount({ from, to });
                        break;
                    case "posts":
                        result = await fetchInstagramPosts({ from, to });
                        break;
                    case "reels":
                        result = await fetchInstagramReels({ from, to });
                        break;
                    case "stories":
                        result = await fetchInstagramStories({ from, to });
                        break;
                    case "competitors":
                        result = await fetchInstagramCompetitors({ from, to });
                        break;
                }

                if (!cancelled) {
                    setSectionData(result.data);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.message || "Failed to load Instagram metrics.");
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
    }, [activeSection, range]);

    const timelinePoints = toChartPoints(
        extractSeriesValues(sectionData?.timeline)
    );

    const items = sectionData?.items ?? [];

    return (
        <div className="space-y-6">
            {/* Section Tabs */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {sections.map((section) => (
                        <button
                            key={section.key}
                            type="button"
                            onClick={() => setActiveSection(section.key)}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeSection === section.key
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                                }`}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Time Range Selector */}
                <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-medium text-gray-900">
                    {(["7d", "30d", "90d"] as TimeRangeKey[]).map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onRangeChange(key)}
                            className={`px-3 py-1 rounded-full ${range === key ? "bg-white shadow-sm" : ""
                                }`}
                        >
                            {key}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-900 mb-2">
                        ⚠️ Instagram Metrics Unavailable
                    </p>
                    <p className="text-sm text-amber-800">
                        {error.includes("Facebook") || error.includes("connection")
                            ? "Some Instagram metrics require connecting your Instagram account via Facebook Business. Please connect your Instagram account to Facebook in Metricool to access all metrics."
                            : error}
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                        💡 Tip: You can still view posts data by navigating to the Posts section and using the basic Instagram connection.
                    </p>
                </div>
            )}

            {loading && (
                <p className="text-sm text-gray-900">
                    Loading {activeSection} metrics...
                </p>
            )}

            {/* Timeline Chart */}
            <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                <header className="mb-4">
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                        {activeSection} - Impressions Over Time
                    </p>
                    <p className="text-xs text-gray-900">
                        Showing data for the selected time period
                    </p>
                </header>
                <div className="h-64">
                    {timelinePoints.length > 0 ? (
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
                                <Tooltip />
                                <Line
                                    dataKey="value"
                                    data={timelinePoints}
                                    name="Impressions"
                                    stroke="#2563eb"
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-gray-900">
                            No timeline data available for this section.
                        </p>
                    )}
                </div>
            </section>

            {/* Items List */}
            <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                <header className="mb-4">
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                        {activeSection} {activeSection === 'competitors' ? 'Analysis' : 'Items'}
                    </p>
                    <p className="text-xs text-gray-900">
                        {activeSection === 'competitors'
                            ? 'Compare your performance with competitors'
                            : `Recent ${activeSection} published in this period`
                        }
                    </p>
                </header>
                <div className="overflow-x-auto">
                    {items.length > 0 ? (
                        activeSection === 'competitors' ? (
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="text-left text-gray-900">
                                        <th className="py-2 pr-2">Competitor</th>
                                        <th className="py-2 pr-2 text-right">Followers</th>
                                        <th className="py-2 pr-2 text-right">Posts</th>
                                        <th className="py-2 pr-2 text-right">Likes</th>
                                        <th className="py-2 pr-2 text-right">Comments</th>
                                        <th className="py-2 pr-2 text-right">Shares</th>
                                        <th className="py-2 pr-2 text-right">Engagement %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item: any, index: number) => (
                                        <tr key={item.id ?? index} className="border-t border-gray-100">
                                            <td className="py-2 pr-2 text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    {item.picture && (
                                                        <img
                                                            src={item.picture}
                                                            alt={item.displayName || item.screenName}
                                                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                        />
                                                    )}
                                                    <span className="font-medium">
                                                        {item.displayName || item.screenName || "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.followers)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.posts)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.likes || item.reactions)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.comments)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.shares)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {item.engagement ? (item.engagement * 100).toFixed(2) + '%' : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="text-left text-gray-900">
                                        <th className="py-2 pr-2">Media</th>
                                        <th className="py-2 pr-2">Message</th>
                                        <th className="py-2 pr-2">Type</th>
                                        <th className="py-2 pr-2 text-right">Impressions</th>
                                        <th className="py-2 pr-2 text-right">Reach</th>
                                        <th className="py-2 pr-2 text-right">Engagement</th>
                                        <th className="py-2 pr-2 text-right">Likes</th>
                                        <th className="py-2 pr-2 text-right">Comments</th>
                                        <th className="py-2 pr-2 text-right">Shares</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.slice(0, 10).map((item: any, index: number) => (
                                        <tr key={item.id ?? index} className="border-t border-gray-100">
                                            <td className="py-2 pr-2 text-gray-900">
                                                {item.picture || item.thumbnailUrl || item.imageUrl ? (
                                                    <img
                                                        src={item.picture || item.thumbnailUrl || item.imageUrl}
                                                        alt="Media"
                                                        className="w-10 h-10 rounded object-cover border border-gray-200"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                                        No img
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2 pr-2 text-gray-900 max-w-xs truncate">
                                                {item.message || item.caption || "—"}
                                            </td>
                                            <td className="py-2 pr-2 text-gray-900">
                                                {item.mediaType || item.type || activeSection}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.impressions || item.impressionsTotal)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.reach)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.engagement)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.likes)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.comments)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.shares)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                    ) : (
                        <p className="text-sm text-gray-900">
                            No {activeSection} items found for this period.
                        </p>
                    )}
                </div>
            </section >
        </div >
    );
}
