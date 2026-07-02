import { Request } from 'express';

/**
 * Dependency-free extraction of client IP + a coarse device/browser parse from the
 * request. Kept minimal on purpose — this is for a "where am I logged in" audit view,
 * not analytics, so we don't pull in a heavyweight UA library (keeps the Vercel build
 * lean). Values are best-effort and never trusted for authorization.
 */

export interface ParsedUserAgent {
  browser: string | null;
  os: string | null;
  device: string; // "Desktop" | "Mobile" | "Tablet"
}

/**
 * Resolve the originating client IP. The app sits behind proxies (Vercel / Netlify /
 * nginx on the VPS), so the socket address is the proxy — the real client is the FIRST
 * entry of `x-forwarded-for`. We deliberately parse the header ourselves instead of
 * flipping Express `trust proxy` globally, because that also changes how the rate
 * limiter derives its key. This value is display-only and must never gate access.
 */
export function getClientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0]?.trim();
    if (first) return normalizeIp(first);
  } else if (Array.isArray(xff) && xff.length > 0) {
    const first = xff[0]?.split(',')[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.trim()) return normalizeIp(real.trim());

  return normalizeIp(req.socket?.remoteAddress ?? req.ip ?? null);
}

function normalizeIp(ip: string | null): string | null {
  if (!ip) return null;
  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) → plain IPv4
  const mapped = ip.replace(/^::ffff:/i, '');
  // Loopback normalisation for readability
  if (mapped === '::1') return '127.0.0.1';
  return mapped;
}

export function parseUserAgent(uaRaw: string | undefined | null): ParsedUserAgent {
  const ua = (uaRaw || '').toLowerCase();
  if (!ua) return { browser: null, os: null, device: 'Desktop' };

  // Device class first (order matters: tablet before mobile)
  let device: ParsedUserAgent['device'] = 'Desktop';
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) {
    device = 'Tablet';
  } else if (/mobi|iphone|ipod|android|blackberry|windows phone/.test(ua)) {
    device = 'Mobile';
  }

  // Browser (order matters: more specific engines before generics)
  let browser: string | null = null;
  if (/edg\//.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/chrome|crios|chromium/.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/.test(ua)) browser = 'Firefox';
  else if (/safari/.test(ua)) browser = 'Safari';
  else if (/msie|trident/.test(ua)) browser = 'Internet Explorer';

  // OS
  let os: string | null = null;
  if (/windows nt 10/.test(ua)) os = 'Windows 10/11';
  else if (/windows/.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ipod/.test(ua)) os = 'iOS';
  else if (/mac os x|macintosh/.test(ua)) os = 'macOS';
  else if (/android/.test(ua)) os = 'Android';
  else if (/linux/.test(ua)) os = 'Linux';

  return { browser, os, device };
}
