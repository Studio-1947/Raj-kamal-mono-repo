import React from "react";
import { formatINR } from "../../total-offline-sales/components";
import {
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
  type FlaggedOrder,
  type PendingAnalysis,
  type PendingVerdict,
  type WebsiteOrder,
} from "../../../services/websiteOrdersService";
import { formatNumber, humanizeEnum, paymentStatusStyle, statusStyle } from "./utils";

interface PendingAnalysisSectionProps {
  analysis: PendingAnalysis | undefined;
  isLoading: boolean;
  error: unknown;
  onSelectOrder: (order: WebsiteOrder) => void;
}

const VERDICTS: {
  key: PendingVerdict;
  title: string;
  meaning: string;
  card: string;
  dot: string;
}[] = [
  {
    key: "STUCK",
    title: "Stuck",
    meaning: "Real orders nobody has touched past the stage's SLA — act on these first.",
    card: "border-rose-200 bg-rose-50/60",
    dot: "bg-rose-500",
  },
  {
    key: "ON_TRACK",
    title: "On track",
    meaning: "Real and recently active, or an online payment still inside its grace window.",
    card: "border-emerald-200 bg-emerald-50/60",
    dot: "bg-emerald-500",
  },
  {
    key: "STATUS_LAGGING",
    title: "Already moving",
    meaning: "A shipment exists but the order status was never advanced.",
    card: "border-blue-200 bg-blue-50/60",
    dot: "bg-blue-500",
  },
  {
    key: "NOT_REALLY_PENDING",
    title: "Not really pending",
    meaning: "Payment failed, was abandoned or refunded — these will not convert.",
    card: "border-gray-200 bg-gray-50",
    dot: "bg-gray-400",
  },
];

const REASON_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: "Online payment in progress",
  IDLE_PAST_SLA: "Idle past SLA",
  ALREADY_SHIPPED: "Shipped — status not updated",
  ALREADY_DELIVERED: "Delivered — status not updated",
  PAYMENT_FAILED: "Payment failed",
  PAYMENT_ABANDONED: "Online payment never completed",
  REFUNDED_STILL_OPEN: "Refunded but still open",
};

const FUNNEL_LABELS: Record<string, string> = {
  PENDING: "Order placed",
  PENDING_INVOICE: "Reached invoicing",
  PENDING_LABEL: "Reached labelling",
  PENDING_DISPATCH: "Reached dispatch",
  COMPLETED: "Completed",
};

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return "<1h";
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-50" />
      ))}
    </div>
  );
}

function SubHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-3">
      <h4 className="text-sm font-medium text-gray-800">{title}</h4>
      {note && <p className="text-xs text-gray-400">{note}</p>}
    </div>
  );
}

