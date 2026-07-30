import {
  METRICOOL_ANALYTICS_DISTRIBUTION_PATH,
  METRICOOL_ANALYTICS_TIMELINES_PATH,
  METRICOOL_API_TOKEN,
  METRICOOL_BASE_URL,
  METRICOOL_BLOG_ID,
  METRICOOL_DEFAULT_TIMEZONE,
  METRICOOL_USER_ID,
  METRICOOL_BLOCKED_BRANDS,
  metricoolRequest,
  buildMetricoolBaseParams,
} from "../config/metricool.js";

const METRICOOL_ANALYTICS_POSTS_BASE_PATH = "/api/v2/analytics/posts";
const METRICOOL_ADMIN_SIMPLE_PROFILES_PATH = "/api/admin/simpleProfiles";

// Reels and stories are separate collections in Metricool, not a filter on the
// posts list: /analytics/posts/instagram returns only FEED_* items and ignores a
// `subject` query param entirely (verified against the live API — passing
// subject=reels still returns the same 90 feed posts). Their own endpoints
// return the real items with their own field shapes.
const METRICOOL_SUBJECT_BASE_PATHS: Record<string, string> = {
  posts: METRICOOL_ANALYTICS_POSTS_BASE_PATH,
  reels: "/api/v2/analytics/reels",
  stories: "/api/v2/analytics/stories",
};

function resolvePostsBasePath(subject?: string): string {
  if (!subject) return METRICOOL_ANALYTICS_POSTS_BASE_PATH;
  return (
    METRICOOL_SUBJECT_BASE_PATHS[subject.trim().toLowerCase()] ??
    METRICOOL_ANALYTICS_POSTS_BASE_PATH
  );
}

function normalizeDateParam(
  value: string | undefined,
  type: "from" | "to",
): string | undefined {
  if (!value) return undefined;
  return value.includes("T")
    ? value
    : type === "from"
      ? `${value}T00:00:00`
      : `${value}T23:59:59`;
}

export type DistributionParams = {
  metric: string;
  network: string;
  from?: string | undefined;
  to?: string | undefined;
  timezone?: string | undefined;
  subject?: string | undefined;
  scope?: string | undefined;
  blogId?: string | undefined;
};

export async function fetchDistribution(params: DistributionParams) {
  await assertBlogIdNotBlocked(params.blogId);
  let subject = params.subject?.trim();

  if (!subject || subject.length === 0) {
    // Metricool only accepts a small set of subjects for distribution endpoints.
    // Pick the closest match based on the metric name and default to `account`
    const metricName = params.metric.toLowerCase();
    if (metricName.includes("reel")) subject = "reels";
    else if (metricName.includes("story")) subject = "stories";
    else if (metricName.includes("post")) subject = "posts";
    else if (metricName.includes("competitor")) subject = "competitors";
    else subject = "account";
  }

  const isMetaAds = params.network === "meta_ads";
  const baseParams: Record<string, any> = {
    metric: params.metric,
    network: isMetaAds ? "facebookads" : params.network,
    subject,
    scope: params.scope ?? undefined,
    from: normalizeDateParam(params.from, "from"),
    to: normalizeDateParam(params.to, "to"),
    timezone: params.timezone ?? METRICOOL_DEFAULT_TIMEZONE,
    blogId: params.blogId,
  };

  return metricoolRequest({
    endpoint: METRICOOL_ANALYTICS_DISTRIBUTION_PATH,
    searchParams: buildMetricoolBaseParams(baseParams),
  });
}

export type TimelineParams = {
  metric: string;
  network: string;
  from?: string | undefined;
  to?: string | undefined;
  timezone?: string | undefined;
  subject?: string | undefined;
  blogId?: string | undefined;
};

const VALID_META_ADS_METRICS = new Set([
  "impressions",
  "reach",
  "spend",
  "clicks",
  "cpc",
  "cpm",
  "ctr",
  "conversions",
  "purchase_roas",
  "action_value.omni_purchase",
]);

const META_ADS_METRIC_MAP: Record<string, string> = {
  pageViews: "clicks",
  likes: "clicks",
  followers: "reach",
  newFollowers: "reach",
  lostFollowers: "reach",
  pageImpressions: "impressions",
};

function normalizeMetaAdsMetric(metric: string): string {
  if (VALID_META_ADS_METRICS.has(metric)) return metric;
  return META_ADS_METRIC_MAP[metric] ?? "impressions";
}

