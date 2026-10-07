import React from "react";
import { FiInfo } from "react-icons/fi";
import { formatINR } from "../../total-offline-sales/components";
import type { CartsConversion, Rate } from "../../../services/websiteCartsService";
import { formatDateTime, formatNumber } from "../../website-orders/components/utils";

interface Props {
  conversion: CartsConversion | undefined;
  isLoading: boolean;
  error: unknown;
}

const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
const fmtPct = (v: number) => `${v < 10 && v > 0 ? v.toFixed(1) : v.toFixed(0)}%`;

const AGE_LABELS: Record<string, string> = {
  today: "Under 24 hours",
  week: "1–7 days",
  month: "7–30 days",
  older: "30+ days",
};

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs opacity-80">{sub}</div>
    </div>
  );
}

function RateBars({ title, rows }: { title: string; rows: { label: string; rate: Rate }[] }) {
  const max = Math.max(1, ...rows.map((r) => pct(r.rate.recovered, r.rate.carts)));
  return (
    <div>
      <h4 className="mb-3 text-sm font-bold text-gray-900">{title}</h4>
      <div className="space-y-3">
        {rows.map((r) => {
          const p = pct(r.rate.recovered, r.rate.carts);
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-gray-800">{r.label}</span>
                <span className="text-gray-500">
                  <strong className="text-gray-900">{fmtPct(p)}</strong> · {r.rate.recovered} of{" "}
                  {formatNumber(r.rate.carts)}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${(p / max) * 100}%`, minWidth: r.rate.recovered ? 4 : 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const CartConversionSection: React.FC<Props> = ({ conversion, isLoading, error }) => {
  const c = conversion;

  return (
    <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Cart conversion</h3>
        <p className="text-xs text-gray-400">Did the people who left a cart go on to buy?</p>
      </div>

      {error && !c ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Conversion could not be calculated right now. The rest of the page is unaffected.
        </p>
      ) : isLoading && !c ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-50" />
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Matching carts against recent orders — the first load can take up to a minute, after that it is cached.
          </p>
        </div>
      ) : !c ? null : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Truly abandoned"
              value={formatNumber(c.abandoned.carts)}
              sub={`${formatINR(c.abandoned.value)} still unbought`}
              tone="border-rose-100 bg-rose-50/70 text-rose-800"
            />
            <Stat
              label="Already checked out"
              value={formatNumber(c.checkedOut.carts)}
              sub={`Ordered within an hour · ${formatINR(c.checkedOut.value)}`}
              tone="border-gray-200 bg-gray-50 text-gray-700"
            />
            <Stat
              label="Won back later"
              value={formatNumber(c.recovered.carts)}
              sub={`${formatINR(c.recovered.revenue)} from ${formatNumber(c.recovered.orders)} orders`}
              tone="border-emerald-100 bg-emerald-50/70 text-emerald-800"
            />
            <Stat
              label="Recovery rate"
              value={fmtPct(c.recovered.rate * 100)}
              sub={`${c.recovered.sameBookCarts} bought a book from the cart`}
              tone="border-blue-100 bg-blue-50/70 text-blue-800"
            />
          </div>

          {c.outreachResults.contacted.carts > 0 && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <h4 className="text-sm font-bold text-gray-900">Did outreach help?</h4>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-gray-500">Carts you contacted</div>
                  <div className="text-xl font-semibold text-blue-800">
                    {fmtPct(pct(c.outreachResults.contacted.ordered, c.outreachResults.contacted.carts))}{" "}
                    <span className="text-xs font-normal text-gray-500">
                      ordered afterwards ({c.outreachResults.contacted.ordered} of{" "}
                      {formatNumber(c.outreachResults.contacted.carts)} · {formatINR(c.outreachResults.contacted.revenue)})
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Carts nobody contacted</div>
                  <div className="text-xl font-semibold text-gray-700">
                    {fmtPct(pct(c.outreachResults.notContacted.recovered, c.outreachResults.notContacted.carts))}{" "}
                    <span className="text-xs font-normal text-gray-500">
                      ordered on their own ({c.outreachResults.notContacted.recovered} of{" "}
                      {formatNumber(c.outreachResults.notContacted.carts)})
                    </span>
                  </div>
                </div>
              </div>
              {c.outreachResults.contacted.carts < 30 && (
                <p className="mt-2 text-[11px] text-gray-500">
                  Only {c.outreachResults.contacted.carts} contacted so far — too few to draw a conclusion yet.
                </p>
              )}
            </div>
          )}

          {/* One bar showing where every cart ended up */}
          <div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="bg-rose-400" style={{ width: `${pct(c.abandoned.carts, c.cartCount)}%` }} title="Truly abandoned" />
              <div className="bg-gray-300" style={{ width: `${pct(c.checkedOut.carts, c.cartCount)}%` }} title="Already checked out" />
              <div className="bg-emerald-500" style={{ width: `${Math.max(pct(c.recovered.carts, c.cartCount), c.recovered.carts ? 0.6 : 0)}%` }} title="Won back later" />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-400" />Truly abandoned</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-gray-300" />Already checked out</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" />Won back later</span>
              <span className="ml-auto">
                {formatNumber(c.buyers.customers)} of {formatNumber(c.buyers.cartCustomers)} cart owners have ordered since{" "}
                {formatDateTime(c.window.from).split(",")[0]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <RateBars
              title="Recovery rate by time waiting"
              rows={(["today", "week", "month", "older"] as const).map((k) => ({
                label: AGE_LABELS[k]!,
                rate: c.byAge[k],
              }))}
            />
            <RateBars
              title="Recovery rate by cart value"
              rows={c.byValueBand.map((b) => ({ label: b.label, rate: b }))}
            />
            <div className="space-y-8">
              <RateBars
                title="New vs repeat customers"
                rows={[
                  { label: "Repeat buyers", rate: c.repeatVsFirst.repeat },
                  { label: "First-time", rate: c.repeatVsFirst.firstTime },
                ]}
              />
              <div>
                <h4 className="mb-3 text-sm font-bold text-gray-900">How long until they came back</h4>
                <div className="flex flex-wrap gap-2">
                  {c.lag.map((l) => (
                    <span key={l.label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700">
                      {l.label}: <strong className="text-gray-900">{l.count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {c.recentRecoveries.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-gray-900">Recent win-backs</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                      <th className="py-2 pr-3 font-medium">Customer</th>
                      <th className="py-2 pr-3 font-medium">Ordered</th>
                      <th className="py-2 pr-3 text-right font-medium">Cart was</th>
                      <th className="py-2 pr-3 text-right font-medium">Order was</th>
                      <th className="py-2 text-right font-medium">Same book?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.recentRecoveries.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-3 font-semibold text-gray-800">{r.customer}</td>
                        <td className="py-2 pr-3 text-gray-500">
                          {formatDateTime(r.orderedAt)} · {r.hoursAfter < 48 ? `${Math.round(r.hoursAfter)}h` : `${Math.round(r.hoursAfter / 24)}d`} later
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-600">{formatINR(r.cartValue)}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-gray-900">{formatINR(r.orderValue)}</td>
                        <td className="py-2 text-right">
                          {r.boughtSameBook ? (
                            <span className="font-semibold text-emerald-600">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="flex items-start gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-[11px] leading-relaxed text-gray-500">
            <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              The website does not link orders to carts, so this is inferred by matching each cart owner to their orders
              (cancelled and failed-payment orders ignored). An order within an hour of the last cart change counts as a
              normal checkout — the site leaves the cart open afterwards, so those carts only look abandoned. An order
              later than that counts as a win-back, whether or not it contained the same books.
              {c.truncated && " Only the most recent orders were scanned, so figures may be understated."}
            </span>
          </p>
        </>
      )}
    </div>
  );
};
