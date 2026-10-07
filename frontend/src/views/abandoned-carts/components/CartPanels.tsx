import React from "react";
import { FiPhone, FiMail, FiMessageCircle } from "react-icons/fi";
import { formatINR } from "../../total-offline-sales/components";
import type { AgeBucketKey, Bucket, CartsSummary } from "../../../services/websiteCartsService";
import { formatNumber } from "../../website-orders/components/utils";
import { whatsappLink } from "./contact";

interface PanelProps {
  summary: CartsSummary | undefined;
  isLoading: boolean;
}

const AGE_ROWS: { key: AgeBucketKey; label: string; hint: string; bar: string }[] = [
  { key: "today", label: "Last 24 hours", hint: "Still warm: best chance to recover", bar: "bg-emerald-500" },
  { key: "week", label: "1–7 days", hint: "Worth a nudge", bar: "bg-amber-400" },
  { key: "month", label: "7–30 days", hint: "Going cold", bar: "bg-orange-500" },
  { key: "older", label: "30+ days", hint: "Likely lost", bar: "bg-rose-500" },
];

function PanelShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="mb-4 text-xs text-gray-400">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

export const CartAgePanel: React.FC<PanelProps> = ({ summary, isLoading }) => (
  <PanelShell title="How long they have been waiting">
    {isLoading && !summary ? (
      <Skeleton />
    ) : !summary ? null : (
      <div className="space-y-4">
        {AGE_ROWS.map((row) => {
          const bucket = summary.byAge[row.key];
          const pct = summary.cartCount ? (bucket.count / summary.cartCount) * 100 : 0;
          return (
            <div key={row.key}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-gray-800">{row.label}</span>
                <span className="text-gray-500">
                  {formatNumber(bucket.count)} carts · {formatINR(bucket.value)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${row.bar}`}
                  style={{ width: `${Math.max(pct, bucket.count ? 2 : 0)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">{row.hint}</p>
            </div>
          );
        })}
      </div>
    )}
  </PanelShell>
);

/** Who can actually be contacted, and how much of the money is realistically winnable. */
export const CartRecoveryPanel: React.FC<PanelProps> = ({ summary, isLoading }) => {
  const rows: { label: string; bucket: Bucket; tone: string }[] = summary
    ? [
        { label: "Phone and email", bucket: summary.reachability.both, tone: "bg-emerald-500" },
        { label: "Phone only", bucket: summary.reachability.phoneOnly, tone: "bg-blue-500" },
        { label: "Email only", bucket: summary.reachability.emailOnly, tone: "bg-violet-500" },
        { label: "No contact details", bucket: summary.reachability.none, tone: "bg-gray-300" },
      ]
    : [];

  return (
    <PanelShell title="Recovery potential" subtitle="Contactable, in stock, active in the last 30 days">
      {isLoading && !summary ? (
        <Skeleton />
      ) : !summary ? null : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="text-2xl font-semibold text-emerald-800">{formatINR(summary.recoverable.value)}</div>
            <div className="text-xs text-emerald-700">
              across {formatNumber(summary.recoverable.count)} winnable carts
              {summary.cartCount > 0 &&
                ` (${((summary.recoverable.count / summary.cartCount) * 100).toFixed(0)}% of matches)`}
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((r) => {
              const pct = summary.cartCount ? (r.bucket.count / summary.cartCount) * 100 : 0;
              return (
                <div key={r.label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-gray-800">{r.label}</span>
                    <span className="text-gray-500">
                      {formatNumber(r.bucket.count)} · {formatINR(r.bucket.value)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${r.tone}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
              <div className="font-semibold text-rose-700">{formatNumber(summary.stockIssues.count)} blocked by stock</div>
              <div className="text-rose-600/80">{formatINR(summary.stockIssues.value)} waiting on a restock</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
              <div className="font-semibold text-amber-700">{formatNumber(summary.discounted.count)} used a discount</div>
              <div className="text-amber-600/80">{formatINR(summary.discounted.discountTotal)} in discounts applied</div>
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
};

interface TopProductsProps extends PanelProps {
  onPickProduct: (term: string) => void;
}

export const TopCartProductsPanel: React.FC<TopProductsProps> = ({ summary, isLoading, onPickProduct }) => (
  <PanelShell title="Most abandoned books" subtitle="Click a book to see only the carts that hold it">
    {isLoading && !summary ? (
      <Skeleton />
    ) : !summary || summary.topProducts.length === 0 ? (
      <p className="py-8 text-center text-sm italic text-gray-400">No cart data.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
              <th className="py-2 pr-3 font-medium">Book</th>
              <th className="py-2 pr-3 text-right font-medium">In carts</th>
              <th className="py-2 pr-3 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {summary.topProducts.map((p, i) => (
              <tr
                key={`${p.sku ?? p.name}-${i}`}
                onClick={() => onPickProduct(p.sku ?? p.name)}
                className="cursor-pointer border-b border-gray-50 transition last:border-0 hover:bg-gray-50"
              >
                <td className="max-w-[320px] py-2.5 pr-3">
                  <div className="truncate font-semibold text-gray-800" title={p.name}>
                    {p.name}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-gray-400">
                    {p.sku ?? "—"}
                    {p.inStock === false && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 font-sans font-semibold text-rose-600">
                        Out of stock
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right font-bold text-gray-900">{formatNumber(p.carts)}</td>
                <td className="py-2.5 pr-3 text-right text-gray-600">{formatNumber(p.quantity)}</td>
                <td className="py-2.5 text-right font-semibold text-gray-900">{formatINR(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </PanelShell>
);

interface TopCustomersProps extends PanelProps {
  onPickCustomer: (term: string) => void;
}

export const TopCartCustomersPanel: React.FC<TopCustomersProps> = ({ summary, isLoading, onPickCustomer }) => (
  <PanelShell title="Biggest carts" subtitle="Highest-value customers holding unpurchased books">
    {isLoading && !summary ? (
      <Skeleton />
    ) : !summary || summary.topCustomers.length === 0 ? (
      <p className="py-8 text-center text-sm italic text-gray-400">No cart data.</p>
    ) : (
      <ul className="divide-y divide-gray-50">
        {summary.topCustomers.map((c) => {
          const wa = whatsappLink(c.phone);
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
              <button
                type="button"
                onClick={() => onPickCustomer(c.phone ?? c.email ?? c.name)}
                className="min-w-0 flex-1 text-left"
                title="Filter to this customer"
              >
                <div className="truncate text-sm font-semibold text-gray-900">{c.name}</div>
                <div className="truncate text-[11px] text-gray-500">
                  {formatNumber(c.books)} books{c.phone ? ` · ${c.phone}` : ""}
                </div>
              </button>
              <div className="flex items-center gap-1.5">
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                    <FiMessageCircle className="h-4 w-4" />
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone.replace(/\s/g, "")}`} title="Call" className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
                    <FiPhone className="h-4 w-4" />
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} title="Email" className="rounded-lg p-1.5 text-violet-600 hover:bg-violet-50">
                    <FiMail className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="w-24 shrink-0 text-right text-sm font-bold text-gray-900">{formatINR(c.value)}</div>
            </li>
          );
        })}
      </ul>
    )}
  </PanelShell>
);
