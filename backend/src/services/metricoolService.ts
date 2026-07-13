import {
  METRICOOL_ANALYTICS_DISTRIBUTION_PATH,
  METRICOOL_ANALYTICS_TIMELINES_PATH,
  METRICOOL_BLOG_ID,
  METRICOOL_DEFAULT_TIMEZONE,
  metricoolRequest,
  buildMetricoolBaseParams,
} from "../config/metricool.js";

const METRICOOL_ANALYTICS_POSTS_BASE_PATH = "/api/v2/analytics/posts";
const METRICOOL_ADMIN_SIMPLE_PROFILES_PATH = "/api/admin/simpleProfiles";

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
};

export async function fetchDistribution(params: DistributionParams) {
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
};

export async function fetchTimeline(params: TimelineParams) {
  const isMetaAds = params.network === "meta_ads";
  const baseParams: Record<string, any> = {
    metric: params.metric,
    network: isMetaAds ? "facebookads" : params.network,
    subject: params.subject ?? "account",
    from: normalizeDateParam(params.from, "from"),
    to: normalizeDateParam(params.to, "to"),
    timezone: params.timezone ?? METRICOOL_DEFAULT_TIMEZONE,
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
  },
) {
  const endpoint = `${METRICOOL_ANALYTICS_POSTS_BASE_PATH}/${network}`;
  return metricoolRequest({
    endpoint,
    searchParams: buildMetricoolBaseParams({
      from: normalizeDateParam(options?.from, "from"),
      to: normalizeDateParam(options?.to, "to"),
      page: options?.page?.toString(),
      pageSize: options?.pageSize?.toString(),
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
  },
) {
  const endpoint = `${METRICOOL_ANALYTICS_COMPETITORS_BASE_PATH}/${network}`;
  return metricoolRequest({
    endpoint,
    searchParams: buildMetricoolBaseParams({
      from: normalizeDateParam(options?.from, "from"),
      to: normalizeDateParam(options?.to, "to"),
      timezone: options?.timezone ?? METRICOOL_DEFAULT_TIMEZONE,
      limit: options?.limit?.toString() ?? "1000",
    }),
  });
}

type PublicBlog = {
  id: number;
  label?: string | null;
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

export type ConnectedNetworks = {
  brandLabel: string | null;
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

/**
 * Resolves which social networks are actually connected to the configured
 * Metricool brand (METRICOOL_BLOG_ID), straight from Metricool's own brand
 * list — so tab visibility tracks what's connected in Metricool instead of
 * a hardcoded guess.
 */
export async function fetchConnectedNetworks(): Promise<ConnectedNetworks> {
  const brands = await metricoolRequest<PublicBlog[]>({
    endpoint: METRICOOL_ADMIN_SIMPLE_PROFILES_PATH,
    searchParams: buildMetricoolBaseParams(),
  });

  const brand = Array.isArray(brands)
    ? brands.find((b) => String(b.id) === String(METRICOOL_BLOG_ID))
    : undefined;

  if (!brand) {
    throw new Error(
      `Configured METRICOOL_BLOG_ID (${METRICOOL_BLOG_ID}) was not found in this Metricool account's brand list`,
    );
  }

  return {
    brandLabel: brand.label ?? null,
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
