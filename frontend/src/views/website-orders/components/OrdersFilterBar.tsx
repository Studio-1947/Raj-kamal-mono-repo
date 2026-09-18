import React from "react";
import { FiChevronDown, FiSearch, FiRefreshCw, FiX, FiLock, FiUnlock } from "react-icons/fi";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "../../../services/websiteOrdersService";
import { DATE_PRESETS, daysAgo, toDateInput } from "./utils";

export interface OrdersFilterState {
  search: string;
  status: string[];
  paymentStatus: string[];
  dateFrom: string;
  dateTo: string;
}

interface OrdersFilterBarProps {
  filters: OrdersFilterState;
  /** Raw input value — kept separate from `filters.search`, which is debounced. */
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onChange: (patch: Partial<OrdersFilterState>) => void;
  onReset: () => void;
  onRefresh: () => void;
  isFetching: boolean;
  isLocked?: boolean;
  onToggleLock?: () => void;
}

const dateInputClass =
  "cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 transition hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

/**
 * Clicking anywhere on a date field should open the picker, not just the tiny
 * calendar glyph. `showPicker` is unsupported on older Safari and throws if the
 * field isn't user-activated, so a failure just falls back to native behaviour.
 */
function openPicker(event: React.MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker();
  } catch {
    /* no-op — the native glyph still works */
  }
}

interface CheckboxDropdownProps {
  allLabel: string;
  ariaLabel: string;
  options: readonly string[];
  labels: Record<string, string>;
  value: string[];
  onChange: (value: string[]) => void;
}

function CheckboxDropdown({
  allLabel,
  ariaLabel,
  options,
  labels,
  value,
  onChange,
}: CheckboxDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const allSelected = value.length === 0;
  const buttonLabel =
    value.length === 0
      ? allLabel
      : value.length === 1
        ? labels[value[0]]
        : `${value.length} selected`;

  React.useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const toggle = (option: string) => {
    onChange(
      value.includes(option) ? value.filter((item) => item !== option) : [...value, option],
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-w-[160px] items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <span className="truncate">{buttonLabel}</span>
        <FiChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          aria-multiselectable="true"
          className="absolute left-0 z-30 mt-2 min-w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onChange([])}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {allLabel}
          </label>
          <div className="my-1 border-t border-gray-100" />
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={value.includes(option)}
                onChange={() => toggle(option)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {labels[option]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export const OrdersFilterBar: React.FC<OrdersFilterBarProps> = ({
  filters,
  searchDraft,
  onSearchDraftChange,
  onChange,
  onReset,
  onRefresh,
  isFetching,
  isLocked,
  onToggleLock,
}) => {
  const today = toDateInput(new Date());

  // A preset is "on" only when both bounds still match what it would set — editing
  // either date by hand should visibly drop the highlight.
  const activePreset = DATE_PRESETS.find(
    (preset) => filters.dateFrom === daysAgo(preset.days) && filters.dateTo === today,
  );

  const isFiltered =
    Boolean(filters.search) || filters.status.length > 0 || filters.paymentStatus.length > 0;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      {/* Top Row: All filter dropdowns, date pickers, presets and action buttons in a line */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date presets */}
          <div className="flex items-center gap-1">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onChange({ dateFrom: daysAgo(preset.days), dateTo: today })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activePreset?.label === preset.label
                    ? "bg-slate-900 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <label className="flex items-center gap-1.5">
              From
              <input
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || today}
                onClick={openPicker}
                onChange={(event) => onChange({ dateFrom: event.target.value })}
                className={dateInputClass}
              />
            </label>
            <label className="flex items-center gap-1.5">
              To
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom}
                max={today}
                onClick={openPicker}
                onChange={(event) => onChange({ dateTo: event.target.value })}
                className={dateInputClass}
              />
            </label>
          </div>

          {/* Checklist dropdowns */}
          <CheckboxDropdown
            value={filters.status}
            onChange={(status) => onChange({ status })}
            options={ORDER_STATUSES}
            labels={STATUS_LABELS}
            allLabel={STATUS_LABELS.ALL}
            ariaLabel="Order status"
          />

          <CheckboxDropdown
            value={filters.paymentStatus}
            onChange={(paymentStatus) => onChange({ paymentStatus })}
            options={PAYMENT_STATUSES}
            labels={PAYMENT_STATUS_LABELS}
            allLabel={PAYMENT_STATUS_LABELS.ALL}
            ariaLabel="Payment status"
          />
        </div>

        {/* Action buttons on the top right */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            title="Refresh from the website"
          >
            <FiRefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {onToggleLock && (
            <button
              type="button"
              onClick={onToggleLock}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                isLocked
                  ? "border-blue-300 bg-blue-50/80 text-blue-700 font-medium hover:bg-blue-100/80 shadow-xs"
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
                  <FiLock className="h-4 w-4 text-blue-600" />
                  <span>Locked</span>
                </>
              ) : (
                <>
                  <FiUnlock className="h-4 w-4 text-gray-500" />
                  <span>Lock filter</span>
                </>
              )}
            </button>
          )}

          {(isFiltered || activePreset?.label !== "30D") && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline pl-2"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Search Bar */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="relative w-full">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Search order number, customer, email or phone…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-9 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
      </div>
    </div>
  );
};
