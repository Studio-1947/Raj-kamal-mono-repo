import React from "react";
import { FiX, FiTruck, FiExternalLink } from "react-icons/fi";
import { formatINR } from "../../total-offline-sales/components";
import { STATUS_LABELS, type WebsiteOrder } from "../../../services/websiteOrdersService";
import {
  formatDateTime,
  humanizeEnum,
  paymentStatusStyle,
  statusStyle,
} from "./utils";

interface OrderDetailDrawerProps {
  /** The row that was clicked — already complete, so the panel renders instantly. */
  order: WebsiteOrder | null;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800">{value || "—"}</p>
    </div>
  );
}

function AmountRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        emphasis
          ? "border-t border-gray-200 pt-2 text-base font-medium text-gray-900"
          : "text-sm text-gray-600"
      }`}
    >
      <span>{label}</span>
      <span>{formatINR(value)}</span>
    </div>
  );
}

/**
 * Slide-over order detail. The list response already carries every field the panel
 * shows, so opening a row costs no extra request — a detail fetch would only add a
 * spinner to data we're already holding.
 */
export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({ order, onClose }) => {
  // Escape closes, matching the rest of the app's overlays.
  React.useEffect(() => {
    if (!order) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  const { amounts, customer, shipTo, shipment } = order;
  const style = statusStyle(order.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-label={`Order ${order.orderNumber}`}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400">Order</p>
            <h2 className="text-lg font-medium text-gray-900">{order.orderNumber}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium ${style.chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {STATUS_LABELS[order.status] ?? humanizeEnum(order.status)}
              </span>
              <span
                className={`rounded-lg border px-2 py-1 text-xs font-medium ${paymentStatusStyle(order.paymentStatus)}`}
              >
                Payment {humanizeEnum(order.paymentStatus).toLowerCase()}
              </span>
              {order.isSplitOrder && (
                <span className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                  Split order
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            title="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="grid grid-cols-2 gap-4">
            <Field label="Placed" value={formatDateTime(order.placedAt)} />
            <Field label="Last updated" value={formatDateTime(order.updatedAt)} />
            <Field label="Channel" value={humanizeEnum(order.channel)} />
            <Field label="Payment method" value={humanizeEnum(order.paymentMethod)} />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium text-gray-900">Customer</h3>
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-gray-50 p-4">
              <Field label="Name" value={customer.name} />
              <Field label="Group" value={humanizeEnum(customer.group)} />
              <Field
                label="Phone"
                value={
                  customer.phone ? (
                    <a href={`tel:${customer.phone}`} className="text-[#0067B5] hover:underline">
                      {customer.phone}
                    </a>
                  ) : null
                }
              />
              <Field
                label="Email"
                value={
                  customer.email ? (
                    <a
                      href={`mailto:${customer.email}`}
                      className="break-all text-[#0067B5] hover:underline"
                    >
                      {customer.email}
                    </a>
                  ) : null
                }
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium text-gray-900">Shipping address</h3>
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
              {[shipTo.city, shipTo.state, shipTo.postalCode, shipTo.country]
                .filter(Boolean)
                .join(", ") || "No address recorded"}
            </div>
          </section>

          {shipment && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900">
                <FiTruck className="h-4 w-4 text-gray-400" />
                Shipment
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-gray-50 p-4">
                <Field label="Carrier" value={shipment.carrier} />
                <Field label="Status" value={humanizeEnum(shipment.status)} />
                <Field label="Tracking" value={shipment.trackingNumber} />
                <Field label="Shipped" value={formatDateTime(shipment.shippedAt)} />
                {shipment.deliveredAt && (
                  <Field label="Delivered" value={formatDateTime(shipment.deliveredAt)} />
                )}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-sm font-medium text-gray-900">
              Items ({order.itemCount} title{order.itemCount === 1 ? "" : "s"},{" "}
              {order.totalQuantity} cop{order.totalQuantity === 1 ? "y" : "ies"})
            </h3>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-900" title={item.name}>
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {[item.variant, item.sku && `ISBN ${item.sku}`].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.quantity} × {formatINR(item.unitPrice)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-gray-900">
                    {formatINR(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-2xl bg-gray-50 p-4">
            <AmountRow label="Subtotal" value={amounts.subtotal} />
            {amounts.discount > 0 && <AmountRow label="Discount" value={-amounts.discount} />}
            {amounts.tax > 0 && <AmountRow label="Tax" value={amounts.tax} />}
            <AmountRow label="Shipping" value={amounts.shipping} />
            {amounts.codFee > 0 && <AmountRow label="COD fee" value={amounts.codFee} />}
            <AmountRow label="Grand total" value={amounts.grandTotal} emphasis />
          </section>

          {order.tags.length > 0 && (
            <section className="flex flex-wrap gap-2">
              {order.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </section>
          )}
        </div>

        {shipment?.trackingNumber && (
          <footer className="border-t border-gray-100 px-6 py-4">
            <a
              href={`https://app.tekipost.com/track/${encodeURIComponent(shipment.trackingNumber)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Track shipment
              <FiExternalLink className="h-4 w-4" />
            </a>
          </footer>
        )}
      </aside>
    </div>
  );
};
