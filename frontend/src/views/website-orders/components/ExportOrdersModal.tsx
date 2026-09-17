import React, { useState, useMemo } from "react";
import {
  FiDownload,
  FiX,
  FiCheckSquare,
  FiSquare,
  FiUser,
  FiPhone,
  FiList,
  FiTruck,
  FiGrid,
  FiDollarSign,
  FiPackage,
} from "react-icons/fi";
import type { OrderFilters, WebsiteOrder } from "../../../services/websiteOrdersService";
import { buildExportCsvUrl } from "../../../services/websiteOrdersService";
import { formatDateTime } from "./utils";

export interface FieldDefinition {
  key: string;
  label: string;
  category: "customer" | "order" | "shipping" | "amounts" | "items" | "shipment";
  categoryLabel: string;
  getValue: (order: WebsiteOrder) => unknown;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",") + "\r\n";
}

export const EXPORT_FIELDS: FieldDefinition[] = [
  // Customer
  {
    key: "customerName",
    label: "Customer Name",
    category: "customer",
    categoryLabel: "Customer Info",
    getValue: (o) => o.customer.name,
  },
  {
    key: "customerPhone",
    label: "Phone Number",
    category: "customer",
    categoryLabel: "Customer Info",
    getValue: (o) => o.customer.phone ?? "",
  },
  {
    key: "customerEmail",
    label: "Email Address",
    category: "customer",
    categoryLabel: "Customer Info",
    getValue: (o) => o.customer.email ?? "",
  },
  {
    key: "customerGroup",
    label: "Customer Group",
    category: "customer",
    categoryLabel: "Customer Info",
    getValue: (o) => o.customer.group ?? "",
  },

  // Order Details
  {
    key: "orderNumber",
    label: "Order Number",
    category: "order",
    categoryLabel: "Order Details",
    getValue: (o) => o.orderNumber,
  },
  {
    key: "placedAt",
    label: "Placed Date & Time",
    category: "order",
    categoryLabel: "Order Details",
    getValue: (o) => (o.placedAt ? formatDateTime(o.placedAt) : ""),
  },
  {
    key: "status",
    label: "Order Status",
    category: "order",
    categoryLabel: "Order Details",
    getValue: (o) => o.status,
  },
  {
    key: "paymentStatus",
    label: "Payment Status",
    category: "order",
    categoryLabel: "Order Details",
    getValue: (o) => o.paymentStatus,
  },
  {
    key: "paymentMethod",
    label: "Payment Method",
    category: "order",
    categoryLabel: "Order Details",
    getValue: (o) => o.paymentMethod ?? "",
  },
  {
    key: "channel",
    label: "Sales Channel",
    category: "order",
    categoryLabel: "Order Details",
    getValue: (o) => o.channel,
  },
  {
    key: "isSplitOrder",
    label: "Split Order Flag",
    category: "order",
    categoryLabel: "Order Details",
    getValue: (o) => (o.isSplitOrder ? "Yes" : "No"),
  },
  {
    key: "orderId",
    label: "Order System ID",
    category: "order",
    categoryLabel: "Order Details",
    getValue: (o) => o.id,
  },

  // Shipping & Location
  {
    key: "city",
    label: "City",
    category: "shipping",
    categoryLabel: "Shipping Address",
    getValue: (o) => o.shipTo.city ?? "",
  },
  {
    key: "state",
    label: "State",
    category: "shipping",
    categoryLabel: "Shipping Address",
    getValue: (o) => o.shipTo.state ?? "",
  },
  {
    key: "postalCode",
    label: "Postal / Pin Code",
    category: "shipping",
    categoryLabel: "Shipping Address",
    getValue: (o) => o.shipTo.postalCode ?? "",
  },
  {
    key: "country",
    label: "Country",
    category: "shipping",
    categoryLabel: "Shipping Address",
    getValue: (o) => o.shipTo.country ?? "",
  },

  // Items
  {
    key: "itemCount",
    label: "Unique Book Titles",
    category: "items",
    categoryLabel: "Items & Quantities",
    getValue: (o) => o.itemCount,
  },
  {
    key: "totalQuantity",
    label: "Total Copies Sold",
    category: "items",
    categoryLabel: "Items & Quantities",
    getValue: (o) => o.totalQuantity,
  },
  {
    key: "itemsSummary",
    label: "Item Titles Summary",
    category: "items",
    categoryLabel: "Items & Quantities",
    getValue: (o) => o.items.map((i) => `${i.name} x${i.quantity}`).join(" | "),
  },

  // Financials
  {
    key: "subtotal",
    label: "Subtotal",
    category: "amounts",
    categoryLabel: "Financial Amounts",
    getValue: (o) => o.amounts.subtotal,
  },
  {
    key: "discount",
    label: "Discount Total",
    category: "amounts",
    categoryLabel: "Financial Amounts",
    getValue: (o) => o.amounts.discount,
  },
  {
    key: "tax",
    label: "Tax Total",
    category: "amounts",
    categoryLabel: "Financial Amounts",
    getValue: (o) => o.amounts.tax,
  },
  {
    key: "shippingFee",
    label: "Shipping Fee",
    category: "amounts",
    categoryLabel: "Financial Amounts",
    getValue: (o) => o.amounts.shipping,
  },
  {
    key: "codFee",
    label: "COD Fee",
    category: "amounts",
    categoryLabel: "Financial Amounts",
    getValue: (o) => o.amounts.codFee,
  },
  {
    key: "grandTotal",
    label: "Grand Total Amount",
    category: "amounts",
    categoryLabel: "Financial Amounts",
    getValue: (o) => o.amounts.grandTotal,
  },
  {
    key: "currency",
    label: "Currency",
    category: "amounts",
    categoryLabel: "Financial Amounts",
    getValue: (o) => o.currency,
  },

  // Logistics & Fulfillment
  {
    key: "carrier",
    label: "Courier Carrier",
    category: "shipment",
    categoryLabel: "Logistics & Delivery",
    getValue: (o) => o.shipment?.carrier ?? "",
  },
  {
    key: "trackingNumber",
    label: "Tracking Number",
    category: "shipment",
    categoryLabel: "Logistics & Delivery",
    getValue: (o) => o.shipment?.trackingNumber ?? "",
  },
  {
    key: "shipmentStatus",
    label: "Shipment Status",
    category: "shipment",
    categoryLabel: "Logistics & Delivery",
    getValue: (o) => o.shipment?.status ?? "",
  },
];

