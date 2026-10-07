import React from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiChevronRight, FiAlertCircle, FiPhone, FiMail, FiMessageCircle, FiImage, FiFileText, FiX, FiCheck } from "react-icons/fi";
import { formatINR } from "../../total-offline-sales/components";
import TablePagination from "../../../components/TablePagination";
import type { CartsPage, WebsiteCart } from "../../../services/websiteCartsService";
import { formatDateTime, formatNumber } from "../../website-orders/components/utils";
import { whatsappLink } from "./contact";
import { GroupInfoButton } from "./GroupInfo";

interface Props {
  page: CartsPage | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  groupStats?: Record<string, { count: number; value: number }> | undefined;
}

const COLUMNS = ["", "Customer", "Last activity", "Items", "Group", "Reach out", "Cart value"];

/** "3d ago": how stale a cart is matters more than its exact timestamp. */
function timeAgo(value: string | null): { label: string; tone: string } {
  if (!value) return { label: "—", tone: "text-gray-400" };
  const hours = (Date.now() - new Date(value).getTime()) / 3_600_000;
  const days = hours / 24;
  if (hours < 1) return { label: "Just now", tone: "text-emerald-600" };
  if (hours < 24) return { label: `${Math.floor(hours)}h ago`, tone: "text-emerald-600" };
  if (days < 7) return { label: `${Math.floor(days)}d ago`, tone: "text-amber-600" };
  if (days < 30) return { label: `${Math.floor(days)}d ago`, tone: "text-orange-600" };
  return { label: `${Math.floor(days)}d ago`, tone: "text-rose-600" };
}

