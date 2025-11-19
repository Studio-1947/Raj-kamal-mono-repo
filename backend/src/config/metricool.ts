const DEFAULT_TIMEOUT_MS = 15000;

export const METRICOOL_BASE_URL = process.env.METRICOOL_BASE_URL ?? '';
export const METRICOOL_API_TOKEN = process.env.METRICOOL_API_TOKEN ?? '';
export const METRICOOL_BRAND_ID = process.env.METRICOOL_BRAND_ID;
export const METRICOOL_DEFAULT_TIMEZONE =
  process.env.METRICOOL_DEFAULT_TIMEZONE ?? 'Asia/Kolkata';
export const METRICOOL_USER_ID = process.env.METRICOOL_USER_ID ?? '';
export const METRICOOL_BLOG_ID = process.env.METRICOOL_BLOG_ID ?? '';

export const METRICOOL_ANALYTICS_ENDPOINT_OVERVIEW =
  '<FILL_METRICOOL_ANALYTICS_ENDPOINT_OVERVIEW>';
export const METRICOOL_ANALYTICS_ENDPOINT_FACEBOOK =
  '<FILL_METRICOOL_ANALYTICS_ENDPOINT_FACEBOOK>';
export const METRICOOL_ANALYTICS_ENDPOINT_INSTAGRAM =
  '<FILL_METRICOOL_ANALYTICS_ENDPOINT_INSTAGRAM>';
export const METRICOOL_ANALYTICS_ENDPOINT_TWITTER =
  '<FILL_METRICOOL_ANALYTICS_ENDPOINT_TWITTER>';
export const METRICOOL_ANALYTICS_ENDPOINT_LINKEDIN =
  '<FILL_METRICOOL_ANALYTICS_ENDPOINT_LINKEDIN>';
export const METRICOOL_ANALYTICS_ENDPOINT_YOUTUBE =
  '<FILL_METRICOOL_ANALYTICS_ENDPOINT_YOUTUBE>';
export const METRICOOL_ANALYTICS_ENDPOINT_TIKTOK =
  '<FILL_METRICOOL_ANALYTICS_ENDPOINT_TIKTOK>';

export const METRICOOL_ANALYTICS_DISTRIBUTION_PATH =
  '/api/v2/analytics/distribution';
export const METRICOOL_ANALYTICS_TIMELINES_PATH =
  '/api/v2/analytics/timelines';

// Admin / profile info (confirmed working from Postman)
export const METRICOOL_ADMIN_PROFILE_PATH = '/api/admin/profile';

export type MetricoolMethod = 'GET' | 'POST';

export type MetricoolRequestOptions = {
  method?: MetricoolMethod;
  endpoint: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
};

type MetricoolErrorShape = {
  ok: false;
  status: number;
  code?: string;
  message: string;
  details?: unknown;
};

function buildUrl(endpoint: string, searchParams?: MetricoolRequestOptions['searchParams']): string {
  if (!METRICOOL_BASE_URL) {
    throw new Error('Missing METRICOOL_BASE_URL');
  }

  const base = METRICOOL_BASE_URL.replace(/\/+$/, '');
  const path = endpoint.replace(/^\/+/, '');
  const url = new URL(`${base}/${path}`);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

export async function metricoolRequest<T = unknown>(
  options: MetricoolRequestOptions
): Promise<T> {
  if (!METRICOOL_API_TOKEN) {
    throw new Error('Missing METRICOOL_API_TOKEN');
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  const url = buildUrl(options.endpoint, options.searchParams);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Mc-Auth': METRICOOL_API_TOKEN,
  };

  try {
    const response = await fetch(
      url,
      {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : null,
        signal: controller.signal,
      } as RequestInit
    );

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorShape: MetricoolErrorShape = {
        ok: false,
        status: response.status,
        message:
          typeof payload === 'string'
            ? payload
            : (payload?.message as string) || 'Metricool request failed',
        code: typeof payload === 'object' ? (payload as any).code : undefined,
        details: typeof payload === 'object' ? payload : undefined,
      };
      const err = new Error(errorShape.message);
      (err as any).status = errorShape.status;
      (err as any).code = errorShape.code;
      (err as any).details = errorShape.details;
      throw err;
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error('Metricool request timed out');
      (timeoutError as any).status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export type MetricoolAnalyticsParams = {
  from?: string | null;
  to?: string | null;
  metric: string;
  network: string;
  timezone?: string;
  subject?: string;
};

export function buildMetricoolAnalyticsParams(
  params: MetricoolAnalyticsParams
): Record<string, string> {
  if (!METRICOOL_USER_ID || !METRICOOL_BLOG_ID || !METRICOOL_API_TOKEN) {
    throw new Error('Missing METRICOOL_USER_ID, METRICOOL_BLOG_ID or METRICOOL_API_TOKEN');
  }

  const searchParams: Record<string, string> = {
    metric: params.metric,
    network: params.network,
    userId: METRICOOL_USER_ID,
    blogId: METRICOOL_BLOG_ID,
    userToken: METRICOOL_API_TOKEN,
  };

  if (params.from) {
    searchParams.from = params.from;
  }
  if (params.to) {
    searchParams.to = params.to;
  }
  if (params.timezone) {
    searchParams.timezone = params.timezone;
  }

  searchParams.subject = params.subject || 'account';

  return searchParams;
}
