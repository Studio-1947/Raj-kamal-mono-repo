import React from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import {
  OUTREACH_LABELS,
  OUTREACH_STATUSES,
  type OutreachChannel,
  type OutreachInput,
  type OutreachStatus,
  type WebsiteCart,
} from "../../../services/websiteCartsService";
import { formatDateTime } from "../../website-orders/components/utils";

interface Props {
  cart: WebsiteCart | null;
  isSaving: boolean;
  onSave: (cartId: string, input: OutreachInput) => void;
  onClear: (cartId: string) => void;
  onClose: () => void;
}

const CHANNELS: { value: OutreachChannel; label: string }[] = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "CALL", label: "Phone call" },
  { value: "EMAIL", label: "Email" },
  { value: "OTHER", label: "Other" },
];

const selectCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

/** Log what happened when someone reached out about a cart. Shared by the whole team. */
export const OutreachDialog: React.FC<Props> = ({ cart, isSaving, onSave, onClear, onClose }) => {
  const [status, setStatus] = React.useState<OutreachStatus>("CONTACTED");
  const [channel, setChannel] = React.useState<OutreachChannel | "">("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!cart) return;
    const o = cart.outreach;
    setStatus((o?.status as OutreachStatus) ?? "CONTACTED");
    setChannel((o?.channel as OutreachChannel) ?? "");
    setNote(o?.note ?? "");
  }, [cart]);

  React.useEffect(() => {
    if (!cart) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cart, onClose]);

  if (!cart) return null;
  const name = cart.customer.name ?? cart.customer.phone ?? cart.customer.email ?? "this customer";
  const logged = cart.outreach;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outreach-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 id="outreach-title" className="text-lg font-bold text-gray-900">
              Outreach
            </h3>
            <p className="truncate text-xs text-gray-400">{name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as OutreachStatus)} className={selectCls}>
                {OUTREACH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {OUTREACH_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">How</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value as OutreachChannel | "")} className={selectCls}>
                <option value="">Not specified</option>
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What was said, what they asked for, when to follow up…"
              className={`${selectCls} resize-none`}
            />
          </label>

          {logged && (
            <p className="text-[11px] text-gray-400">
              First contacted {formatDateTime(logged.contactedAt)}
              {logged.contactedByName ? ` by ${logged.contactedByName}` : ""}. Orders placed after this time are counted
              as results of the outreach.
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {logged ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onClear(cart.id)}
              className="text-xs font-medium text-rose-600 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Remove log
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                onSave(cart.id, {
                  status,
                  ...(channel ? { channel } : {}),
                  note,
                  customerId: cart.customer.id,
                })
              }
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