function CartItemImage({ src, alt }: { src: string | null; alt: string }) {
  const [error, setError] = React.useState(false);

  if (error || !src) {
    return (
      <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-300">
        <FiImage className="h-4 w-4" />
      </div>
    );
  }

  // Handle relative URLs assuming they belong to rajkamalprakashan.com
  const fullSrc =
    src.startsWith("http") || src.startsWith("data:") || src.startsWith("//")
      ? src
      : `https://rajkamalprakashan.com${src.startsWith("/") ? "" : "/"}${src}`;

  return (
    <img
      src={fullSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-14 w-10 shrink-0 rounded object-cover"
      onError={() => setError(true)}
    />
  );
}

function CartRow({ cart }: { cart: WebsiteCart }) {
  const [open, setOpen] = React.useState(false);
  const [showNoteModal, setShowNoteModal] = React.useState(false);
  const [status, setStatus] = React.useState("pending");
  const [note, setNote] = React.useState("");
  const [savedStatus, setSavedStatus] = React.useState<string | null>(null);
  const [savedNote, setSavedNote] = React.useState("");

  const age = timeAgo(cart.updatedAt);
  const c = cart.customer;
  const wa = whatsappLink(c.phone);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50/70"
      >
        <td className="w-8 py-3 pl-4 text-gray-400">
          {open ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
        </td>
        <td className="px-3 py-3">
          <div className="text-sm font-semibold text-gray-900">{c.name ?? c.phone ?? c.email ?? "Unknown"}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-gray-500">
            {c.phone && (
              <span className="inline-flex items-center gap-1">
                <FiPhone className="h-3 w-3" />
                {c.phone}
              </span>
            )}
            {c.email && (
              <span className="inline-flex items-center gap-1">
                <FiMail className="h-3 w-3" />
                {c.email}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          <div className={`text-sm font-semibold ${age.tone}`}>{age.label}</div>
          <div className="text-[11px] text-gray-400">{formatDateTime(cart.updatedAt)}</div>
        </td>
        <td className="px-3 py-3 text-sm text-gray-700">
          {formatNumber(cart.totalQuantity)} {cart.totalQuantity === 1 ? "book" : "books"}
          {cart.itemCount !== cart.totalQuantity && (
            <span className="text-[11px] text-gray-400">
              {" "}
              · {cart.itemCount} {cart.itemCount === 1 ? "title" : "titles"}
            </span>
          )}
          {cart.hasStockIssue && (
            <div className="mt-0.5 text-[11px] font-semibold text-rose-600">Out-of-stock book</div>
          )}
        </td>
        <td className="px-3 py-3">
          {c.group === "PRIME_READER" ? (
            <span className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
              Prime reader
            </span>
          ) : (
            <span className="text-xs text-gray-400">General</span>
          )}
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1">
            {wa && (
              <a href={wa} onClick={stop} target="_blank" rel="noreferrer" title="WhatsApp" className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                <FiMessageCircle className="h-4 w-4" />
              </a>
            )}
            {c.phone && (
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} onClick={stop} title="Call" className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
                <FiPhone className="h-4 w-4" />
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} onClick={stop} title="Email" className="rounded-lg p-1.5 text-violet-600 hover:bg-violet-50">
                <FiMail className="h-4 w-4" />
              </a>
            )}
            {!wa && !c.phone && !c.email && <span className="text-xs text-gray-300">—</span>}
            <div className="w-px h-4 bg-gray-200 mx-1"></div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowNoteModal(true); }}
              title="Add Notes / Log Contact" 
              className="rounded-lg p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <FiFileText className="h-4 w-4" />
            </button>
            {savedStatus === 'reached' && (
              <span title={savedNote} className="ml-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 cursor-help">
                <FiCheck className="w-3 h-3" /> Reached
              </span>
            )}
            {savedStatus === 'no_answer' && (
              <span title={savedNote} className="ml-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200 cursor-help">
                No Answer
              </span>
            )}
            {savedStatus === 'invalid' && (
              <span title={savedNote} className="ml-1 inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200 cursor-help">
                Invalid
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="text-sm font-bold text-gray-900">{formatINR(cart.amounts.grandTotal)}</div>
          {cart.amounts.discount > 0 && (
            <div className="text-[11px] text-emerald-600">−{formatINR(cart.amounts.discount)} discount</div>
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td />
          <td colSpan={COLUMNS.length - 1} className="px-3 py-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-2.5"
                >
                  <CartItemImage src={item.coverImage} alt="" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-gray-900" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {item.variant ?? "—"} · Qty {item.quantity}
                      {item.inStock === false && (
                        <span className="ml-1 font-semibold text-rose-600">· Out of stock</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400">Added {formatDateTime(item.addedAt)}</div>
                  </div>
                  <div className="shrink-0 text-xs font-bold text-gray-900">{formatINR(item.lineTotal)}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}

      {showNoteModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={stop}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 border border-gray-100" onClick={stop}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
                <FiFileText className="text-indigo-600 h-5 w-5" />
                Log Contact: {c.name ?? c.phone ?? "Customer"}
              </h3>
              <button 
                onClick={() => setShowNoteModal(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Contact Status</label>
                <select 
                  className="w-full text-sm rounded-xl border border-gray-200 p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900 font-medium"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pending">Pending / Not Contacted</option>
                  <option value="reached">Reached Customer</option>
                  <option value="no_answer">No Answer / Left Voicemail</option>
                  <option value="invalid">Invalid Number</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label>
                <textarea 
                  rows={4} 
                  className="w-full text-sm rounded-xl border border-gray-200 p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal"
                  placeholder="E.g., Customer said they will checkout tonight..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
              <button 
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setSavedStatus(status);
                  setSavedNote(note);
                  setShowNoteModal(false);
                }}
                className="px-5 py-2 bg-indigo-600 border border-transparent rounded-xl text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <FiCheck className="w-4 h-4" /> Save Note
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export const AbandonedCartsTable: React.FC<Props> = ({
  page,
  isLoading,
  isFetching,
  error,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  groupStats,
}) => {
  const carts = page?.carts ?? [];

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-base font-bold text-gray-900">Carts</h3>
        <span className="text-xs text-gray-400">
          {page ? `${formatNumber(page.meta.total)} total` : ""}
          {isFetching && " · updating…"}
        </span>
      </div>

      {error ? (
        <div className="flex items-center gap-2 px-5 py-10 text-sm text-rose-600">
          <FiAlertCircle className="h-4 w-4" />
          {error instanceof Error ? error.message : "Could not load abandoned carts."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                {COLUMNS.map((col, i) => (
                  <th
                    key={i}
                    className={`px-3 py-3 font-medium ${i === COLUMNS.length - 1 ? "pr-4 text-right" : ""}`}
                  >
                    {col}
                    {col === "Group" && <GroupInfoButton byGroup={groupStats} className="ml-1.5 align-middle" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && !page ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={COLUMNS.length} className="px-4 py-3">
                      <div className="h-9 animate-pulse rounded-xl bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : carts.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="py-12 text-center text-sm italic text-gray-400">
                    No carts match your filters.
                  </td>
                </tr>
              ) : (
                carts.map((cart) => <CartRow key={cart.id} cart={cart} />)
              )}
            </tbody>
          </table>
        </div>
      )}

      {page && page.meta.total > 0 && (
        <div className="border-t border-gray-100 px-5 py-3">
          <TablePagination
            currentPage={currentPage}
            totalItems={page.meta.total}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </div>
      )}
    </div>
  );
};
