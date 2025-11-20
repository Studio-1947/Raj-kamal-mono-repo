import {
  METRICOOL_ANALYTICS_DISTRIBUTION_PATH,
  METRICOOL_ANALYTICS_TIMELINES_PATH,
  METRICOOL_DEFAULT_TIMEZONE,
  metricoolRequest,
  buildMetricoolBaseParams,
} from '../config/metricool.js';

const METRICOOL_ANALYTICS_POSTS_BASE_PATH = '/api/v2/analytics/posts';

function normalizeDateParam(value: string | undefined, type: 'from' | 'to'): string | undefined {
  if (!value) return undefined;
  return value.includes('T')
    ? value
    : type === 'from'
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
    if (metricName.includes('reel')) subject = 'reels';
    else if (metricName.includes('story')) subject = 'stories';
    else if (metricName.includes('post')) subject = 'posts';
    else if (metricName.includes('competitor')) subject = 'competitors';
    else subject = 'account';
  }

  return metricoolRequest({
    endpoint: METRICOOL_ANALYTICS_DISTRIBUTION_PATH,
    searchParams: buildMetricoolBaseParams({
      metric: params.metric,
      network: params.network,
      from: normalizeDateParam(params.from, 'from'),
      to: normalizeDateParam(params.to, 'to'),
      timezone: params.timezone ?? METRICOOL_DEFAULT_TIMEZONE,
      subject,
      scope: params.scope ?? undefined,
    }),
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
  return metricoolRequest({
    endpoint: METRICOOL_ANALYTICS_TIMELINES_PATH,
    searchParams: buildMetricoolBaseParams({
      metric: params.metric,
      network: params.network,
      from: normalizeDateParam(params.from, 'from'),
      to: normalizeDateParam(params.to, 'to'),
      timezone: params.timezone ?? METRICOOL_DEFAULT_TIMEZONE,
      subject: params.subject ?? 'account',
    }),
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
  }
) {
  const endpoint = `${METRICOOL_ANALYTICS_POSTS_BASE_PATH}/${network}`;
  return metricoolRequest({
    endpoint,
    searchParams: buildMetricoolBaseParams({
      from: normalizeDateParam(options?.from, 'from'),
      to: normalizeDateParam(options?.to, 'to'),
      page: options?.page?.toString(),
      pageSize: options?.pageSize?.toString(),
      subject: options?.subject,
    }),
  });
}

