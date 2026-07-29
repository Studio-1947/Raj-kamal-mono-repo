import { apiClient } from "../lib/apiClient";

export type PlatformKey =
  | "facebook"
  | "instagram"
  | "youtube"
  | "linkedin"
  | "tiktok"
  | "twitter"
  | "pinterest"
  | "meta_ads";

export type NetworkFlags = {
  facebook: boolean;
  instagram: boolean;
  youtube: boolean;
  meta_ads: boolean;
  linkedin: boolean;
  tiktok: boolean;
  twitter: boolean;
  threads: boolean;
  pinterest: boolean;
  gmb: boolean;
  bluesky: boolean;
};

export type Brand = NetworkFlags & {
  blogId: string;
  label: string | null;
  picture: string | null;
};

type ApiEnvelope<T> = { success: boolean; data: T; error?: any };

type TimelinePoint = { dateTime?: string; value?: number };

type TimelineMetricAlias = Partial<Record<string, string>>;
type DistributionMetricMap = Partial<Record<"country" | "city", string>>;

// Metricool endpoints can take longer than our default axios timeout, so give them more headroom.
const METRICOOL_TIMEOUT_MS = 60000;
const METRICOOL_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes - increased for better performance
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
    likes: "postsInteractions",
    pageImpressions: "postsInteractions",
    followers: "pageFollows",
    newFollowers: "page_daily_follows_unique",
    lostFollowers: "page_daily_unfollows_unique",
    reach: "postsInteractions",
    clicks: "page_media_view",
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
  youtube: {},
  linkedin: {
    likes: "postsInteractions",
    pageImpressions: "impressions",
    followers: "followers",
    newFollowers: "followersGained",
    reach: "impressions",
    pageViews: "pageViews",
    clicks: "clicks",
  },
  tiktok: {
    likes: "likes",
    pageImpressions: "views",
    followers: "followers",
    reach: "views",
    pageViews: "profileViews",
  },
  twitter: {
    likes: "likes",
    pageImpressions: "impressions",
    followers: "followers",
    reach: "impressions",
    clicks: "urlClicks",
  },
  pinterest: {
    likes: "saves",
    pageImpressions: "impressions",
    followers: "followers",
    reach: "impressions",
    clicks: "pinClicks",
  },
  meta_ads: {
    likes: "clicks",
    pageImpressions: "impressions",
    pageViews: "clicks",
    followers: "reach",
    newFollowers: "reach",
    lostFollowers: "reach",
    reach: "reach",
    clicks: "clicks",
  },
};

const distributionMetricAliases: Record<PlatformKey, DistributionMetricMap> = {
  facebook: {
    country: "page_follows_country",
    city: "page_follows_city",
  },
  instagram: {
    country: "country",
    city: "city",
  },
  youtube: {},
  linkedin: {
    country: "country",
  },
  tiktok: {
    country: "country",
  },
  twitter: {
    country: "country",
  },
  pinterest: {
    country: "country",
  },
  meta_ads: {
    country: "country",
  },
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
  params?: Record<string, unknown>,
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
  kind: "country" | "city",
): string {
  // Metricool distribution API uses simple 'country' and 'city' as metric names
  return distributionMetricAliases[platform]?.[kind] ?? kind;
}

export async function fetchTimelineSeries(
  platform: PlatformKey,
  metric: string,
  params?: Record<string, unknown>,
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
  params?: Record<string, unknown>,
) {
  const { timezone, ...rest } = params ?? {};
  return getMetricool<any>("/metricool/" + platform + "/distribution", {
    metric,
    timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
    ...rest,
  });
}

const BLOCKED_BRANDS_CLIENT = ["1947.io"];

export async function fetchBrands(): Promise<Brand[]> {
  const brands = await getMetricool<Brand[]>("/metricool/brands");
  return (brands || []).filter((b) => {
    if (!b.label || !b.label.trim()) return false;
    const labelLower = b.label.toLowerCase();
    return !BLOCKED_BRANDS_CLIENT.some((blocked) => labelLower.includes(blocked.toLowerCase()));
  });
}

