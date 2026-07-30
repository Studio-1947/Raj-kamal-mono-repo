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

// Every mapping below is a real metric name accepted by Metricool's
// /analytics/timelines enum for that network+subject=account, verified against
// the live API. Anything the network genuinely doesn't expose is absent here and
// listed in UNSUPPORTED_ACCOUNT_METRICS instead — aliasing a missing metric onto
// a different one (e.g. reach -> postsInteractions) silently mislabels
// interactions as reach, which is what this table used to do.
const timelineMetricAliases: Record<PlatformKey, TimelineMetricAlias> = {
  facebook: {
    followers: "pageFollows",
    newFollowers: "page_daily_follows_unique",
    lostFollowers: "page_daily_unfollows_unique",
    pageViews: "pageViews",
    mediaViews: "page_media_view",
    interactions: "postsInteractions",
    reactions: "page_actions_post_reactions_total",
    postsCount: "postsCount",
    clicks: "page_website_clicks_logged_in_unique",
    // pageImpressions/likes are valid FB metric names but return no points on
    // Page-admin tokens without the impressions permission — kept as-is so an
    // empty series reads as "no data", never as another metric's numbers.
    likes: "likes",
    pageImpressions: "pageImpressions",
  },
  instagram: {
    followers: "followers",
    following: "Friends",
    // Instagram exposes only a NET daily delta, not gained/lost separately.
    netFollowers: "delta_followers",
    pageImpressions: "impressions",
    views: "views",
    reach: "reach",
    pageViews: "profile_views",
    interactions: "postsInteractions",
    accountsEngaged: "accounts_engaged",
    postsCount: "postsCount",
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

// Metricool does NOT return timeline points in chronological order — verified
// against the live API, e.g. Instagram `followers` for Jun 29–Jul 29 comes back
// as [Jun 29, Jul 28, Jul 27, ... Jul 9]. Every consumer here (latest value,
// chart X axis) depends on date order, so sort once at the boundary.
export function sortSeriesByDate(points: TimelinePoint[]): TimelinePoint[] {
  return [...points].sort((a, b) =>
    String(a?.dateTime ?? "").localeCompare(String(b?.dateTime ?? "")),
  );
}

function extractSeriesValues(payload: any): TimelinePoint[] {
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

/** Most recent numeric point in the series (by date, not array position). */
function extractLatestValue(payload: any): number | null {
  const values = extractSeriesValues(payload);
  for (let i = values.length - 1; i >= 0; i--) {
    if (typeof values[i]?.value === "number") return values[i].value as number;
  }
  return null;
}

/**
 * Sum of a series, or null when the metric returned no points at all.
 * Distinguishing "no data" from 0 matters: the old `sum || latest` idiom turned
 * a legitimate 0 into an unrelated snapshot value, and a missing metric into a
 * hardcoded placeholder further up the stack.
 */
function sumSeriesOrNull(payload: any): number | null {
  const values = extractSeriesValues(payload).filter(
    (point) => typeof point?.value === "number",
  );
  if (!values.length) return null;
  return values.reduce((sum, point) => sum + (point.value as number), 0);
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

/**
 * Platforms whose timeline enums are verified against the live API, so a logical
 * metric with no alias entry genuinely does not exist there.
 *
 * Requesting one anyway costs a real round-trip that can only 400: it queues
 * behind the backend's rate limiter, logs an error, and spends rate-limit budget
 * that a 429 would then turn into a sample-data fallback. Overview + growth were
 * firing ~7 such calls per platform per load (Instagram: reactions,
 * newFollowers, lostFollowers, mediaViews; Facebook: following, views, reach,
 * accountsEngaged, netFollowers).
 *
 * Deliberately excludes meta_ads, whose callers pass real metric names
 * (spend/impressions) that aren't in its logical alias map.
 */
const VERIFIED_METRIC_PLATFORMS = new Set<PlatformKey>(["facebook", "instagram"]);

function supportsMetric(platform: PlatformKey, metric: string): boolean {
  if (timelineMetricAliases[platform]?.[metric]) return true;
  return !VERIFIED_METRIC_PLATFORMS.has(platform);
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

/**
 * Account-level metrics each network genuinely does not expose via Metricool
 * (verified against the live /analytics/timelines enums). The UI uses this to
 * label a blank tile "Not reported by <network>" rather than "0" or a guess.
 */
export const UNSUPPORTED_ACCOUNT_METRICS: Partial<Record<PlatformKey, string[]>> = {
  instagram: ["followersGained", "followersLost", "reactions"],
  facebook: ["reach", "following", "accountsEngaged"],
  youtube: ["pageVisits", "reach", "following", "accountsEngaged"],
};

export type SocialOverview = {
  from: string;
  to: string;
  /** Follower count on the most recent day in range (a snapshot, not a sum). */
  followers: number | null;
  following: number | null;
  /** Net follower change across the range. */
  followersChange: number | null;
  followersGained: number | null;
  followersLost: number | null;
  views: number | null;
  /** Which Metricool metric the views figure came from, for honest labelling. */
  viewsSource: "impressions" | "page_media_view" | null;
  impressions: number | null;
  reach: number | null;
  pageVisits: number | null;
  interactions: number | null;
  reactions: number | null;
  accountsEngaged: number | null;
  /** Posts + reels + stories published in range, from Metricool's own counter. */
  totalContent: number | null;
  contentBreakdown: { posts: number | null; reels: number | null; stories: number | null };
  unsupported: string[];
};

/** Count of items published in range for one content subject. */
async function fetchSubjectCount(
  platform: PlatformKey,
  subject: "posts" | "reels" | "stories",
  params?: Record<string, unknown>,
): Promise<number | null> {
  const { timezone, ...rest } = params ?? {};
  try {
    const payload = await getMetricool<any>("/metricool/" + platform + "/timeline", {
      metric: "count",
      subject,
      timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
      ...rest,
    });
    return sumSeriesOrNull(payload);
  } catch {
    return null;
  }
}

const nullOnFailure = (promise: Promise<any>) => promise.catch(() => null);

export async function fetchOverview(
  platform: PlatformKey,
  params?: Record<string, unknown>,
): Promise<{ data: SocialOverview }> {
  const series = (metric: string) =>
    supportsMetric(platform, metric)
      ? nullOnFailure(fetchTimelineSeries(platform, metric, params))
      : Promise.resolve(null);

  const [
    followers,
    following,
    impressions,
    views,
    reach,
    pageVisits,
    interactions,
    reactions,
    accountsEngaged,
    postsCount,
    netFollowers,
    followersGained,
    followersLost,
    mediaViews,
    postsSubject,
    reelsSubject,
    storiesSubject,
  ] = await Promise.all([
    series("followers"),
    series("following"),
    series("pageImpressions"),
    series("views"),
    series("reach"),
    series("pageViews"),
    series("interactions"),
    series("reactions"),
    series("accountsEngaged"),
    series("postsCount"),
    series("netFollowers"),
    series("newFollowers"),
    series("lostFollowers"),
    series("mediaViews"),
    fetchSubjectCount(platform, "posts", params),
    fetchSubjectCount(platform, "reels", params),
    fetchSubjectCount(platform, "stories", params),
  ]);

  const gained = sumSeriesOrNull(followersGained);
  const lost = sumSeriesOrNull(followersLost);
  const net = sumSeriesOrNull(netFollowers);
  // Instagram reports only a net delta; Facebook reports gained and lost.
  const followersChange =
    net ?? (gained !== null || lost !== null ? (gained ?? 0) - (lost ?? 0) : null);

  const impressionsSum = sumSeriesOrNull(impressions);
  const viewsSum = sumSeriesOrNull(views);
  const mediaViewsSum = sumSeriesOrNull(mediaViews);
  const totalContent = sumSeriesOrNull(postsCount);

  // Meta retired page-level impressions in favour of a views metric, so a
  // Facebook Page returns nothing for `pageImpressions` while `page_media_view`
  // is populated. Prefer the explicit metric and fall back to media views,
  // recording which one produced the number so the UI can label it.
  const resolvedViews = viewsSum ?? impressionsSum ?? mediaViewsSum;
  const viewsSource =
    viewsSum !== null || impressionsSum !== null
      ? "impressions"
      : mediaViewsSum !== null
        ? "page_media_view"
        : null;

  return {
    data: {
      from: params?.from as string,
      to: params?.to as string,
      followers: extractLatestValue(followers),
      following: extractLatestValue(following),
      followersChange,
      followersGained: gained,
      followersLost: lost,
      views: resolvedViews,
      viewsSource,
      impressions: impressionsSum,
      reach: sumSeriesOrNull(reach),
      pageVisits: sumSeriesOrNull(pageVisits),
      interactions: sumSeriesOrNull(interactions),
      reactions: sumSeriesOrNull(reactions),
      accountsEngaged: sumSeriesOrNull(accountsEngaged),
      totalContent,
      contentBreakdown: {
        posts: postsSubject,
        reels: reelsSubject,
        stories: storiesSubject,
      },
      unsupported: UNSUPPORTED_ACCOUNT_METRICS[platform] ?? [],
    },
  };
}

export async function fetchGrowth(
  platform: PlatformKey,
  params?: Record<string, unknown>,
) {
  const series = (metric: string) =>
    supportsMetric(platform, metric)
      ? nullOnFailure(fetchTimelineSeries(platform, metric, params))
      : Promise.resolve(null);

  const [
    impressions,
    views,
    reach,
    pageViews,
    followers,
    newFollowers,
    lostFollowers,
    netFollowers,
    interactions,
    postsCount,
    mediaViews,
  ] = await Promise.all([
    series("pageImpressions"),
    series("views"),
    series("reach"),
    series("pageViews"),
    series("followers"),
    series("newFollowers"),
    series("lostFollowers"),
    series("netFollowers"),
    series("interactions"),
    series("postsCount"),
    series("mediaViews"),
  ]);

  const impressionsPoints = extractSeriesValues(impressions);
  const viewsPoints = extractSeriesValues(views);
  const mediaViewsPoints = extractSeriesValues(mediaViews);

  return {
    data: {
      from: params?.from as string,
      to: params?.to as string,
      series: {
        impressions: impressionsPoints,
        // Same precedence as fetchOverview: explicit views, then impressions,
        // then Meta's page_media_view replacement.
        views: viewsPoints.length
          ? viewsPoints
          : impressionsPoints.length
            ? impressionsPoints
            : mediaViewsPoints,
        reach: extractSeriesValues(reach),
        pageViews: extractSeriesValues(pageViews),
        followers: extractSeriesValues(followers),
        newFollowers: extractSeriesValues(newFollowers),
        lostFollowers: extractSeriesValues(lostFollowers),
        netFollowers: extractSeriesValues(netFollowers),
        interactions: extractSeriesValues(interactions),
        postsCount: extractSeriesValues(postsCount),
      },
    },
  };
}

/**
 * Per-content-type interaction and view series, straight from Metricool's
 * subject-scoped timelines. Verified additive: Instagram posts (241,335) +
 * reels (28,740) interactions == the account-level postsInteractions total
 * (270,075) for Jun 29–Jul 29.
 *
 * Instagram/Facebook stories expose no interaction metric at all — stories
 * interactions is therefore null, not zero and not an assumed share of the
 * total.
 */
export type ContentTypeBreakdown = {
  interactions: { posts: number | null; reels: number | null; stories: number | null };
  views: { posts: number | null; reels: number | null; stories: number | null };
  series: {
    postsInteractions: TimelinePoint[];
    reelsInteractions: TimelinePoint[];
    postsViews: TimelinePoint[];
    reelsViews: TimelinePoint[];
    storiesViews: TimelinePoint[];
  };
};

export async function fetchContentTypeBreakdown(
  platform: PlatformKey,
  params?: Record<string, unknown>,
): Promise<{ data: ContentTypeBreakdown }> {
  const { timezone, ...rest } = params ?? {};
  const subjectSeries = (subject: string, metric: string) =>
    nullOnFailure(
      getMetricool<any>("/metricool/" + platform + "/timeline", {
        metric,
        subject,
        timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
        ...rest,
      }),
    );

  // Each network/subject pair accepts a different metric enum. Facebook reels
  // expose neither `views` nor `impressions` (their play counter is
  // blue_reels_play_count), and Facebook stories expose only `count` — so no
  // story view series exists there at all.
  const isFacebook = platform === "facebook";
  const postsViewsMetric = isFacebook ? "impressions" : "views";
  const reelsViewsMetric = isFacebook ? "blue_reels_play_count" : "views";

  const [
    postsInteractions,
    reelsInteractions,
    postsViews,
    reelsViews,
    storiesViews,
  ] = await Promise.all([
    subjectSeries("posts", "interactions"),
    subjectSeries("reels", "interactions"),
    subjectSeries("posts", postsViewsMetric),
    subjectSeries("reels", reelsViewsMetric),
    isFacebook ? Promise.resolve(null) : subjectSeries("stories", "impressions"),
  ]);

  return {
    data: {
      interactions: {
        posts: sumSeriesOrNull(postsInteractions),
        reels: sumSeriesOrNull(reelsInteractions),
        stories: null,
      },
      views: {
        posts: sumSeriesOrNull(postsViews),
        reels: sumSeriesOrNull(reelsViews),
        stories: sumSeriesOrNull(storiesViews),
      },
      series: {
        postsInteractions: extractSeriesValues(postsInteractions),
        reelsInteractions: extractSeriesValues(reelsInteractions),
        postsViews: extractSeriesValues(postsViews),
        reelsViews: extractSeriesValues(reelsViews),
        storiesViews: extractSeriesValues(storiesViews),
      },
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Meta Ads                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Meta's own action counters for a campaign, keyed exactly as Meta reports them.
 * These are real per-campaign funnel steps that the campaigns payload has always
 * carried; nothing here is derived or estimated.
 */
export type MetaAdsFunnel = {
  videoViews: number | null;
  engagement: number | null;
  linkClicks: number | null;
  landingPageViews: number | null;
  addToCart: number | null;
  purchases: number | null;
  leads: number | null;
  registrations: number | null;
  messagingStarted: number | null;
  estimatedAdRecall: number | null;
};

export type MetaAdsCampaign = {
  id: string;
  name: string;
  status: string | null;
  objective: string | null;
  buyingType: string | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  uniqueClicks: number | null;
  spend: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  conversions: number | null;
  results: number | null;
  resultsLabel: string | null;
  startedAt: string | null;
  funnel: MetaAdsFunnel;
  /** Every action key Meta returned, for anything the funnel doesn't name. */
  actions: Record<string, number>;
};

function buildFunnel(actions: Record<string, number>): MetaAdsFunnel {
  const pick = (...keys: string[]): number | null => {
    for (const key of keys) {
      const value = actions[key];
      if (typeof value === "number") return value;
    }
    return null;
  };

  return {
    videoViews: pick("video_play_actions.video_views", "video_view"),
    engagement: pick("post_engagement", "page_engagement"),
    linkClicks: pick("link_click", "outbound_click"),
    landingPageViews: pick("landing_page_view", "omni_landing_page_view"),
    addToCart: pick("add_to_cart", "omni_add_to_cart"),
    purchases: pick("purchase", "omni_purchase"),
    leads: pick("lead", "onsite_conversion.lead"),
    registrations: pick("complete_registration", "omni_complete_registration"),
    messagingStarted: pick("onsite_conversion.messaging_conversation_started_7d"),
    estimatedAdRecall: pick("estimated_ad_recallers"),
  };
}

const num = (value: unknown): number | null =>
  typeof value === "number" && !Number.isNaN(value) ? value : null;

/**
 * Real Meta Ads campaigns. Metricool's field is `spent` (not `spend`), and rate
 * fields (ctr/cpc/cpm) are already computed per campaign — they must never be
 * summed across campaigns.
 */
export async function fetchMetaAdsCampaigns(
  params?: Record<string, unknown>,
): Promise<{ data: MetaAdsCampaign[] }> {
  const { timezone, ...rest } = params ?? {};
  const payload = await getMetricool<any>("/metricool/meta_ads/campaigns", {
    timezone: timezone ?? METRICOOL_DEFAULT_TIMEZONE,
    ...rest,
  });
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return {
    data: items.map((item: any, index: number) => {
      const actions: Record<string, number> = {};
      for (const [key, value] of Object.entries(item.actions ?? {})) {
        if (typeof value === "number") actions[key] = value;
      }

      return {
        id: String(item.id ?? item.providerCampaignId ?? `campaign-${index}`),
        name: item.name ?? `Campaign ${index + 1}`,
        status: item.status ?? null,
        objective: item.objective ?? null,
        buyingType: item.buyingType ?? null,
        impressions: num(item.impressions),
        reach: num(item.reach),
        clicks: num(item.clicks),
        uniqueClicks: num(item.uniqueClicks),
        spend: num(item.spent ?? item.spend),
        ctr: num(item.ctr),
        cpc: num(item.cpc),
        cpm: num(item.cpm),
        conversions: num(item.conversions),
        results: num(item.results),
        resultsLabel: item.resultsLabel ?? null,
        startedAt: item.start?.dateTime ?? item.created?.dateTime ?? null,
        funnel: buildFunnel(actions),
        actions,
      };
    }),
  };
}

export type MetaAdsOverview = {
  from: string;
  to: string;
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  /** Derived from period totals — never a sum of daily rates. */
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  conversions: number | null;
  /**
   * ROAS needs purchase *value*, which Metricool does not expose (the
   * `action_value.omni_purchase` timeline returns no points and the campaigns
   * payload carries action counts only). So it stays null rather than guessed.
   */
  roas: number | null;
  /** Spend per purchase — computable from data we do have, unlike ROAS. */
  costPerPurchase: number | null;
  /** Spend per landing page view. */
  costPerLandingPageView: number | null;
  /** Account-wide funnel, summed from the per-campaign action counters. */
  funnel: MetaAdsFunnel;
  series: {
    spend: TimelinePoint[];
    impressions: TimelinePoint[];
    reach: TimelinePoint[];
    clicks: TimelinePoint[];
  };
};

export async function fetchMetaAdsOverview(
  params?: Record<string, unknown>,
): Promise<{ data: MetaAdsOverview }> {
  const series = (metric: string) =>
    nullOnFailure(fetchTimelineSeries("meta_ads", metric, params));

  const [spend, impressions, reach, clicks, campaigns] = await Promise.all([
    series("spend"),
    series("impressions"),
    series("reach"),
    series("clicks"),
    fetchMetaAdsCampaigns(params).catch(() => ({ data: [] as MetaAdsCampaign[] })),
  ]);

  const spendSum = sumSeriesOrNull(spend);
  const impressionsSum = sumSeriesOrNull(impressions);
  const clicksSum = sumSeriesOrNull(clicks);

  // Account-level `conversions` returns no points, but each campaign carries a
  // real conversion count — so the period total comes from the campaign list.
  const conversionValues = campaigns.data
    .map((campaign) => campaign.conversions)
    .filter((value): value is number => value !== null);
  const conversions = conversionValues.length
    ? conversionValues.reduce((sum, value) => sum + value, 0)
    : null;

  // Account funnel = the sum of each campaign's real action counters. A step no
  // campaign reported stays null rather than becoming a zero.
  const funnelKeys = [
    "videoViews", "engagement", "linkClicks", "landingPageViews", "addToCart",
    "purchases", "leads", "registrations", "messagingStarted", "estimatedAdRecall",
  ] as const;
  const funnel = funnelKeys.reduce((acc, key) => {
    const values = campaigns.data
      .map((campaign) => campaign.funnel[key])
      .filter((value): value is number => value !== null);
    acc[key] = values.length ? values.reduce((sum, value) => sum + value, 0) : null;
    return acc;
  }, {} as MetaAdsFunnel);

  // Rates are recomputed from totals: averaging or summing daily CPC/CPM/CTR
  // would weight a ₹5 day the same as a ₹5,000 day.
  const ctr =
    impressionsSum && clicksSum !== null ? (clicksSum / impressionsSum) * 100 : null;
  const cpc = clicksSum && spendSum !== null ? spendSum / clicksSum : null;
  const cpm =
    impressionsSum && spendSum !== null ? (spendSum / impressionsSum) * 1000 : null;

  return {
    data: {
      from: params?.from as string,
      to: params?.to as string,
      spend: spendSum,
      impressions: impressionsSum,
      reach: sumSeriesOrNull(reach),
      clicks: clicksSum,
      ctr,
      cpc,
      cpm,
      conversions,
      roas: null,
      costPerPurchase:
        spendSum !== null && funnel.purchases ? spendSum / funnel.purchases : null,
      costPerLandingPageView:
        spendSum !== null && funnel.landingPageViews
          ? spendSum / funnel.landingPageViews
          : null,
      funnel,
      series: {
        spend: extractSeriesValues(spend),
        impressions: extractSeriesValues(impressions),
        reach: extractSeriesValues(reach),
        clicks: extractSeriesValues(clicks),
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

// YouTube has its own metric names entirely (totalSubscribers, views,
// totalVideos, subscribersGained, subscribersLost), so it isn't routed through
// the generic PlatformKey aliases.
//
// /analytics/distribution does 500 as "not implemented" for youtube, so there
// are no demographics. /analytics/posts/youtube, however, DOES return the video
// catalogue (330 items on this channel) with per-video views, watch minutes,
// likes and comments — see fetchYoutubeVideos.
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
): Promise<{ data: YoutubeOverview & Partial<SocialOverview> }> {
  const [subscribers, views, totalVideos, gained, lost] = await Promise.all([
    nullOnFailure(fetchYoutubeTimeline("totalSubscribers", params)),
    nullOnFailure(fetchYoutubeTimeline("views", params)),
    nullOnFailure(fetchYoutubeTimeline("totalVideos", params)),
    nullOnFailure(fetchYoutubeTimeline("subscribersGained", params)),
    nullOnFailure(fetchYoutubeTimeline("subscribersLost", params)),
  ]);

  const gainedSum = sumSeriesOrNull(gained);
  const lostSum = sumSeriesOrNull(lost);
  const viewsSum = sumSeriesOrNull(views);

  return {
    data: {
      subscribers: extractLatestValue(subscribers),
      views: viewsSum,
      totalVideos: sumSeriesOrNull(totalVideos),
      followers: extractLatestValue(subscribers),
      impressions: viewsSum,
      followersGained: gainedSum,
      followersLost: lostSum,
      followersChange:
        gainedSum !== null || lostSum !== null ? (gainedSum ?? 0) - (lostSum ?? 0) : null,
      totalContent: sumSeriesOrNull(totalVideos),
      unsupported: UNSUPPORTED_ACCOUNT_METRICS.youtube ?? [],
      from: params?.from as string,
      to: params?.to as string,
    },
  };
}

export type YoutubeVideo = {
  videoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  watchUrl: string | null;
  publishedAt: string | null;
  views: number | null;
  watchMinutes: number | null;
  averageViewDuration: number | null;
  likes: number | null;
  dislikes: number | null;
  comments: number | null;
};

/**
 * Videos that accrued views in the requested window — verified live: a 2026
 * July range returns 324 videos published as far back as 2017, and a 2020 range
 * returns none. So `items` is "videos with activity in this period", NOT
 * "videos published in this period"; `publishedInRange` counts the latter by
 * filtering on publishedAt, because the account-level `totalVideos` timeline
 * returns no points at all for this channel.
 */
export async function fetchYoutubeVideos(
  params?: Record<string, unknown>,
): Promise<{ data: { items: YoutubeVideo[]; publishedInRange: number | null } }> {
  const { timezone, from, to, ...rest } = params ?? {};
  const payload = await getMetricool<any>("/metricool/youtube/posts", {
    from,
    to,
    ...rest,
  });
  const raw = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  const items: YoutubeVideo[] = raw.map((item: any, index: number) => ({
    videoId: String(item.videoId ?? `video-${index}`),
    title: item.title ?? "(untitled)",
    description: item.description ?? null,
    thumbnailUrl: item.thumbnailUrl ?? null,
    watchUrl: item.watchUrl ?? null,
    publishedAt: item.publishedAt?.dateTime ?? item.publishedAt ?? null,
    views: num(item.views),
    watchMinutes: num(item.watchMinutes),
    averageViewDuration: num(item.averageViewDuration),
    likes: num(item.likes),
    dislikes: num(item.dislikes),
    comments: num(item.comments),
  }));

  const fromStr = typeof from === "string" ? from.slice(0, 10) : null;
  const toStr = typeof to === "string" ? to.slice(0, 10) : null;
  const publishedInRange =
    fromStr && toStr
      ? items.filter((video) => {
          const day = video.publishedAt?.slice(0, 10);
          return Boolean(day && day >= fromStr && day <= toStr);
        }).length
      : null;

  return { data: { items, publishedInRange } };
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
