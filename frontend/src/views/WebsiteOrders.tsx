/**
 * Website Orders
 *
 * Live orders from rajkamalprakashan.com, served through our backend proxy
 * (`/api/website-orders`). Two queries back the page and share one filter state:
 * a paginated table, and a range summary that feeds the KPIs, trend and breakdowns.
 */

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import AppLayout from "../shared/AppLayout";
import {
  useWebsiteOrders,
  useWebsiteOrdersSummary,
  type WebsiteOrder,
} from "../services/websiteOrdersService";
import {
  OrdersFilterBar,
  OrdersKpiRow,
  OrdersTable,
  OrdersTrendChart,
  OrderDetailDrawer,
  PaymentMixPanel,
  TopProductsPanel,
  TopStatesPanel,
  daysAgo,
  toDateInput,
  type OrdersFilterState,
} from "./website-orders/components";

/** Last 30 days is the range an operations team actually works in day to day. */
const DEFAULT_FILTERS: OrdersFilterState = {
  search: "",
  status: [],
  paymentStatus: [],
  dateFrom: daysAgo(30),
  dateTo: toDateInput(new Date()),
};

const SEARCH_DEBOUNCE_MS = 400;

export default function WebsiteOrders() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = React.useState<OrdersFilterState>(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [selectedOrder, setSelectedOrder] = React.useState<WebsiteOrder | null>(null);

  // Typing shouldn't fire a request per keystroke — the upstream is rate-limited and
  // the summary query pages through the whole range on every change.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.search === searchDraft ? current : { ...current, search: searchDraft },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  // Any filter change invalidates the current page number: page 7 of the old result
  // set is meaningless against the new one.
  React.useEffect(() => {
    setPage(1);
  }, [filters]);

  const queryFilters = React.useMemo(
    () => ({
      status: filters.status,
      paymentStatus: filters.paymentStatus,
      search: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }),
    [filters],
  );

  const ordersQuery = useWebsiteOrders({ ...queryFilters, page, pageSize });
  const summaryQuery = useWebsiteOrdersSummary(queryFilters);

  const handleFilterChange = React.useCallback((patch: Partial<OrdersFilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const handleReset = React.useCallback(() => {
    setSearchDraft("");
    setFilters({ ...DEFAULT_FILTERS, dateTo: toDateInput(new Date()) });
  }, []);

  const handleRefresh = React.useCallback(() => {
    // Drop the whole feature's cache, not just the visible page — the KPIs and the
    // table must not disagree after a manual refresh.
    queryClient.invalidateQueries({ queryKey: ["website-orders"] });
  }, [queryClient]);

  return (
    <AppLayout>
      <div className="space-y-6 py-6">
        <header>
          <h1 className="text-3xl font-normal text-gray-900">Website Orders</h1>
          <p className="mt-2 text-gray-600">
            Live orders from rajkamalprakashan.com — status, fulfilment and revenue.
          </p>
        </header>

        <OrdersFilterBar
          filters={filters}
          searchDraft={searchDraft}
          onSearchDraftChange={setSearchDraft}
          onChange={handleFilterChange}
          onReset={handleReset}
          onRefresh={handleRefresh}
          isFetching={ordersQuery.isFetching || summaryQuery.isFetching}
        />

        {/* The summary is the expensive query; a failure there shouldn't hide the
            table, so it degrades to a thin notice instead of an error state. */}
        {summaryQuery.error ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Summary metrics are unavailable right now — the order list below is still live.
          </p>
        ) : (
          <OrdersKpiRow summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
        )}

        <OrdersTrendChart summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <PaymentMixPanel summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
          <TopProductsPanel summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
          <TopStatesPanel summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
        </div>

        <OrdersTable
          page={ordersQuery.data}
          isLoading={ordersQuery.isLoading}
          isFetching={ordersQuery.isFetching}
          error={ordersQuery.error}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSelectOrder={setSelectedOrder}
          filters={queryFilters}
        />
      </div>

      <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </AppLayout>
  );
}
