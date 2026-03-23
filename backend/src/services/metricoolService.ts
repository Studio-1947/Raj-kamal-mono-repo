import {
  METRICOOL_ANALYTICS_DISTRIBUTION_PATH,
  METRICOOL_ANALYTICS_TIMELINES_PATH,
  METRICOOL_DEFAULT_TIMEZONE,
  metricoolRequest,
  buildMetricoolBaseParams,
} from "../config/metricool.js";

const METRICOOL_ANALYTICS_POSTS_BASE_PATH = "/api/v2/analytics/posts";

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
  };

  if (isMetaAds) {
    // Specific overrides for Facebook Ads as requested
    baseParams.userId = "4145269";
    baseParams.blogId = "5370120";
    // Convert YYYY-MM-DD to YYYYMMDD
    if (params.from) {
      baseParams.start = params.from.replace(/-/g, "");
    }
    if (params.to) {
      baseParams.end = params.to.replace(/-/g, "");
    }
    baseParams.timezone = "Asia/Calcutta";
    // Keep from/to as they are required by the API validation
    baseParams.from = normalizeDateParam(params.from, "from");
    baseParams.to = normalizeDateParam(params.to, "to");
  } else {
    baseParams.from = normalizeDateParam(params.from, "from");
    baseParams.to = normalizeDateParam(params.to, "to");
    baseParams.timezone = params.timezone ?? METRICOOL_DEFAULT_TIMEZONE;
  }


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
  };

  if (isMetaAds) {
    // Specific overrides for Facebook Ads as requested
    baseParams.userId = "4145269";
    baseParams.blogId = "5370120";
    // Convert YYYY-MM-DD to YYYYMMDD
    if (params.from) {
      baseParams.start = params.from.replace(/-/g, "");
    }
    if (params.to) {
      baseParams.end = params.to.replace(/-/g, "");
    }
    baseParams.timezone = "Asia/Calcutta";
    // Keep from/to as they are required by the API validation
    baseParams.from = normalizeDateParam(params.from, "from");
    baseParams.to = normalizeDateParam(params.to, "to");
  } else {
    baseParams.from = normalizeDateParam(params.from, "from");
    baseParams.to = normalizeDateParam(params.to, "to");
    baseParams.timezone = params.timezone ?? METRICOOL_DEFAULT_TIMEZONE;
  }


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
