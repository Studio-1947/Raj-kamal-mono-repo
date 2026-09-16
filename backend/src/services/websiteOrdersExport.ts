/**
 * Website orders — CSV and PDF export.
 *
 * Both formats stream from the same `scanOrders` walk the summary uses, so an export
 * always reflects exactly the filters the user had applied, and a 20k-order CSV is
 * written out at constant memory rather than assembled in a string first.
 *
 * Two things drive the design here:
 *   - The data is genuinely multilingual. Customer names, cities and states come
 *     back in Devanagari (गौतमानन्द झा, वाराणसी, महाराष्ट्र) alongside romanised
 *     Hindi and accented Latin. Both writers handle that explicitly — see the BOM
 *     note in the CSV writer and the embedded font in the PDF writer.
 *   - Exports get opened in Excel, which treats a leading =, +, - or @ as a formula.
 *     Every field goes through `csvCell`, which neutralises that.
 */

import type { Response } from "express";
import PDFDocument from "pdfkit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  scanOrders,
  fetchOrdersSummary,
  type OrderFilters,
  type OrdersSummary,
  type ScanProgress,
  type WebsiteOrder,
} from "./websiteOrdersService.js";

/**
 * Exports scan deeper than the on-screen summary — the point of a download is to get
 * the whole set — but still need a ceiling: unfiltered, the range is the full 27k+
 * order history, which is ~270 upstream calls.
 */
const EXPORT_MAX_ORDERS = 20_000;

/** How many orders the PDF lists individually. Beyond this a PDF stops being useful. */
const PDF_MAX_TABLE_ROWS = 60;

const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../assets/fonts");
/**
 * Noto Sans Devanagari, embedded because PDF's built-in fonts are Latin-1 only and
 * would render every Hindi name as garbage. fontkit (which pdfkit uses) applies the
 * font's Indic OpenType features, so conjuncts and matras shape correctly rather
 * than appearing as loose glyphs with visible viramas.
 */
const FONT_PATH = path.join(FONT_DIR, "NotoSansDevanagari.ttf");

export type CsvGranularity = "orders" | "items";

// ── CSV ──────────────────────────────────────────────────────────────────────

/**
 * Quote and escape one CSV field.
 *
 * The leading-apostrophe guard is deliberate: a customer name or note beginning with
 * =, +, - or @ is executed as a formula when the file is opened in Excel or Sheets
 * (CSV injection). Prefixing with an apostrophe keeps the text readable while making
 * the cell inert.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  // Escape embedded quotes by doubling, per RFC 4180.
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(cells: unknown[]): string {
  // CRLF, not LF — Excel on Windows is the primary consumer here.
  return cells.map(csvCell).join(",") + "\r\n";
}

/** ISO timestamp → a form Excel parses as a date without a manual import step. */
function csvDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace("T", " ").slice(0, 19);
}

const ORDER_COLUMNS = [
  "Order Number", "Placed At", "Status", "Payment Status", "Payment Method",
  "Customer Name", "Email", "Phone", "Customer Group",
  "City", "State", "Postal Code", "Country",
  "Titles", "Copies", "Items",
  "Subtotal", "Discount", "Tax", "Shipping", "COD Fee", "Grand Total", "Currency",
  "Carrier", "Tracking Number", "Shipment Status", "Shipped At", "Delivered At",
  "Split Order", "Channel", "Order ID",
];

const ITEM_COLUMNS = [
  "Order Number", "Placed At", "Status", "Payment Status",
  "Customer Name", "Phone", "City", "State",
  "Title", "ISBN / SKU", "Variant", "Quantity", "Unit Price", "Line Total",
  "Order Grand Total", "Currency", "Order ID",
];

