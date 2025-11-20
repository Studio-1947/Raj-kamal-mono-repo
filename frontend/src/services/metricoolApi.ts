import { apiClient } from "../lib/apiClient";

export type PlatformKey = "facebook" | "instagram" | "meta_ads";

type ApiEnvelope<T> = { success: boolean; data: T; error?: any };

type TimelinePoint = { dateTime?: string; value?: number };

type TimelineMetricAlias = Partial<Record<string, string>>;
type DistributionMetricMap = Partial<Record<"country" | "city", string>>;

// Metricool endpoints can take longer than our default axios timeout, so give them more headroom.
const METRICOOL_TIMEOUT_MS = 60000;
const METRICOOL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes - increased from 2 minutes for better performance
const METRICOOL_DEFAULT_TIMEZONE = "Asia/Kolkata";

type CacheEntry<T> = { expiresAt: number; data: T };

const metricoolCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${key}:${stableStringify((value as any)[key])}`);
  return `{${entries.join(",")}}`;
}

function buildCacheKey(url: string, params?: Record<string, unknown>) {
  return `${url}?${stableStringify(params ?? {})}`;
}

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
    followers: "followers",
    newFollowers: "delta_followers",
    lostFollowers: "delta_followers",
    reach: "reach",
    clicks: "website_clicks",
  },
  meta_ads: {},
};

const distributionMetricAliases: Record<PlatformKey, DistributionMetricMap> = {
  facebook: {
    country: "followersByCountry", // Facebook uses 'followersByCountry' for distribution
    city: "followersByCity", // Facebook uses 'followersByCity' for distribution
  },
  instagram: {
    country: "country", // Instagram uses simple 'country' for distribution
    city: "city", // Instagram uses simple 'city' for distribution
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
  const key = buildCacheKey(url, params);
  const now = Date.now();

  const cached = metricoolCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing;
  }

  const request = apiClient
    .get<ApiEnvelope<T>>(url, {
      params,
      timeout: METRICOOL_TIMEOUT_MS,
    })
    .then((envelope) => {
      metricoolCache.set(key, {
        expiresAt: Date.now() + METRICOOL_CACHE_TTL_MS,
        data: envelope.data,
      });
      inFlightRequests.delete(key);
      return envelope.data;
    })
    .catch((error) => {
      inFlightRequests.delete(key);
      throw error;
    });

  inFlightRequests.set(key, request);
  return request;
}

function resolveTimelineMetric(platform: PlatformKey, metric: string): string {
  return timelineMetricAliases[platform]?.[metric] ?? metric;
}

function resolveDistributionMetric(
  platform: PlatformKey,
  kind: "country" | "city"
): string {
  // Metricool distribution API uses simple 'country' and 'city' as metric names
  return distributionMetricAliases[platform]?.[kind] ?? kind;
}

async function fetchTimelineSeries(
  platform: PlatformKey,
  metric: string,
  params?: Record<string, unknown>
) {
  const { timezone, ...rest } = params ?? {};
  return getMetricool<any>("/metricool/" + platform + "/timeline", {
    metric: resolveTimelineMetric(platform, metric),
    timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
    ...rest,
  });
}

async function fetchDistributionMetric(
  platform: PlatformKey,
  metric: string,
  params?: Record<string, unknown>
) {
  const { timezone, ...rest } = params ?? {};
  return getMetricool<any>("/metricool/" + platform + "/distribution", {
    metric,
    timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
    ...rest,
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

// Instagram section-specific data fetchers
export type InstagramSection = "community" | "account" | "posts" | "reels" | "stories" | "competitors";

export async function fetchInstagramSection(
  section: InstagramSection,
  params?: Record<string, unknown>
) {
  const subjectMap: Record<InstagramSection, string> = {
    community: "account",
    account: "account",
    posts: "posts",
    reels: "reels",
    stories: "stories",
    competitors: "competitors",
  };

  // Different subjects support different metrics in Metricool API
  const metricMap: Record<InstagramSection, string> = {
    community: "impressions",
    account: "impressions",
    posts: "impressions",
    reels: "count", // Reels use 'count' metric
    stories: "count", // Stories use 'count' metric
    competitors: "count", // Competitors use 'count' metric
  };

  const subject = subjectMap[section];
  const metric = metricMap[section];
  const { timezone, ...rest } = params ?? {};

  // Fetch timeline data for the section (skip for competitors as it's not supported)
  let timelineData: any = null;
  let timelineError: string | null = null;
  
  if (section !== "competitors") {
    try {
      timelineData = await getMetricool<any>("/metricool/instagram/timeline", {
        metric,
        subject,
        timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
        ...rest,
      });
    } catch (error: any) {
      console.warn(`Failed to fetch ${section} timeline:`, error);
      timelineError = error?.response?.data?.error || error?.message || "Timeline data unavailable";
      // Check if it's a Facebook connection error
      if (timelineError?.includes("Facebook") || timelineError?.includes("connection")) {
        throw new Error("This metric is not available for Instagram without a connection via Facebook.");
      }
    }
  }

  // Fetch posts/items for the section
  let items: any[] = [];
  try {
    const postsData = await getMetricool<any>("/metricool/instagram/posts", {
      subject,
      ...rest,
    });
    items = postsData?.items ?? postsData?.data ?? postsData ?? [];
  } catch (error) {
    console.warn(`Failed to fetch ${section} posts:`, error);
  }

  return {
    data: {
      timeline: timelineData,
      items,
      subject,
      section,
      error: timelineError,
    },
  };
}

export async function fetchInstagramCommunity(params?: Record<string, unknown>) {
  return fetchInstagramSection("community", params);
}

export async function fetchInstagramAccount(params?: Record<string, unknown>) {
  return fetchInstagramSection("account", params);
}

export async function fetchInstagramPosts(params?: Record<string, unknown>) {
  return fetchInstagramSection("posts", params);
}

export async function fetchInstagramReels(params?: Record<string, unknown>) {
  return fetchInstagramSection("reels", params);
}

export async function fetchInstagramStories(params?: Record<string, unknown>) {
  return fetchInstagramSection("stories", params);
}

export async function fetchInstagramCompetitors(params?: Record<string, unknown>) {
  const { timezone, ...rest } = params ?? {};
  const data = await getMetricool<any>("/metricool/instagram/competitors", {
    timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
    limit: 1000,
    ...rest,
  });
  
  return {
    data: {
      items: data?.data ?? [],
      section: "competitors",
    },
  };
}


// Facebook section-specific data fetchers
export type FacebookSection = "posts" | "reels" | "stories" | "competitors";


export async function fetchFacebookSection(
  section: FacebookSection,
  params?: Record<string, unknown>
) {
  const subjectMap: Record<FacebookSection, string> = {
    posts: "posts",
    reels: "reels",
    stories: "stories",
    competitors: "competitors",
  };

  // Different subjects support different metrics in Metricool API
  const metricMap: Record<FacebookSection, string> = {
    posts: "impressions",
    reels: "count", // Reels use 'count' metric
    stories: "count", // Stories use 'count' metric  
    competitors: "count", // Competitors use 'count' metric
  };

  const subject = subjectMap[section];
  const metric = metricMap[section];
  const { timezone, ...rest } = params ?? {};

  // Fetch timeline data for the section (skip for competitors as it's not supported)
  let timelineData: any = null;
  let timelineError: string | null = null;
  
  if (section !== "competitors") {
    try {
      timelineData = await getMetricool<any>("/metricool/facebook/timeline", {
        metric,
        subject,
        timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
        ...rest,
      });
    } catch (error: any) {
      console.warn(`Failed to fetch Facebook ${section} timeline:`, error);
      timelineError = error?.response?.data?.error || error?.message || "Timeline data unavailable";
    }
  }

  // Fetch posts/items for the section
  let items: any[] = [];
  try {
    const postsData = await getMetricool<any>("/metricool/facebook/posts", {
      subject,
      ...rest,
    });
    items = postsData?.items ?? postsData?.data ?? postsData ?? [];
  } catch (error) {
    console.warn(`Failed to fetch Facebook ${section} posts:`, error);
  }

  return {
    data: {
      timeline: timelineData,
      items,
      subject,
      section,
      error: timelineError,
    },
  };
}

export async function fetchFacebookReels(params?: Record<string, unknown>) {
  return fetchFacebookSection("reels", params);
}

export async function fetchFacebookStories(params?: Record<string, unknown>) {
  return fetchFacebookSection("stories", params);
}

export async function fetchFacebookCompetitors(params?: Record<string, unknown>) {
  const { timezone, ...rest } = params ?? {};
  const data = await getMetricool<any>("/metricool/facebook/competitors", {
    timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
    limit: 1000,
    ...rest,
  });
  
  return {
    data: {
      items: data?.data ?? [],
      section: "competitors",
    },
  };
}

