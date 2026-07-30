import { useEffect, useMemo, useState } from "react";
import {
    fetchOverview,
    fetchGrowth,
    fetchInstagramCommunity,
    fetchInstagramAccount,
    fetchInstagramPosts,
    fetchInstagramReels,
    fetchInstagramStories,
    fetchInstagramCompetitors,
    fetchInstagramEngagement,
    fetchInstagramGenderDistribution,
    fetchInstagramAgeDistribution,
    fetchInstagramContentTypes,
    fetchDemographicsCountries,
    fetchDemographicsCities,
    fetchContentTypeBreakdown,
    sortSeriesByDate,
    type InstagramSection,
    type InstagramEngagement,
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
import { getCountryName } from "../lib/countryNames";
import SocialCommonHeader from "./SocialCommonHeader";
import { formatDateISO } from "./SocialDatePicker";
import SocialPageOverview from "./SocialPageOverview";
import TablePagination from "./TablePagination";
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
    instagramDemographicsCountriesMock,
    instagramDemographicsCitiesMock,
} from "./socialMockData";

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
    const isoFrom = formatDateISO(from);
    const isoTo = formatDateISO(to);
    return { from: isoFrom, to: isoTo };
}

function formatNumber(value?: number, fallback = "—") {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return fallback;
    }
    // Allow 0 to be displayed as "0"
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// Metricool returns timeline points out of chronological order, so every series
// is sorted before it reaches a chart axis (see sortSeriesByDate).
function extractSeriesValues(payload: any): any[] {
    if (!payload) return [];
    if (Array.isArray(payload?.data)) {
        const first = payload.data[0];
        if (Array.isArray(first?.values)) {
            return sortSeriesByDate(first.values);
        }
    }
    if (Array.isArray(payload?.values)) {
        return sortSeriesByDate(payload.values);
    }
    return [];
}

function toChartPoints(points: any[]) {
    return sortSeriesByDate(points).map((point: any) => ({
        date: point.dateTime?.slice(0, 10) ?? "",
        value: typeof point.value === "number" ? point.value : 0,
    }));
}

// Emptiness checks used to decide when to fall back to sample data. Only a
// response with no usable metric at all counts as empty — a single missing
// metric (e.g. Instagram's profile_views, which this account doesn't report)
// must not swap the whole panel over to sample numbers.
function overviewIsEmpty(data: any) {
    if (!data) return true;
    const signals = [
        data.followers,
        data.views,
        data.impressions,
        data.reach,
        data.interactions,
        data.totalContent,
        data.followersChange,
    ];
    return !signals.some((value) => typeof value === "number");
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
    customFrom?: string;
    customTo?: string;
    blogId?: string;
    onDateRangeChange?: (from: string, to: string, presetKey?: string) => void;
}

