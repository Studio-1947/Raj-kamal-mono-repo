import type { WebsiteCart } from "../../../services/websiteCartsService";

function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per cart, with the books flattened into a single readable column. */
export function downloadCartsCsv(carts: WebsiteCart[]): void {
  const header = [
    "Customer",
    "Phone",
    "Email",
    "Group",
    "Last activity",
    "Days waiting",
    "Books",
    "Titles",
    "Subtotal",
    "Discount",
    "Cart value",
    "Out of stock item",
    "Outreach status",
    "Outreach channel",
    "Outreach note",
    "Contacted by",
    "Books in cart",
  ];
  const rows = carts.map((c) => {
    const days = c.updatedAt ? Math.floor((Date.now() - new Date(c.updatedAt).getTime()) / 86_400_000) : "";
    return [
      c.customer.name ?? "",
      c.customer.phone ?? "",
      c.customer.email ?? "",
      c.customer.group ?? "",
      c.updatedAt ?? "",
      days,
      c.totalQuantity,
      c.itemCount,
      c.amounts.subtotal,
      c.amounts.discount,
      c.amounts.grandTotal,
      c.hasStockIssue ? "Yes" : "No",
      c.outreach?.status ?? "",
      c.outreach?.channel ?? "",
      c.outreach?.note ?? "",
      c.outreach?.contactedByName ?? "",
      c.items.map((i) => `${i.name}${i.sku ? ` [${i.sku}]` : ""} x${i.quantity}`).join("; "),
    ];
  });

  // BOM so Excel opens Devanagari/UTF-8 text correctly.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `abandoned-carts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