export async function fetchOverview(
  platform: PlatformKey,
  params?: Record<string, unknown>,
) {
  const [likes, followers, impressions, reach, pageVisits, posts] =
    await Promise.all([
      fetchTimelineSeries(platform, "likes", params),
      fetchTimelineSeries(platform, "followers", params),
      fetchTimelineSeries(platform, "pageImpressions", params),
      fetchTimelineSeries(platform, "reach", params),
      fetchTimelineSeries(platform, "pageViews", params),
      getMetricool<any>("/metricool/" + platform + "/posts", params).catch(
        () => ({ items: [] }),
      ),
    ]);

  // Extract values from series
  const likesValue = sumSeriesValues(likes) || extractLatestValue(likes);
  const followersValue = extractLatestValue(followers);
  const impressionsSum = sumSeriesValues(impressions) || extractLatestValue(impressions);
  const reachSum = sumSeriesValues(reach) || extractLatestValue(reach);
  const pageVisitsSum = sumSeriesValues(pageVisits) || extractLatestValue(pageVisits);

  // Calculate total content from posts
  const totalContentValue =
    posts?.items?.length ??
    posts?.data?.items?.length ??
    posts?.data?.length ??
    null;

  return {
    data: {
      from: params?.from as string,
      to: params?.to as string,
      likes: likesValue,
      followers: followersValue,
      views: impressionsSum,
      impressions: impressionsSum,
      reach: reachSum,
      pageVisits: pageVisitsSum,
      totalContent: totalContentValue,
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
  params?: Record<string, unknown>,
) {
  const [
    impressions,
    reach,
    pageViews,
    followers,
    newFollowers,
    lostFollowers,
  ] = await Promise.all([
    fetchTimelineSeries(platform, "pageImpressions", params),
    fetchTimelineSeries(platform, "reach", params),
    fetchTimelineSeries(platform, "pageViews", params),
    fetchTimelineSeries(platform, "followers", params),
    fetchTimelineSeries(platform, "newFollowers", params),
    fetchTimelineSeries(platform, "lostFollowers", params),
  ]);

  return {
    data: {
      from: params?.from as string,
      to: params?.to as string,
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
  params?: Record<string, unknown>,
): Promise<{ data: any }> {
  const data = await getMetricool<any>(
    "/metricool/" + platform + "/posts",
    params,
  );
  return { data };
}

export async function fetchDemographicsCountries(
  platform: PlatformKey,
  params?: Record<string, unknown>,
) {
  const metric = resolveDistributionMetric(platform, "country");
  const data = await fetchDistributionMetric(platform, metric, {
    ...params,
  });
  return { data };
}

export async function fetchDemographicsCities(
  platform: PlatformKey,
  params?: Record<string, unknown>,
) {
  const metric = resolveDistributionMetric(platform, "city");
  const data = await fetchDistributionMetric(platform, metric, {
    ...params,
  });
  return { data };
}

export async function fetchClicks(
  platform: PlatformKey,
  params?: Record<string, unknown>,
): Promise<{ data: any }> {
  const clicks = await fetchTimelineSeries(platform, "clicks", params);
  return { data: clicks };
}

function sumSeriesValues(payload: any): number {
  return extractSeriesValues(payload).reduce(
    (sum, point) => sum + (typeof point.value === "number" ? point.value : 0),
    0,
  );
}

export type FacebookEngagement = {
  reactions: number;
  interactions: number;
  postsCount: number;
};

// page_actions_post_reactions_total/postsInteractions/postsCount aren't in
// timelineMetricAliases.facebook — they're already the real Metricool metric
// names (confirmed against the live API), no aliasing needed.
export async function fetchFacebookEngagement(
  params?: Record<string, unknown>,
): Promise<{ data: FacebookEngagement }> {
  const [reactions, interactions, postsCount] = await Promise.all([
    fetchTimelineSeries("facebook", "page_actions_post_reactions_total", params),
    fetchTimelineSeries("facebook", "postsInteractions", params),
    fetchTimelineSeries("facebook", "postsCount", params),
  ]);

  return {
    data: {
      reactions: sumSeriesValues(reactions),
      interactions: sumSeriesValues(interactions),
      postsCount: sumSeriesValues(postsCount),
    },
  };
}

export type InstagramEngagement = {
  accountsEngaged: number;
  postsCount: number;
};

export async function fetchInstagramEngagement(
  params?: Record<string, unknown>,
): Promise<{ data: InstagramEngagement }> {
  const [accountsEngaged, postsCount] = await Promise.all([
    fetchTimelineSeries("instagram", "accounts_engaged", params),
    fetchTimelineSeries("instagram", "postsCount", params),
  ]);

  return {
    data: {
      accountsEngaged: sumSeriesValues(accountsEngaged),
      postsCount: sumSeriesValues(postsCount),
    },
  };
}

// postsTypes is a real Metricool distribution metric for Facebook too (content
// type breakdown), confirmed against the live API — same subject-guessing
// pitfall as Instagram's, so subject: "account" must be explicit here as well.
export async function fetchFacebookContentTypes(
  params?: Record<string, unknown>,
): Promise<{ data: any }> {
  const data = await fetchDistributionMetric("facebook", "postsTypes", {
    subject: "account",
    ...params,
  });
  return { data };
}

// Instagram demographics: gender/age/postsTypes are real Metricool distribution
// metrics (confirmed against the live API) with no existing UI surfacing them.
// `subject: "account"` must be explicit — the backend's subject-guessing
// heuristic matches metric names containing "post" to subject=posts, which
// misfires on "postsTypes" (an account-level metric, not a posts-subject one).
export async function fetchInstagramGenderDistribution(
  params?: Record<string, unknown>,
): Promise<{ data: any }> {
  const data = await fetchDistributionMetric("instagram", "gender", {
    subject: "account",
    ...params,
  });
  return { data };
}

export async function fetchInstagramAgeDistribution(
  params?: Record<string, unknown>,
): Promise<{ data: any }> {
  const data = await fetchDistributionMetric("instagram", "age", {
    subject: "account",
    ...params,
  });
  return { data };
}

export async function fetchInstagramContentTypes(
  params?: Record<string, unknown>,
): Promise<{ data: any }> {
  const data = await fetchDistributionMetric("instagram", "postsTypes", {
    subject: "account",
    ...params,
  });
  return { data };
}

// YouTube: Metricool only exposes channel-level timeline metrics for this
// network (no per-video list, no demographics — confirmed against the live
// API: /analytics/posts/youtube returns [] and /analytics/distribution
// 500s as "not implemented" for youtube). So unlike Facebook/Instagram this
// isn't routed through the generic PlatformKey aliases — it has its own
// metric names entirely: totalSubscribers, views, totalVideos,
// subscribersGained, subscribersLost.
async function fetchYoutubeTimeline(
  metric: string,
  params?: Record<string, unknown>,
) {
  const { timezone, ...rest } = params ?? {};
  return getMetricool<any>("/metricool/youtube/timeline", {
    metric,
    subject: "account",
    timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
    ...rest,
  });
}

export type YoutubeOverview = {
  subscribers: number | null;
  views: number | null;
  totalVideos: number | null;
  from?: string;
  to?: string;
};

export async function fetchYoutubeOverview(
  params?: Record<string, unknown>,
): Promise<{ data: YoutubeOverview }> {
  const [subscribers, views, totalVideos] = await Promise.all([
    fetchYoutubeTimeline("totalSubscribers", params),
    fetchYoutubeTimeline("views", params),
    fetchYoutubeTimeline("totalVideos", params),
  ]);

  return {
    data: {
      subscribers: extractLatestValue(subscribers),
      views: sumSeriesValues(views),
      totalVideos: sumSeriesValues(totalVideos),
      from: params?.from as string,
      to: params?.to as string,
    },
  };
}

export async function fetchYoutubeGrowth(
  params?: Record<string, unknown>,
): Promise<{ data: any }> {
  const [subscribers, views, subscribersGained, subscribersLost] = await Promise.all([
    fetchYoutubeTimeline("totalSubscribers", params),
    fetchYoutubeTimeline("views", params),
    fetchYoutubeTimeline("subscribersGained", params),
    fetchYoutubeTimeline("subscribersLost", params),
  ]);

  return {
    data: {
      series: {
        subscribers: extractSeriesValues(subscribers),
        views: extractSeriesValues(views),
        subscribersGained: extractSeriesValues(subscribersGained),
        subscribersLost: extractSeriesValues(subscribersLost),
      },
    },
  };
}

// Instagram section-specific data fetchers
export type InstagramSection =
  | "community"
  | "account"
  | "posts"
  | "reels"
  | "stories"
  | "competitors";

export async function fetchInstagramSection(
  section: InstagramSection,
  params?: Record<string, unknown>,
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
      timelineError =
        error?.response?.data?.error ||
        error?.message ||
        "Timeline data unavailable";
      // Check if it's a Facebook connection error
      if (
        timelineError?.includes("Facebook") ||
        timelineError?.includes("connection")
      ) {
        throw new Error(
          "This metric is not available for Instagram without a connection via Facebook.",
        );
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

export async function fetchInstagramCommunity(
  params?: Record<string, unknown>,
) {
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

export async function fetchInstagramCompetitors(
  params?: Record<string, unknown>,
) {
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
  params?: Record<string, unknown>,
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
      timelineError =
        error?.response?.data?.error ||
        error?.message ||
        "Timeline data unavailable";
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

export async function fetchFacebookCompetitors(
  params?: Record<string, unknown>,
) {
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
