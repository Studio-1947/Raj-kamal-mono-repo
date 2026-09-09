import React from "react";
import { FiShoppingBag, FiTrendingUp, FiBook, FiCreditCard } from "react-icons/fi";
import { KpiCard, formatINR } from "../../total-offline-sales/components";
import type { OrdersSummary } from "../../../services/websiteOrdersService";
import { formatDate, formatNumber, statusStyle } from "./utils";
import { STATUS_LABELS } from "../../../services/websiteOrdersService";

interface OrdersKpiRowProps {
  summary: OrdersSummary | undefined;
  isLoading: boolean;
}

function KpiSkeleton() {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
      <div className="mt-4 h-8 w-32 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

export const OrdersKpiRow: React.FC<OrdersKpiRowProps> = ({ summary, isLoading }) => {
  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cancelled = summary.byStatus.CANCELLED?.count ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Orders"
          value={formatNumber(summary.orderCount)}
          icon={<FiShoppingBag className="h-12 w-12" />}
          badge={
            cancelled > 0 ? (
              <p className="mt-2 text-xs text-gray-400">
                {formatNumber(cancelled)} cancelled ·{" "}
                {((cancelled / summary.orderCount) * 100).toFixed(1)}%
              </p>
            ) : undefined
          }
        />
        <KpiCard
          title="Revenue"
          value={formatINR(summary.revenue)}
          icon={<FiTrendingUp className="h-12 w-12" />}
          badge={<p className="mt-2 text-xs text-gray-400">Cancelled orders excluded</p>}
        />
        <KpiCard
          title="Avg order value"
          value={formatINR(summary.averageOrderValue)}
          icon={<FiCreditCard className="h-12 w-12" />}
        />
        <KpiCard
          title="Books sold"
          value={formatNumber(summary.itemsSold)}
          icon={<FiBook className="h-12 w-12" />}
        />
      </div>

      {/* Status strip — the operational view: what is stuck where, right now. */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(summary.byStatus)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([status, bucket]) => (
            <div
              key={status}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium ${statusStyle(status).chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle(status).dot}`} />
              {STATUS_LABELS[status] ?? status}
              <span className="font-bold">{formatNumber(bucket.count)}</span>
            </div>
          ))}
      </div>

      {summary.truncated && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This range holds more orders than the dashboard aggregates in one pass. Every
          figure on this page covers the {formatNumber(summary.scannedOrders)} most recent
          orders only
          {summary.coveredFrom ? ` — ${formatDate(summary.coveredFrom)} onward` : ""}, not
          the full range you selected. Narrow the dates for exact totals.
        </p>
      )}
    </div>
  );
};
