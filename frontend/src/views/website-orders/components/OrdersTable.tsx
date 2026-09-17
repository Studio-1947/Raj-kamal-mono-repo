import React from "react";
import { FiPackage, FiTruck, FiAlertCircle, FiDownload } from "react-icons/fi";
import { formatINR } from "../../total-offline-sales/components";
import TablePagination from "../../../components/TablePagination";
import type { OrdersPage, WebsiteOrder, OrderFilters } from "../../../services/websiteOrdersService";
import { STATUS_LABELS } from "../../../services/websiteOrdersService";
import {
  formatDateTime,
  formatNumber,
  humanizeEnum,
  paymentStatusStyle,
  statusStyle,
} from "./utils";
import { ExportOrdersModal } from "./ExportOrdersModal";

interface OrdersTableProps {
  page: OrdersPage | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectOrder: (order: WebsiteOrder) => void;
  filters?: OrderFilters;
}

const COLUMNS = ["Order", "Placed", "Customer", "Ships to", "Items", "Status", "Payment", "Total"];

function StatusChip({ status }: { status: string }) {
  const style = statusStyle(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium ${style.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {STATUS_LABELS[status] ?? humanizeEnum(status)}
    </span>
  );
}

function SkeletonRows({ rows, columns }: { rows: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  page,
  isLoading,
  isFetching,
  error,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  onSelectOrder,
  filters = {},
}) => {
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const orders = page?.orders ?? [];

  return (
    <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-normal text-gray-800">Orders</h3>
          <p className="text-xs text-gray-400">
            {page ? `${formatNumber(page.meta.total)} orders match the current filters` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Only shown on a background refetch — the first load has its own skeleton. */}
          {isFetching && !isLoading && (
            <span className="text-xs text-gray-400">Refreshing…</span>
          )}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            disabled={isLoading || !page || page.meta.total === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition"
            title="Export CSV spreadsheet with custom fields"
          >
            <FiDownload className="h-4 w-4 text-blue-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <FiAlertCircle className="h-8 w-8 text-rose-400" />
          <p className="text-sm font-medium text-gray-700">Couldn&apos;t load website orders</p>
          <p className="max-w-md text-xs text-gray-500">
            {(error as any)?.response?.data?.error ??
              (error as any)?.message ??
              "The website API did not respond."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  {COLUMNS.map((column) => (
                    <th
                      key={column}
                      className={`whitespace-nowrap px-4 py-3 font-normal ${
                        column === "Total" || column === "Items" ? "text-right" : "text-left"
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && orders.length === 0 ? (
                  <SkeletonRows rows={8} columns={COLUMNS.length} />
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-16 text-center">
                      <FiPackage className="mx-auto h-8 w-8 text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">
                        No orders match these filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="cursor-pointer transition hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{order.orderNumber}</span>
                          {order.isSplitOrder && (
                            <span
                              className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"
                              title="Split from a backordered parent order"
                            >
                              SPLIT
                            </span>
                          )}
                        </div>
                        {order.shipment?.trackingNumber && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                            <FiTruck className="h-3 w-3" />
                            {order.shipment.trackingNumber}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatDateTime(order.placedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{order.customer.name}</p>
                        <p className="text-xs text-gray-400">
                          {order.customer.phone ?? order.customer.email ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p>{order.shipTo.city ?? "—"}</p>
                        <p className="text-xs text-gray-400">{order.shipTo.state ?? ""}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-600">
                        {order.totalQuantity}
                        {order.itemCount !== order.totalQuantity && (
                          <span className="text-xs text-gray-400">
                            {" "}
                            / {order.itemCount} title{order.itemCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusChip status={order.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-block rounded-lg border px-2 py-1 text-xs font-medium ${paymentStatusStyle(order.paymentStatus)}`}
                        >
                          {humanizeEnum(order.paymentStatus)}
                        </span>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {order.paymentMethod === "CASH_ON_DELIVERY"
                            ? "COD"
                            : humanizeEnum(order.paymentMethod)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">
                        {formatINR(order.amounts.grandTotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {page && page.meta.total > 0 && (
            <div className="px-6">
              <TablePagination
                currentPage={currentPage}
                totalItems={page.meta.total}
                pageSize={pageSize}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                pageSizeOptions={[20, 50, 100]}
              />
            </div>
          )}
        </>
      )}

      <ExportOrdersModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filters={filters}
        currentPageOrders={orders}
        totalMatchingOrders={page?.meta.total ?? 0}
      />
    </div>
  );
};
