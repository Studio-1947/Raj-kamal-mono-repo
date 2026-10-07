import React from "react";
import {
  FiSearch,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiSliders,
  FiChevronDown,
  FiChevronUp,
  FiLock,
  FiUnlock,
} from "react-icons/fi";
import {
  DEFAULT_CART_FILTERS,
  type AgeBucketKey,
  type CartFilterState,
  type CartSort,
} from "../../../services/websiteCartsService";
import { GroupInfoButton } from "./GroupInfo";
import { DATE_PRESETS, daysAgo, toDateInput } from "../../website-orders/components/utils";
import { CheckboxDropdown, dateInputClass, openPicker } from "../../website-orders/components/OrdersFilterBar";

interface Props {
  filters: CartFilterState;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onChange: (patch: Partial<CartFilterState>) => void;
  onApply: (next: CartFilterState) => void;
  onReset: () => void;
  onRefresh: () => void;
  onExport: () => void;
  isFetching: boolean;
  isExporting: boolean;
  isLocked: boolean;
  onToggleLock: () => void;
  matchCount: number | undefined;
  groupStats?: Record<string, { count: number; value: number }> | undefined;
}

/** One-click audiences. Each is just a filter preset, so it can be tweaked afterwards. */
const SEGMENTS: { label: string; hint: string; patch: Partial<CartFilterState> }[] = [
  {
    label: "Hot leads",
    hint: "Active in the last 7 days, contactable, everything in stock, ₹500+",
    patch: { ages: ["today", "week"], contact: "reachable", stock: "clean", minValue: "500", sort: "value" },
  },
  {
    label: "Win-back",
    hint: "Quiet for 7–30 days but still contactable and in stock",
    patch: { ages: ["month"], contact: "reachable", stock: "clean", sort: "value" },
  },
  { label: "High value", hint: "Carts of ₹5,000 or more", patch: { minValue: "5000", sort: "value" } },
  {
    label: "Bulk buyers",
    hint: "10 or more books in one cart (libraries, institutions, resellers)",
    patch: { minItems: "10", sort: "items" },
  },
  {
    label: "Blocked by stock",
    hint: "Carts holding at least one out-of-stock book",
    patch: { stock: "issues", sort: "value" },
  },
  { label: "Used a discount", hint: "Carts with a coupon or discount applied", patch: { hasDiscount: true, sort: "value" } },
];

const AGE_OPTIONS: AgeBucketKey[] = ["today", "week", "month", "older"];
const AGE_LABELS: Record<string, string> = {
  ALL: "Any wait time",
  today: "Under 24 hours",
  week: "1–7 days",
  month: "7–30 days",
  older: "30+ days",
};

const GROUP_OPTIONS = ["GENERAL", "PRIME_READER"];
const GROUP_LABELS: Record<string, string> = {
  ALL: "All groups",
  GENERAL: "General",
  PRIME_READER: "Prime reader",
};

const SORT_OPTIONS: { value: CartSort; label: string }[] = [
  { value: "recent", label: "Most recent activity" },
  { value: "oldest", label: "Oldest first" },
  { value: "value", label: "Highest value" },
  { value: "value_asc", label: "Lowest value" },
  { value: "items", label: "Most books" },
];

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </label>
  );
}

/** How many filters differ from the defaults (sort doesn't count: it doesn't narrow anything). */
export function countActiveFilters(f: CartFilterState): number {
  let n = 0;
  if (f.search) n++;
  if (f.product) n++;
  if (f.dateFrom || f.dateTo) n++;
  if (f.ages.length) n++;
  if (f.minValue || f.maxValue) n++;
  if (f.minItems || f.maxItems) n++;
  if (f.groups.length) n++;
  if (f.contact) n++;
  if (f.stock) n++;
  if (f.hasDiscount) n++;
  return n;
}