function orderRow(order: WebsiteOrder): string {
  return csvRow([
    order.orderNumber,
    csvDateTime(order.placedAt),
    order.status,
    order.paymentStatus,
    order.paymentMethod ?? "",
    order.customer.name,
    order.customer.email ?? "",
    order.customer.phone ?? "",
    order.customer.group ?? "",
    order.shipTo.city ?? "",
    order.shipTo.state ?? "",
    order.shipTo.postalCode ?? "",
    order.shipTo.country ?? "",
    order.itemCount,
    order.totalQuantity,
    // Readable at a glance without needing the line-item export alongside it.
    order.items.map((item) => `${item.name} x${item.quantity}`).join(" | "),
    order.amounts.subtotal,
    order.amounts.discount,
    order.amounts.tax,
    order.amounts.shipping,
    order.amounts.codFee,
    order.amounts.grandTotal,
    order.currency,
    order.shipment?.carrier ?? "",
    order.shipment?.trackingNumber ?? "",
    order.shipment?.status ?? "",
    csvDateTime(order.shipment?.shippedAt ?? null),
    csvDateTime(order.shipment?.deliveredAt ?? null),
    order.isSplitOrder ? "Yes" : "No",
    order.channel,
    order.id,
  ]);
}

function itemRows(order: WebsiteOrder): string {
  return order.items
    .map((item) =>
      csvRow([
        order.orderNumber,
        csvDateTime(order.placedAt),
        order.status,
        order.paymentStatus,
        order.customer.name,
        order.customer.phone ?? "",
        order.shipTo.city ?? "",
        order.shipTo.state ?? "",
        item.name,
        item.sku ?? "",
        item.variant ?? "",
        item.quantity,
        item.unitPrice,
        item.lineTotal,
        order.amounts.grandTotal,
        order.currency,
        order.id,
      ]),
    )
    .join("");
}

/**
 * Stream the filtered orders as CSV.
 *
 * `granularity: "items"` emits one row per book with the order fields repeated —
 * that's the shape you need to pivot by title, which the order-level export can't
 * answer. Headers are set by the caller before this runs.
 */
export async function streamOrdersCsv(
  filters: OrderFilters,
  granularity: CsvGranularity,
  res: Response,
): Promise<void> {
  const progress: ScanProgress = { scanned: 0, truncated: false };

  // UTF-8 BOM. Without it Excel decodes the file as the system codepage and every
  // Devanagari name arrives as mojibake — the single most common way an export like
  // this is reported "broken".
  res.write("﻿");
  res.write(csvRow(granularity === "items" ? ITEM_COLUMNS : ORDER_COLUMNS));

  for await (const order of scanOrders(filters, EXPORT_MAX_ORDERS, progress)) {
    res.write(granularity === "items" ? itemRows(order) : orderRow(order));
  }

  if (progress.truncated) {
    // A silently short file is worse than a noisy one — say so inside the data.
    res.write(csvRow([`Export capped at ${EXPORT_MAX_ORDERS} orders; narrow the filters for the full set.`]));
  }
  res.end();
}

// ── PDF ──────────────────────────────────────────────────────────────────────

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function money(value: number): string {
  return INR.format(value);
}

function count(value: number): string {
  return value.toLocaleString("en-IN");
}

function prettyDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function humanize(value: string | null): string {
  if (!value) return "—";
  const words = value.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const INK = "#111827";
const MUTED = "#6B7280";
const RULE = "#E5E7EB";
const ACCENT = "#0067B5";

type Doc = InstanceType<typeof PDFDocument>;

function sectionHeading(doc: Doc, text: string): void {
  // Keep a heading with at least a couple of rows of its section.
  if (doc.y > doc.page.height - doc.page.margins.bottom - 90) doc.addPage();
  doc.moveDown(0.8);
  doc.fillColor(INK).fontSize(12).text(text);
  doc.moveDown(0.35);
  const y = doc.y;
  doc
    .strokeColor(RULE)
    .lineWidth(1)
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke();
  doc.moveDown(0.5);
}

/** One table row with right-aligned numeric columns. */
function tableRow(
  doc: Doc,
  cells: string[],
  widths: number[],
  options: { bold?: boolean; muted?: boolean; alignRightFrom?: number } = {},
): void {
  const { bold = false, muted = false, alignRightFrom = 1 } = options;
  const bottom = doc.page.height - doc.page.margins.bottom - 24;
  if (doc.y > bottom) doc.addPage();

  const y = doc.y;
  let x = doc.page.margins.left;

  doc.font(bold ? "body-bold" : "body").fillColor(muted ? MUTED : INK).fontSize(9);
  cells.forEach((cell, index) => {
    const width = widths[index] ?? 0;
    doc.text(cell, x, y, {
      width: width - 6,
      align: index >= alignRightFrom ? "right" : "left",
      ellipsis: true,
      lineBreak: false,
    });
    x += width;
  });
  doc.y = y + 14;
}

function kpiBlock(doc: Doc, summary: OrdersSummary): void {
  const tiles: [string, string][] = [
    ["Orders", count(summary.orderCount)],
    ["Revenue", money(summary.revenue)],
    ["Avg order value", money(summary.averageOrderValue)],
    ["Books sold", count(summary.itemsSold)],
  ];

  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 10;
  const width = (usable - gap * (tiles.length - 1)) / tiles.length;
  const top = doc.y;

  tiles.forEach(([label, value], index) => {
    const x = doc.page.margins.left + index * (width + gap);
    doc.roundedRect(x, top, width, 54, 8).fillAndStroke("#F9FAFB", RULE);
    doc.fillColor(MUTED).font("body").fontSize(8).text(label.toUpperCase(), x + 10, top + 10, {
      width: width - 20,
      lineBreak: false,
    });
    doc.fillColor(INK).font("body-bold").fontSize(14).text(value, x + 10, top + 25, {
      width: width - 20,
      ellipsis: true,
      lineBreak: false,
    });
  });

  doc.y = top + 54;
}

export interface PdfExportContext {
  filters: OrderFilters;
  /** Description of the active filters, rendered under the title. */
  filterLabel: string;
}

/**
 * Build the PDF report and pipe it to `res`.
 *
 * This is a report, not a data dump — the CSV is the right tool for every row. It
 * reuses the summary the dashboard already computes, then lists the most recent
 * orders for context.
 */
export async function streamOrdersPdf(
  { filters, filterLabel }: PdfExportContext,
  res: Response,
): Promise<void> {
  // Compute before creating the document: if the upstream fails we want the error to
  // propagate to the route while the response is still clean, not mid-PDF.
  const summary = await fetchOrdersSummary(filters);

  const recent: WebsiteOrder[] = [];
  const progress: ScanProgress = { scanned: 0, truncated: false };
  for await (const order of scanOrders({ ...filters }, PDF_MAX_TABLE_ROWS, progress)) {
    recent.push(order);
    if (recent.length >= PDF_MAX_TABLE_ROWS) break;
  }

  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  doc.registerFont("body", FONT_PATH);
  // The variable font's default instance is Regular; pdfkit has no synthetic bold, so
  // "bold" is the same face — weight is carried by size and colour instead.
  doc.registerFont("body-bold", FONT_PATH);
  doc.pipe(res);

  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ── Title ──
  doc.font("body-bold").fillColor(INK).fontSize(20).text("Website Orders");
  doc.font("body").fillColor(MUTED).fontSize(9).text("rajkamalprakashan.com");
  doc.moveDown(0.4);
  doc.fillColor(INK).fontSize(9).text(filterLabel);
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text(
      `Generated ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
    );
  doc.moveDown(0.8);

  if (summary.truncated) {
    const note =
      `Note: this range exceeds what is aggregated in one pass. Every figure below covers the ` +
      `${count(summary.scannedOrders)} most recent orders` +
      (summary.coveredFrom ? ` (${prettyDate(summary.coveredFrom)} onward)` : "") +
      `, not the full range selected.`;
    const height = doc.heightOfString(note, { width: usable - 20 }) + 14;
    doc.roundedRect(doc.page.margins.left, doc.y, usable, height, 6).fillAndStroke("#FFFBEB", "#FDE68A");
    doc.fillColor("#92400E").fontSize(8).text(note, doc.page.margins.left + 10, doc.y + 7, {
      width: usable - 20,
    });
    doc.y += 8;
    doc.moveDown(0.5);
  }

  kpiBlock(doc, summary);

  // ── Status ──
  sectionHeading(doc, "Orders by status");
  const statusWidths = [usable - 200, 100, 100];
  tableRow(doc, ["Status", "Orders", "Revenue"], statusWidths, { bold: true, muted: true });
  Object.entries(summary.byStatus)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([status, bucket]) =>
      tableRow(doc, [humanize(status), count(bucket.count), money(bucket.revenue)], statusWidths),
    );

  // ── Payment ──
  sectionHeading(doc, "Payment mix");
  tableRow(doc, ["Method", "Orders", "Revenue"], statusWidths, { bold: true, muted: true });
  Object.entries(summary.byPaymentMethod)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([method, bucket]) =>
      tableRow(doc, [humanize(method), count(bucket.count), money(bucket.revenue)], statusWidths),
    );

  // ── Top titles ──
  if (summary.topProducts.length > 0) {
    sectionHeading(doc, "Top titles");
    const widths = [usable - 220, 120, 100];
    tableRow(doc, ["Title", "Copies sold", "Revenue"], widths, { bold: true, muted: true });
    summary.topProducts.forEach((product) =>
      tableRow(doc, [product.name, count(product.quantity), money(product.revenue)], widths),
    );
  }

  // ── Top states ──
  if (summary.topStates.length > 0) {
    sectionHeading(doc, "Top states");
    const widths = [usable - 220, 120, 100];
    tableRow(doc, ["State", "Orders", "Revenue"], widths, { bold: true, muted: true });
    summary.topStates.forEach((state) =>
      tableRow(doc, [state.state, count(state.orders), money(state.revenue)], widths),
    );
  }

  // ── Recent orders ──
  if (recent.length > 0) {
    sectionHeading(doc, `Most recent orders (${recent.length})`);
    const widths = [110, usable - 430, 90, 90, 70, 70];
    tableRow(doc, ["Order", "Customer", "Placed", "Status", "Items", "Total"], widths, {
      bold: true,
      muted: true,
      alignRightFrom: 4,
    });
    recent.forEach((order) =>
      tableRow(
        doc,
        [
          order.orderNumber,
          order.customer.name,
          prettyDate(order.placedAt),
          humanize(order.status),
          String(order.totalQuantity),
          money(order.amounts.grandTotal),
        ],
        widths,
        { alignRightFrom: 4 },
      ),
    );
    doc.moveDown(0.4);
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .text("For the complete order list, use the CSV export.");
  }

  // ── Page numbers ──
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    doc
      .font("body")
      .fillColor(MUTED)
      .fontSize(8)
      .text(
        `Page ${i + 1} of ${range.count}`,
        doc.page.margins.left,
        doc.page.height - 28,
        { width: usable, align: "center", lineBreak: false },
      );
  }

  doc.end();
}

/** Human description of the active filters, shown on the PDF and used in filenames. */
export function describeFilters(filters: OrderFilters): string {
  const parts: string[] = [];
  if (filters.dateFrom || filters.dateTo) {
    parts.push(`${prettyDate(filters.dateFrom ?? null)} – ${prettyDate(filters.dateTo ?? null)}`);
  }
  if (filters.status) parts.push(`Status: ${humanize(filters.status)}`);
  if (filters.paymentStatus) parts.push(`Payment: ${humanize(filters.paymentStatus)}`);
  if (filters.search) parts.push(`Search: "${filters.search}"`);
  return parts.length > 0 ? parts.join("  ·  ") : "All orders";
}

/** `website-orders_2026-08-10_2026-09-09.csv` — sorts and reads well in a downloads folder. */
export function exportFilename(filters: OrderFilters, suffix: string, extension: string): string {
  const from = filters.dateFrom?.slice(0, 10);
  const to = filters.dateTo?.slice(0, 10);
  const range = from && to ? `_${from}_${to}` : "";
  return `website-orders${suffix ? `-${suffix}` : ""}${range}.${extension}`;
}
