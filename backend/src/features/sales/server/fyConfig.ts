// ─────────────────────────────────────────────────────────────────────────────
// fyConfig.ts
//
// Single source of truth for Indian financial-year handling across the sales
// feature. The live tables hold the CURRENT FY (refreshed by the daily sync);
// completed years live in the `offline_sales_history` archive, discriminated by
// `financialYear`.
//
// When a new past year is archived (via scripts/seed-history.ts), add its label
// to ARCHIVE_FYS — newest first — and every reader (total-offline summary, YoY,
// the BookFair sub-fair breakdown, …) picks it up automatically. Nothing else
// should hardcode an FY string.
// ─────────────────────────────────────────────────────────────────────────────

// Financial years available in the history archive (newest first).
export const ARCHIVE_FYS = ['2025-26'] as const;
export type ArchiveFy = (typeof ARCHIVE_FYS)[number];

/** Canonical label for the current (live) financial year, e.g. "2026-27". */
export function currentFyLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? y : y - 1; // FY starts 1 Apr
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export const CURRENT_FY = currentFyLabel();

/** Newest archived financial year (the one "Last Year" resolves to). */
export function latestArchiveFy(): string {
  return ARCHIVE_FYS[0];
}

/** True when `fy` is a recognised archived (completed) year. */
export function isArchiveFy(fy: string): boolean {
  return (ARCHIVE_FYS as readonly string[]).includes(fy);
}

// '', 'current', 'this' → live current FY. 'previous'/'last' → newest archived FY.
// An explicit archived label (e.g. '2025-26') selects that archive year.
export function resolveFy(param?: string): { fy: string; isHistory: boolean } {
  const raw = (param ?? '').trim();
  const p = raw.toLowerCase();
  if (!p || p === 'current' || p === 'this') return { fy: CURRENT_FY, isHistory: false };
  if (p === 'previous' || p === 'last') return { fy: latestArchiveFy(), isHistory: true };
  if (isArchiveFy(raw)) return { fy: raw, isHistory: true };
  return { fy: CURRENT_FY, isHistory: false };
}

// Last instant of a financial year (e.g. "2025-26" → 2026-03-31 23:59:59.999 UTC).
// Used to anchor "trailing window" analytics for a COMPLETED past year, where
// "now" is meaningless (the year ended months ago).
export function fyEndDate(fy: string): Date {
  const startYear = parseInt(fy.slice(0, 4), 10);
  return new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999));
}