export async function fetchTimeline(params: TimelineParams) {
  await assertBlogIdNotBlocked(params.blogId);
  const isMetaAds = params.network === "meta_ads" || params.network === "facebookads";
  const metric = isMetaAds
    ? normalizeMetaAdsMetric(params.metric)
    : params.metric;

  const baseParams: Record<string, any> = {
    metric,
    network: isMetaAds ? "facebookads" : params.network,
    subject: params.subject ?? "account",
    from: normalizeDateParam(params.from, "from"),
    to: normalizeDateParam(params.to, "to"),
    timezone: params.timezone ?? METRICOOL_DEFAULT_TIMEZONE,
    blogId: params.blogId,
  };

  return metricoolRequest({
    endpoint: METRICOOL_ANALYTICS_TIMELINES_PATH,
    searchParams: buildMetricoolBaseParams(baseParams),
  });
}

export async function fetchPosts(
  network: string,
  options?: {
    from?: string | undefined;
    to?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    subject?: string | undefined;
    blogId?: string | undefined;
  },
) {
  await assertBlogIdNotBlocked(options?.blogId);
  const targetNetwork = (network === "meta_ads" || network === "facebookads") ? "facebook" : network;
  const endpoint = `${resolvePostsBasePath(options?.subject)}/${targetNetwork}`;
  return metricoolRequest({
    endpoint,
    searchParams: buildMetricoolBaseParams({
      from: normalizeDateParam(options?.from, "from"),
      to: normalizeDateParam(options?.to, "to"),
      page: options?.page?.toString(),
      pageSize: options?.pageSize?.toString(),
      blogId: options?.blogId,
    }),
  });
}

const METRICOOL_ANALYTICS_CAMPAIGNS_BASE_PATH =
  "/api/v2/analytics/campaigns";

/**
 * Ad campaigns. This is the only real source of per-campaign data for Meta Ads —
 * `/analytics/posts/facebookads` is a 404, and mapping meta_ads onto the
 * Facebook posts endpoint (as the posts path does) returns Page posts, not ads.
 * Verified live: campaign impressions and clicks sum to exactly the
 * account-level timeline totals.
 */
export async function fetchCampaigns(
  network: string,
  options?: {
    from?: string | undefined;
    to?: string | undefined;
    timezone?: string | undefined;
    blogId?: string | undefined;
  },
) {
  await assertBlogIdNotBlocked(options?.blogId);
  const targetNetwork =
    network === "meta_ads" || network === "facebook" ? "facebookads" : network;
  return metricoolRequest({
    endpoint: `${METRICOOL_ANALYTICS_CAMPAIGNS_BASE_PATH}/${targetNetwork}`,
    searchParams: buildMetricoolBaseParams({
      from: normalizeDateParam(options?.from, "from"),
      to: normalizeDateParam(options?.to, "to"),
      timezone: options?.timezone ?? METRICOOL_DEFAULT_TIMEZONE,
      blogId: options?.blogId,
    }),
  });
}

const METRICOOL_ANALYTICS_COMPETITORS_BASE_PATH =
  "/api/v2/analytics/competitors";

export async function fetchCompetitors(
  network: string,
  options?: {
    from?: string | undefined;
    to?: string | undefined;
    timezone?: string | undefined;
    limit?: number | undefined;
    blogId?: string | undefined;
  },
) {
  await assertBlogIdNotBlocked(options?.blogId);
  const endpoint = `${METRICOOL_ANALYTICS_COMPETITORS_BASE_PATH}/${network}`;
  return metricoolRequest({
    endpoint,
    searchParams: buildMetricoolBaseParams({
      from: normalizeDateParam(options?.from, "from"),
      to: normalizeDateParam(options?.to, "to"),
      timezone: options?.timezone ?? METRICOOL_DEFAULT_TIMEZONE,
      limit: options?.limit?.toString() ?? "1000",
      blogId: options?.blogId,
    }),
  });
}

type PublicBlog = {
  id: number;
  label?: string | null;
  picture?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  facebookAds?: string | null;
  linkedinCompany?: string | null;
  tiktok?: string | null;
  twitter?: string | null;
  threads?: string | null;
  pinterest?: string | null;
  gmb?: string | null;
  bluesky?: string | null;
};

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

export type ConnectedNetworks = NetworkFlags & {
  brandLabel: string | null;
};

export type Brand = NetworkFlags & {
  blogId: string;
  label: string | null;
  picture: string | null;
};

