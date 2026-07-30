import { useEffect, useMemo, useState } from "react";
import {
    fetchOverview,
    fetchGrowth,
    fetchPosts,
    fetchDemographicsCountries,
    type PlatformKey,
} from "../services/metricoolApi";
import {
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
import SocialPageOverview from "./SocialPageOverview";
import TablePagination from "./TablePagination";
import { getCountryName } from "../lib/countryNames";
import {
    genericOverviewMock,
    genericGrowthMock,
    genericDemographicsCountriesMock,
    genericPostsMock,
} from "./socialMockData";

type TimeRangeKey = "7d" | "30d" | "90d" | "custom";
type GenericSection = "overview" | "demographics" | "posts";

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

function formatNumber(value?: number, fallback = "—") {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return fallback;
    }
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// Empty only when no metric at all came back — a single unreported metric must
// not flip the panel to sample data (`likes` is no longer part of the overview
// shape, so checking it here would have made every response look non-empty).
function overviewIsEmpty(data: any) {
    if (!data) return true;
    const signals = [
        data.followers,
        data.views,
        data.impressions,
        data.reach,
        data.pageVisits,
        data.interactions,
        data.totalContent,
    ];
    return !signals.some((value) => typeof value === "number");
}

const NETWORK_COLORS: Record<string, string> = {
    linkedin: "#0A66C2",
    tiktok: "#000000",
    twitter: "#1DA1F2",
    pinterest: "#E60023",
    meta_ads: "#0668E1",
};

const NETWORK_NAMES: Record<string, string> = {
    linkedin: "LinkedIn",
    tiktok: "TikTok",
    twitter: "Twitter / X",
    pinterest: "Pinterest",
    meta_ads: "Meta Ads",
};

interface GenericSocialViewProps {
    platform: PlatformKey;
    range: TimeRangeKey;
    onRangeChange: (range: TimeRangeKey) => void;
    customFrom?: string;
    customTo?: string;
    blogId?: string;
    onDateRangeChange?: (from: string, to: string, presetKey?: string) => void;
}

export default function GenericSocialView({
    platform,
    range,
    onRangeChange,
    customFrom,
    customTo,
    blogId,
    onDateRangeChange,
}: GenericSocialViewProps) {
    const [activeSection, setActiveSection] = useState<GenericSection>("overview");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usingMock, setUsingMock] = useState(false);

    const [overview, setOverview] = useState<any>(null);
    const [growth, setGrowth] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [demographicsCountries, setDemographicsCountries] = useState<any[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("date_desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const brandColor = NETWORK_COLORS[platform] ?? "#2563eb";
    const networkName = NETWORK_NAMES[platform] ?? platform;

    const sections: { key: GenericSection; label: string }[] = [
        { key: "overview", label: `${networkName.toUpperCase()} OVERVIEW` },
        { key: "demographics", label: "DEMOGRAPHICS" },
        { key: "posts", label: "POSTS & CONTENT" },
    ];

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            setUsingMock(false);

            try {
                const { from, to } = computeRangeDates(range, customFrom, customTo);

                if (activeSection === "overview") {
                    const [overviewRes, growthRes] = await Promise.all([
                        fetchOverview(platform, { from, to, blogId }),
                        fetchGrowth(platform, { from, to, blogId }),
                    ]);

                    if (!cancelled) {
                        const emptyOverview = overviewIsEmpty(overviewRes.data);
                        setOverview(emptyOverview ? genericOverviewMock(platform, range) : overviewRes.data);
                        setGrowth(emptyOverview ? genericGrowthMock(platform, range) : growthRes.data ?? null);
                        if (emptyOverview) setUsingMock(true);
                    }
                } else if (activeSection === "demographics") {
                    const countriesRes = await fetchDemographicsCountries(platform, { from, to, blogId });
                    if (!cancelled) {
                        const countries = countriesRes.data?.data ?? countriesRes.data ?? [];
                        if (!Array.isArray(countries) || countries.length === 0) {
                            setDemographicsCountries(genericDemographicsCountriesMock);
                            setUsingMock(true);
                        } else {
                            setDemographicsCountries(countries);
                        }
                    }
                } else if (activeSection === "posts") {
                    const postsResRaw: any = await fetchPosts(platform, { from, to, pageSize: 20, blogId });
                    if (!cancelled) {
                        const postItems =
                            postsResRaw?.data?.items ??
                            postsResRaw?.data?.data ??
                            postsResRaw?.data ??
                            postsResRaw ??
                            [];
                        if (!Array.isArray(postItems) || postItems.length === 0) {
                            setPosts(genericPostsMock(platform));
                            setUsingMock(true);
                        } else {
                            setPosts(postItems);
                        }
                    }
                }
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.message || `Failed to fetch ${networkName} metrics from API.`);
                    setUsingMock(true);
                    setOverview(genericOverviewMock(platform, range));
                    setGrowth(genericGrowthMock(platform, range));
                    setDemographicsCountries(genericDemographicsCountriesMock);
                    setPosts(genericPostsMock(platform));
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
    }, [platform, range, customFrom, customTo, activeSection, blogId]);

    const activeDates = computeRangeDates(range, customFrom, customTo);

    const filteredPosts = useMemo(() => {
        if (!posts) return [];
        let result = posts.filter((item: any) => {
            const content = item.message || item.text || item.description || item.caption || item.title || "";
            return content.toLowerCase().includes(searchQuery.toLowerCase());
        });

        return result.sort((a, b) => {
            if (sortBy === "date_desc") {
                return new Date(b.date || b.dateTime || 0).getTime() - new Date(a.date || a.dateTime || 0).getTime();
            } else if (sortBy === "impressions_desc") {
                return (b.impressions || b.views || 0) - (a.impressions || a.views || 0);
            } else if (sortBy === "engagement_desc") {
                return (b.engagement || b.clicks || 0) - (a.engagement || a.clicks || 0);
            }
            return 0;
        });
    }, [posts, searchQuery, sortBy]);

    const paginatedPosts = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPosts.slice(start, start + pageSize);
    }, [filteredPosts, currentPage, pageSize]);

    return (
        <div className="space-y-6">
            <SocialCommonHeader
                sections={sections}
                activeSection={activeSection}
                onSelectSection={(key) => setActiveSection(key as GenericSection)}
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
                brandColor={brandColor}
            />

            {error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">Notice regarding {networkName} Analytics</p>
                    <p className="text-xs opacity-90 mt-1">{error}</p>
                </div>
            )}

            {loading && <LoadingSpinner size="md" message={`Loading ${networkName} metrics...`} />}

            {!loading && usingMock && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-xs text-amber-800">
                    <SampleDataBadge />
                    <span>
                        Live {networkName} metrics aren't available right now — preview mode active.
                    </span>
                </div>
            )}

            {/* OVERVIEW Section */}
            {activeSection === "overview" && (
                <SocialPageOverview
                    platform={platform as any}
                    overview={overview}
                    growth={growth}
                    from={activeDates.from}
                    to={activeDates.to}
                />
            )}

            {/* DEMOGRAPHICS Section */}
            {activeSection === "demographics" && (
                <div className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 space-y-4">
                    <header>
                        <h3 className="text-base font-extrabold text-gray-900 tracking-tight">{networkName} Audience by Country</h3>
                        <p className="text-xs text-gray-500 font-medium">Geographic concentration of followers</p>
                    </header>

                    {demographicsCountries.length > 0 ? (
                        <div className="h-64 pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={demographicsCountries
                                        .slice()
                                        .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
                                        .slice(0, 10)
                                        .map((item) => ({
                                            name: getCountryName(item?.key ?? "Unknown"),
                                            value: item?.value ?? 0,
                                        }))}
                                    layout="vertical"
                                    margin={{ top: 0, right: 20, left: 40, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill={brandColor} radius={[0, 6, 6, 0]} barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 italic py-8 text-center">
                            No geographic demographic data returned from {networkName} API.
                        </p>
                    )}
                </div>
            )}

            {/* POSTS Section */}
            {activeSection === "posts" && (
                <div className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm p-6 space-y-4">
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900 tracking-tight">{networkName} Posts & Content</h3>
                            <p className="text-xs text-gray-500 font-medium">Published posts and performance breakdown</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none"
                            >
                                <option value="date_desc">Newest First</option>
                                <option value="impressions_desc">Most Impressions</option>
                                <option value="engagement_desc">Most Engagement</option>
                            </select>
                        </div>
                    </header>

                    {paginatedPosts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase text-[10px]">
                                        <th className="py-3 px-2">Date</th>
                                        <th className="py-3 px-2">Post Content</th>
                                        <th className="py-3 px-2 text-right">Impressions</th>
                                        <th className="py-3 px-2 text-right">Engagement</th>
                                        <th className="py-3 px-2 text-right">Likes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPosts.map((post, idx) => (
                                        <tr key={post.id || idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="py-3 px-2 text-gray-500 font-medium whitespace-nowrap">
                                                {post.date?.slice(0, 10) || post.dateTime?.slice(0, 10) || "—"}
                                            </td>
                                            <td className="py-3 px-2 text-gray-900 font-medium max-w-xs truncate">
                                                {post.message || post.text || post.description || post.caption || post.title || "—"}
                                            </td>
                                            <td className="py-3 px-2 text-right font-bold text-gray-900">
                                                {formatNumber(post.impressions || post.views)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-bold text-gray-900">
                                                {formatNumber(post.engagement || post.clicks)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-bold text-gray-900">
                                                {formatNumber(post.likes || post.reactions)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <TablePagination
                                currentPage={currentPage}
                                totalItems={filteredPosts.length}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={(sz) => {
                                    setPageSize(sz);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 italic py-8 text-center">No posts found for this period.</p>
                    )}
                </div>
            )}
        </div>
    );
}
