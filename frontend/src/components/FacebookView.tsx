import { useEffect, useState } from "react";
import {
    fetchOverview,
    fetchGrowth,
    fetchPosts,
    fetchDemographicsCountries,
    fetchDemographicsCities,
    fetchClicks,
    fetchFacebookReels,
    fetchFacebookStories,
    fetchFacebookCompetitors,
} from "../services/metricoolApi";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { ImageWithHover } from "./ImageWithHover";
import { LoadingSpinner } from "./LoadingSkeletons";

type TimeRangeKey = "7d" | "30d" | "90d";
type FacebookSection = "page_overview" | "demographics" | "clicks_on_page" | "posts" | "reels" | "stories" | "competitors";

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
    // Allow 0 to be displayed as "0"
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function normalizeSeries(seriesContainer: any, key: string): any[] {
    if (!seriesContainer) return [];
    const candidate =
        seriesContainer?.series?.[key] ??
        seriesContainer?.data?.series?.[key] ??
        seriesContainer?.[key];
    if (!candidate) return [];
    if (Array.isArray(candidate?.values)) {
        return candidate.values;
    }
    if (Array.isArray(candidate)) {
        return candidate;
    }
    return [];
}

function toChartPoints(points: any[]) {
    return points.map((point) => ({
        date: point.dateTime?.slice(0, 10) ?? "",
        value: typeof point.value === "number" ? point.value : 0,
    }));
}

const chartColors = ["#2563eb", "#16a34a", "#f97316", "#e11d48", "#9333ea"];

interface FacebookViewProps {
    range: TimeRangeKey;
    onRangeChange: (range: TimeRangeKey) => void;
}

