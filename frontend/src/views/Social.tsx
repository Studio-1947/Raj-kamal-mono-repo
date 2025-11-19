import { useEffect, useMemo, useState } from "react";
import AppLayout from "../shared/AppLayout";
import { useLang } from "../modules/lang/LangContext";
import {
  fetchAdsCampaigns,
  fetchAdsOverview,
  fetchAdsTimeseries,
  fetchClicks,
  fetchDemographicsCities,
  fetchDemographicsCountries,
  fetchGrowth,
  fetchOverview,
  fetchPosts,
  type PlatformKey,
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

type TimelinePoint = { dateTime?: string; value?: number };

type PostItem = {
  id?: string;
  message?: string;
  mediaType?: string;
  network?: string;
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  publishedAt?: string;
};

type CampaignItem = {
  id?: string;
  campaignName?: string;
  objective?: string;
  spend?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
};

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

function normalizeSeries(seriesContainer: any, key: string): TimelinePoint[] {
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

function toChartPoints(points: TimelinePoint[]) {
  return points.map((point) => ({
    date: point.dateTime?.slice(0, 10) ?? "",
    value: typeof point.value === "number" ? point.value : 0,
  }));
}

const chartColors = ["#2563eb", "#16a34a", "#f97316", "#e11d48", "#9333ea"];

export default function Social() {
  const { t } = useLang();

  const [range, setRange] = useState<TimeRangeKey>("30d");
  const [activeNetwork, setActiveNetwork] = useState<PlatformKey>("facebook");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [growth, setGrowth] = useState<any>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [demographicsCountries, setDemographicsCountries] = useState<any[]>([]);
  const [demographicsCities, setDemographicsCities] = useState<any[]>([]);
  const [clicksData, setClicksData] = useState<any>(null);

  const [adsOverview, setAdsOverview] = useState<any>(null);
  const [adsTimeseries, setAdsTimeseries] = useState<any>(null);
  const [adsCampaigns, setAdsCampaigns] = useState<CampaignItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = computeRangeDates(range);

        if (activeNetwork === "facebook" || activeNetwork === "instagram") {
          const [
            overviewRes,
            growthRes,
            postsResRaw,
            countriesRes,
            citiesRes,
            clicksRes,
          ] = await Promise.all([
            fetchOverview(activeNetwork, { from, to }),
            fetchGrowth(activeNetwork, { from, to }),
            fetchPosts(activeNetwork, { from, to, pageSize: 10 }),
            fetchDemographicsCountries(activeNetwork),
            fetchDemographicsCities(activeNetwork),
            fetchClicks(activeNetwork, { from, to }),
          ]);

          if (!cancelled) {
            setOverview(overviewRes.data ?? null);
            setGrowth(growthRes.data ?? null);
            const postsRes: any = postsResRaw;
            const postItems =
              postsRes?.data?.items ??
              postsRes?.data?.data ??
              postsRes?.data ??
              postsRes ??
              [];
            setPosts(postItems as PostItem[]);
            setDemographicsCountries(
              countriesRes.data?.data ?? countriesRes.data ?? []
            );
            setDemographicsCities(
              citiesRes.data?.data ?? citiesRes.data ?? []
            );
            setClicksData(clicksRes.data ?? null);
            setAdsOverview(null);
            setAdsTimeseries(null);
            setAdsCampaigns([]);
          }
        } else if (activeNetwork === "meta_ads") {
          const [overviewRes, timeseriesRes, campaignsResRaw] = await Promise.all([
            fetchAdsOverview({ from, to }),
            fetchAdsTimeseries({ from, to }),
            fetchAdsCampaigns(),
          ]);

          if (!cancelled) {
            setAdsOverview(overviewRes.data ?? null);
            setAdsTimeseries(timeseriesRes.data ?? null);
            const campaignsRes: any = campaignsResRaw;
            setAdsCampaigns(
              campaignsRes?.data?.items ??
                campaignsRes?.data?.data ??
                campaignsRes?.data ??
                campaignsRes ??
                []
            );
            setOverview(null);
            setGrowth(null);
            setPosts([]);
            setDemographicsCountries([]);
            setDemographicsCities([]);
            setClicksData(null);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load Metricool metrics.");
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
  }, [activeNetwork, range]);

  const networkFrom = overview?.from ?? growth?.from ?? clicksData?.from ?? "unknown";
  const networkTo = overview?.to ?? growth?.to ?? clicksData?.to ?? "unknown";

  const growthSeriesContainer = useMemo(() => {
    if (!growth) return null;
    return growth.series ?? growth.data?.series ?? growth;
  }, [growth]);

  const impressionsPoints = toChartPoints(
    normalizeSeries(growthSeriesContainer, "impressions")
  );
  const reachPoints = toChartPoints(
    normalizeSeries(growthSeriesContainer, "reach")
  );
  const pageViewsPoints = toChartPoints(
    normalizeSeries(growthSeriesContainer, "pageViews")
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

  const headerTabs: PlatformKey[] = ["facebook", "instagram", "meta_ads"];

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t("social_media")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Metricool analytics for Facebook, Instagram, and Meta Ads.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-medium text-gray-700">
            {headerTabs.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveNetwork(key)}
                className={`px-3 py-1 rounded-full capitalize ${
                  activeNetwork === key ? "bg-white shadow-sm" : ""
                }`}
              >
                {key === "meta_ads" ? "Meta Ads" : key}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-medium text-gray-700">
            {["7d", "30d", "90d"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key as TimeRangeKey)}
                className={`px-3 py-1 rounded-full ${
                  range === key ? "bg-white shadow-sm" : ""
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <p className="mb-4 text-sm text-gray-500">
          Loading {activeNetwork} metrics...
        </p>
      )}

      {(activeNetwork === "facebook" || activeNetwork === "instagram") && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Page Overview</p>
                <p className="text-xs text-gray-500">
                  {networkFrom} → {networkTo}
                </p>
              </div>
              {overview?.profileName && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
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
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Likes", value: overview?.likes },
                { label: "Followers", value: overview?.followers },
                { label: "Views", value: overview?.views ?? overview?.impressions },
                { label: "Page visits", value: overview?.pageVisits ?? overview?.pageViews },
                { label: "Total content", value: overview?.totalContent },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl bg-sky-50 px-4 py-3 text-center shadow-inner border border-sky-100"
                >
                  <p className="text-xs font-semibold text-gray-500">
                    {card.label}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(card.value)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-gray-100 px-4 py-3 text-center">
                <p className="text-xs text-gray-500">
                  Average daily new followers
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatNumber(overview?.averageDailyNewFollowers)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-100 px-4 py-3 text-center">
                <p className="text-xs text-gray-500">Daily page views</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatNumber(overview?.dailyPageViews)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-100 px-4 py-3 text-center">
                <p className="text-xs text-gray-500">Posts per week</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatNumber(overview?.postsPerWeek)}
                </p>
              </div>
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
                  <p className="text-sm text-gray-500">
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
                <p className="text-xs text-gray-500">
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
                      data={toChartPoints(newFollowersPoints)}
                      name="Acquired"
                      stroke="#0ea5e9"
                      dot={false}
                    />
                    <Line
                      dataKey="value"
                      data={toChartPoints(lostFollowersPoints)}
                      name="Lost"
                      stroke="#f97316"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">
                  No follower balance data.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5 space-y-4">
            <header className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                Posts viewed in period
              </p>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700">
                  {formatNumber(overview?.impressions)} Impressions
                </span>
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-700">
                  {formatNumber(overview?.reactions)} Reactions
                </span>
              </div>
            </header>
            <div className="h-64">
              {impressionsPoints.length || reachPoints.length ? (
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
                      stroke="#0ea5e9"
                      dot={false}
                    />
                    <Line
                      dataKey="value"
                      data={reachPoints}
                      name="Reach"
                      stroke="#16a34a"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">
                  No impressions data available.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5 space-y-4">
            <header className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Demographics</p>
              <p className="text-xs text-gray-500">Followers by country/city</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64 flex items-center justify-center">
                {demographicsPie.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demographicsPie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {demographicsPie.map((_, index) => (
                          <Cell
                            key={`country-${index}`}
                            fill={chartColors[index % chartColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">No demographic data.</p>
                )}
              </div>
              <div className="overflow-x-auto">
                {demographicsCityTable.length ? (
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-1 pr-2">City</th>
                        <th className="py-1 pr-2 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demographicsCityTable.map((item, index) => (
                        <tr key={`city-${index}`} className="border-t border-gray-100">
                          <td className="py-1 pr-2 text-gray-900">
                            {item?.key ?? "Unknown"}
                          </td>
                          <td className="py-1 pr-2 text-right text-gray-900">
                            {item?.value ? `${(item.value * 100).toFixed(2)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500">No city breakdown available.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5 space-y-4">
            <header className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Clicks on Page</p>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-700">
                  {formatNumber(clicksData?.totalClicks)} Total clicks
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700">
                  {formatNumber(clicksData?.pageVisits ?? overview?.pageVisits)} Page visits
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700">
                  {formatNumber(overview?.totalContent)} Total content
                </span>
              </div>
            </header>
            <div className="h-64">
              {clicksPoints.length || pageViewsPoints.length ? (
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
                      stroke="#f97316"
                      dot={false}
                    />
                    <Line
                      dataKey="value"
                      data={pageViewsPoints}
                      name="Page Views"
                      stroke="#9333ea"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">No clicks data for this period.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5 space-y-4">
            <header className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                Posts published in period
              </p>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700">
                  {formatNumber(overview?.engagement)} Engagement
                </span>
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-700">
                  {formatNumber(overview?.interactions)} Interactions
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700">
                  {formatNumber(overview?.avgReachPerPost)} Avg. reach per post
                </span>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
                  {formatNumber(overview?.impressions)} Impressions
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700">
                  {formatNumber(overview?.posts)} Posts
                </span>
              </div>
            </header>
            <div className="overflow-x-auto">
              {postsRows.length ? (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-2">Message</th>
                      <th className="py-2 pr-2">Type</th>
                      <th className="py-2 pr-2 text-right">Impressions</th>
                      <th className="py-2 pr-2 text-right">Reach</th>
                      <th className="py-2 pr-2 text-right">Likes</th>
                      <th className="py-2 pr-2 text-right">Comments</th>
                      <th className="py-2 pr-2 text-right">Shares</th>
                      <th className="py-2 pr-2 text-right">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postsRows.map((post) => (
                      <tr key={post.id} className="border-t border-gray-100">
                        <td className="py-2 pr-2 text-gray-900 max-w-xs truncate">
                          {post.message || "—"}
                        </td>
                        <td className="py-2 pr-2 text-gray-700">
                          {post.mediaType || post.network || "—"}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatNumber(post.impressions)}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatNumber(post.reach)}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatNumber(post.likes)}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatNumber(post.comments)}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatNumber(post.shares)}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatNumber(post.clicks)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">No posts during this period.</p>
              )}
            </div>
          </section>
        </div>
      )}
      {activeNetwork === "meta_ads" && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Meta Ads Overview
                </p>
                <p className="text-xs text-gray-500">
                  Spend, impressions, reach, clicks, conversions
                </p>
              </div>
              <p className="text-xs text-gray-500">{range.toUpperCase()}</p>
            </header>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Spend", value: adsOverview?.spend, suffix: "₹" },
                { label: "Impressions", value: adsOverview?.impressions },
                { label: "Reach", value: adsOverview?.reach },
                { label: "Clicks", value: adsOverview?.clicks },
                { label: "CTR", value: adsOverview?.ctr, suffix: "%" },
                { label: "CPC", value: adsOverview?.cpc, suffix: "₹" },
                { label: "Conversions", value: adsOverview?.conversions },
                { label: "ROAS", value: adsOverview?.roas },
              ].map((card, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-sky-50 px-4 py-3 text-center shadow-inner border border-sky-100"
                >
                  <p className="text-xs font-semibold text-gray-500">
                    {card.label}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {card.suffix
                      ? `${formatNumber(card.value)} ${card.suffix}`
                      : formatNumber(card.value)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5 space-y-4">
            <header className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                Ads performance over time
              </p>
              <p className="text-xs text-gray-500">Spend vs impressions vs clicks</p>
            </header>
            <div className="h-64">
              {adsTimeseries ? (
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
                      data={toChartPoints(normalizeSeries(adsTimeseries, "spend"))}
                      name="Spend"
                      stroke="#0ea5e9"
                      dot={false}
                    />
                    <Line
                      dataKey="value"
                      data={toChartPoints(
                        normalizeSeries(adsTimeseries, "impressions")
                      )}
                      name="Impressions"
                      stroke="#f97316"
                      dot={false}
                    />
                    <Line
                      dataKey="value"
                      data={toChartPoints(normalizeSeries(adsTimeseries, "clicks"))}
                      name="Clicks"
                      stroke="#16a34a"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">No ads data yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white shadow-sm p-5">
            <header className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Campaigns</p>
              <p className="text-xs text-gray-500">Spend, objective, status overview</p>
            </header>
            <div className="overflow-x-auto mt-4">
              {adsCampaigns.length ? (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-2">Campaign</th>
                      <th className="py-2 pr-2">Objective</th>
                      <th className="py-2 pr-2 text-right">Spend</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2">Dates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adsCampaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-t border-gray-100">
                        <td className="py-2 pr-2 text-gray-900">
                          {campaign.campaignName || campaign.id}
                        </td>
                        <td className="py-2 pr-2 text-gray-700">
                          {campaign.objective || "—"}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {formatNumber(campaign.spend)}
                        </td>
                        <td className="py-2 pr-2 text-gray-700">
                          {campaign.status || "—"}
                        </td>
                        <td className="py-2 pr-2 text-gray-500">
                          {campaign.startDate || "?"} - {campaign.endDate || "?"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">
                  No campaigns returned by Meta Ads API.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
