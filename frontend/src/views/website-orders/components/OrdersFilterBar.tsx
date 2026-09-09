import React from "react";
import { FiSearch, FiRefreshCw, FiX } from "react-icons/fi";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "../../../services/websiteOrdersService";
import { DATE_PRESETS, daysAgo, toDateInput } from "./utils";

export interface OrdersFilterState {
  search: string;
  status: string;
  paymentStatus: string;
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
}

const selectClass =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

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

export const OrdersFilterBar: React.FC<OrdersFilterBarProps> = ({
  filters,
  searchDraft,
  onSearchDraftChange,
  onChange,
  onReset,
  onRefresh,
  isFetching,
}) => {
  const today = toDateInput(new Date());

  // A preset is "on" only when both bounds still match what it would set — editing
  // either date by hand should visibly drop the highlight.
  const activePreset = DATE_PRESETS.find(
    (preset) => filters.dateFrom === daysAgo(preset.days) && filters.dateTo === today,
  );

  const isFiltered =
    Boolean(filters.search) || filters.status !== "ALL" || filters.paymentStatus !== "ALL";

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search — matches order number, customer name, email or phone upstream */}
        <div className="relative min-w-[240px] flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Search order number, customer, email or phone…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

        <select
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value })}
          className={selectClass}
          aria-label="Order status"
        >
          <option value="ALL">{STATUS_LABELS.ALL}</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <select
          value={filters.paymentStatus}
          onChange={(event) => onChange({ paymentStatus: event.target.value })}
          className={selectClass}
          aria-label="Payment status"
        >
          <option value="ALL">{PAYMENT_STATUS_LABELS.ALL}</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PAYMENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

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
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
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

        {(isFiltered || activePreset?.label !== "30D") && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
};
