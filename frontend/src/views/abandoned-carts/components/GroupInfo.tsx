import React from "react";
import { createPortal } from "react-dom";
import { FiInfo, FiX } from "react-icons/fi";
import { formatINR } from "../../total-offline-sales/components";
import type { Bucket } from "../../../services/websiteCartsService";
import { formatNumber } from "../../website-orders/components/utils";

interface Props {
  /** Live counts for the current filters, shown inside the dialog when available. */
  byGroup?: Record<string, Bucket> | undefined;
  className?: string;
}

/**
 * The "Prime reader" label is not something this dashboard calculates — it is the
 * customer-group field on the customer's website account, passed through unchanged.
 * This dialog says so, and says what is and is not known about it.
 */
export const GroupInfoButton: React.FC<Props> = ({ byGroup, className = "" }) => {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const prime = byGroup?.PRIME_READER;
  const general = byGroup?.GENERAL;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="How is the customer group decided?"
        aria-label="About customer groups"
        className={`inline-flex items-center justify-center rounded-full text-gray-400 transition hover:text-blue-600 ${className}`}
      >
        <FiInfo className="h-3.5 w-3.5" />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="group-info-title"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="group-info-title" className="text-lg font-bold text-gray-900">
                    About customer groups
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-400">Where “Prime reader” and “General” come from</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-gray-600">
                <section>
                  <h4 className="font-semibold text-gray-900">Not calculated here</h4>
                  <p>
                    We do not work this out. It is the <strong>customer group</strong> saved on the person’s account on
                    rajkamalprakashan.com, shown exactly as the website reports it.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900">The two groups</h4>
                  <ul className="mt-1 space-y-2">
                    <li className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
                      <strong className="text-violet-800">Prime reader</strong> — a member account on the website.
                      Their cart lines are priced at the member (prime) price: none of their current cart lines are at full list price.
                      {prime && (
                        <div className="mt-1 text-xs text-violet-700">
                          {formatNumber(prime.count)} carts · {formatINR(prime.value)} in the current view
                        </div>
                      )}
                    </li>
                    <li className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                      <strong className="text-gray-800">General</strong> — everyone else, including customers who signed
                      up with just a phone number (OTP).
                      {general && (
                        <div className="mt-1 text-xs text-gray-500">
                          {formatNumber(general.count)} carts · {formatINR(general.value)} in the current view
                        </div>
                      )}
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-gray-900">What we cannot tell you</h4>
                  <p>
                    The website’s admin API does not expose how or when someone becomes a Prime reader — no membership
                    rules, start date or expiry, and we show a customer’s group <em>today</em>, not when they filled
                    the cart. For the exact criteria, check with the website team.
                  </p>
                </section>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-95"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
