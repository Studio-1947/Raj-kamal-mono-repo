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
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-normal text-gray-800">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
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
  const rows = summary?.topProducts ?? [];
  const max = Math.max(1, ...rows.map((row) => row.quantity));

  return (
    <Panel title="Top titles" subtitle="Best-selling books in this range, by copies sold">
      {rows.length === 0 ? (
        <EmptyOrSkeleton isLoading={isLoading} />
      ) : (
        <div className="space-y-4">
          {rows.map((product) => (
            <BarRow
              key={product.sku ?? product.name}
              label={product.name}
              sublabel={`${formatNumber(product.quantity)} · ${formatINR(product.revenue)}`}
              value={product.quantity}
              max={max}
              color="#8B5CF6"
            />
          ))}
        </div>
      )}
    </Panel>
  );
};

export const TopStatesPanel: React.FC<PanelProps> = ({ summary, isLoading }) => {
  const rows = summary?.topStates ?? [];
  const max = Math.max(1, ...rows.map((row) => row.revenue));

  return (
    <Panel title="Top states" subtitle="Where the orders ship, by revenue">
      {rows.length === 0 ? (
        <EmptyOrSkeleton isLoading={isLoading} />
      ) : (
        <div className="space-y-4">
          {rows.map((state) => (
            <BarRow
              key={state.state}
              label={state.state}
              sublabel={`${formatNumber(state.orders)} orders · ${formatINR(state.revenue)}`}
              value={state.revenue}
              max={max}
              color="#F97316"
            />
          ))}
        </div>
      )}
    </Panel>
  );
};
