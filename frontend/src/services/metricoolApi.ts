import { apiClient } from "../lib/apiClient";

export type PlatformKey = "facebook" | "instagram" | "meta_ads";

type ApiEnvelope<T> = { success: boolean; data: T; error?: any };

type TimelinePoint = { dateTime?: string; value?: number };

type TimelineMetricAlias = Partial<Record<string, string>>;
type DistributionMetricMap = Partial<Record<"country" | "city", string>>;

const timelineMetricAliases: Record<PlatformKey, TimelineMetricAlias> = {
  facebook: {
    followers: "pageFollows",
    newFollowers: "page_daily_follows_unique",
    lostFollowers: "page_daily_unfollows_unique",
    reach: "page_posts_impressions",
    clicks: "page_total_actions",
  },
  instagram: {
    likes: "postsInteractions",
    pageImpressions: "impressions",
    pageViews: "profile_views",
    followers: "Followers",
    newFollowers: "delta_followers",
    lostFollowers: "delta_followers",
    reach: "reach",
    clicks: "website_clicks",
  },
  meta_ads: {},
};

const distributionMetricAliases: Record<PlatformKey, DistributionMetricMap> = {
  facebook: {
    country: "page_follows_country",
    city: "page_follows_city",
  },
  instagram: {
    country: "followers_country",
    city: "followers_city",
  },
  meta_ads: {},
};

function extractSeriesValues(payload: any): TimelinePoint[] {
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

function extractLatestValue(payload: any): number | null {
  const values = extractSeriesValues(payload);
  if (!values.length) return null;
  const last = values[values.length - 1];
  return typeof last?.value === "number" ? last.value : null;
}

async function getMetricool<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<T> {
  const envelope = await apiClient.get<ApiEnvelope<T>>(url, { params });
  return envelope.data;
}

function resolveTimelineMetric(platform: PlatformKey, metric: string): string {
  return timelineMetricAliases[platform]?.[metric] ?? metric;
}

function resolveDistributionMetric(
  platform: PlatformKey,
  kind: "country" | "city"
): string {
  const fallback =
    kind === "country" ? "page_follows_country" : "page_follows_city";
  return distributionMetricAliases[platform]?.[kind] ?? fallback;
}

async function fetchTimelineSeries(
  platform: PlatformKey,
  metric: string,
  params?: Record<string, unknown>
) {
  return getMetricool<any>("/metricool/" + platform + "/timeline", {
    metric: resolveTimelineMetric(platform, metric),
    ...params,
  });
}

async function fetchDistributionMetric(
  platform: PlatformKey,
  metric: string,
  params?: Record<string, unknown>
) {
  return getMetricool<any>("/metricool/" + platform + "/distribution", {
    metric,
    ...params,
  });
}

export async function fetchOverview(
  platform: PlatformKey,
  params?: Record<string, unknown>
) {
  if (platform === "meta_ads") {
    return { data: null };
  }

  const [likes, followers, views, pageVisits] = await Promise.all([
    fetchTimelineSeries(platform, "likes", params),
    fetchTimelineSeries(platform, "followers", params),
    fetchTimelineSeries(platform, "pageImpressions", params),
    fetchTimelineSeries(platform, "pageViews", params),
  ]);

  return {
    data: {
      likes: extractLatestValue(likes),
      followers: extractLatestValue(followers),
      views: extractLatestValue(views),
      pageVisits: extractLatestValue(pageVisits),
      totalContent: null,
      followersChange: null,
      dailyPageViews: null,
      postsPerWeek: null,
      reactions: null,
      interactions: null,
      avgReachPerPost: null,
      posts: null,
      engagement: null,
      profileName: "",
      profilePictureUrl: "",
    },
  };
}

export async function fetchGrowth(
  platform: PlatformKey,
  params?: Record<string, unknown>
) {
  if (platform === "meta_ads") {
    return { data: null };
  }

  const [impressions, reach, pageViews, followers, newFollowers, lostFollowers] =
    await Promise.all([
      fetchTimelineSeries(platform, "pageImpressions", params),
      fetchTimelineSeries(platform, "reach", params),
      fetchTimelineSeries(platform, "pageViews", params),
      fetchTimelineSeries(platform, "followers", params),
      fetchTimelineSeries(platform, "newFollowers", params),
      fetchTimelineSeries(platform, "lostFollowers", params),
    ]);

  return {
    data: {
      series: {
        impressions: extractSeriesValues(impressions),
        reach: extractSeriesValues(reach),
        pageViews: extractSeriesValues(pageViews),
        followers: extractSeriesValues(followers),
        newFollowers: extractSeriesValues(newFollowers),
        lostFollowers: extractSeriesValues(lostFollowers),
      },
    },
  };
}

export async function fetchPosts(
  platform: PlatformKey,
  params?: Record<string, unknown>
): Promise<{ data: any }> {
  if (platform === "meta_ads") {
    return { data: { items: [] } };
  }
  const data = await getMetricool<any>("/metricool/" + platform + "/posts", params);
  return { data };
}

export async function fetchDemographicsCountries(
  platform: PlatformKey,
  params?: Record<string, unknown>
) {
  if (platform === "meta_ads") {
    return { data: { data: [] } };
  }
  const metric = resolveDistributionMetric(platform, "country");
  const data = await fetchDistributionMetric(platform, metric, {
    ...params,
  });
  return { data };
}

export async function fetchDemographicsCities(
  platform: PlatformKey,
  params?: Record<string, unknown>
) {
  if (platform === "meta_ads") {
    return { data: { data: [] } };
  }
  const metric = resolveDistributionMetric(platform, "city");
  const data = await fetchDistributionMetric(platform, metric, {
    ...params,
  });
  return { data };
}

export async function fetchClicks(
  platform: PlatformKey,
  params?: Record<string, unknown>
): Promise<{ data: any }> {
  if (platform === "meta_ads") {
    return { data: null };
  }
  const clicks = await fetchTimelineSeries(platform, "clicks", params);
  return { data: clicks };
}

export async function fetchAdsOverview(
  params?: Record<string, unknown>
): Promise<{ data: any }> {
  return { data: null };
}

export async function fetchAdsTimeseries(
  params?: Record<string, unknown>
): Promise<{ data: any }> {
  return { data: null };
}

export async function fetchAdsCampaigns(): Promise<{ data: any[] }> {
  return { data: [] };
}
