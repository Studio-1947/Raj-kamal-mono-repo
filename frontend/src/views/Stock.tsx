/**
 * Inventory (Stock) Page
 *
 * This page will host inventory management features:
 * - Current stock levels per title/ISBN
 * - Low-stock alerts and reorder suggestions
 * - Inbound (purchase) and outbound (sales/returns) movements
 * - Filters by author, publisher, category
 *
 * For now, it's a lightweight, well-commented placeholder with a clear
 * structure so we can wire real APIs incrementally.
 */

import React from "react";
import AppLayout from "../shared/AppLayout";
import { useLang } from "../modules/lang/LangContext";

/**
 * Small, reusable skeleton block for a loading state
 */
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />
  );
}

/**
 * Inventory summary header with key metrics
 * Replace hard-coded placeholders with live data when backend endpoints are ready.
 */
function InventorySummary() {
  const items = [
    { label: "Total SKUs", value: "—" },
    { label: "In Stock", value: "—" },
    { label: "Low Stock", value: "—" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <p className="text-xs text-gray-500">{it.label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Main inventory table shell with commented columns
 * Swap the static rows with data-bound rows once APIs are available.
 */
function InventoryTable() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 bg-gray-50">
        {/* Filters go here: search by title/ISBN, dropdowns for publisher, category, etc. */}
        <input
          type="text"
          placeholder="Search by title, author, or ISBN..."
          className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-gray-500 bg-gray-50">
              {/* Core stock columns */}
              <th className="px-4 py-2 text-left font-medium">Title</th>
              <th className="px-4 py-2 text-left font-medium">Author</th>
              <th className="px-4 py-2 text-left font-medium">ISBN</th>
              <th className="px-4 py-2 text-right font-medium">In Stock</th>
              <th className="px-4 py-2 text-right font-medium">
                Reorder Level
              </th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Placeholder rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-48" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-36" />
                </td>
                <td className="px-4 py-2">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-4 py-2 text-right">
                  <Skeleton className="h-4 w-12 ml-auto" />
                </td>
                <td className="px-4 py-2 text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  {/* Action buttons (disabled for now) */}
                  <button
                    className="inline-flex items-center px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-600"
                    disabled
                  >
                    View
                  </button>
                  <button
                    className="inline-flex items-center px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-600"
                    disabled
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Stock() {
  const { t } = useLang();
  return (
    <AppLayout>
      {/* Page header */}
      <h1 className="text-3xl font-bold text-gray-900">{t("inventory")}</h1>
      <p className="mt-2 text-gray-600">
        Track and manage stock levels across titles.
      </p>

      {/* Summary cards */}
      <div className="mt-4">
        <InventorySummary />
      </div>

      {/* Table */}
      <div className="mt-6">
        <InventoryTable />
      </div>
    </AppLayout>
  );
}