const ALL_KEYS = EXPORT_FIELDS.map((f) => f.key);

const CATEGORIES: { id: FieldDefinition["category"]; label: string; icon: React.ReactNode }[] = [
  { id: "customer", label: "Customer Info", icon: <FiUser className="h-4 w-4 text-blue-500" /> },
  { id: "order", label: "Order Details", icon: <FiList className="h-4 w-4 text-emerald-500" /> },
  { id: "shipping", label: "Shipping Address", icon: <FiTruck className="h-4 w-4 text-amber-500" /> },
  { id: "items", label: "Items & Quantities", icon: <FiPackage className="h-4 w-4 text-purple-500" /> },
  { id: "amounts", label: "Financial Amounts", icon: <FiDollarSign className="h-4 w-4 text-indigo-500" /> },
  { id: "shipment", label: "Logistics & Tracking", icon: <FiTruck className="h-4 w-4 text-rose-500" /> },
];

interface ExportOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: OrderFilters;
  currentPageOrders?: WebsiteOrder[];
  totalMatchingOrders?: number;
}

export const ExportOrdersModal: React.FC<ExportOrdersModalProps> = ({
  isOpen,
  onClose,
  filters,
  currentPageOrders = [],
  totalMatchingOrders = 0,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(ALL_KEYS);
  const [exportScope, setExportScope] = useState<"visible" | "all">("all");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const toggleKey = (key: string) => {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  };

  const selectAll = () => setSelectedKeys(ALL_KEYS);
  const selectNone = () => setSelectedKeys([]);

  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case "all":
        setSelectedKeys(ALL_KEYS);
        break;
      case "names_only":
        setSelectedKeys(["customerName"]);
        break;
      case "names_phone":
        setSelectedKeys(["customerName", "customerPhone"]);
        break;
      case "customer_contact":
        setSelectedKeys(["customerName", "customerPhone", "customerEmail", "city", "state", "postalCode"]);
        break;
      case "table_view":
        setSelectedKeys([
          "orderNumber",
          "placedAt",
          "customerName",
          "customerPhone",
          "city",
          "state",
          "totalQuantity",
          "status",
          "paymentStatus",
          "grandTotal",
        ]);
        break;
      case "shipping_delivery":
        setSelectedKeys([
          "orderNumber",
          "customerName",
          "customerPhone",
          "city",
          "state",
          "postalCode",
          "carrier",
          "trackingNumber",
          "shipmentStatus",
        ]);
        break;
    }
  };

  const handleDownload = async () => {
    if (selectedKeys.length === 0) {
      alert("Please select at least one field to export.");
      return;
    }

    setIsExporting(true);

    try {
      if (exportScope === "visible" && currentPageOrders.length > 0) {
        // Instant client-side CSV download
        const activeFields = EXPORT_FIELDS.filter((f) => selectedKeys.includes(f.key));
        const headers = activeFields.map((f) => f.label);
        const rows = currentPageOrders.map((order) =>
          activeFields.map((f) => f.getValue(order)),
        );

        const csvContent = "\uFEFF" + [csvRow(headers), ...rows.map(csvRow)].join("");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        link.download = `website-orders-page-${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Trigger backend streamed CSV export
        const exportUrl = buildExportCsvUrl(filters, selectedKeys, "orders");
        const link = document.createElement("a");
        link.href = exportUrl;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <FiDownload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Customizable CSV Export</h2>
              <p className="text-xs text-gray-500">
                Choose exactly which columns to include in your exported spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Scope Selector */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">
              Export Scope
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportScope("visible")}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                  exportScope === "visible"
                    ? "border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    exportScope === "visible" ? "border-blue-600 bg-blue-600" : "border-gray-300"
                  }`}
                >
                  {exportScope === "visible" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="text-sm font-medium block">Current Page Only</span>
                  <span className="text-xs text-gray-500">
                    {currentPageOrders.length} visible orders on screen
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportScope("all")}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                  exportScope === "all"
                    ? "border-blue-500 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    exportScope === "all" ? "border-blue-600 bg-blue-600" : "border-gray-300"
                  }`}
                >
                  {exportScope === "all" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="text-sm font-medium block">All Filtered Orders</span>
                  <span className="text-xs text-gray-500">
                    {totalMatchingOrders > 0 ? `${totalMatchingOrders} total matching orders` : "All orders matching current filters"}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Quick Presets
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-blue-600 font-medium hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-xs text-gray-500 hover:text-gray-800 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
              >
                <FiGrid className="h-3.5 w-3.5 text-gray-500" />
                All Fields
              </button>

              <button
                type="button"
                onClick={() => applyPreset("names_only")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/50 text-xs font-medium text-blue-700 hover:bg-blue-100/60 transition"
              >
                <FiUser className="h-3.5 w-3.5" />
                Names Only
              </button>

              <button
                type="button"
                onClick={() => applyPreset("names_phone")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs font-medium text-emerald-700 hover:bg-emerald-100/60 transition"
              >
                <FiPhone className="h-3.5 w-3.5" />
                Names + Phone
              </button>

              <button
                type="button"
                onClick={() => applyPreset("customer_contact")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-xs font-medium text-indigo-700 hover:bg-indigo-100/60 transition"
              >
                <FiUser className="h-3.5 w-3.5" />
                Customer Contact
              </button>

              <button
                type="button"
                onClick={() => applyPreset("table_view")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/50 text-xs font-medium text-purple-700 hover:bg-purple-100/60 transition"
              >
                <FiList className="h-3.5 w-3.5" />
                Table Columns
              </button>

              <button
                type="button"
                onClick={() => applyPreset("shipping_delivery")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs font-medium text-amber-700 hover:bg-amber-100/60 transition"
              >
                <FiTruck className="h-3.5 w-3.5" />
                Shipping & Delivery
              </button>
            </div>
          </div>

          {/* Categorized Field Checkboxes */}
          <div className="space-y-5 border-t border-gray-100 pt-4">
            {CATEGORIES.map((cat) => {
              const categoryFields = EXPORT_FIELDS.filter((f) => f.category === cat.id);
              if (categoryFields.length === 0) return null;

              const isAllCategorySelected = categoryFields.every((f) =>
                selectedKeys.includes(f.key),
              );

              const toggleCategory = () => {
                if (isAllCategorySelected) {
                  setSelectedKeys((curr) =>
                    curr.filter((k) => !categoryFields.some((f) => f.key === k)),
                  );
                } else {
                  const toAdd = categoryFields.map((f) => f.key);
                  setSelectedKeys((curr) => Array.from(new Set([...curr, ...toAdd])));
                }
              };

              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={toggleCategory}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-800 hover:text-blue-600 transition"
                    >
                      {cat.icon}
                      <span>{cat.label}</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        ({categoryFields.filter((f) => selectedKeys.includes(f.key)).length}/
                        {categoryFields.length})
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {categoryFields.map((field) => {
                      const isChecked = selectedKeys.includes(field.key);
                      return (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => toggleKey(field.key)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left border transition ${
                            isChecked
                              ? "bg-blue-50/40 border-blue-200 text-gray-900 font-medium"
                              : "bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {isChecked ? (
                            <FiCheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : (
                            <FiSquare className="h-4 w-4 text-gray-300 shrink-0" />
                          )}
                          <span className="truncate">{field.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="text-xs text-gray-500">
            Selected <span className="font-semibold text-gray-900">{selectedKeys.length}</span> of{" "}
            {EXPORT_FIELDS.length} fields
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || selectedKeys.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FiDownload className="h-4 w-4" />
              {isExporting ? "Generating CSV..." : "Download CSV"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