function toNetworkFlags(brand: PublicBlog): NetworkFlags {
  return {
    facebook: Boolean(brand.facebook),
    instagram: Boolean(brand.instagram),
    youtube: Boolean(brand.youtube),
    meta_ads: Boolean(brand.facebookAds),
    linkedin: Boolean(brand.linkedinCompany),
    tiktok: Boolean(brand.tiktok),
    twitter: Boolean(brand.twitter),
    threads: Boolean(brand.threads),
    pinterest: Boolean(brand.pinterest),
    gmb: Boolean(brand.gmb),
    bluesky: Boolean(brand.bluesky),
  };
}

export function isBrandBlocked(brand: { id?: number | string; label?: string | null }): boolean {
  if (!brand) return false;
  const label = (brand.label ?? "").trim().toLowerCase();
  const idStr = String(brand.id ?? "").trim().toLowerCase();

  return METRICOOL_BLOCKED_BRANDS.some((blocked) => {
    if (!blocked) return false;
    return (
      (label && (label === blocked || label.includes(blocked))) ||
      (idStr && idStr === blocked)
    );
  });
}

export async function assertBlogIdNotBlocked(blogId?: string): Promise<void> {
  if (!blogId) return;
  const brands = await fetchAllBrands();
  const target = brands.find((b) => String(b.id) === String(blogId));
  if (target && isBrandBlocked(target)) {
    const error = new Error("Access to this brand profile is restricted.");
    (error as any).status = 403;
    throw error;
  }
}

// simpleProfiles is cached 5 minutes by metricoolRequest, so listing all
// brands and resolving a single brand's connected networks share one cheap
// underlying call instead of hammering Metricool per lookup.
async function fetchAllBrands(): Promise<PublicBlog[]> {
  const brands = await metricoolRequest<PublicBlog[]>({
    endpoint: METRICOOL_ADMIN_SIMPLE_PROFILES_PATH,
    searchParams: buildMetricoolBaseParams(),
  });
  return Array.isArray(brands) ? brands : [];
}

/** All brands on this Metricool account, with their connected networks and logo. */
export async function listBrands(): Promise<Brand[]> {
  const brands = await fetchAllBrands();
  return brands
    .filter((brand) => brand.label && brand.label.trim().length > 0)
    .filter((brand) => !isBrandBlocked(brand))
    .map((brand) => ({
      blogId: String(brand.id),
      label: brand.label ?? null,
      picture: brand.picture ?? null,
      ...toNetworkFlags(brand),
    }));
}

/**
 * Resolves which social networks are actually connected for a given brand
 * (defaults to METRICOOL_BLOG_ID), straight from Metricool's own brand list —
 * so tab visibility tracks what's connected in Metricool instead of a
 * hardcoded guess.
 */
export async function fetchConnectedNetworks(
  blogId: string = METRICOOL_BLOG_ID,
): Promise<ConnectedNetworks> {
  const brands = await fetchAllBrands();
  const brand = brands.find((b) => String(b.id) === String(blogId));

  if (!brand) {
    throw new Error(
      `blogId (${blogId}) was not found in this Metricool account's brand list`,
    );
  }

  if (isBrandBlocked(brand)) {
    const error = new Error("Access to this brand profile is restricted.");
    (error as any).status = 403;
    throw error;
  }

  return {
    brandLabel: brand.label ?? null,
    ...toNetworkFlags(brand),
  };
}

/**
 * Verifies the Metricool integration actually works, once, at process
 * startup — so a bad token/userId/blogId is a loud console error at boot
 * instead of a silent "Sample data" badge nobody notices for weeks.
 */
export async function runMetricoolStartupCheck(): Promise<void> {
  if (!METRICOOL_BASE_URL || !METRICOOL_API_TOKEN || !METRICOOL_USER_ID || !METRICOOL_BLOG_ID) {
    console.error(
      "[Metricool] NOT CONFIGURED — missing one of METRICOOL_BASE_URL / METRICOOL_API_TOKEN / " +
        "METRICOOL_USER_ID / METRICOOL_BLOG_ID. The Social Media dashboard will show sample data only.",
    );
    return;
  }

  try {
    const networks = await fetchConnectedNetworks();
    const connected = (
      ["facebook", "instagram", "youtube", "meta_ads", "linkedin", "tiktok", "twitter", "threads", "pinterest", "gmb", "bluesky"] as const
    ).filter((key) => networks[key]);
    console.log(
      `[Metricool] OK — connected to brand "${networks.brandLabel}" (blogId ${METRICOOL_BLOG_ID}). ` +
        `Networks: ${connected.join(", ") || "none"}`,
    );
  } catch (error: any) {
    console.error(
      `[Metricool] STARTUP CHECK FAILED — token/userId/blogId may be wrong or expired. ` +
        `Status: ${error?.status ?? "unknown"}. Message: ${error?.message ?? error}`,
    );
  }
}