export default function FacebookView({ range, onRangeChange }: FacebookViewProps) {
    const [activeSection, setActiveSection] = useState<FacebookSection>("page_overview");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [overview, setOverview] = useState<any>(null);
    const [growth, setGrowth] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [demographicsCountries, setDemographicsCountries] = useState<any[]>([]);
    const [demographicsCities, setDemographicsCities] = useState<any[]>([]);
    const [clicksData, setClicksData] = useState<any>(null);
    const [reelsData, setReelsData] = useState<any>(null);
    const [storiesData, setStoriesData] = useState<any>(null);
    const [competitorsData, setCompetitorsData] = useState<any>(null);

    const sections: { key: FacebookSection; label: string }[] = [
        { key: "page_overview", label: "PAGE OVERVIEW" },
        { key: "demographics", label: "DEMOGRAPHICS" },
        { key: "clicks_on_page", label: "CLICKS ON PAGE" },
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

                // Load data based on active section to reduce parallel API calls
                if (activeSection === "page_overview") {
                    const [overviewRes, growthRes] = await Promise.all([
                        fetchOverview("facebook", { from, to }),
                        fetchGrowth("facebook", { from, to }),
                    ]);

                    if (!cancelled) {
                        setOverview(overviewRes.data ?? null);
                        setGrowth(growthRes.data ?? null);
                    }
                } else if (activeSection === "demographics") {
                    const [countriesRes, citiesRes] = await Promise.all([
                        fetchDemographicsCountries("facebook", { from, to }),
                        fetchDemographicsCities("facebook", { from, to }),
                    ]);

                    if (!cancelled) {
                        setDemographicsCountries(
                            countriesRes.data?.data ?? countriesRes.data ?? []
                        );
                        setDemographicsCities(
                            citiesRes.data?.data ?? citiesRes.data ?? []
                        );
                    }
                } else if (activeSection === "clicks_on_page") {
                    const clicksRes = await fetchClicks("facebook", { from, to });

                    if (!cancelled) {
                        setClicksData(clicksRes.data ?? null);
                    }
                } else if (activeSection === "posts") {
                    const postsResRaw = await fetchPosts("facebook", { from, to, pageSize: 10 });

                    if (!cancelled) {
                        const postsRes: any = postsResRaw;
                        const postItems =
                            postsRes?.data?.items ??
                            postsRes?.data?.data ??
                            postsRes?.data ??
                            postsRes ??
                            [];
                        setPosts(postItems);
                    }
                } else if (activeSection === "reels") {
                    const reelsRes = await fetchFacebookReels({ from, to, pageSize: 10 });

                    if (!cancelled) {
                        setReelsData(reelsRes.data ?? null);
                        console.log("Facebook Reels Data Loaded:", reelsRes.data);
                    }
                } else if (activeSection === "stories") {
                    const storiesRes = await fetchFacebookStories({ from, to, pageSize: 10 });

                    if (!cancelled) {
                        setStoriesData(storiesRes.data ?? null);
                        console.log("Facebook Stories Data Loaded:", storiesRes.data);
                        // Log first item to see actual structure
                        if (storiesRes.data?.items?.length > 0) {
                            console.log("First Story Item Structure:", storiesRes.data.items[0]);
                            console.log("Available fields:", Object.keys(storiesRes.data.items[0]));
                        }
                    }
                } else if (activeSection === "competitors") {
                    const competitorsRes = await fetchFacebookCompetitors({ from, to });

                    if (!cancelled) {
                        setCompetitorsData(competitorsRes.data ?? null);
                        console.log("Facebook Competitors Data Loaded:", competitorsRes.data);
                    }
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.message || "Failed to load Facebook metrics.");
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
    }, [range, activeSection]); // Added activeSection to trigger data fetch when tab changes

    const networkFrom = overview?.from ?? growth?.from ?? clicksData?.from ?? "unknown";
    const networkTo = overview?.to ?? growth?.to ?? clicksData?.to ?? "unknown";

    const growthSeriesContainer = growth?.series ?? growth?.data?.series ?? growth;

    const impressionsPoints = toChartPoints(
        normalizeSeries(growthSeriesContainer, "impressions")
    );
    const reachPoints = toChartPoints(
        normalizeSeries(growthSeriesContainer, "reach")
    );
    const followersPoints = toChartPoints(
        normalizeSeries(growthSeriesContainer, "followers")
    );
    const newFollowersPoints = toChartPoints(
        normalizeSeries(growthSeriesContainer, "newFollowers")
    );
    const lostFollowersPoints = toChartPoints(
        normalizeSeries(growthSeriesContainer, "lostFollowers")
    );
    const clicksPoints = toChartPoints(
        normalizeSeries(clicksData, "series") ?? []
    );

    const demographicsPie = demographicsCountries.map((item, index) => ({
        name: item?.key ?? `Group ${index + 1}`,
        value: typeof item?.value === "number" ? item.value : 0,
    }));

    const demographicsCityTable = demographicsCities
        .slice()
        .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
        .slice(0, 10);

    const postsRows = posts.slice(0, 5);

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
                <div className={`rounded-xl border px-4 py-3 text-sm ${error.includes('429') || error.includes('Rate limit') || error.includes('rate limit')
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                    <div className="flex items-start gap-2">
                        <span className="text-lg">
                            {error.includes('429') || error.includes('Rate limit') || error.includes('rate limit')
                                ? '⏳'
                                : '⚠️'}
                        </span>
                        <div className="flex-1">
                            <p className="font-semibold mb-1">
                                {error.includes('429') || error.includes('Rate limit') || error.includes('rate limit')
                                    ? 'Rate Limit Reached'
                                    : 'Error Loading Data'}
                            </p>
                            <p className="text-xs opacity-90">{error}</p>
                            {(error.includes('429') || error.includes('Rate limit') || error.includes('rate limit')) && (
                                <p className="text-xs mt-2 opacity-75">
                                    💡 Tip: Try switching to a different tab or wait a few seconds before refreshing.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <LoadingSpinner
                    size="md"
                    message={`Loading ${activeSection.replace(/_/g, " ")} metrics...`}
                />
            )}

            {/* PAGE OVERVIEW Section */}
            {activeSection === "page_overview" && (
                <div className="space-y-6">
                    <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Page Overview</p>
                                <p className="text-xs text-gray-900">
                                    {networkFrom} → {networkTo}
                                </p>
                            </div>
                            {overview?.profileName && (
                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                    <img
                                        src={
                                            overview?.profilePictureUrl ||
                                            overview?.picture ||
                                            "/favicon.svg"
                                        }
                                        alt="Profile"
                                        className="h-8 w-8 rounded-full object-cover"
                                    />
                                    <span className="font-semibold text-gray-900">
                                        {overview?.profileName}
                                    </span>
                                </div>
                            )}
                        </header>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                            {[
                                { label: "Likes", value: overview?.likes ?? 0 },
                                { label: "Followers", value: overview?.followers ?? 0 },
                                { label: "Reach", value: overview?.reach ?? 0 },
                                // { label: "Impressions", value: overview?.impressions ?? overview?.views ?? 0 },
                                { label: "Page visits", value: overview?.pageVisits ?? overview?.pageViews ?? 0 },
                                { label: "Total content", value: overview?.totalContent ?? 0 },
                            ].map((card) => (
                                <div
                                    key={card.label}
                                    className="rounded-2xl bg-sky-50 px-4 py-3 text-center shadow-inner border border-sky-100"
                                >
                                    <p className="text-xs font-semibold text-gray-900">
                                        {card.label}
                                    </p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {formatNumber(card.value, "0")}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">
                                Growth
                            </h3>
                            <div className="h-72">
                                {impressionsPoints.length || followersPoints.length ? (
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
                                                data={impressionsPoints}
                                                name="Impressions"
                                                stroke="#fbbf24"
                                                dot={false}
                                            />
                                            <Line
                                                dataKey="value"
                                                data={followersPoints}
                                                name="Followers"
                                                stroke="#10b981"
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-sm text-gray-900">
                                        No growth data for this period.
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5 space-y-4">
                        <header className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    Balance of Followers
                                </p>
                                <p className="text-xs text-gray-900">
                                    {networkFrom} → {networkTo}
                                </p>
                            </div>
                            <div className="flex gap-2 text-xs font-semibold">
                                <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700">
                                    {formatNumber(overview?.followersChange)} Net change
                                </span>
                                <span className="px-3 py-1 rounded-full bg-green-50 text-green-700">
                                    {formatNumber(overview?.followers)} Total followers
                                </span>
                            </div>
                        </header>
                        <div className="h-64">
                            {newFollowersPoints.length || lostFollowersPoints.length ? (
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
                                            data={newFollowersPoints}
                                            name="Acquired"
                                            stroke="#0ea5e9"
                                            dot={false}
                                        />
                                        <Line
                                            dataKey="value"
                                            data={lostFollowersPoints}
                                            name="Lost"
                                            stroke="#f97316"
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-sm text-gray-900">
                                    No follower balance data.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* DEMOGRAPHICS Section */}
            {activeSection === "demographics" && (
                <div className="space-y-6">
                    <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                        <header className="mb-4">
                            <p className="text-sm font-semibold text-gray-900">
                                Followers by Country
                            </p>
                            <p className="text-xs text-gray-900">
                                Geographic distribution of your audience
                            </p>
                        </header>
                        <div className="h-64 flex items-center justify-center">
                            {demographicsPie.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={demographicsPie}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label
                                        >
                                            {demographicsPie.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={chartColors[index % chartColors.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center">
                                    <p className="text-sm text-gray-900 mb-2">No demographic data available</p>
                                    <p className="text-xs text-gray-400">
                                        Note: Facebook requires at least 100 followers for demographic data.
                                        Age and gender demographics were deprecated by Facebook in Sept 2024.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                        <header className="mb-4">
                            <p className="text-sm font-semibold text-gray-900">
                                Top Cities
                            </p>
                            <p className="text-xs text-gray-900">
                                Cities with the most followers
                            </p>
                        </header>
                        <div className="overflow-x-auto">
                            {demographicsCityTable.length > 0 ? (
                                <table className="min-w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-gray-900">
                                            <th className="py-2 pr-2">City</th>
                                            <th className="py-2 pr-2 text-right">Followers</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {demographicsCityTable.map((item, index) => (
                                            <tr key={index} className="border-t border-gray-100">
                                                <td className="py-2 pr-2 text-gray-900">
                                                    {item?.key ?? "—"}
                                                </td>
                                                <td className="py-2 pr-2 text-right text-gray-900">
                                                    {formatNumber(item?.value)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-sm text-gray-900">No city breakdown available</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Requires at least 100 followers
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* CLICKS ON PAGE Section */}
            {activeSection === "clicks_on_page" && (
                <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                    <header className="mb-4">
                        <p className="text-sm font-semibold text-gray-900">
                            Clicks on Page
                        </p>
                        <p className="text-xs text-gray-900">
                            {networkFrom} → {networkTo}
                        </p>
                    </header>
                    <div className="h-64">
                        {clicksPoints.length > 0 ? (
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
                                        data={clicksPoints}
                                        name="Clicks"
                                        stroke="#8b5cf6"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm text-gray-900">
                                No clicks data for this period.
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* POSTS Section */}
            {activeSection === "posts" && (
                <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                    <header className="mb-4">
                        <p className="text-sm font-semibold text-gray-900">Recent Posts</p>
                        <p className="text-xs text-gray-900">
                            Top performing posts in this period
                        </p>
                    </header>
                    <div className="overflow-x-auto">
                        {postsRows.length > 0 ? (
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="text-left text-gray-900">
                                        <th className="py-2 pr-2">Media</th>
                                        <th className="py-2 pr-2">Message</th>
                                        <th className="py-2 pr-2">Type</th>
                                        <th className="py-2 pr-2 text-right">Impressions</th>
                                        <th className="py-2 pr-2 text-right">Reach</th>
                                        <th className="py-2 pr-2 text-right">Engagement</th>
                                        <th className="py-2 pr-2 text-right">Clicks</th>
                                        <th className="py-2 pr-2 text-right">Likes</th>
                                        <th className="py-2 pr-2 text-right">Comments</th>
                                        <th className="py-2 pr-2 text-right">Shares</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {postsRows.map((item: any, index: number) => (
                                        <tr key={item.id ?? index} className="border-t border-gray-100">
                                            <td className="py-2 pr-2 text-gray-900">
                                                <ImageWithHover
                                                    src={item.picture}
                                                    alt={item.message || "Post media"}
                                                    className="w-10 h-10 rounded object-cover border border-gray-200"
                                                    showName={true}
                                                    name={item.message?.substring(0, 50) || "Post"}
                                                />
                                            </td>
                                            <td className="py-2 pr-2 text-gray-900 max-w-xs truncate">
                                                {item.message || "—"}
                                            </td>
                                            <td className="py-2 pr-2 text-gray-900">
                                                {item.mediaType || "—"}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.impressions)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.reach)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.engagement)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.clicks)}
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
                        ) : (
                            <p className="text-sm text-gray-900">No posts found for this period.</p>
                        )}
                    </div>
                </section>
            )}


            {/* REELS Section */}
            {activeSection === "reels" && (
                <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                    <header className="mb-4">
                        <p className="text-sm font-semibold text-gray-900">Facebook Reels</p>
                        <p className="text-xs text-gray-900">
                            Performance metrics for your Reels content
                        </p>
                        {reelsData?.error && (
                            <p className="text-xs text-amber-600 mt-2">
                                ⚠️ {reelsData.error}
                            </p>
                        )}
                    </header>
                    <div className="overflow-x-auto">
                        {reelsData?.items && reelsData.items.length > 0 ? (
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
                                    {reelsData.items.slice(0, 10).map((item: any, index: number) => (
                                        <tr key={item.id ?? index} className="border-t border-gray-100">
                                            <td className="py-2 pr-2 text-gray-900">
                                                {item.picture ? (
                                                    <img
                                                        src={item.picture}
                                                        alt="Reel media"
                                                        className="w-10 h-10 rounded object-cover border border-gray-200"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                                        No img
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2 pr-2 text-gray-900 max-w-xs truncate">
                                                {item.message || "—"}
                                            </td>
                                            <td className="py-2 pr-2 text-gray-900">
                                                {item.mediaType || "Reel"}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.impressions)}
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
                        ) : (
                            <p className="text-sm text-gray-900">
                                {reelsData?.error
                                    ? "Unable to load Reels data. This may require additional permissions or Facebook connection."
                                    : "No Reels found for this period."}
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* STORIES Section */}
            {activeSection === "stories" && (
                <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                    <header className="mb-4">
                        <p className="text-sm font-semibold text-gray-900">Facebook Stories</p>
                        <p className="text-xs text-gray-900">
                            Performance metrics for your Stories content
                        </p>
                        {storiesData?.error && (
                            <p className="text-xs text-amber-600 mt-2">
                                ⚠️ {storiesData.error}
                            </p>
                        )}
                    </header>
                    <div className="overflow-x-auto">
                        {storiesData?.items && storiesData.items.length > 0 ? (
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
                                    {storiesData.items.slice(0, 10).map((item: any, index: number) => (
                                        <tr key={item.id ?? index} className="border-t border-gray-100">
                                            <td className="py-2 pr-2 text-gray-900">
                                                <ImageWithHover
                                                    src={item.picture}
                                                    alt={item.text || "Story media"}
                                                    className="w-10 h-10 rounded object-cover border border-gray-200"
                                                    showName={true}
                                                    name={item.text?.substring(0, 50) || "Story"}
                                                />
                                            </td>
                                            <td className="py-2 pr-2 text-gray-900 max-w-xs truncate">
                                                {item.text || "—"}
                                            </td>
                                            <td className="py-2 pr-2 text-gray-900">
                                                {item.mediaType || "Story"}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.impressions)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.impressionsUnique)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.engagement)}
                                            </td>
                                            <td className="py-2 pr-2 text-right text-gray-900">
                                                {formatNumber(item.reactions)}
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
                        ) : (
                            <p className="text-sm text-gray-900">
                                {storiesData?.error
                                    ? "Unable to load Stories data. This may require additional permissions or Facebook connection."
                                    : "No Stories found for this period."}
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* COMPETITORS Section */}
            {activeSection === "competitors" && (
                <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                    <header className="mb-4">
                        <p className="text-sm font-semibold text-gray-900">Competitors Analysis</p>
                        <p className="text-xs text-gray-900">
                            Compare your performance with competitors
                        </p>
                        {competitorsData?.error && (
                            <p className="text-xs text-amber-600 mt-2">
                                ⚠️ {competitorsData.error}
                            </p>
                        )}
                    </header>
                    <div className="overflow-x-auto">
                        {competitorsData?.items && competitorsData.items.length > 0 ? (
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="text-left text-gray-900">
                                        <th className="py-2 pr-2">Competitor</th>
                                        <th className="py-2 pr-2 text-right">Followers</th>
                                        <th className="py-2 pr-2 text-right">Posts</th>
                                        <th className="py-2 pr-2 text-right">Reactions</th>
                                        <th className="py-2 pr-2 text-right">Comments</th>
                                        <th className="py-2 pr-2 text-right">Shares</th>
                                        <th className="py-2 pr-2 text-right">Engagement %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {competitorsData.items.map((item: any, index: number) => (
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
                                                {formatNumber(item.reactions)}
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
                            <p className="text-sm text-gray-900">
                                {competitorsData?.error
                                    ? "Unable to load Competitors data. This feature may require additional setup in Metricool."
                                    : "No competitor data available. Add competitors in Metricool to see comparisons."}
                            </p>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
