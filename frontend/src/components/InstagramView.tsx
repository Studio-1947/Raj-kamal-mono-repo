import { useEffect, useState } from "react";
import {
    fetchOverview,
    fetchGrowth,
    fetchInstagramCommunity,
    fetchInstagramAccount,
    fetchInstagramPosts,
    fetchInstagramReels,
    fetchInstagramStories,
    fetchInstagramCompetitors,
    fetchInstagramAccountsEngaged,
    fetchInstagramGenderDistribution,
    fetchInstagramAgeDistribution,
    fetchInstagramContentTypes,
    type InstagramSection,
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
    Cell,
} from "recharts";
import { ImageWithHover } from "./ImageWithHover";
import { LoadingSpinner, SampleDataBadge } from "./LoadingSkeletons";
import {
    instagramOverviewMock,
    instagramGrowthMock,
    instagramPostsMock,
    instagramReelsMock,
    instagramStoriesMock,
    instagramCommunityMock,
    instagramCompetitorsMock,
    instagramTimelineMock,
    instagramGenderMock,
    instagramAgeMock,
    instagramContentTypesMock,
} from "./socialMockData";

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
    // Allow 0 to be displayed as "0"
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

// Emptiness checks used to decide when to fall back to sample data.
function overviewIsEmpty(data: any) {
    return (
        !data ||
        (!data.followers && !data.likes && !data.reach && !data.impressions && !data.pageVisits)
    );
}

function asSeriesArray(candidate: any): any[] {
    if (Array.isArray(candidate)) return candidate;
    if (Array.isArray(candidate?.values)) return candidate.values;
    return [];
}

function growthIsEmpty(data: any) {
    const container = data?.series ?? data?.data?.series ?? data;
    const imp = asSeriesArray(container?.impressions);
    const fol = asSeriesArray(container?.followers);
    return imp.length === 0 && fol.length === 0;
}

function sectionDataIsEmpty(data: any) {
    return !data || !Array.isArray(data.items) || data.items.length === 0;
}

function listIsEmpty(list: any[]) {
    return !Array.isArray(list) || list.length === 0;
}

const chartColors = ["#a855f7", "#ec4899", "#f97316", "#0ea5e9", "#16a34a"];

const GENDER_LABELS: Record<string, string> = { M: "Male", F: "Female", U: "Unknown" };
const CONTENT_TYPE_LABELS: Record<string, string> = {
    FEED_CAROUSEL_ALBUM: "Carousel",
    FEED_IMAGE: "Image",
    FEED_VIDEO: "Video",
    REEL: "Reel",
};

const instagramSectionMock: Record<string, any> = {
    community: instagramCommunityMock,
    posts: instagramPostsMock,
    reels: instagramReelsMock,
    stories: instagramStoriesMock,
    competitors: instagramCompetitorsMock,
};

// "demographics" isn't part of the shared InstagramSection type (that type
// drives fetchInstagramSection's subject/metric maps, which demographics
// doesn't use — it has its own dedicated fetchers instead).
type LocalInstagramSection = InstagramSection | "demographics";

interface InstagramViewProps {
    range: TimeRangeKey;
    onRangeChange: (range: TimeRangeKey) => void;
    blogId?: string;
}