export const PendingAnalysisSection: React.FC<PendingAnalysisSectionProps> = ({
  analysis,
  isLoading,
  error,
  onSelectOrder,
}) => {
  const [verdict, setVerdict] = React.useState<PendingVerdict>("STUCK");
  const [visible, setVisible] = React.useState(15);

  React.useEffect(() => setVisible(15), [verdict]);

  const rows = React.useMemo<FlaggedOrder[]>(
    () => (analysis?.flagged ?? []).filter((row) => row.verdict === verdict),
    [analysis, verdict],
  );

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-normal text-gray-800">Pending analysis</h3>
        <p className="text-xs text-gray-400">
          Every order currently in a pending status, sorted into real vs. not real, and how
          far orders in this date range have converted. Ignores the status filter above.
        </p>
      </div>

      <HowItWorks analysis={analysis} />

      {error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Pending analysis is unavailable right now.
        </p>
      ) : isLoading && !analysis ? (
        <Skeleton />
      ) : !analysis ? null : (
        <div className="space-y-8">
          {/* Verdicts — also the filter for the drill-down list below. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {VERDICTS.map((v) => {
              const bucket = analysis.verdicts[v.key];
              const active = verdict === v.key;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVerdict(v.key)}
                  aria-pressed={active}
                  className={`rounded-2xl border p-4 text-left transition ${v.card} ${
                    active ? "ring-2 ring-slate-900/70" : "hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <span className={`h-2 w-2 rounded-full ${v.dot}`} />
                    {v.title}
                  </div>
                  <p className="mt-2 text-2xl text-gray-900">{formatNumber(bucket.count)}</p>
                  <p className="text-xs text-gray-500">
                    {formatINR(bucket.revenue)} ·{" "}
                    {analysis.pendingCount > 0 ? pct(bucket.count / analysis.pendingCount) : "0%"}
                  </p>
                  <p className="mt-2 text-xs leading-snug text-gray-500">{v.meaning}</p>
                </button>
              );
            })}
          </div>

          {/* Conversion headline */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Real conversion"
              value={pct(analysis.realConversion)}
              note="Completed ÷ orders that were ever real"
            />
            <Stat
              label="Raw conversion"
              value={pct(analysis.rawConversion)}
              note="Completed ÷ all orders placed"
            />
            <Stat
              label="Median time to ship"
              value={formatDuration(analysis.velocity.medianHoursToShip)}
              note={`From ${formatNumber(analysis.velocity.shippedSample)} shipped orders`}
            />
            <Stat
              label="Median time to deliver"
              value={formatDuration(analysis.velocity.medianHoursToDeliver)}
              note={`From ${formatNumber(analysis.velocity.deliveredSample)} delivered orders`}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Funnel */}
            <div>
              <SubHeading
                title="Conversion funnel"
                note="Orders that reached each stage or beyond (cancelled orders excluded)"
              />
              <div className="space-y-3">
                {analysis.funnel.map((step) => (
                  <div key={step.stage} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-gray-700">{FUNNEL_LABELS[step.stage] ?? step.stage}</span>
                      <span className="text-xs text-gray-500">
                        {formatNumber(step.reached)} · {pct(step.ofPlaced)} of placed
                        {step.stepConversion !== null && ` · ${pct(step.stepConversion)} of previous`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-slate-700 transition-all"
                        style={{ width: `${Math.max(1, step.ofPlaced * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {formatNumber(analysis.cancelled)} cancelled · {formatNumber(analysis.placed)} placed
              </p>
            </div>

            {/* Cohorts */}
            <div>
              <SubHeading
                title="Is pending clearing over time?"
                note="By how long ago the order was placed — older groups should be mostly completed"
              />
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                    <th className="pb-2 font-normal">Placed</th>
                    <th className="pb-2 text-right font-normal">Orders</th>
                    <th className="pb-2 text-right font-normal">Completed</th>
                    <th className="pb-2 text-right font-normal">Still pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analysis.cohorts.map((c) => (
                    <tr key={c.label} className="text-gray-700">
                      <td className="py-1.5">{c.label}</td>
                      <td className="py-1.5 text-right">{formatNumber(c.placed)}</td>
                      <td className="py-1.5 text-right">{c.placed ? pct(c.completedPct) : "—"}</td>
                      <td
                        className={`py-1.5 text-right ${
                          c.placed && c.stillPendingPct > 0.2 && c.label !== "Today"
                            ? "font-medium text-rose-600"
                            : ""
                        }`}
                      >
                        {c.placed ? pct(c.stillPendingPct) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stage breakdown */}
          <div>
            <SubHeading
              title="Where pending orders sit"
              note="Idle = time since the order was last updated. SLA is the working limit per stage."
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                    <th className="pb-2 font-normal">Stage</th>
                    <th className="pb-2 text-right font-normal">Orders</th>
                    <th className="pb-2 text-right font-normal">Value</th>
                    <th className="pb-2 text-right font-normal">Stuck</th>
                    <th className="pb-2 text-right font-normal">Already moving</th>
                    <th className="pb-2 text-right font-normal">Not real</th>
                    <th className="pb-2 text-right font-normal">Median idle</th>
                    <th className="pb-2 text-right font-normal">Longest idle</th>
                    <th className="pb-2 text-right font-normal">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analysis.stages.map((s) => (
                    <tr key={s.stage} className="text-gray-700">
                      <td className="py-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-medium ${statusStyle(s.stage).chip}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusStyle(s.stage).dot}`} />
                          {STATUS_LABELS[s.stage]}
                        </span>
                      </td>
                      <td className="py-2 text-right">{formatNumber(s.count)}</td>
                      <td className="py-2 text-right">{formatINR(s.revenue)}</td>
                      <td className="py-2 text-right">{formatNumber(s.byVerdict.STUCK)}</td>
                      <td className="py-2 text-right">{formatNumber(s.byVerdict.STATUS_LAGGING)}</td>
                      <td className="py-2 text-right">
                        {formatNumber(s.byVerdict.NOT_REALLY_PENDING)}
                      </td>
                      <td className="py-2 text-right">{formatDuration(s.medianIdleHours)}</td>
                      <td className="py-2 text-right">{formatDuration(s.maxIdleHours)}</td>
                      <td className="py-2 text-right text-gray-400">{formatDuration(s.slaHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drill-down */}
          <div>
            <SubHeading
              title={`${VERDICTS.find((v) => v.key === verdict)?.title} orders (${formatNumber(rows.length)})`}
              note="Most idle first. Click a row for the full order."
            />
            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Nothing in this group</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="pb-2 font-normal">Order</th>
                      <th className="pb-2 font-normal">Stage</th>
                      <th className="pb-2 font-normal">Payment</th>
                      <th className="pb-2 font-normal">Why</th>
                      <th className="pb-2 text-right font-normal">Age</th>
                      <th className="pb-2 text-right font-normal">Idle</th>
                      <th className="pb-2 text-right font-normal">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, visible).map((row) => (
                      <tr
                        key={row.order.id}
                        onClick={() => onSelectOrder(row.order)}
                        className="cursor-pointer text-gray-700 transition hover:bg-gray-50"
                      >
                        <td className="py-2">
                          <p className="font-medium text-gray-900">{row.order.orderNumber}</p>
                          <p className="text-xs text-gray-400">{row.order.customer.name}</p>
                        </td>
                        <td className="py-2">{STATUS_LABELS[row.order.status] ?? row.order.status}</td>
                        <td className="py-2">
                          <span
                            className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${paymentStatusStyle(row.order.paymentStatus)}`}
                          >
                            {humanizeEnum(row.order.paymentStatus)}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">
                            {PAYMENT_METHOD_LABELS[row.order.paymentMethod ?? "UNSPECIFIED"] ??
                              humanizeEnum(row.order.paymentMethod)}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-gray-600">
                          {row.reasons.map((r) => REASON_LABELS[r] ?? r).join(", ") || "Within SLA"}
                        </td>
                        <td className="py-2 text-right">{formatDuration(row.ageHours)}</td>
                        <td className="py-2 text-right">{formatDuration(row.idleHours)}</td>
                        <td className="py-2 text-right">{formatINR(row.order.amounts.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > visible && (
              <button
                type="button"
                onClick={() => setVisible((n) => n + 25)}
                className="mt-3 text-sm text-[#0067B5] hover:underline"
              >
                Show more ({formatNumber(rows.length - visible)} remaining)
              </button>
            )}
            {analysis.flaggedTruncated && (
              <p className="mt-2 text-xs text-gray-400">
                The list shows the {formatNumber(analysis.flagged.length)} most urgent of{" "}
                {formatNumber(analysis.pendingCount)} pending orders; the counts above are complete.
              </p>
            )}
          </div>

          {analysis.truncated && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This range holds more orders than can be analysed in one pass — figures cover the{" "}
              {formatNumber(analysis.scannedOrders)} most recent orders. Narrow the dates for exact
              numbers.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Plain-language account of the rules, so nobody has to ask why an order landed where
 * it did. SLA hours come from the API response, so this text can't drift from the
 * rules the server actually applied.
 */
function HowItWorks({ analysis }: { analysis: PendingAnalysis | undefined }) {
  const sla = analysis?.slaHours;
  const h = (stage: keyof NonNullable<typeof sla>) => (sla ? `${sla[stage]}h` : "…");

  return (
    <details className="group mb-6 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm text-gray-600">
      <summary className="cursor-pointer select-none font-medium text-gray-800">
        How this is calculated
      </summary>

      <div className="mt-3 space-y-4 leading-relaxed">
        <section>
          <p className="font-medium text-gray-800">1. What we look at</p>
          <p>
            All orders placed in the selected dates (up to the 3,000 most recent), pulled live
            from the website. The status and payment filters above are ignored here, because
            to know what pending orders turned into we need to see every order. Orders move
            through: Pending → Pending invoice → Awaiting label → Awaiting dispatch →
            Completed. Cancelled orders are counted separately and left out of the funnel.
          </p>
        </section>

        <section>
          <p className="font-medium text-gray-800">
            2. Is a pending order really pending? (first matching rule wins)
          </p>
          <ol className="ml-5 list-decimal space-y-1">
            <li>
              <b>Already moving</b> — it has a shipment with a ship date or tracking number
              (or is delivered), yet its status was never updated. It is not waiting on us.
            </li>
            <li>
              <b>Not really pending</b> — payment failed, payment was refunded but the order
              is still open, or an online (e.g. Razorpay) payment is still unconfirmed after
              24 hours. These are dead checkouts and won't convert. Cash on delivery is never
              treated this way, since its payment is meant to stay pending until delivery.
            </li>
            <li>
              <b>Stuck</b> — a real order that hasn't been updated for longer than its stage
              allows: Pending {h("PENDING")}, Pending invoice {h("PENDING_INVOICE")}, Awaiting
              label {h("PENDING_LABEL")}, Awaiting dispatch {h("PENDING_DISPATCH")}.
            </li>
            <li>
              <b>On track</b> — everything else, including an online payment under 24 hours
              old that may still complete.
            </li>
          </ol>
        </section>

        <section>
          <p className="font-medium text-gray-800">3. How conversion is measured</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <b>Funnel</b> — how many orders reached each stage <i>or beyond</i>, and what
              share of the previous stage that is.
            </li>
            <li>
              <b>Raw conversion</b> = completed ÷ all orders placed.
            </li>
            <li>
              <b>Real conversion</b> = completed ÷ (placed − cancelled − not really pending).
              Use this one to judge fulfilment; raw conversion is dragged down by checkouts
              that were never going to complete.
            </li>
            <li>
              <b>Is pending clearing?</b> — orders grouped by how long ago they were placed.
              Recent groups are naturally mostly pending; old groups with a high "still
              pending" share point to orders that are being lost or forgotten.
            </li>
            <li>
              <b>Time to ship / deliver</b> — median time from order placed to the shipment's
              ship or delivery date.
            </li>
          </ul>
        </section>

        <section>
          <p className="font-medium text-gray-800">4. Things to keep in mind</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <b>Idle</b> means time since the order was last updated on the website. Any
              edit, including an internal note, restarts it, so a stuck order can occasionally
              look active.
            </li>
            <li>
              The website only tells us an order's <i>current</i> status, not when it changed.
              "Moving forward" is therefore inferred from how far orders have got, not from
              exact stage-to-stage timings.
            </li>
            <li>
              The stage limits above are working targets we chose, not website settings.
            </li>
            <li>Click a verdict card to list its orders, most idle first; click a row for details.</li>
          </ul>
        </section>
      </div>
    </details>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-2xl text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{note}</p>
    </div>
  );
}
