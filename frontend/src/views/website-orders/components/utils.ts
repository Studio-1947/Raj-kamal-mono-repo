/** Presentation helpers shared across the Website Orders page. */

/**
 * Status palette. Colours encode state, not decoration: amber for "waiting on us",
 * blue for "in motion", green for done, rose for cancelled — so a full table scans
 * at a glance without reading a single label.
 */
export const STATUS_STYLES: Record<string, { chip: string; dot: string; hex: string }> = {
  PENDING: { chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", hex: "#F59E0B" },
  PENDING_LABEL: { chip: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500", hex: "#F97316" },
  PENDING_DISPATCH: { chip: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", hex: "#3B82F6" },
  COMPLETED: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", hex: "#10B981" },
  CANCELLED: { chip: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", hex: "#F43F5E" },
  UNKNOWN: { chip: "bg-gray-50 text-gray-600 border-gray-200", dot: "bg-gray-400", hex: "#9CA3AF" },
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  CAPTURED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  REFUNDED: "bg-violet-50 text-violet-700 border-violet-200",
  UNKNOWN: "bg-gray-50 text-gray-600 border-gray-200",
};

export function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.UNKNOWN;
}

export function paymentStatusStyle(status: string) {
  return PAYMENT_STATUS_STYLES[status] ?? PAYMENT_STATUS_STYLES.UNKNOWN;
}

/** `YYYY-MM-DD` in local time — `toISOString` would shift the day for IST users. */
export function toDateInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInput(date);
}

/** Quick ranges, matching the vocabulary used on the sales dashboards. */
export const DATE_PRESETS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
] as const;

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Short axis label for the daily trend — full dates crowd the x-axis. */
export function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}

/** Titlecase an upstream enum: PENDING_DISPATCH → "Pending dispatch". */
export function humanizeEnum(value: string | null): string {
  if (!value) return "—";
  const words = value.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