export default function InstagramView({ range, onRangeChange, blogId }: InstagramViewProps) {
    const [activeSection, setActiveSection] = useState<LocalInstagramSection>("account");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usingMock, setUsingMock] = useState(false);
    const [sectionData, setSectionData] = useState<any>(null);
    const [overview, setOverview] = useState<any>(null);
    const [growth, setGrowth] = useState<any>(null);
    const [accountsEngaged, setAccountsEngaged] = useState<number | null>(null);
    const [genderData, setGenderData] = useState<any[]>([]);
    const [ageData, setAgeData] = useState<any[]>([]);
    const [contentTypesData, setContentTypesData] = useState<any[]>([]);
    const [hasCompetitors, setHasCompetitors] = useState(false);

    const sections: { key: LocalInstagramSection; label: string }[] = [
        { key: "account", label: "ACCOUNT OVERVIEW" },
        { key: "demographics", label: "DEMOGRAPHICS" },
        { key: "community", label: "COMMUNITY" },
        { key: "posts", label: "POSTS" },
        { key: "reels", label: "REELS" },
        { key: "stories", label: "STORIES" },
        ...(hasCompetitors ? [{ key: "competitors" as const, label: "COMPETITORS" }] : []),
    ];

    // Competitors only shows up once Metricool actually has competitor pages
    // configured for this brand (a Metricool-side setup step, not a code
    // issue) — checked independently of activeSection so the tab itself is
    // hidden/shown correctly, not just its content.
    useEffect(() => {
        let cancelled = false;
        async function checkCompetitors() {
            try {
                const { from, to } = computeRangeDates(range);
                const res = await fetchInstagramCompetitors({ from, to, blogId });
                if (!cancelled) setHasCompetitors(!listIsEmpty(res.data?.items));
            } catch {
                if (!cancelled) setHasCompetitors(false);
            }
        }
        checkCompetitors();
        return () => {
            cancelled = true;
        };
    }, [range, blogId]);

    useEffect(() => {
        if (!hasCompetitors && activeSection === "competitors") {
            setActiveSection("account");
        }
    }, [hasCompetitors, activeSection]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            setUsingMock(false);
            try {
                const { from, to } = computeRangeDates(range);

                // Load data based on active section
                if (activeSection === "account") {
                    // Fetch overview and growth data for account overview
                    const [overviewRes, growthRes, accountsEngagedRes] = await Promise.all([
                        fetchOverview("instagram", { from, to, blogId }),
                        fetchGrowth("instagram", { from, to, blogId }),
                        fetchInstagramAccountsEngaged({ from, to, blogId }),
                    ]);

                    if (!cancelled) {
                        const emptyOverview = overviewIsEmpty(overviewRes.data);
                        const emptyGrowth = growthIsEmpty(growthRes.data);
                        setOverview(emptyOverview ? instagramOverviewMock(range) : overviewRes.data);
                        setGrowth(emptyGrowth ? instagramGrowthMock(range) : growthRes.data ?? null);
                        setAccountsEngaged(accountsEngagedRes.data.total);
                        setSectionData(null); // Clear section data for overview
                        if (emptyOverview || emptyGrowth) setUsingMock(true);
                    }
                } else if (activeSection === "demographics") {
                    const [genderRes, ageRes, contentTypesRes] = await Promise.all([
                        fetchInstagramGenderDistribution({ from, to, blogId }),
                        fetchInstagramAgeDistribution({ from, to, blogId }),
                        fetchInstagramContentTypes({ from, to, blogId }),
                    ]);

                    if (!cancelled) {
                        const gender = genderRes.data?.data ?? genderRes.data ?? [];
                        const age = ageRes.data?.data ?? ageRes.data ?? [];
                        const contentTypes = contentTypesRes.data?.data ?? contentTypesRes.data ?? [];
                        const emptyGender = listIsEmpty(gender);
                        const emptyAge = listIsEmpty(age);
                        const emptyContentTypes = listIsEmpty(contentTypes);
                        setGenderData(emptyGender ? instagramGenderMock : gender);
                        setAgeData(emptyAge ? instagramAgeMock : age);
                        setContentTypesData(emptyContentTypes ? instagramContentTypesMock : contentTypes);
                        setOverview(null);
                        setGrowth(null);
                        setSectionData(null);
                        if (emptyGender && emptyAge && emptyContentTypes) setUsingMock(true);
                    }
                } else {
                    // Fetch section-specific data
                    let result;
                    switch (activeSection) {
                        case "community":
                            result = await fetchInstagramCommunity({ from, to, blogId });
                            break;
                        case "posts":
                            result = await fetchInstagramPosts({ from, to, blogId });
                            break;
                        case "reels":
                            result = await fetchInstagramReels({ from, to, blogId });
                            break;
                        case "stories":
                            result = await fetchInstagramStories({ from, to, blogId });
                            break;
                        case "competitors":
                            result = await fetchInstagramCompetitors({ from, to, blogId });
                            break;
                    }

                    if (!cancelled) {
                        const data = result?.data;
                        if (sectionDataIsEmpty(data)) {
                            const mock = instagramSectionMock[activeSection];
                            setSectionData(
                                activeSection === "competitors"
                                    ? mock
                                    : { ...mock, timeline: instagramTimelineMock(range) }
                            );
                            setUsingMock(true);
                        } else {
                            setSectionData(data);
                        }
                        setOverview(null); // Clear overview data for other sections
                        setGrowth(null);
                    }
                }
            } catch (err: any) {
                // Live data failed (offline backend, rate limit, not connected):
                // fall back to sample data so the layout still previews correctly.
                if (!cancelled) {
                    setUsingMock(true);
                    if (activeSection === "account") {
                        setOverview(instagramOverviewMock(range));
                        setGrowth(instagramGrowthMock(range));
                        setSectionData(null);
                    } else if (activeSection === "demographics") {
                        setGenderData(instagramGenderMock);
                        setAgeData(instagramAgeMock);
                        setContentTypesData(instagramContentTypesMock);
                        setOverview(null);
                        setGrowth(null);
                        setSectionData(null);
                    } else {
                        const mock = instagramSectionMock[activeSection];
                        setSectionData(
                            activeSection === "competitors"
                                ? mock
                                : { ...mock, timeline: instagramTimelineMock(range) }
                        );
                        setOverview(null);
                        setGrowth(null);
                    }
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
    }, [activeSection, range, blogId]);

    // Helper function to normalize series data
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

    // Prepare chart data for overview section
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
                            className={`px-4 py-2 text-xs font-normal rounded-lg transition-all ${activeSection === section.key
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                                }`}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Time Range Selector */}
                <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-normal text-gray-900">
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
                <div className={`rounded-xl border px-4 py-3 ${error.includes('429') || error.includes('Rate limit') || error.includes('rate limit')
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-amber-200 bg-amber-50'
                    }`}>
                    <div className="flex items-start gap-2">
                        <span className="text-lg">
                            {error.includes('429') || error.includes('Rate limit') || error.includes('rate limit')
                                ? '⏳'
                                : '⚠️'}
                        </span>
                        <div className="flex-1">
                            <p className="text-sm font-normal text-amber-900 mb-2">
                                {error.includes('429') || error.includes('Rate limit') || error.includes('rate limit')
                                    ? 'Rate Limit Reached'
                                    : '⚠️ Instagram Metrics Unavailable'}
                            </p>
                            <p className="text-sm text-amber-800">
                                {error.includes('429') || error.includes('Rate limit') || error.includes('rate limit')
                                    ? error
                                    : (error.includes("Facebook") || error.includes("connection")
                                        ? "Some Instagram metrics require connecting your Instagram account via Facebook Business. Please connect your Instagram account to Facebook in Metricool to access all metrics."
                                        : error)}
                            </p>
                            <p className="text-xs text-amber-700 mt-2">
                                {error.includes('429') || error.includes('Rate limit') || error.includes('rate limit')
                                    ? '💡 Tip: Try switching to a different tab or wait a few seconds before refreshing.'
                                    : '💡 Tip: You can still view posts data by navigating to the Posts section and using the basic Instagram connection.'}
                            </p>
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

            {!loading && usingMock && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-xs text-amber-800">
                    <SampleDataBadge />
                    <span>
                        Live Instagram metrics aren't available right now — showing sample data so you
                        can preview how this section looks.
                    </span>
                </div>
            )}

            {/* ACCOUNT OVERVIEW Section */}
            {activeSection === "account" && (
                <div className="space-y-6">
                    <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-normal text-gray-900">Account Overview</p>
                                <p className="text-xs text-gray-900">
                                    {overview?.from ?? ""} → {overview?.to ?? ""}
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
                                    <span className="font-normal text-gray-900">
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
                                { label: "Impressions", value: overview?.impressions ?? overview?.views ?? 0 },
                                { label: "Profile visits", value: overview?.pageVisits ?? overview?.pageViews ?? 0 },
                                { label: "Total content", value: overview?.totalContent ?? 0 },
                                { label: "Accounts engaged", value: accountsEngaged ?? 0 },
                            ].map((card) => (
                                <div
                                    key={card.label}
                                    className="rounded-2xl bg-purple-50 px-4 py-3 text-center shadow-inner border border-purple-100"
                                >
                                    <p className="text-xs font-normal text-gray-900">
                                        {card.label}
                                    </p>
                                    <p className="text-xl font-normal text-gray-900">
                                        {formatNumber(card.value, "0")}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6">
                            <h3 className="text-sm font-normal text-gray-900 mb-2">
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
                                            <Tooltip
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                                        labelStyle={{ color: "#111827", fontWeight: 600, marginBottom: 4 }}
                                    />
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
                                <p className="text-sm font-normal text-gray-900">
                                    Balance of Followers
                                </p>
                                <p className="text-xs text-gray-900">
                                    {overview?.from ?? ""} → {overview?.to ?? ""}
                                </p>
                            </div>
                            <div className="flex gap-2 text-xs font-normal">
                                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700">
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
                                        <Tooltip
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                                        labelStyle={{ color: "#111827", fontWeight: 600, marginBottom: 4 }}
                                    />
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
                            <p className="text-sm font-normal text-gray-900">Audience Gender</p>
                            <p className="text-xs text-gray-900">Share of followers by gender</p>
                        </header>
                        {genderData.length > 0 ? (
                            <div className="space-y-3">
                                {genderData
                                    .slice()
                                    .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
                                    .map((item, index) => (
                                        <div key={item?.key ?? index} className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-normal text-gray-900">
                                                    {GENDER_LABELS[item?.key] ?? item?.key ?? "—"}
                                                </span>
                                                <span className="text-sm font-normal text-gray-900">
                                                    {(item?.value ?? 0).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${item?.value ?? 0}%`,
                                                        backgroundColor: chartColors[index % chartColors.length],
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-900">No gender data available.</p>
                        )}
                    </section>

                    <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                        <header className="mb-4">
                            <p className="text-sm font-normal text-gray-900">Audience Age</p>
                            <p className="text-xs text-gray-900">Share of followers by age bracket</p>
                        </header>
                        <div className="h-80">
                            {ageData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={ageData
                                            .slice()
                                            .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
                                            .map((item) => ({
                                                name: item?.key ?? "Unknown",
                                                value: item?.value ?? 0,
                                            }))}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
                                                            <p className="text-xs font-normal text-gray-900">
                                                                {payload[0].payload.name}
                                                            </p>
                                                            <p className="text-xs text-purple-600 font-normal">
                                                                {payload[0].payload.value.toFixed(1)}% of followers
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                            {ageData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-sm text-gray-900">No age data available.</p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                        <header className="mb-4">
                            <p className="text-sm font-normal text-gray-900">Content Types</p>
                            <p className="text-xs text-gray-900">Share of posts by media type</p>
                        </header>
                        {contentTypesData.length > 0 ? (
                            <div className="space-y-3">
                                {contentTypesData
                                    .slice()
                                    .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
                                    .map((item, index) => (
                                        <div key={item?.key ?? index} className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-normal text-gray-900">
                                                    {CONTENT_TYPE_LABELS[item?.key] ?? item?.key ?? "—"}
                                                </span>
                                                <span className="text-sm font-normal text-gray-900">
                                                    {(item?.value ?? 0).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${item?.value ?? 0}%`,
                                                        backgroundColor: chartColors[index % chartColors.length],
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-900">No content type data available.</p>
                        )}
                    </section>
                </div>
            )}

            {/* Timeline Chart - Only show for non-account sections */}
            {activeSection !== "account" && activeSection !== "demographics" && (
                <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                    <header className="mb-4">
                        <p className="text-sm font-normal text-gray-900 capitalize">
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
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                                        labelStyle={{ color: "#111827", fontWeight: 600, marginBottom: 4 }}
                                    />
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
            )}


            {/* Items List - Only show for non-account sections */}
            {activeSection !== "account" && activeSection !== "demographics" && (
                <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
                    <header className="mb-4">
                        <p className="text-sm font-normal text-gray-900 capitalize">
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
                                                        <ImageWithHover
                                                            src={item.picture}
                                                            alt={item.displayName || item.screenName || "Competitor"}
                                                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                            showName={true}
                                                            name={item.displayName || item.screenName || "Unknown"}
                                                        />
                                                        <span className="font-normal">
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
                                                    {formatNumber(item.shares || item.sharesCount)}
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
                                                    <ImageWithHover
                                                        src={item.picture || item.thumbnailUrl || item.imageUrl}
                                                        alt={item.content || item.message || item.text || item.caption || item.description || item.title || "Media"}
                                                        className="w-10 h-10 rounded object-cover border border-gray-200"
                                                        showName={true}
                                                        name={(item.content || item.message || item.text || item.caption || item.description || item.title || item.name || item.mediaType || item.type || activeSection).substring(0, 50)}
                                                    />
                                                </td>
                                                <td className="py-2 pr-2 text-gray-900 max-w-xs truncate">
                                                    {item.content || item.message || item.text || item.caption || item.description || item.title || item.name || <span className="text-gray-400 italic text-xs">(No caption)</span>}
                                                </td>
                                                <td className="py-2 pr-2 text-gray-900">
                                                    {item.mediaType || item.type || activeSection}
                                                </td>
                                                <td className="py-2 pr-2 text-right text-gray-900">
                                                    {formatNumber(item.impressions || item.impressionsTotal || item.views)}
                                                </td>
                                                <td className="py-2 pr-2 text-right text-gray-900">
                                                    {formatNumber(item.reach || item.impressionsUnique || item.reachTotal)}
                                                </td>
                                                <td className="py-2 pr-2 text-right text-gray-900">
                                                    {formatNumber(item.engagement || item.engagementTotal)}
                                                </td>
                                                <td className="py-2 pr-2 text-right text-gray-900">
                                                    {formatNumber(item.likes || item.reactions || item.likesCount)}
                                                </td>
                                                <td className="py-2 pr-2 text-right text-gray-900">
                                                    {formatNumber(item.comments || item.commentsCount)}
                                                </td>
                                                <td className="py-2 pr-2 text-right text-gray-900">
                                                    {formatNumber(item.shares || item.sharesCount)}
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
                </section>
            )}
        </div>
    );
}
