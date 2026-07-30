import { useEffect, useMemo, useState } from "react";
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
    fetchFacebookEngagement,
    fetchFacebookContentTypes,
    fetchContentTypeBreakdown,
    sortSeriesByDate,
    type FacebookEngagement,
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
import { getCountryName } from "../lib/countryNames";
import { LoadingSpinner, SampleDataBadge } from "./LoadingSkeletons";
import SocialCommonHeader from "./SocialCommonHeader";
import { formatDateISO } from "./SocialDatePicker";
import SocialPageOverview from "./SocialPageOverview";
import TablePagination from "./TablePagination";
import {
    facebookOverviewMock,
    facebookGrowthMock,
    facebookClicksMock,
    facebookDemographicsCountriesMock,
    facebookDemographicsCitiesMock,
    facebookPostsMock,
    facebookReelsMock,
    facebookStoriesMock,
    facebookCompetitorsMock,
} from "./socialMockData";

type TimeRangeKey = "7d" | "30d" | "90d" | "custom";
type FacebookSection = "page_overview" | "demographics" | "page_views" | "posts" | "reels" | "stories" | "competitors";

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

function normalizeSeries(seriesContainer: any, key: string): any[] {
    if (!seriesContainer) return [];

    // Try to find the data in various possible locations
    const candidate =
        seriesContainer?.series?.[key] ??
        seriesContainer?.data?.series?.[key] ??
        seriesContainer?.[key];

    if (!candidate) {
        // If no candidate found with the key, try direct access to values
        if (Array.isArray(seriesContainer?.values)) {
            return seriesContainer.values;
        }
        if (Array.isArray(seriesContainer?.data?.values)) {
            return seriesContainer.data.values;
        }
        // Check if data is an array with values inside
        if (Array.isArray(seriesContainer?.data) && seriesContainer.data[0]?.values) {
            return seriesContainer.data[0].values;
        }
        return [];
    }

    if (Array.isArray(candidate?.values)) {
        return candidate.values;
    }
    if (Array.isArray(candidate)) {
        return candidate;
    }
    return [];
}

// Sorted here because Metricool returns timeline points out of chronological
// order — an unsorted array plots a scrambled X axis.
function toChartPoints(points: any[]) {
    return sortSeriesByDate(points).map((point: any) => ({
        date: point.dateTime?.slice(0, 10) ?? "",
        value: typeof point.value === "number" ? point.value : 0,
    }));
}

const chartColors = ["#2563eb", "#16a34a", "#f97316", "#e11d48", "#9333ea"];

// Metricool's reels and stories collections carry their own field names — FB
// reels report blueReelsPlayCount / postImpressionsUnique / postVideoReactions,
// FB stories carry a thumbnail and no metrics at all — so media rows read
// through one accessor set instead of post-only keys. `??` (not `||`) so a real
// zero stays a zero rather than falling through to another field.
// Facebook's `engagement` on posts is a RATE, not a count: a post with 19
// reactions+comments+shares plus 64 clicks over 1,164 unique impressions reports
// engagement = 7.13 (= 7.13%). Rendered bare it read as "7.13 engagements".
const formatPercent = (value?: number | null, fallback = "—") =>
    value === undefined || value === null || Number.isNaN(value) ? fallback : `${value.toFixed(2)}%`;

// Facebook items date themselves via created.dateTime (Instagram uses
// publishedAt.dateTime); neither carries a flat `date`, which left every
// exported Date cell blank.
const itemPublishedAt = (item: any): string =>
    String(item?.created?.dateTime ?? item?.created ?? item?.publishedAt?.dateTime ?? item?.date ?? item?.dateTime ?? "").slice(0, 10);

const mediaThumb = (item: any) => item.picture ?? item.thumbnailUrl ?? item.imageUrl;
const mediaCaption = (item: any) =>
    item.message ?? item.text ?? item.description ?? item.caption ?? item.content;
const mediaImpressions = (item: any) =>
    item.impressions ?? item.impressionsTotal ?? item.views ?? item.blueReelsPlayCount;
const mediaReach = (item: any) =>
    item.reach ?? item.impressionsUnique ?? item.reachTotal ?? item.postImpressionsUnique;
const mediaLikes = (item: any) =>
    item.likes ?? item.reactions ?? item.likesCount ?? item.postVideoReactions;
const mediaEngagement = (item: any) =>
    item.engagement ?? item.engagementTotal ?? item.postVideoSocialActions;

// Emptiness checks used to decide when to fall back to sample data. Facebook
// pages commonly report followers/visits/content but no impressions or reach at
// all, so a single missing metric must not flip the panel to sample numbers.
function overviewIsEmpty(data: any) {
    if (!data) return true;
    const signals = [
        data.followers,
        data.views,
        data.impressions,
        data.pageVisits,
        data.interactions,
        data.totalContent,
        data.followersChange,
    ];
    return !signals.some((value) => typeof value === "number");
}

function growthIsEmpty(data: any) {
    const container = data?.series ?? data?.data?.series ?? data;
    return (
        normalizeSeries(container, "impressions").length === 0 &&
        normalizeSeries(container, "followers").length === 0 &&
        normalizeSeries(container, "reach").length === 0 &&
        normalizeSeries(container, "newFollowers").length === 0
    );
}