export default function InstagramView({ range, onRangeChange, customFrom, customTo, blogId, onDateRangeChange }: InstagramViewProps) {
    const [activeSection, setActiveSection] = useState<LocalInstagramSection>("account");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usingMock, setUsingMock] = useState(false);
    // Request succeeded, but Metricool reported nothing for this date range.
    const [noDataForRange, setNoDataForRange] = useState(false);
    const [sectionData, setSectionData] = useState<any>(null);
    const [overview, setOverview] = useState<any>(null);
    const [growth, setGrowth] = useState<any>(null);
    const [engagement, setEngagement] = useState<InstagramEngagement | null>(null);
    const [contentTypeBreakdown, setContentTypeBreakdown] = useState<any>(null);
    const [genderData, setGenderData] = useState<any[]>([]);
    const [ageData, setAgeData] = useState<any[]>([]);
    const [contentTypesData, setContentTypesData] = useState<any[]>([]);
    const [demographicsCountries, setDemographicsCountries] = useState<any[]>([]);
    const [demographicsCities, setDemographicsCities] = useState<any[]>([]);
    const [hasReels, setHasReels] = useState(false);
    const [hasStories, setHasStories] = useState(false);
    const [hasCompetitors, setHasCompetitors] = useState(false);

    const sections: { key: LocalInstagramSection; label: string }[] = [
        { key: "account", label: "ACCOUNT OVERVIEW" },
        { key: "demographics", label: "DEMOGRAPHICS" },
        { key: "posts", label: "POSTS" },
        ...(hasReels ? [{ key: "reels" as const, label: "REELS" }] : []),
        ...(hasStories ? [{ key: "stories" as const, label: "STORIES" }] : []),
        ...(hasCompetitors ? [{ key: "competitors" as const, label: "COMPETITORS" }] : []),
    ];

    useEffect(() => {
        let cancelled = false;
        async function checkAvailability() {
            try {
                const { from, to } = computeRangeDates(range, customFrom, customTo);
                const [reelsRes, storiesRes, competitorsRes] = await Promise.all([
                    fetchInstagramReels({ from, to, blogId }).catch(() => null),
                    fetchInstagramStories({ from, to, blogId }).catch(() => null),
                    fetchInstagramCompetitors({ from, to, blogId }).catch(() => null),
                ]);
                if (!cancelled) {
                    setHasReels(!listIsEmpty(reelsRes?.data?.items ?? []));
                    setHasStories(!listIsEmpty(storiesRes?.data?.items ?? []));
                    setHasCompetitors(!listIsEmpty(competitorsRes?.data?.items ?? []));
                }
            } catch {
                if (!cancelled) {
                    setHasReels(false);
                    setHasStories(false);
                    setHasCompetitors(false);
                }
            }
        }
        checkAvailability();
        return () => {
            cancelled = true;
        };
    }, [range, customFrom, customTo, blogId]);

    useEffect(() => {
        const availableKeys = sections.map((s) => s.key);
        if (!availableKeys.includes(activeSection)) {
            setActiveSection("account");
        }
    }, [sections, activeSection]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            setUsingMock(false);
            setNoDataForRange(false);
            try {
                const { from, to } = computeRangeDates(range, customFrom, customTo);

                // Load data based on active section
                if (activeSection === "account") {
                    // Fetch overview and growth data for account overview
                    const [overviewRes, growthRes, engagementRes, contentTypesRes] = await Promise.all([
                        fetchOverview("instagram", { from, to, blogId }),
                        fetchGrowth("instagram", { from, to, blogId }),
                        fetchInstagramEngagement({ from, to, blogId }),
                        fetchContentTypeBreakdown("instagram", { from, to, blogId }),
                    ]);

                    if (!cancelled) {
                        // A successful-but-empty response means Metricool has no
                        // data for this range yet (its data lags ~a day, so a
                        // range ending today returns nothing). That is not a
                        // failure, so it must not substitute sample numbers —
                        // real empty data plus an explanatory notice instead.
                        const emptyOverview = overviewIsEmpty(overviewRes.data);
                        const emptyGrowth = growthIsEmpty(growthRes.data);
                        setOverview(overviewRes.data);
                        setGrowth(growthRes.data ?? null);
                        setEngagement(engagementRes.data);
                        setContentTypeBreakdown(contentTypesRes.data);
                        setSectionData(null); // Clear section data for overview
                        setNoDataForRange(emptyOverview && emptyGrowth);
                    }
                } else if (activeSection === "demographics") {
                    const [genderRes, ageRes, contentTypesRes, countriesRes, citiesRes] = await Promise.all([
                        fetchInstagramGenderDistribution({ from, to, blogId }),
                        fetchInstagramAgeDistribution({ from, to, blogId }),
                        fetchInstagramContentTypes({ from, to, blogId }),
                        fetchDemographicsCountries("instagram", { from, to, blogId }),
                        fetchDemographicsCities("instagram", { from, to, blogId }),
                    ]);

                    if (!cancelled) {
                        const gender = genderRes.data?.data ?? genderRes.data ?? [];
                        const age = ageRes.data?.data ?? ageRes.data ?? [];
                        const contentTypes = contentTypesRes.data?.data ?? contentTypesRes.data ?? [];
                        const countries = countriesRes.data?.data ?? countriesRes.data ?? [];
                        const cities = citiesRes.data?.data ?? citiesRes.data ?? [];
                        const emptyGender = listIsEmpty(gender);
                        const emptyAge = listIsEmpty(age);
                        const emptyContentTypes = listIsEmpty(contentTypes);
                        const emptyCountries = listIsEmpty(countries);
                        const emptyCities = listIsEmpty(cities);
                        setGenderData(emptyGender ? instagramGenderMock : gender);
                        setAgeData(emptyAge ? instagramAgeMock : age);
                        setContentTypesData(emptyContentTypes ? instagramContentTypesMock : contentTypes);
                        setDemographicsCountries(emptyCountries ? instagramDemographicsCountriesMock : countries);
                        setDemographicsCities(emptyCities ? instagramDemographicsCitiesMock : cities);
                        setOverview(null);
                        setGrowth(null);
                        setSectionData(null);
                        if (emptyGender && emptyAge && emptyContentTypes && emptyCountries && emptyCities) {
                            setUsingMock(true);
                        }
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
                        setSectionData(data);
                        setNoDataForRange(sectionDataIsEmpty(data));
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
                        setDemographicsCountries(instagramDemographicsCountriesMock);
                        setDemographicsCities(instagramDemographicsCitiesMock);
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
    }, [activeSection, range, customFrom, customTo, blogId]);

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

    const [searchQuery, setSearchQuery] = useState("");
    const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
    const [sortBy, setSearchSortBy] = useState("date_desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        setSearchQuery("");
        setMediaTypeFilter("all");
        setSearchSortBy("date_desc");
        setCurrentPage(1);
    }, [activeSection]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, mediaTypeFilter, sortBy]);

    // Helpers for CSV and PDF downloads
    const exportToCSV = (data: any[], filename: string, mapping: { header: string; getValue: (item: any) => any }[]) => {
        if (!data || !data.length) return;
        const headers = mapping.map(m => m.header).join(",");
        const rows = data.map(item => 
            mapping.map(m => {
                const val = m.getValue(item);
                const cell = val === null || val === undefined ? "" : String(val);
                const escaped = cell.replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(",")
        );
        const csvContent = [headers, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = (data: any[], title: string, mapping: { header: string; getValue: (item: any) => any; align?: "left" | "right" }[]) => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        
        const rowsHtml = data.map((item, index) => {
            const colsHtml = mapping.map(m => {
                const val = m.getValue(item);
                const displayVal = typeof val === "number" ? val.toLocaleString("en-IN") : (val ?? "—");
                const alignment = m.align === "right" ? "text-align: right;" : "text-align: left;";
                return `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb; ${alignment}">${displayVal}</td>`;
            }).join("");
            return `<tr style="background-color: ${index % 2 === 0 ? "#ffffff" : "#f9fafb"}">${colsHtml}</tr>`;
        }).join("");
        
        const headersHtml = mapping.map(m => {
            const alignment = m.align === "right" ? "text-align: right;" : "text-align: left;";
            return `<th style="padding: 10px 8px; background-color: #f3f4f6; font-weight: bold; border-bottom: 2px solid #e5e7eb; ${alignment}">${m.header}</th>`;
        }).join("");
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; padding: 20px; }
                        h1 { font-size: 18px; margin-bottom: 4px; color: #1f2937; }
                        p { font-size: 11px; color: #6b7280; margin-top: 0; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <p>Generated on ${new Date().toLocaleDateString("en-IN")} at ${new Date().toLocaleTimeString("en-IN")}</p>
                    <table>
                        <thead>
                            <tr>${headersHtml}</tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.close();
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Columns configurations
    // Verified against the live API: all 174 Instagram stories in a month carry
    // these six metrics numerically (impressions 70,559 / reach 68,820 /
    // taps forward 61,451 / taps back 3,542 / exits 9,736 / replies 14).
    const STORY_METRIC_COLUMNS: { label: string; key: string }[] = [
        { label: "Impressions", key: "impressions" },
        { label: "Reach", key: "reach" },
        { label: "Taps fwd", key: "tapsForward" },
        { label: "Taps back", key: "tapsBack" },
        { label: "Exits", key: "exits" },
        { label: "Replies", key: "replies" },
    ];

    const storyExportColumns = [
        { header: "Published", getValue: (item: any) => (item.publishedAt?.dateTime ?? item.publishedAt ?? "").slice(0, 10) },
        { header: "Type", getValue: (item: any) => item.type ?? "" },
        { header: "Permalink", getValue: (item: any) => item.permalink ?? "" },
        ...[
            ["Impressions", "impressions"], ["Reach", "reach"], ["Taps forward", "tapsForward"],
            ["Taps back", "tapsBack"], ["Exits", "exits"], ["Replies", "replies"],
        ].map(([header, key]) => ({
            header,
            getValue: (item: any) => (typeof item[key] === "number" ? item[key] : ""),
            align: "right" as const,
        })),
    ];

    const postExportColumns = [
        { header: "Date", getValue: (item: any) => item.date || item.dateTime || "" },
        { header: "Message", getValue: (item: any) => item.content || item.message || item.text || item.caption || item.description || item.title || "" },
        { header: "Type", getValue: (item: any) => item.mediaType || item.type || "" },
        { header: "Impressions", getValue: (item: any) => item.impressions || item.impressionsTotal || item.views || 0, align: "right" as const },
        { header: "Reach", getValue: (item: any) => item.reach || item.impressionsUnique || item.reachTotal || 0, align: "right" as const },
        { header: "Engagement", getValue: (item: any) => item.engagement || item.engagementTotal || 0, align: "right" as const },
        { header: "Likes/Reactions", getValue: (item: any) => item.likes || item.reactions || item.likesCount || 0, align: "right" as const },
        { header: "Comments", getValue: (item: any) => item.comments || item.commentsCount || 0, align: "right" as const },
        { header: "Shares", getValue: (item: any) => item.shares || item.sharesCount || 0, align: "right" as const },
    ];

    const competitorExportColumns = [
        { header: "Competitor", getValue: (item: any) => item.displayName || item.screenName || "" },
        { header: "Followers", getValue: (item: any) => item.followers || 0, align: "right" as const },
        { header: "Posts", getValue: (item: any) => item.posts || 0, align: "right" as const },
        { header: "Likes/Reactions", getValue: (item: any) => item.likes || item.reactions || 0, align: "right" as const },
        { header: "Comments", getValue: (item: any) => item.comments || 0, align: "right" as const },
        { header: "Shares", getValue: (item: any) => item.shares || item.sharesCount || 0, align: "right" as const },
        { header: "Engagement %", getValue: (item: any) => item.engagement ? (item.engagement * 100).toFixed(2) + "%" : "0%", align: "right" as const },
    ];

    const rawItems = sectionData?.items ?? [];

    const postTypes = useMemo(() => {
        const types = new Set<string>();
        rawItems.forEach((item: any) => {
            const t = item.mediaType || item.type;
            if (t) types.add(t);
        });
        return Array.from(types);
    }, [rawItems]);

    const itemDate = (item: any): string =>
        item.publishedAt?.dateTime ?? item.publishedAt ?? item.date ?? item.dateTime ?? 0;

    const sortItems = (items: any[], type: string) => {
        return [...items].sort((a, b) => {
            switch (type) {
                // Stories/reels carry publishedAt.dateTime rather than a flat
                // date field, so date sorting has to look there too.
                case "date_desc":
                    return new Date(itemDate(b)).getTime() - new Date(itemDate(a)).getTime();
                case "date_asc":
                    return new Date(itemDate(a)).getTime() - new Date(itemDate(b)).getTime();
                case "impressions_desc":
                    return (b.impressions || b.impressionsTotal || b.views || 0) - (a.impressions || a.impressionsTotal || a.views || 0);
                case "reach_desc":
                    return (b.reach || b.impressionsUnique || b.reachTotal || 0) - (a.reach || a.impressionsUnique || a.reachTotal || 0);
                case "likes_desc":
                    return (b.likes || b.reactions || b.likesCount || 0) - (a.likes || a.reactions || a.likesCount || 0);
                case "comments_desc":
                    return (b.comments || b.commentsCount || 0) - (a.comments || a.commentsCount || 0);
                case "shares_desc":
                    return (b.shares || b.sharesCount || 0) - (a.shares || a.sharesCount || 0);
                case "engagement_desc":
                    return (b.engagement || b.engagementTotal || 0) - (a.engagement || a.engagementTotal || 0);
                case "taps_forward_desc":
                    return (b.tapsForward ?? 0) - (a.tapsForward ?? 0);
                case "exits_desc":
                    return (b.exits ?? 0) - (a.exits ?? 0);
                case "replies_desc":
                    return (b.replies ?? 0) - (a.replies ?? 0);
                case "followers_desc":
                    return (b.followers || 0) - (a.followers || 0);
                case "posts_desc":
                    return (b.posts || 0) - (a.posts || 0);
                default:
                    return 0;
            }
        });
    };

    const items = useMemo(() => {
        if (!rawItems) return [];
        let result = rawItems.filter((item: any) => {
            if (activeSection === "competitors") {
                const name = item.displayName || item.screenName || "";
                return name.toLowerCase().includes(searchQuery.toLowerCase());
            } else {
                const content = item.content || item.message || item.text || item.caption || item.description || item.title || "";
                const matchesSearch = content.toLowerCase().includes(searchQuery.toLowerCase());
                
                if (mediaTypeFilter === "all") return matchesSearch;
                const type = (item.mediaType || item.type || "").toLowerCase();
                return matchesSearch && type === mediaTypeFilter.toLowerCase();
            }
        });
        return sortItems(result, sortBy);
    }, [rawItems, searchQuery, activeSection, mediaTypeFilter, sortBy]);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, currentPage, pageSize]);

    const activeDates = computeRangeDates(range, customFrom, customTo);

    return (
        <div className="space-y-6">
            {/* Common Social Section Header & Calendar Date Picker */}
            <SocialCommonHeader
                sections={sections}
                activeSection={activeSection}
                onSelectSection={(key) => setActiveSection(key as LocalInstagramSection)}
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
                brandColor="#E1306C"
            />

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

            {!loading && !usingMock && noDataForRange && (
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-700">
                    <span className="text-sm leading-none shrink-0 mt-0.5">📅</span>
                    <span>
                        Metricool reported no Instagram data for{" "}
                        <strong className="font-semibold">{activeDates.from} → {activeDates.to}</strong>.
                        Its analytics lag by about a day, so a range ending today is usually still empty —
                        try a range ending yesterday or earlier.
                    </span>
                </div>
            )}

            {/* ACCOUNT OVERVIEW Section */}
            {activeSection === "account" && (
                <SocialPageOverview
                    platform="instagram"
                    overview={overview}
                    growth={growth}
                    engagement={engagement}
                    contentTypes={contentTypeBreakdown}
                    from={activeDates.from}
                    to={activeDates.to}
                />
            )}

            {/* DEMOGRAPHICS Section */}
            {activeSection === "demographics" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Gender Distribution Card */}
                        <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-4">
                            <header>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Audience Gender</h3>
                                <p className="text-xs text-gray-500 font-medium">Share of followers by gender</p>
                            </header>
                            {genderData.length > 0 ? (
                                <div className="space-y-3 pt-2">
                                    {genderData
                                        .slice()
                                        .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
                                        .map((item, index) => (
                                            <div key={item?.key ?? index} className="space-y-1">
                                                <div className="flex justify-between items-center text-xs font-semibold">
                                                    <span className="text-gray-800">
                                                        {GENDER_LABELS[item?.key] ?? item?.key ?? "—"}
                                                    </span>
                                                    <span className="text-gray-900 font-bold">
                                                        {(item?.value ?? 0).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
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
                                <p className="text-xs text-gray-500 italic py-8 text-center">No gender data available.</p>
                            )}
                        </section>

                        {/* Content Types Breakdown Card */}
                        <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-4">
                            <header>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Content Types</h3>
                                <p className="text-xs text-gray-500 font-medium">Share of posts by media type</p>
                            </header>
                            {contentTypesData.length > 0 ? (
                                <div className="space-y-3 pt-2">
                                    {contentTypesData
                                        .slice()
                                        .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
                                        .map((item, index) => (
                                            <div key={item?.key ?? index} className="space-y-1">
                                                <div className="flex justify-between items-center text-xs font-semibold">
                                                    <span className="text-gray-800">
                                                        {CONTENT_TYPE_LABELS[item?.key] ?? item?.key ?? "—"}
                                                    </span>
                                                    <span className="text-gray-900 font-bold">
                                                        {(item?.value ?? 0).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
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
                                <p className="text-xs text-gray-500 italic py-8 text-center">No content type data available.</p>
                            )}
                        </section>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Age Bracket Card */}
                        <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-4">
                            <header>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Audience Age</h3>
                                <p className="text-xs text-gray-500 font-medium">Share of followers by age bracket</p>
                            </header>
                            <div className="h-72 pt-2">
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
                                            margin={{ top: 0, right: 20, left: 40, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={60} />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
                                                                <p className="font-bold text-gray-900">{payload[0].payload.name}</p>
                                                                <p className="text-pink-600 font-semibold">{payload[0].payload.value.toFixed(1)}% of followers</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                                                {ageData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-xs text-gray-500 italic py-8 text-center">No age data available.</p>
                                )}
                            </div>
                        </section>

                        {/* Top Countries Card */}
                        <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-4">
                            <header>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Followers by Country</h3>
                                <p className="text-xs text-gray-500 font-medium">Top 10 country distribution</p>
                            </header>
                            <div className="h-72 pt-2">
                                {demographicsCountries.length > 0 ? (
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
                                            margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={90} />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
                                                                <p className="font-bold text-gray-900">{payload[0].payload.name}</p>
                                                                <p className="text-pink-600 font-semibold">{payload[0].payload.value.toFixed(1)}% of followers</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                                                {demographicsCountries.slice(0, 10).map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-xs text-gray-500 italic py-8 text-center">No country data available.</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Top Cities Card */}
                    <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-4">
                        <header>
                            <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Top Cities</h3>
                            <p className="text-xs text-gray-500 font-medium">Cities with highest audience concentration</p>
                        </header>
                        {demographicsCities.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {demographicsCities
                                    .slice()
                                    .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
                                    .slice(0, 10)
                                    .map((item, index) => (
                                        <div key={item?.key ?? index} className="space-y-1">
                                            <div className="flex justify-between items-center text-xs font-semibold">
                                                <span className="text-gray-800 truncate">
                                                    {item?.key ?? "—"}
                                                </span>
                                                <span className="text-gray-900 font-bold">
                                                    {(item?.value ?? 0).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
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
                            <p className="text-xs text-gray-500 italic py-8 text-center">No city breakdown available.</p>
                        )}
                    </section>
                </div>
            )}

            {/* Timeline Chart - Only show for non-account sections */}
            {activeSection !== "account" && activeSection !== "demographics" && (
                <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-4">
                    <header>
                        <h3 className="text-base font-extrabold text-gray-900 capitalize tracking-tight">
                            {activeSection} - Impressions Over Time
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">
                            Daily trend performance for the selected period
                        </p>
                    </header>
                    <div className="h-64 pt-2">
                        {timelinePoints.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={timelinePoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis
                                        dataKey="date"
                                        type="category"
                                        allowDuplicatedCategory={false}
                                        tick={{ fontSize: 11, fill: "#94A3B8" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 16, border: "1px solid #E2E8F0", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", fontSize: 12 }}
                                        labelStyle={{ fontWeight: 700, color: "#0F172A", marginBottom: 4 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        name="Impressions"
                                        stroke="#E1306C"
                                        strokeWidth={3}
                                        dot={{ r: 3.5, fill: "#E1306C", strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-xs text-gray-500 italic py-8 text-center">
                                No timeline data available for this section.
                            </p>
                        )}
                    </div>
                </section>
            )}


            {/* Items List - Only show for non-account sections */}
            {activeSection !== "account" && activeSection !== "demographics" && (
                <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 sm:p-7 space-y-4">
                    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900 capitalize tracking-tight">
                                {activeSection} {activeSection === 'competitors' ? 'Analysis' : 'Items'}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">
                                {items.length} items found
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {activeSection === "posts" && postTypes.length > 1 && (
                                <select
                                    value={mediaTypeFilter}
                                    onChange={(e) => setMediaTypeFilter(e.target.value)}
                                    className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-pink-500 bg-white text-gray-700"
                                >
                                    <option value="all">All Types</option>
                                    {postTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                value={sortBy}
                                onChange={(e) => setSearchSortBy(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-pink-500 bg-white text-gray-700"
                            >
                                <option value="date_desc">Newest First</option>
                                <option value="date_asc">Oldest First</option>
                                {activeSection === "competitors" ? (
                                    <>
                                        <option value="followers_desc">Followers (High to Low)</option>
                                        <option value="posts_desc">Posts (High to Low)</option>
                                    </>
                                ) : activeSection === "stories" ? (
                                    /* Stories have no likes/comments/shares/engagement
                                       to sort by — only the story metric set. */
                                    <>
                                        <option value="impressions_desc">Impressions (High to Low)</option>
                                        <option value="reach_desc">Reach (High to Low)</option>
                                        <option value="taps_forward_desc">Taps forward (High to Low)</option>
                                        <option value="exits_desc">Exits (High to Low)</option>
                                        <option value="replies_desc">Replies (High to Low)</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="impressions_desc">Impressions (High to Low)</option>
                                        <option value="reach_desc">Reach (High to Low)</option>
                                        <option value="likes_desc">Likes (High to Low)</option>
                                        <option value="comments_desc">Comments (High to Low)</option>
                                        <option value="shares_desc">Shares (High to Low)</option>
                                        <option value="engagement_desc">Engagement Rate (High to Low)</option>
                                    </>
                                )}
                            </select>
                            <input
                                type="text"
                                placeholder={`Search ${activeSection}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-pink-500 w-48 bg-gray-50/50 text-gray-900"
                            />
                            <button
                                type="button"
                                onClick={() => exportToCSV(
                                    items,
                                    `instagram_${activeSection}.csv`,
                                    activeSection === "competitors"
                                        ? competitorExportColumns
                                        : activeSection === "stories"
                                            ? storyExportColumns
                                            : postExportColumns
                                )}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ CSV
                            </button>
                            <button
                                type="button"
                                onClick={() => exportToPDF(
                                    items,
                                    `Instagram ${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Analysis`,
                                    activeSection === "competitors"
                                        ? competitorExportColumns
                                        : activeSection === "stories"
                                            ? storyExportColumns
                                            : postExportColumns
                                )}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ PDF
                            </button>
                        </div>
                    </header>
                    <div className="overflow-x-auto">
                        {items.length > 0 ? (
                            activeSection === 'competitors' ? (
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-900 border-b border-gray-100">
                                            <th className="py-4 pr-3">Competitor</th>
                                            <th className="py-4 pr-3 text-right">Followers</th>
                                            <th className="py-4 pr-3 text-right">Posts</th>
                                            <th className="py-4 pr-3 text-right">Likes</th>
                                            <th className="py-4 pr-3 text-right">Comments</th>
                                            <th className="py-4 pr-3 text-right">Shares</th>
                                            <th className="py-4 pr-3 text-right">Engagement %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedItems.map((item: any, index: number) => (
                                            <tr key={item.id ?? index} className="border-b border-gray-100 hover:bg-gray-50/30">
                                                <td className="py-4 pr-3 text-gray-900">
                                                    <div className="flex items-center gap-3 font-semibold text-gray-800">
                                                        <ImageWithHover
                                                            src={item.picture}
                                                            alt={item.displayName || item.screenName || "Competitor"}
                                                            className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm"
                                                            showName={true}
                                                            name={item.displayName || item.screenName || "Unknown"}
                                                        />
                                                        <span className="font-semibold text-gray-800">
                                                            {item.displayName || item.screenName || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900 font-medium">
                                                    {formatNumber(item.followers)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900">
                                                    {formatNumber(item.posts)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900">
                                                    {formatNumber(item.likes || item.reactions)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900">
                                                    {formatNumber(item.comments)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900">
                                                    {formatNumber(item.shares || item.sharesCount)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900 font-semibold text-pink-600">
                                                    {item.engagement ? (item.engagement * 100).toFixed(2) + '%' : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : activeSection === "stories" ? (
                                // Stories report a completely different metric set:
                                // impressions, reach, taps forward/back, exits and
                                // replies. Engagement/likes/comments/shares do not
                                // exist for stories, so those columns could only
                                // ever render as dashes.
                                <>
                                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                                        {STORY_METRIC_COLUMNS.map(({ label, key }) => {
                                            const values = items
                                                .map((item: any) => item[key])
                                                .filter((value: any) => typeof value === "number");
                                            return (
                                                <div key={key} className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3.5 text-center">
                                                    <p className="text-lg font-extrabold text-slate-900 tracking-tight">
                                                        {values.length
                                                            ? formatNumber(values.reduce((a: number, b: number) => a + b, 0))
                                                            : "—"}
                                                    </p>
                                                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-900 border-b border-gray-100">
                                                <th className="py-4 pr-3">Media</th>
                                                <th className="py-4 pr-3">Published</th>
                                                <th className="py-4 pr-3">Type</th>
                                                {STORY_METRIC_COLUMNS.map(({ label, key }) => (
                                                    <th key={key} className="py-4 pr-3 text-right">{label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedItems.map((item: any, index: number) => (
                                                <tr key={item.postId ?? index} className="border-b border-gray-100 hover:bg-gray-50/30">
                                                    <td className="py-4 pr-3">
                                                        <ImageWithHover
                                                            src={item.thumbnailUrl || item.mediaUrl}
                                                            alt={item.type || "Story"}
                                                            className="w-14 h-14 rounded-xl object-cover border border-gray-200"
                                                            showName={true}
                                                            name={`Story${item.type ? ` · ${item.type}` : ""}`}
                                                        />
                                                    </td>
                                                    <td className="py-4 pr-3 text-xs font-medium text-gray-600 whitespace-nowrap">
                                                        {(item.publishedAt?.dateTime ?? item.publishedAt ?? "").slice(0, 10) || "—"}
                                                    </td>
                                                    <td className="py-4 pr-3 text-xs font-semibold text-gray-500 uppercase">
                                                        {item.type ?? "story"}
                                                    </td>
                                                    {STORY_METRIC_COLUMNS.map(({ key }) => (
                                                        <td key={key} className="py-4 pr-3 text-right text-gray-900">
                                                            {formatNumber(item[key])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            ) : (
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-900 border-b border-gray-100">
                                            <th className="py-4 pr-3">Media</th>
                                            <th className="py-4 pr-3">Message</th>
                                            <th className="py-4 pr-3">Type</th>
                                            <th className="py-4 pr-3 text-right">Impressions</th>
                                            <th className="py-4 pr-3 text-right">Reach</th>
                                            <th className="py-4 pr-3 text-right">Engagement</th>
                                            <th className="py-4 pr-3 text-right">Likes</th>
                                            <th className="py-4 pr-3 text-right">Comments</th>
                                            <th className="py-4 pr-3 text-right">Shares</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedItems.map((item: any, index: number) => (
                                            <tr key={item.id ?? index} className="border-b border-gray-100 hover:bg-gray-50/30">
                                                <td className="py-4 pr-3 text-gray-900">
                                                    <ImageWithHover
                                                        src={item.picture || item.thumbnailUrl || item.imageUrl}
                                                        alt={item.content || item.message || item.text || item.caption || item.description || item.title || "Media"}
                                                        className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                                                        showName={true}
                                                        name={(item.content || item.message || item.text || item.caption || item.description || item.title || item.name || item.mediaType || item.type || activeSection).substring(0, 50)}
                                                    />
                                                </td>
                                                <td className="py-4 pr-3 text-gray-900 max-w-xs truncate font-medium">
                                                    {item.content || item.message || item.text || item.caption || item.description || item.title || item.name || <span className="text-gray-400 italic text-xs">(No caption)</span>}
                                                </td>
                                                <td className="py-4 pr-3 text-gray-900 font-semibold text-xs text-gray-500 uppercase">
                                                    {item.mediaType || item.type || activeSection}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900">
                                                    {formatNumber(item.impressions || item.impressionsTotal || item.views)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900">
                                                    {formatNumber(item.reach || item.impressionsUnique || item.reachTotal)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900 font-semibold">
                                                    {formatNumber(item.engagement || item.engagementTotal)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900">
                                                    {formatNumber(item.likes || item.reactions || item.likesCount)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900">
                                                    {formatNumber(item.comments || item.commentsCount)}
                                                </td>
                                                <td className="py-4 pr-3 text-right text-gray-900">
                                                    {formatNumber(item.shares || item.sharesCount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        ) : (
                            <div className="text-center py-10 px-4 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 my-4">
                                <p className="text-sm font-extrabold text-slate-800">
                                    No {activeSection} items found for this period
                                </p>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    {activeSection === "competitors" ? (
                                        <>💡 <strong>Why is this empty?</strong> Competitor tracking requires adding competitor Instagram handles inside your Metricool account settings. Once added, their profile stats will appear here.</>
                                    ) : (
                                        <>💡 <strong>Tip:</strong> No {activeSection} were published between {activeDates.from} and {activeDates.to}. Try expanding your date range using the date picker above.</>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                    <TablePagination
                        currentPage={currentPage}
                        totalItems={items.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                </section>
            )}
        </div>
    );
}