export const CartFilterPanel: React.FC<Props> = ({
  filters,
  searchDraft,
  onSearchDraftChange,
  onChange,
  onApply,
  onReset,
  onRefresh,
  onExport,
  isFetching,
  isExporting,
  isLocked,
  onToggleLock,
  matchCount,
  groupStats,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const active = countActiveFilters(filters);
  const today = toDateInput(new Date());

  // A preset is "on" only when both bounds still match what it would set — editing
  // either date by hand should visibly drop the highlight.
  const allTime = !filters.dateFrom && !filters.dateTo;
  const activePreset = DATE_PRESETS.find((p) => filters.dateFrom === daysAgo(p.days) && filters.dateTo === today);

  return (
    <div className="space-y-2.5 rounded-3xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
      {/* Segments */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Segments</span>
        {SEGMENTS.map((s) => (
          <button
            key={s.label}
            type="button"
            title={s.hint}
            onClick={() => onApply({ ...DEFAULT_CART_FILTERS, ...s.patch })}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Same layout as the Website Orders filter bar */}
      <div className="relative z-20 flex min-h-[40px] w-full flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ dateFrom: "", dateTo: "" })}
            className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition ${
              allTime ? "bg-slate-900 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange({ dateFrom: daysAgo(preset.days), dateTo: today })}
              className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition ${
                activePreset?.label === preset.label
                  ? "bg-slate-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
          <label className="flex shrink-0 items-center gap-1">
            From
            <input
              type="date"
              value={filters.dateFrom}
              max={filters.dateTo || today}
              onClick={openPicker}
              onChange={(e) => onChange({ dateFrom: e.target.value })}
              className={dateInputClass}
            />
          </label>
          <label className="flex shrink-0 items-center gap-1">
            To
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom}
              max={today}
              onClick={openPicker}
              onChange={(e) => onChange({ dateTo: e.target.value })}
              className={dateInputClass}
            />
          </label>
        </div>

        <CheckboxDropdown
          value={filters.ages}
          onChange={(ages) => onChange({ ages: ages as AgeBucketKey[] })}
          options={AGE_OPTIONS}
          labels={AGE_LABELS}
          allLabel={AGE_LABELS.ALL!}
          ariaLabel="Time waiting"
        />

        <CheckboxDropdown
          value={filters.groups}
          onChange={(groups) => onChange({ groups })}
          options={GROUP_OPTIONS}
          labels={GROUP_LABELS}
          allLabel={GROUP_LABELS.ALL!}
          ariaLabel="Customer group"
        />
        <GroupInfoButton byGroup={groupStats} className="-ml-1 shrink-0" />

        <select
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as CartSort })}
          className="shrink-0 rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Sort carts"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap sm:gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition ${
              showAdvanced
                ? "border-blue-300 bg-blue-50/80 font-medium text-blue-700"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FiSliders className="h-3.5 w-3.5" />
            <span>More filters</span>
            {showAdvanced ? <FiChevronUp className="h-3.5 w-3.5" /> : <FiChevronDown className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            title="Refresh from the website"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onToggleLock}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition ${
              isLocked
                ? "border-blue-300 bg-blue-50/80 font-medium text-blue-700 shadow-xs hover:bg-blue-100/80"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            title={
              isLocked
                ? "Filter lock active (persists across page navigation until unlocked or page refresh)"
                : "Lock current filters (persists across page navigation)"
            }
          >
            {isLocked ? (
              <>
                <FiLock className="h-3.5 w-3.5 text-blue-600" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <FiUnlock className="h-3.5 w-3.5 text-gray-500" />
                <span>Lock filter</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onExport}
            disabled={isExporting || matchCount === 0}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload className="h-3.5 w-3.5" />
            <span>{isExporting ? "Exporting…" : "Export CSV"}</span>
          </button>

          {active > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="px-1 text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* More filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Book in cart (title or ISBN)">
            <input
              type="text"
              value={filters.product}
              onChange={(e) => onChange({ product: e.target.value })}
              placeholder="e.g. Maila Aanchal"
              className={inputCls}
            />
          </Field>

          <Field label="Cart value (₹)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={filters.minValue}
                onChange={(e) => onChange({ minValue: e.target.value })}
                placeholder="Min"
                className={inputCls}
              />
              <span className="text-gray-300">–</span>
              <input
                type="number"
                min={0}
                value={filters.maxValue}
                onChange={(e) => onChange({ maxValue: e.target.value })}
                placeholder="Max"
                className={inputCls}
              />
            </div>
          </Field>

          <Field label="Books in cart">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={filters.minItems}
                onChange={(e) => onChange({ minItems: e.target.value })}
                placeholder="Min"
                className={inputCls}
              />
              <span className="text-gray-300">–</span>
              <input
                type="number"
                min={0}
                value={filters.maxItems}
                onChange={(e) => onChange({ maxItems: e.target.value })}
                placeholder="Max"
                className={inputCls}
              />
            </div>
          </Field>

          <Field label="Contact details">
            <select
              value={filters.contact}
              onChange={(e) => onChange({ contact: e.target.value as CartFilterState["contact"] })}
              className={inputCls}
            >
              <option value="">Any</option>
              <option value="reachable">Reachable (phone or email)</option>
              <option value="phone">Has phone</option>
              <option value="email">Has email</option>
              <option value="unreachable">No contact details</option>
            </select>
          </Field>

          <Field label="Stock">
            <select
              value={filters.stock}
              onChange={(e) => onChange({ stock: e.target.value as CartFilterState["stock"] })}
              className={inputCls}
            >
              <option value="">Any</option>
              <option value="clean">All books in stock</option>
              <option value="issues">Has out-of-stock book</option>
            </select>
          </Field>

          <Field label="Discount">
            <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={filters.hasDiscount}
                onChange={(e) => onChange({ hasDiscount: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              Only carts with a discount
            </label>
          </Field>
        </div>
      )}

      {/* Search + result count */}
      <div className="border-t border-gray-100 pt-2.5">
        <div className="relative w-full">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => onSearchDraftChange(e.target.value)}
            placeholder="Search customer name, phone or email…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-9 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
          />
          {searchDraft && (
            <button
              type="button"
              onClick={() => onSearchDraftChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>
        {matchCount !== undefined && (
          <p className="mt-2 text-xs text-gray-500">
            <strong className="font-semibold text-gray-800">{matchCount.toLocaleString("en-IN")}</strong> carts
            {active > 0 ? ` match ${active} active filter${active > 1 ? "s" : ""}` : " in total"}
          </p>
        )}
      </div>
    </div>
  );
};
