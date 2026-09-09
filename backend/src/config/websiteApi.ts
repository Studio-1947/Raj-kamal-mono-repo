/**
 * Website (bookstore) admin API — connection config and token management.
 *
 * The Raj-Kamal website runs its own backend (backend.rajkamalprakashan.com) with a
 * separate admin auth system. Its access tokens are short-lived (~3h), so we never
 * ship one to the browser and never hard-code one. Two ways to authenticate, in order
 * of preference:
 *
 *   1. WEBSITE_API_EMAIL + WEBSITE_API_PASSWORD — we log in ourselves and keep the
 *      access token in memory, re-logging in shortly before it expires (and once more
 *      on an unexpected 401). This is the only setup that survives unattended.
 *   2. WEBSITE_API_TOKEN — a static token, useful for local testing only. It WILL
 *      expire and the route will start returning 502 until it's replaced.
 *
 * If neither is set the feature is inert: routes answer 503 with a clear message
 * rather than the process failing to boot.
 */

const DEFAULT_BASE_URL = "https://backend.rajkamalprakashan.com";
const DEFAULT_TIMEOUT_MS = 20_000;

// Re-login this long before the token's own `exp`, so an in-flight request never
// races the expiry.
const TOKEN_EXPIRY_SKEW_MS = 60_000;

export const WEBSITE_API_BASE_URL = (
  process.env.WEBSITE_API_BASE_URL || DEFAULT_BASE_URL
).replace(/\/+$/, "");

export const WEBSITE_API_TIMEOUT_MS =
  Number(process.env.WEBSITE_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

const WEBSITE_API_EMAIL = process.env.WEBSITE_API_EMAIL?.trim();
const WEBSITE_API_PASSWORD = process.env.WEBSITE_API_PASSWORD;
const WEBSITE_API_STATIC_TOKEN = process.env.WEBSITE_API_TOKEN?.trim();

export const websiteApiConfigured = Boolean(
  (WEBSITE_API_EMAIL && WEBSITE_API_PASSWORD) || WEBSITE_API_STATIC_TOKEN,
);

/** Thrown for any upstream failure; carries the status we should surface. */
export class WebsiteApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = "WebsiteApiError";
  }
}

type CachedToken = { token: string; expiresAt: number };

let cachedToken: CachedToken | null = null;
// Concurrent requests during a cold start must not each fire their own login.
let inFlightLogin: Promise<CachedToken> | null = null;

/** Read `exp` out of a JWT without verifying it — we only need the lifetime. */
function readTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { exp?: number };
    if (typeof payload.exp === "number") return payload.exp * 1000;
  } catch {
    // Not a JWT, or an unreadable one — fall through to the conservative default.
  }
  // Unknown shape: assume a short life so we re-check often rather than
  // caching a dead token for hours.
  return Date.now() + 5 * 60 * 1000;
}

async function login(): Promise<CachedToken> {
  if (!WEBSITE_API_EMAIL || !WEBSITE_API_PASSWORD) {
    throw new WebsiteApiError(
      "Website API token expired and no WEBSITE_API_EMAIL/WEBSITE_API_PASSWORD is configured to renew it.",
      503,
    );
  }

  const response = await rawFetch("/api/v1/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: WEBSITE_API_EMAIL,
      password: WEBSITE_API_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new WebsiteApiError(
      `Website API login failed (${response.status}). Check WEBSITE_API_EMAIL / WEBSITE_API_PASSWORD.`,
      502,
      response.status,
    );
  }

  const body = (await response.json()) as Record<string, any>;
  // The login response has moved shape before; accept the common spellings rather
  // than breaking on a rename.
  const token: unknown =
    body?.accessToken ?? body?.token ?? body?.data?.accessToken ?? body?.data?.token;

  if (typeof token !== "string" || !token) {
    throw new WebsiteApiError(
      "Website API login succeeded but returned no access token.",
      502,
    );
  }

  return { token, expiresAt: readTokenExpiry(token) };
}

/**
 * A valid access token, logging in if the cached one is missing or near expiry.
 * `forceRefresh` is used after an unexpected 401 (e.g. the session was revoked
 * upstream), so one retry can recover instead of failing the user's request.
 */
export async function getWebsiteApiToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_EXPIRY_SKEW_MS) {
    return cachedToken.token;
  }

  // The static token is a testing convenience — only trust it while it's still live,
  // and only when we have no credentials to do better.
  if (!forceRefresh && WEBSITE_API_STATIC_TOKEN) {
    const expiresAt = readTokenExpiry(WEBSITE_API_STATIC_TOKEN);
    if (Date.now() < expiresAt - TOKEN_EXPIRY_SKEW_MS) {
      return WEBSITE_API_STATIC_TOKEN;
    }
  }

  if (!inFlightLogin) {
    inFlightLogin = login().finally(() => {
      inFlightLogin = null;
    });
  }

  cachedToken = await inFlightLogin;
  return cachedToken.token;
}

/** Un-authenticated fetch against the website API, with a timeout. */
async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBSITE_API_TIMEOUT_MS);
  try {
    return await fetch(`${WEBSITE_API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new WebsiteApiError(
        `Website API timed out after ${WEBSITE_API_TIMEOUT_MS}ms.`,
        504,
      );
    }
    throw new WebsiteApiError(
      `Website API unreachable: ${error?.message || "network error"}.`,
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Authenticated GET against the website API. Retries exactly once on a 401 with a
 * freshly minted token — that covers an expired or revoked session without turning
 * a persistent auth failure into a retry storm.
 */
export async function websiteApiGet<T>(path: string, search?: URLSearchParams): Promise<T> {
  if (!websiteApiConfigured) {
    throw new WebsiteApiError(
      "Website API is not configured. Set WEBSITE_API_EMAIL and WEBSITE_API_PASSWORD (or WEBSITE_API_TOKEN).",
      503,
    );
  }

  const url = search?.toString() ? `${path}?${search}` : path;

  const attempt = async (forceRefresh: boolean): Promise<Response> => {
    const token = await getWebsiteApiToken(forceRefresh);
    return rawFetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  };

  let response = await attempt(false);
  if (response.status === 401) {
    cachedToken = null;
    response = await attempt(true);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new WebsiteApiError(
      `Website API responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      response.status === 404 ? 404 : 502,
      response.status,
    );
  }

  return (await response.json()) as T;
}

/** Surfaced on /health so a dead credential is visible without reading logs. */
export function getWebsiteApiHealth() {
  return {
    configured: websiteApiConfigured,
    mode: WEBSITE_API_EMAIL && WEBSITE_API_PASSWORD ? "credentials" : websiteApiConfigured ? "static-token" : "none",
    baseUrl: WEBSITE_API_BASE_URL,
    tokenExpiresAt: cachedToken ? new Date(cachedToken.expiresAt).toISOString() : null,
  };
}
