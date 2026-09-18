import React from "react";
import { formatINR } from "../../total-offline-sales/components";
import type { OrdersSummary } from "../../../services/websiteOrdersService";
import { PAYMENT_METHOD_LABELS } from "../../../services/websiteOrdersService";
import { formatNumber, humanizeEnum } from "./utils";

interface PanelProps {
  summary: OrdersSummary | undefined;
  isLoading: boolean;
}

function Panel({
  title,
  subtitle,
  controls,
  children,
}: {
  title: string;
  subtitle: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-normal text-gray-800">{title}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        {controls && <div className="flex flex-wrap items-center gap-1.5">{controls}</div>}
      </div>
      {children}
    </div>
  );
}

function EmptyOrSkeleton({ isLoading }: { isLoading: boolean }) {
  return isLoading ? (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-50" />
      ))}
    </div>
  ) : (
    <p className="py-6 text-center text-sm text-gray-400">No data in this range</p>
  );
}

/**
 * A labelled proportion bar. Every row in a panel is scaled against that panel's
 * largest value, so the bars compare within a list rather than against an absolute
 * ceiling nobody can see.
 */
function BarRow({
  label,
  sublabel,
  value,
  max,
  color,
}: {
  label: string;
  sublabel: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-gray-700" title={label}>
          {label}
        </span>
        <span className="shrink-0 text-xs text-gray-500">{sublabel}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export const PaymentMixPanel: React.FC<PanelProps> = ({ summary, isLoading }) => {
  const rows = Object.entries(summary?.byPaymentMethod ?? {}).sort(
    (a, b) => b[1].count - a[1].count,
  );
  const max = Math.max(1, ...rows.map(([, bucket]) => bucket.count));
  const total = rows.reduce((sum, [, bucket]) => sum + bucket.count, 0);

  return (
    <Panel title="Payment mix" subtitle="How customers paid, by order count">
      {rows.length === 0 ? (
        <EmptyOrSkeleton isLoading={isLoading} />
      ) : (
        <div className="space-y-4">
          {rows.map(([method, bucket], index) => (
            <BarRow
              key={method}
              label={PAYMENT_METHOD_LABELS[method] ?? humanizeEnum(method)}
              sublabel={`${formatNumber(bucket.count)} · ${((bucket.count / total) * 100).toFixed(0)}% · ${formatINR(bucket.revenue)}`}
              value={bucket.count}
              max={max}
              color={index === 0 ? "#0067B5" : "#10B981"}
            />
          ))}
        </div>
      )}
    </Panel>
  );
};

export const TopProductsPanel: React.FC<PanelProps> = ({ summary, isLoading }) => {
  const [mode, setMode] = React.useState<"top" | "bottom">("top");
  const [sortBy, setSortBy] = React.useState<"quantity" | "revenue">("quantity");
  const [limit, setLimit] = React.useState<number>(10);

  const sortedProducts = React.useMemo(() => {
    const list = [...(summary?.topProducts ?? [])];
    list.sort((a, b) => {
      const valA = sortBy === "quantity" ? a.quantity : a.revenue;
      const valB = sortBy === "quantity" ? b.quantity : b.revenue;
      return mode === "top" ? valB - valA : valA - valB;
    });
    return list.slice(0, limit);
  }, [summary?.topProducts, mode, sortBy, limit]);

  const max = Math.max(
    1,
    ...sortedProducts.map((row) => (sortBy === "quantity" ? row.quantity : row.revenue))
  );

  const panelTitle = mode === "top" ? "Top titles" : "Bottom titles";
  const panelSubtitle =
    mode === "top"
      ? sortBy === "quantity"
        ? "Best-selling books in this range, by copies sold"
        : "Highest grossing books in this range, by revenue"
      : sortBy === "quantity"
        ? "Lowest-selling books in this range, by copies sold"
        : "Lowest grossing books in this range, by revenue";

  const controls = (
    <>
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setMode("top")}
          className={`rounded-md px-2 py-0.5 font-medium transition ${
            mode === "top" ? "bg-white text-gray-800 shadow-xs" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Top
        </button>
        <button
          type="button"
          onClick={() => setMode("bottom")}
          className={`rounded-md px-2 py-0.5 font-medium transition ${
            mode === "bottom" ? "bg-white text-gray-800 shadow-xs" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Bottom
        </button>
      </div>

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as "quantity" | "revenue")}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="quantity">By Copies</option>
        <option value="revenue">By Revenue</option>
      </select>

      <select
        value={limit}
        onChange={(e) => setLimit(Number(e.target.value))}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value={5}>5</option>
        <option value={10}>10</option>
        <option value={20}>20</option>
      </select>
    </>
  );

  return (
    <Panel title={panelTitle} subtitle={panelSubtitle} controls={controls}>
      {sortedProducts.length === 0 ? (
        <EmptyOrSkeleton isLoading={isLoading} />
      ) : (
        <div className="space-y-4">
          {sortedProducts.map((product) => {
            const rowVal = sortBy === "quantity" ? product.quantity : product.revenue;
            return (
              <BarRow
                key={product.sku ?? product.name}
                label={product.name}
                sublabel={`${formatNumber(product.quantity)} · ${formatINR(product.revenue)}`}
                value={rowVal}
                max={max}
                color={mode === "top" ? "#8B5CF6" : "#EC4899"}
              />
            );
          })}
        </div>
      )}
    </Panel>
  );
};

export const TopStatesPanel: React.FC<PanelProps> = ({ summary, isLoading }) => {
  const [mode, setMode] = React.useState<"top" | "bottom">("top");
  const [sortBy, setSortBy] = React.useState<"revenue" | "orders">("revenue");
  const [limit, setLimit] = React.useState<number>(10);

  const sortedStates = React.useMemo(() => {
    const list = [...(summary?.topStates ?? [])];
    list.sort((a, b) => {
      const valA = sortBy === "revenue" ? a.revenue : a.orders;
      const valB = sortBy === "revenue" ? b.revenue : b.orders;
      return mode === "top" ? valB - valA : valA - valB;
    });
    return list.slice(0, limit);
  }, [summary?.topStates, mode, sortBy, limit]);

  const max = Math.max(
    1,
    ...sortedStates.map((row) => (sortBy === "revenue" ? row.revenue : row.orders))
  );

  const panelTitle = mode === "top" ? "Top states" : "Bottom states";
  const panelSubtitle =
    mode === "top"
      ? sortBy === "revenue"
        ? "Where the orders ship, by revenue"
        : "Where the orders ship, by order count"
      : sortBy === "revenue"
        ? "Lowest shipping states in this range, by revenue"
        : "Lowest shipping states in this range, by order count";

  const controls = (
    <>
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setMode("top")}
          className={`rounded-md px-2 py-0.5 font-medium transition ${
            mode === "top" ? "bg-white text-gray-800 shadow-xs" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Top
        </button>
        <button
          type="button"
          onClick={() => setMode("bottom")}
          className={`rounded-md px-2 py-0.5 font-medium transition ${
            mode === "bottom" ? "bg-white text-gray-800 shadow-xs" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Bottom
        </button>
      </div>

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as "revenue" | "orders")}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="revenue">By Revenue</option>
        <option value="orders">By Orders</option>
      </select>

      <select
        value={limit}
        onChange={(e) => setLimit(Number(e.target.value))}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value={5}>5</option>
        <option value={10}>10</option>
        <option value={20}>20</option>
      </select>
    </>
  );

  return (
    <Panel title={panelTitle} subtitle={panelSubtitle} controls={controls}>
      {sortedStates.length === 0 ? (
        <EmptyOrSkeleton isLoading={isLoading} />
      ) : (
        <div className="space-y-4">
          {sortedStates.map((state) => {
            const rowVal = sortBy === "revenue" ? state.revenue : state.orders;
            return (
              <BarRow
                key={state.state}
                label={state.state}
                sublabel={`${formatNumber(state.orders)} orders · ${formatINR(state.revenue)}`}
                value={rowVal}
                max={max}
                color={mode === "top" ? "#F97316" : "#E11D48"}
              />
            );
          })}
        </div>
      )}
    </Panel>
  );
};
