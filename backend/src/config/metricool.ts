const DEFAULT_TIMEOUT_MS = 15000;
const REQUEST_INTERVAL_MS = 1500; // 1.5 seconds between batches (more conservative)
const MAX_PARALLEL_REQUESTS = 1; // Process requests one at a time to avoid rate limits

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

// Optimized queue-based rate limiting with batching
let requestQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;
let lastBatchTime = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastBatch = now - lastBatchTime;
    
    // Wait if needed to maintain interval between batches
    if (timeSinceLastBatch < REQUEST_INTERVAL_MS) {
      await sleep(REQUEST_INTERVAL_MS - timeSinceLastBatch);
    }

    // Process up to MAX_PARALLEL_REQUESTS in parallel
    const batch = requestQueue.splice(0, MAX_PARALLEL_REQUESTS);
    
    try {
      // Execute batch in parallel
      await Promise.all(batch.map(task => task()));
    } catch (error) {
      console.error('Batch request failed:', error);
    }
    
    lastBatchTime = Date.now();
  }

  isProcessingQueue = false;
}

function queueRequest<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const wrappedTask = async () => {
      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    requestQueue.push(wrappedTask);
    processQueue();
  });
}

export function buildMetricoolBaseParams(
  extra?: Record<string, string | number | undefined | null>
): Record<string, string> {
  if (!METRICOOL_USER_ID || !METRICOOL_BLOG_ID || !METRICOOL_API_TOKEN) {
    throw new Error('Missing METRICOOL_USER_ID, METRICOOL_BLOG_ID or METRICOOL_API_TOKEN');
  }

  const params: Record<string, string> = {
    userId: METRICOOL_USER_ID,
    blogId: METRICOOL_BLOG_ID,
    userToken: METRICOOL_API_TOKEN,
  };

  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    });
  }

  return params;
}

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

  const normalizedBase = METRICOOL_BASE_URL.endsWith('/')
    ? METRICOOL_BASE_URL
    : `${METRICOOL_BASE_URL}/`;
  const baseUrl = new URL(normalizedBase);
  const basePath = baseUrl.pathname.replace(/^\/+/, '').replace(/\/+$/, '');

  let normalizedEndpoint = endpoint.trim().replace(/^\/+/, '');

  if (basePath) {
    if (normalizedEndpoint === basePath) {
      normalizedEndpoint = '';
    } else if (normalizedEndpoint.startsWith(`${basePath}/`)) {
      normalizedEndpoint = normalizedEndpoint.slice(basePath.length + 1);
    }
  }

  const url = new URL(normalizedEndpoint, baseUrl);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Start with 2 seconds

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // If we get a 429, retry with exponential backoff
    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : RETRY_DELAY_MS * (MAX_RETRIES - retries + 1);
      
      console.warn(`Rate limited (429). Retrying after ${delayMs}ms. Retries left: ${retries - 1}`);
      await sleep(delayMs);
      return fetchWithRetry(url, options, retries - 1);
    }
    
    return response;
  } catch (error) {
    if (retries > 0 && error instanceof Error && error.name !== 'AbortError') {
      const delayMs = RETRY_DELAY_MS * (MAX_RETRIES - retries + 1);
      console.warn(`Request failed. Retrying after ${delayMs}ms. Retries left: ${retries - 1}`);
      await sleep(delayMs);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export async function metricoolRequest<T = unknown>(
  options: MetricoolRequestOptions
): Promise<T> {
  if (!METRICOOL_API_TOKEN) {
    throw new Error('Missing METRICOOL_API_TOKEN');
  }

  return queueRequest(async () => {
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
      const response = await fetchWithRetry(
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
        // Enhanced error message for 429
        let errorMessage = typeof payload === 'string'
          ? payload
          : (payload?.message as string) || 'Metricool request failed';
        
        if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. The Metricool API is temporarily unavailable. Please wait a moment and try again.';
        }

        const errorShape: MetricoolErrorShape = {
          ok: false,
          status: response.status,
          message: errorMessage,
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
  });
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