function listIsEmpty(list: any[]) {
    return !Array.isArray(list) || list.length === 0;
}

interface FacebookViewProps {
    range: TimeRangeKey;
    onRangeChange: (range: TimeRangeKey) => void;
    customFrom?: string;
    customTo?: string;
    blogId?: string;
    onDateRangeChange?: (from: string, to: string, presetKey?: string) => void;
}

export default function FacebookView({ range, onRangeChange, customFrom, customTo, blogId, onDateRangeChange }: FacebookViewProps) {
    const [activeSection, setActiveSection] = useState<FacebookSection>("page_overview");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [usingMock, setUsingMock] = useState(false);
    // Request succeeded, but Metricool reported nothing for this date range.
    const [noDataForRange, setNoDataForRange] = useState(false);

    const [overview, setOverview] = useState<any>(null);
    const [growth, setGrowth] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [demographicsCountries, setDemographicsCountries] = useState<any[]>([]);
    const [demographicsCities, setDemographicsCities] = useState<any[]>([]);
    const [contentTypesData, setContentTypesData] = useState<any[]>([]);
    const [clicksData, setClicksData] = useState<any>(null);
    const [reelsData, setReelsData] = useState<any>(null);
    const [storiesData, setStoriesData] = useState<any>(null);
    const [competitorsData, setCompetitorsData] = useState<any>(null);
    const [engagement, setEngagement] = useState<FacebookEngagement | null>(null);
    const [contentTypeBreakdown, setContentTypeBreakdown] = useState<any>(null);
    const [hasReels, setHasReels] = useState(false);
    const [hasStories, setHasStories] = useState(false);
    const [hasCompetitors, setHasCompetitors] = useState(false);

    const sections: { key: FacebookSection; label: string }[] = [
        { key: "page_overview", label: "PAGE OVERVIEW" },
        { key: "demographics", label: "DEMOGRAPHICS" },
        { key: "page_views", label: "PAGE VIEWS" },
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
                    fetchFacebookReels({ from, to, pageSize: 5, blogId }).catch(() => null),
                    fetchFacebookStories({ from, to, pageSize: 5, blogId }).catch(() => null),
                    fetchFacebookCompetitors({ from, to, blogId }).catch(() => null),
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
            setActiveSection("page_overview");
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

                // Load data based on active section to reduce parallel API calls
                if (activeSection === "page_overview") {
                    const [overviewRes, growthRes, engagementRes, contentTypesRes] = await Promise.all([
                        fetchOverview("facebook", { from, to, blogId }),
                        fetchGrowth("facebook", { from, to, blogId }),
                        fetchFacebookEngagement({ from, to, blogId }),
                        fetchContentTypeBreakdown("facebook", { from, to, blogId }),
                    ]);

                    if (!cancelled) {
                        const emptyOverview = overviewIsEmpty(overviewRes.data);
                        const emptyGrowth = growthIsEmpty(growthRes.data);
                        setEngagement(engagementRes.data);
                        setContentTypeBreakdown(contentTypesRes.data);
                        // Empty-but-successful means no data for the range, not a
                        // broken integration — see the notice, not sample numbers.
                        setOverview(overviewRes.data);
                        setGrowth(growthRes.data ?? null);
                        setNoDataForRange(emptyOverview && emptyGrowth);
                    }
                } else if (activeSection === "demographics") {
                    const [countriesRes, citiesRes, contentTypesRes] = await Promise.all([
                        fetchDemographicsCountries("facebook", { from, to, blogId }),
                        fetchDemographicsCities("facebook", { from, to, blogId }),
                        fetchFacebookContentTypes({ from, to, blogId }),
                    ]);

                    if (!cancelled) {
                        const countries = countriesRes.data?.data ?? countriesRes.data ?? [];
                        const cities = citiesRes.data?.data ?? citiesRes.data ?? [];
                        const contentTypes = contentTypesRes.data?.data ?? contentTypesRes.data ?? [];
                        const emptyCountries = listIsEmpty(countries);
                        const emptyCities = listIsEmpty(cities);
                        setDemographicsCountries(
                            emptyCountries ? facebookDemographicsCountriesMock : countries
                        );
                        setDemographicsCities(
                            emptyCities ? facebookDemographicsCitiesMock : cities
                        );
                        setContentTypesData(contentTypes);
                        if (emptyCountries || emptyCities) setUsingMock(true);
                    }
                } else if (activeSection === "page_views") {
                    const [clicksRes, overviewRes, growthRes] = await Promise.all([
                        fetchClicks("facebook", { from, to, blogId }),
                        fetchOverview("facebook", { from, to, blogId }),
                        fetchGrowth("facebook", { from, to, blogId }),
                    ]);

                    if (!cancelled) {
                        // Meta reports no click metrics for this Page, but pageViews
                        // (rendered from the growth series) is populated — so an
                        // empty clicks response is expected and must not swap this
                        // section over to sample data.
                        const emptyOverview = overviewIsEmpty(overviewRes.data);
                        setClicksData(clicksRes.data);
                        setOverview(overviewRes.data);
                        setGrowth(growthRes.data ?? null);
                        setNoDataForRange(emptyOverview);
                    }
                } else if (activeSection === "posts") {
                    const postsResRaw = await fetchPosts("facebook", { from, to, pageSize: 10, blogId });

                    if (!cancelled) {
                        const postsRes: any = postsResRaw;
                        const postItems =
                            postsRes?.data?.items ??
                            postsRes?.data?.data ??
                            postsRes?.data ??
                            postsRes ??
                            [];
                        if (listIsEmpty(postItems)) {
                            setPosts(facebookPostsMock);
                            setUsingMock(true);
                        } else {
                            setPosts(postItems);
                        }
                    }
                } else if (activeSection === "reels") {
                    const reelsRes = await fetchFacebookReels({ from, to, pageSize: 10, blogId });

                    if (!cancelled) {
                        if (listIsEmpty(reelsRes.data?.items)) {
                            setReelsData(facebookReelsMock);
                            setUsingMock(true);
                        } else {
                            setReelsData(reelsRes.data ?? null);
                        }
                    }
                } else if (activeSection === "stories") {
                    const storiesRes = await fetchFacebookStories({ from, to, pageSize: 10, blogId });

                    if (!cancelled) {
                        if (listIsEmpty(storiesRes.data?.items)) {
                            setStoriesData(facebookStoriesMock);
                            setUsingMock(true);
                        } else {
                            setStoriesData(storiesRes.data ?? null);
                        }
                    }
                } else if (activeSection === "competitors") {
                    const competitorsRes = await fetchFacebookCompetitors({ from, to, blogId });

                    if (!cancelled) {
                        if (listIsEmpty(competitorsRes.data?.items)) {
                            setCompetitorsData(facebookCompetitorsMock);
                            setUsingMock(true);
                        } else {
                            setCompetitorsData(competitorsRes.data ?? null);
                        }
                    }
                }
            } catch (err: any) {
                // Live data failed (offline backend, rate limit, not connected):
                // fall back to sample data so the layout still previews correctly.
                if (!cancelled) {
                    setUsingMock(true);
                    if (activeSection === "page_overview" || activeSection === "page_views") {
                        setOverview(facebookOverviewMock(range));
                        setGrowth(facebookGrowthMock(range));
                        setClicksData(facebookClicksMock(range));
                    } else if (activeSection === "demographics") {
                        setDemographicsCountries(facebookDemographicsCountriesMock);
                        setDemographicsCities(facebookDemographicsCitiesMock);
                    } else if (activeSection === "posts") {
                        setPosts(facebookPostsMock);
                    } else if (activeSection === "reels") {
                        setReelsData(facebookReelsMock);
                    } else if (activeSection === "stories") {
                        setStoriesData(facebookStoriesMock);
                    } else if (activeSection === "competitors") {
                        setCompetitorsData(facebookCompetitorsMock);
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
    }, [range, customFrom, customTo, activeSection, blogId]);

    const networkFrom = overview?.from ?? growth?.from ?? clicksData?.from ?? "unknown";
    const networkTo = overview?.to ?? growth?.to ?? clicksData?.to ?? "unknown";

    const growthSeriesContainer = growth?.series ?? growth?.data?.series ?? growth;

    const impressionsPoints = toChartPoints(
        normalizeSeries(growthSeriesContainer, "impressions")
    );
    // `views` falls back to page_media_view in fetchGrowth, which is the only
    // populated view metric for Facebook Pages.
    const viewsPoints = toChartPoints(
        normalizeSeries(growthSeriesContainer, "views")
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
    // Facebook page visits. The `pageViews` metric is the real, populated one;
    // Meta returns nothing for the click metrics (page_website_clicks_*,
    // ctaClicks, page_total_actions) on this Page, so the clicks response is
    // only used if it actually carried points.
    const pageViewsPoints = toChartPoints(
        normalizeSeries(growthSeriesContainer, "pageViews")
    );
    const clicksSeriesPoints = toChartPoints(
        normalizeSeries(clicksData, "clicks") ??
        (Array.isArray(clicksData?.values) ? clicksData.values : []) ??
        []
    );
    const clicksPoints = pageViewsPoints.length ? pageViewsPoints : clicksSeriesPoints;

    const demographicsPie = demographicsCountries.map((item, index) => ({
        name: item?.key ?? `Group ${index + 1}`,
        value: typeof item?.value === "number" ? item.value : 0,
    }));

    const demographicsCityTable = demographicsCities
        .slice()
        .sort((a, b) => (b?.value ?? 0) - (a?.value ?? 0))
        .slice(0, 10);

    const [searchQuery, setSearchQuery] = useState("");
    const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
    const [sortBy, setSortBy] = useState("date_desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        setSearchQuery("");
        setMediaTypeFilter("all");
        setSortBy("date_desc");
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

    // Columns configuration for CSV and PDF exports
    // Facebook stories carry no metrics, so exporting the post columns would
    // emit six empty fields per row.
    const fbStoryExportColumns = [
        { header: "Published", getValue: (item: any) => (item.created?.dateTime ?? item.created ?? "").slice(0, 10) },
        { header: "Type", getValue: (item: any) => item.mediaType ?? "" },
        { header: "Story URL", getValue: (item: any) => item.storyUrl ?? "" },
        { header: "Story ID", getValue: (item: any) => item.storyId ?? "" },
    ];

    const fbReelExportColumns = [
        { header: "Published", getValue: (item: any) => itemPublishedAt(item) },
        { header: "Description", getValue: (item: any) => item.description ?? "" },
        { header: "Plays", getValue: (item: any) => (typeof item.blueReelsPlayCount === "number" ? item.blueReelsPlayCount : ""), align: "right" as const },
        { header: "Reach", getValue: (item: any) => (typeof item.postImpressionsUnique === "number" ? item.postImpressionsUnique : ""), align: "right" as const },
        { header: "Social actions", getValue: (item: any) => (typeof item.postVideoSocialActions === "number" ? item.postVideoSocialActions : ""), align: "right" as const },
        { header: "Reactions", getValue: (item: any) => (typeof item.postVideoReactions === "number" ? item.postVideoReactions : ""), align: "right" as const },
        { header: "Avg. watch (s)", getValue: (item: any) => (typeof item.postVideoAvgTimeWatchedSeconds === "number" ? item.postVideoAvgTimeWatchedSeconds.toFixed(1) : ""), align: "right" as const },
        { header: "Length (s)", getValue: (item: any) => (typeof item.length === "number" ? item.length.toFixed(0) : ""), align: "right" as const },
        { header: "Reel URL", getValue: (item: any) => item.reelUrl ?? "" },
    ];

    const postExportColumns = [
        { header: "Date", getValue: (item: any) => itemPublishedAt(item) },
        { header: "Message", getValue: (item: any) => item.message || item.text || item.description || item.caption || "" },
        { header: "Type", getValue: (item: any) => item.mediaType || item.type || "" },
        { header: "Impressions", getValue: (item: any) => item.impressions || item.impressionsTotal || item.views || 0, align: "right" as const },
        { header: "Reach", getValue: (item: any) => item.reach || item.impressionsUnique || item.reachTotal || 0, align: "right" as const },
        { header: "Engagement %", getValue: (item: any) => (typeof item.engagement === "number" ? item.engagement.toFixed(2) : ""), align: "right" as const },
        { header: "Clicks", getValue: (item: any) => (typeof item.clicks === "number" ? item.clicks : ""), align: "right" as const },
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

    const postTypes = useMemo(() => {
        const types = new Set<string>();
        posts.forEach((item: any) => {
            const t = item.mediaType || item.type;
            if (t) types.add(t);
        });
        return Array.from(types);
    }, [posts]);

    const sortItems = (items: any[], type: string) => {
        return [...items].sort((a, b) => {
            switch (type) {
                // Facebook items carry created.dateTime, not a flat `date`, so the
                // old accessors resolved to 0 for every row and date sorting was a
                // no-op.
                case "date_desc":
                    return new Date(itemPublishedAt(b)).getTime() - new Date(itemPublishedAt(a)).getTime();
                case "date_asc":
                    return new Date(itemPublishedAt(a)).getTime() - new Date(itemPublishedAt(b)).getTime();
                case "impressions_desc":
                    return (b.impressions || b.impressionsTotal || b.views || 0) - (a.impressions || a.impressionsTotal || a.views || 0);
                case "plays_desc":
                    return (b.blueReelsPlayCount ?? 0) - (a.blueReelsPlayCount ?? 0);
                case "reactions_desc":
                    return (b.postVideoReactions ?? b.reactions ?? 0) - (a.postVideoReactions ?? a.reactions ?? 0);
                case "reach_desc":
                    return (b.reach || b.impressionsUnique || b.postImpressionsUnique || 0) - (a.reach || a.impressionsUnique || a.postImpressionsUnique || 0);
                case "likes_desc":
                    return (b.likes || b.reactions || b.likesCount || 0) - (a.likes || a.reactions || a.likesCount || 0);
                case "comments_desc":
                    return (b.comments || b.commentsCount || 0) - (a.comments || a.commentsCount || 0);
                case "shares_desc":
                    return (b.shares || b.sharesCount || 0) - (a.shares || a.sharesCount || 0);
                case "engagement_desc":
                    return (b.engagement || b.engagementTotal || 0) - (a.engagement || a.engagementTotal || 0);
                case "followers_desc":
                    return (b.followers || 0) - (a.followers || 0);
                case "posts_desc":
                    return (b.posts || 0) - (a.posts || 0);
                default:
                    return 0;
            }
        });
    };

    const filteredPosts = useMemo(() => {
        if (!posts) return [];
        const result = posts.filter((item: any) => {
            const content = item.message || item.text || item.description || item.caption || "";
            const matchesSearch = content.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (mediaTypeFilter === "all") return matchesSearch;
            const type = (item.mediaType || item.type || "").toLowerCase();
            return matchesSearch && type === mediaTypeFilter.toLowerCase();
        });
        return sortItems(result, sortBy);
    }, [posts, searchQuery, mediaTypeFilter, sortBy]);

    const filteredReels = useMemo(() => {
        const items = reelsData?.items || [];
        const result = items.filter((item: any) => {
            const content = item.message || item.text || item.description || item.caption || "";
            return content.toLowerCase().includes(searchQuery.toLowerCase());
        });
        return sortItems(result, sortBy);
    }, [reelsData, searchQuery, sortBy]);

    const filteredStories = useMemo(() => {
        const items = storiesData?.items || [];
        const result = items.filter((item: any) => {
            const content = item.text || item.message || item.description || item.caption || "";
            return content.toLowerCase().includes(searchQuery.toLowerCase());
        });
        return sortItems(result, sortBy);
    }, [storiesData, searchQuery, sortBy]);

    const filteredCompetitors = useMemo(() => {
        const items = competitorsData?.items || [];
        const result = items.filter((item: any) => {
            const content = item.displayName || item.screenName || "";
            return content.toLowerCase().includes(searchQuery.toLowerCase());
        });
        return sortItems(result, sortBy);
    }, [competitorsData, searchQuery, sortBy]);

    const paginatedPosts = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredPosts.slice(start, start + pageSize);
    }, [filteredPosts, currentPage, pageSize]);

    const paginatedReels = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredReels.slice(start, start + pageSize);
    }, [filteredReels, currentPage, pageSize]);

    const paginatedStories = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredStories.slice(start, start + pageSize);
    }, [filteredStories, currentPage, pageSize]);

    const paginatedCompetitors = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredCompetitors.slice(start, start + pageSize);
    }, [filteredCompetitors, currentPage, pageSize]);

    const activeDates = computeRangeDates(range, customFrom, customTo);

    return (
        <div className="space-y-6">
            {/* Common Social Section Header & Calendar Date Picker */}
            <SocialCommonHeader
                sections={sections}
                activeSection={activeSection}
                onSelectSection={(key) => setActiveSection(key as FacebookSection)}
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
                brandColor="#1877F2"
            />

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
                            <p className="font-normal mb-1">
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

            {!loading && usingMock && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-xs text-amber-800">
                    <SampleDataBadge />
                    <span>
                        Live Facebook metrics aren't available right now — showing sample data so you
                        can preview how this section looks.
                    </span>
                </div>
            )}

            {!loading && !usingMock && noDataForRange && (
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-700">
                    <span className="text-sm leading-none shrink-0 mt-0.5">📅</span>
                    <span>
                        Metricool reported no Facebook data for{" "}
                        <strong className="font-semibold">{activeDates.from} → {activeDates.to}</strong>.
                        Its analytics lag by about a day, so a range ending today is usually still empty —
                        try a range ending yesterday or earlier.
                    </span>
                </div>
            )}

            {/* PAGE OVERVIEW Section */}
            {activeSection === "page_overview" && (
                <SocialPageOverview
                    platform="facebook"
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
                        {/* Top Countries Card */}
                        <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 space-y-4">
                            <header>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Followers by Country</h3>
                                <p className="text-xs text-gray-500 font-medium">Geographic origin of your Facebook audience</p>
                            </header>
                            <div className="h-64 pt-2">
                                {demographicsCountries.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={demographicsCountries
                                                .slice()
                                                .sort((a: any, b: any) => (b?.value ?? 0) - (a?.value ?? 0))
                                                .slice(0, 7)
                                                .map((item: any) => ({
                                                    name: getCountryName(item?.key ?? "Unknown"),
                                                    value: item?.value ?? 0,
                                                }))}
                                            layout="vertical"
                                            margin={{ top: 0, right: 20, left: 40, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
                                                                <p className="font-bold text-gray-900">{payload[0].payload.name}</p>
                                                                <p className="text-blue-600 font-semibold">{formatNumber(payload[0].payload.value)} followers</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                                                {demographicsCountries.slice(0, 7).map((_: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-xs text-gray-500 italic py-8 text-center">No country breakdown available.</p>
                                )}
                            </div>
                        </section>

                        {/* Top Cities Card */}
                        <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 space-y-4">
                            <header>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Top Cities</h3>
                                <p className="text-xs text-gray-500 font-medium">Cities with highest follower concentration</p>
                            </header>
                            <div className="space-y-3 pt-2">
                                {demographicsCityTable.length > 0 ? (
                                    demographicsCityTable.slice(0, 5).map((item, index) => {
                                        const maxValue = Math.max(...demographicsCityTable.map(i => i?.value ?? 0));
                                        const percentage = Math.min(100, ((item?.value ?? 0) / (maxValue || 1)) * 100);
                                        return (
                                            <div key={index} className="space-y-1">
                                                <div className="flex justify-between items-center text-xs font-semibold">
                                                    <span className="text-gray-800 truncate max-w-[140px]">
                                                        {item?.key ?? "—"}
                                                    </span>
                                                    <span className="text-gray-900 font-bold">
                                                        {formatNumber(item?.value)}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${percentage}%`,
                                                            backgroundColor: chartColors[index % chartColors.length]
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs text-gray-500 italic py-8 text-center">No city breakdown available.</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Content Types Card */}
                    {contentTypesData.length > 0 && (
                        <section className="rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm hover:shadow-md transition-shadow p-6 space-y-4">
                            <header>
                                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Content Types Breakdown</h3>
                                <p className="text-xs text-gray-500 font-medium">Distribution of published posts by type</p>
                            </header>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {contentTypesData.map((item, index) => (
                                    <div key={item?.key ?? index} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs font-semibold">
                                            <span className="text-gray-800 truncate uppercase">
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
                                                    backgroundColor: chartColors[index % chartColors.length]
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {/* PAGE VIEWS Section */}
            {activeSection === "page_views" && (
                <section className="rounded-3xl border border-gray-200/80 bg-white shadow-sm p-6 sm:p-7 space-y-6">
                    <header className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Page Views & Clicks</h2>
                            <p className="text-xs text-gray-500 font-medium">{networkFrom} → {networkTo}</p>
                        </div>
                    </header>

                    {/* Summary Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/60 rounded-2xl p-5 text-center transition-all duration-200 shadow-sm">
                            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                {formatNumber(overview?.pageVisits)}
                            </p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">Page Visits</p>
                        </div>
                        <div className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/60 rounded-2xl p-5 text-center transition-all duration-200 shadow-sm">
                            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                {formatNumber(overview?.views)}
                            </p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">Content Views</p>
                        </div>
                        <div className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/60 rounded-2xl p-5 text-center transition-all duration-200 shadow-sm">
                            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                {formatNumber(overview?.totalContent)}
                            </p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">Total Content</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-72 w-full pt-2">
                        {clicksPoints.length > 0 || impressionsPoints.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                    {clicksPoints.length > 0 && (
                                        <Line
                                            dataKey="value"
                                            data={clicksPoints}
                                            name="Page visits"
                                            stroke="#8B5CF6"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: "#8B5CF6", strokeWidth: 0 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    )}
                                    {viewsPoints.length > 0 && (
                                        <Line
                                            dataKey="value"
                                            data={viewsPoints}
                                            name="Content views"
                                            stroke="#F59E0B"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: "#F59E0B", strokeWidth: 0 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-xs text-gray-500 italic py-8 text-center">
                                No page view data for this period.
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* POSTS Section */}
            {activeSection === "posts" && (
                <section className="rounded-3xl border border-gray-200/80 bg-white shadow-sm p-6 space-y-5">
                    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-100">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Recent Posts</h3>
                            <p className="text-xs text-gray-500 font-medium">
                                Showing {filteredPosts.length} posts in this period
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {postTypes.length > 1 && (
                                <select
                                    value={mediaTypeFilter}
                                    onChange={(e) => setMediaTypeFilter(e.target.value)}
                                    className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 font-medium"
                                >
                                    <option value="all">All Types</option>
                                    {postTypes.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 font-medium"
                            >
                                <option value="date_desc">Newest First</option>
                                <option value="date_asc">Oldest First</option>
                                <option value="impressions_desc">Impressions (High to Low)</option>
                                <option value="reach_desc">Reach (High to Low)</option>
                                <option value="likes_desc">Likes/Reactions (High to Low)</option>
                                <option value="comments_desc">Comments (High to Low)</option>
                                <option value="shares_desc">Shares (High to Low)</option>
                                <option value="engagement_desc">Engagement Rate (High to Low)</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-44 bg-gray-50 text-gray-900 placeholder-gray-400 font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => exportToCSV(filteredPosts, "facebook_posts.csv", postExportColumns)}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ CSV
                            </button>
                            <button
                                type="button"
                                onClick={() => exportToPDF(filteredPosts, "Facebook Posts Analysis", postExportColumns)}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ PDF
                            </button>
                        </div>
                    </header>
                    <div className="overflow-x-auto">
                        {filteredPosts.length > 0 ? (
                            <table className="min-w-full text-xs text-left">
                                <thead>
                                    <tr className="text-gray-500 font-semibold border-b border-gray-200/80 bg-slate-50/50">
                                        <th className="py-3 px-3 rounded-l-xl">Media</th>
                                        <th className="py-3 px-3">Message</th>
                                        <th className="py-3 px-3">Published</th>
                                        <th className="py-3 px-3">Type</th>
                                        <th className="py-3 px-3 text-right">Impressions</th>
                                        <th className="py-3 px-3 text-right">Reach</th>
                                        <th className="py-3 px-3 text-right">Eng. %</th>
                                        <th className="py-3 px-3 text-right">Clicks</th>
                                        <th className="py-3 px-3 text-right">Reactions</th>
                                        <th className="py-3 px-3 text-right">Comments</th>
                                        <th className="py-3 px-3 text-right rounded-r-xl">Shares</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedPosts.map((item: any, index: number) => (
                                        <tr key={item.id ?? index} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-3">
                                                <ImageWithHover
                                                    src={item.picture}
                                                    alt={item.message || item.text || item.description || "Post media"}
                                                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-sm"
                                                    showName={true}
                                                    name={(item.message || item.text || item.description || item.caption)?.substring(0, 50) || "Post"}
                                                />
                                            </td>
                                            <td className="py-3.5 px-3 max-w-xs truncate text-gray-800 font-medium">
                                                {item.message || item.text || item.description || item.caption || "—"}
                                            </td>
                                            <td className="py-3.5 px-3 text-gray-600 font-medium whitespace-nowrap">
                                                {itemPublishedAt(item) || "—"}
                                            </td>
                                            <td className="py-3.5 px-3">
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                                    {item.mediaType || item.type || "—"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-medium text-gray-900">
                                                {formatNumber(item.impressions ?? item.impressionsTotal ?? item.views)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-medium text-gray-900">
                                                {formatNumber(item.impressionsUnique ?? item.reach)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-bold text-gray-900">
                                                {formatPercent(item.engagement)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {formatNumber(item.clicks)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {formatNumber(item.reactions ?? item.likes)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {formatNumber(item.comments)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {formatNumber(item.shares)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-10 px-4 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 my-4">
                                <p className="text-sm font-extrabold text-slate-800">No posts found in selected period</p>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    💡 <strong>Tip:</strong> No Facebook posts were published between {activeDates.from} and {activeDates.to}. Try expanding your date range filter using the date picker above.
                                </p>
                            </div>
                        )}
                    </div>
                    <TablePagination
                        currentPage={currentPage}
                        totalItems={filteredPosts.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                </section>
            )}

            {/* REELS Section */}
            {activeSection === "reels" && (
                <section className="rounded-3xl border border-gray-200/80 bg-white shadow-sm p-6 space-y-5">
                    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-100">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Facebook Reels</h3>
                            <p className="text-xs text-gray-500 font-medium">
                                Showing {filteredReels.length} reels in this period
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 font-medium"
                            >
                                <option value="date_desc">Newest First</option>
                                <option value="date_asc">Oldest First</option>
                                <option value="plays_desc">Plays (High to Low)</option>
                                <option value="reach_desc">Reach (High to Low)</option>
                                <option value="reactions_desc">Reactions (High to Low)</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Search reels..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-44 bg-gray-50 text-gray-900 placeholder-gray-400 font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => exportToCSV(filteredReels, "facebook_reels.csv", fbReelExportColumns)}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ CSV
                            </button>
                            <button
                                type="button"
                                onClick={() => exportToPDF(filteredReels, "Facebook Reels Analysis", fbReelExportColumns)}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ PDF
                            </button>
                        </div>
                    </header>
                    <div className="overflow-x-auto">
                        {paginatedReels.length > 0 ? (
                            <table className="min-w-full text-xs text-left">
                                <thead>
                                    <tr className="text-gray-500 font-semibold border-b border-gray-200/80 bg-slate-50/50">
                                        <th className="py-3 px-3 rounded-l-xl">Media</th>
                                        <th className="py-3 px-3">Message</th>
                                        <th className="py-3 px-3">Type</th>
                                        <th className="py-3 px-3">Published</th>
                                        <th className="py-3 px-3 text-right">Plays</th>
                                        <th className="py-3 px-3 text-right">Reach</th>
                                        <th className="py-3 px-3 text-right">Social actions</th>
                                        <th className="py-3 px-3 text-right">Reactions</th>
                                        <th className="py-3 px-3 text-right">Avg. watch</th>
                                        <th className="py-3 px-3 text-right rounded-r-xl">Length</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedReels.map((item: any, index: number) => (
                                        <tr key={item.id ?? index} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-3">
                                                <ImageWithHover
                                                    src={mediaThumb(item)}
                                                    alt={mediaCaption(item) || "Reel media"}
                                                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-sm"
                                                    showName={true}
                                                    name={mediaCaption(item)?.substring(0, 50) || "Reel"}
                                                />
                                            </td>
                                            <td className="py-3.5 px-3 max-w-xs truncate text-gray-800 font-medium">
                                                {mediaCaption(item) || "—"}
                                            </td>
                                            <td className="py-3.5 px-3">
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                                    {item.mediaType || "Reel"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-3 text-gray-600 font-medium whitespace-nowrap">
                                                {itemPublishedAt(item) || "—"}
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-medium text-gray-900">
                                                {formatNumber(mediaImpressions(item))}
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-medium text-gray-900">
                                                {formatNumber(mediaReach(item))}
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-bold text-gray-900">
                                                {formatNumber(item.postVideoSocialActions)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {formatNumber(mediaLikes(item))}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {typeof item.postVideoAvgTimeWatchedSeconds === "number"
                                                    ? `${item.postVideoAvgTimeWatchedSeconds.toFixed(1)}s`
                                                    : "—"}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {typeof item.length === "number" ? `${item.length.toFixed(0)}s` : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-10 px-4 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 my-4">
                                <p className="text-sm font-extrabold text-slate-800">No Reels found in selected period</p>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    💡 <strong>Tip:</strong> Facebook Reels metrics are collected for short video formats published to your page.
                                </p>
                            </div>
                        )}
                    </div>
                    <TablePagination
                        currentPage={currentPage}
                        totalItems={filteredReels.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                </section>
            )}

            {/* STORIES Section */}
            {activeSection === "stories" && (
                <section className="rounded-3xl border border-gray-200/80 bg-white shadow-sm p-6 space-y-5">
                    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-100">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Facebook Stories</h3>
                            <p className="text-xs text-gray-500 font-medium">
                                Showing {filteredStories.length} stories in this period
                            </p>
                            {/* Verified against the live API: Facebook's stories
                                endpoint returns only pageId, storyId, created,
                                mediaType, mediaId, storyUrl and thumbnailUrl — no
                                impressions, reach or engagement at all. The metric
                                columns this table used to show could never fill. */}
                            <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1.5">
                                <span className="shrink-0">ℹ️</span>
                                <span>
                                    Meta doesn't report per-story insights for Facebook Pages through Metricool,
                                    so only the story itself is listed. Instagram stories do include
                                    impressions, reach, taps and replies.
                                </span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 font-medium"
                            >
                                <option value="date_desc">Newest First</option>
                                <option value="date_asc">Oldest First</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Search stories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-44 bg-gray-50 text-gray-900 placeholder-gray-400 font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => exportToCSV(filteredStories, "facebook_stories.csv", fbStoryExportColumns)}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ CSV
                            </button>
                            <button
                                type="button"
                                onClick={() => exportToPDF(filteredStories, "Facebook Stories Analysis", fbStoryExportColumns)}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ PDF
                            </button>
                        </div>
                    </header>
                    <div className="overflow-x-auto">
                        {paginatedStories.length > 0 ? (
                            <table className="min-w-full text-xs text-left">
                                <thead>
                                    <tr className="text-gray-500 font-semibold border-b border-gray-200/80 bg-slate-50/50">
                                        <th className="py-3 px-3 rounded-l-xl">Media</th>
                                        <th className="py-3 px-3">Type</th>
                                        <th className="py-3 px-3">Published</th>
                                        <th className="py-3 px-3 rounded-r-xl">Story</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedStories.map((item: any, index: number) => (
                                        <tr key={item.storyId ?? item.id ?? index} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-3">
                                                <ImageWithHover
                                                    src={mediaThumb(item)}
                                                    alt={item.mediaType || "Story media"}
                                                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-sm"
                                                    showName={true}
                                                    name={`Story${item.mediaType ? ` · ${item.mediaType}` : ""}`}
                                                />
                                            </td>
                                            <td className="py-3.5 px-3">
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                                    {item.mediaType || "Story"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-3 text-gray-600 font-medium whitespace-nowrap">
                                                {(item.created?.dateTime ?? item.created ?? "").slice(0, 10) || "—"}
                                            </td>
                                            <td className="py-3.5 px-3">
                                                {item.storyUrl ? (
                                                    <a
                                                        href={item.storyUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline font-bold text-[11px]"
                                                    >
                                                        Open on Facebook ↗
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-10 px-4 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 my-4">
                                <p className="text-sm font-extrabold text-slate-800">No Stories found in selected period</p>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    💡 <strong>Tip:</strong> Facebook Stories expire after 24 hours and story metrics are logged during active publication windows.
                                </p>
                            </div>
                        )}
                    </div>
                    <TablePagination
                        currentPage={currentPage}
                        totalItems={filteredStories.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                </section>
            )}

            {/* COMPETITORS Section */}
            {activeSection === "competitors" && (
                <section className="rounded-3xl border border-gray-200/80 bg-white shadow-sm p-6 space-y-5">
                    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-100">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Competitors Analysis</h3>
                            <p className="text-xs text-gray-500 font-medium">
                                Showing {filteredCompetitors.length} competitors tracked
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-gray-700 font-medium"
                            >
                                <option value="date_desc">Newest First</option>
                                <option value="date_asc">Oldest First</option>
                                <option value="followers_desc">Followers (High to Low)</option>
                                <option value="posts_desc">Posts (High to Low)</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Search competitors..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-44 bg-gray-50 text-gray-900 placeholder-gray-400 font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => exportToCSV(filteredCompetitors, "facebook_competitors.csv", competitorExportColumns)}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ CSV
                            </button>
                            <button
                                type="button"
                                onClick={() => exportToPDF(filteredCompetitors, "Facebook Competitors Comparison", competitorExportColumns)}
                                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition flex items-center gap-1 border border-gray-200"
                            >
                                ⬇ PDF
                            </button>
                        </div>
                    </header>
                    <div className="overflow-x-auto">
                        {paginatedCompetitors.length > 0 ? (
                            <table className="min-w-full text-xs text-left">
                                <thead>
                                    <tr className="text-gray-500 font-semibold border-b border-gray-200/80 bg-slate-50/50">
                                        <th className="py-3 px-3 rounded-l-xl">Competitor</th>
                                        <th className="py-3 px-3 text-right">Followers</th>
                                        <th className="py-3 px-3 text-right">Posts</th>
                                        <th className="py-3 px-3 text-right">Reactions</th>
                                        <th className="py-3 px-3 text-right">Comments</th>
                                        <th className="py-3 px-3 text-right">Shares</th>
                                        <th className="py-3 px-3 text-right rounded-r-xl">Engagement %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedCompetitors.map((item: any, index: number) => (
                                        <tr key={item.id ?? index} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-3">
                                                <div className="flex items-center gap-3">
                                                    <ImageWithHover
                                                        src={item.picture}
                                                        alt={item.displayName || item.screenName || "Competitor"}
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                                                        showName={true}
                                                        name={item.displayName || item.screenName || "Unknown"}
                                                    />
                                                    <span className="font-bold text-gray-900">
                                                        {item.displayName || item.screenName || "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-semibold text-gray-900">
                                                {formatNumber(item.followers)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {formatNumber(item.posts)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {formatNumber(item.likes || item.reactions)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {formatNumber(item.comments)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right text-gray-700 font-medium">
                                                {formatNumber(item.shares || item.sharesCount)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-bold text-blue-600">
                                                {item.engagement ? (item.engagement * 100).toFixed(2) + "%" : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-10 px-4 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 my-4">
                                <p className="text-sm font-extrabold text-slate-800">No Competitors Tracked</p>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    💡 <strong>Why is this empty?</strong> Add competitor Facebook Pages inside your Metricool account settings to track their performance here.
                                </p>
                            </div>
                        )}
                    </div>
                    <TablePagination
                        currentPage={currentPage}
                        totalItems={filteredCompetitors.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                </section>
            )}
        </div>
    );
}
