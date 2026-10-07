/**
 * Abandoned Carts
 *
 * Open carts from rajkamalprakashan.com that never became an order, served through
 * our backend proxy (`/api/website-carts`). The backend holds the full cart set and
 * does the filtering, so one filter state drives the table, the KPIs and every chart.
 */

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
  FiClock,
  FiTarget,
  FiAlertTriangle,
} from "react-icons/fi";
import AppLayout from "../shared/AppLayout";
import { useLockedFilters } from "../hooks/useLockedFilters";
import {
  DEFAULT_CART_FILTERS,
  clearCartOutreach,
  saveCartOutreach,
  fetchAllMatchingCarts,
  refreshWebsiteCarts,
  useWebsiteCarts,
  useWebsiteCartsConversion,
  useWebsiteCartsSummary,
  type CartFilterState,
  type OutreachChannel,
  type OutreachInput,
  type WebsiteCart,
} from "../services/websiteCartsService";
import { KpiCard, formatINR } from "./total-offline-sales/components";
import {
  AbandonedCartsTable,
  CartAgePanel,
  CartConversionSection,
  CartFilterPanel,
  CartHourChart,
  CartRecoveryPanel,
  CartSizeBandsChart,
  CartTrendChart,
  OutreachDialog,
  CartValueBandsChart,
  CartWeekdayChart,
  TopCartCustomersPanel,
  TopCartProductsPanel,
  downloadCartsCsv,
} from "./abandoned-carts/components";
import { formatNumber } from "./website-orders/components/utils";

const SEARCH_DEBOUNCE_MS = 400;

export default function AbandonedCarts() {
  const queryClient = useQueryClient();
  const { filters, isLocked, updateFilters, setFilters, toggleLock, resetFilters } =
    useLockedFilters<CartFilterState>("website-carts", DEFAULT_CART_FILTERS);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Segments and "click a book" replace the whole filter set, so keep the search
  // box in step with whatever the filters now say.
  React.useEffect(() => {
    // Keep the draft as typed (e.g. a trailing space) when it already means the same thing.
    setSearchDraft((draft) => (draft.trim() === filters.search ? draft : filters.search));
  }, [filters.search]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== searchDraft.trim()) updateFilters({ search: searchDraft.trim() });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.search, updateFilters]);

  // Page 7 of the old result set means nothing against a new one.
  React.useEffect(() => {
    setPage(1);
  }, [filters]);

  const cartsQuery = useWebsiteCarts({ ...filters, page, pageSize });
  const summaryQuery = useWebsiteCartsSummary(filters);
  const conversionQuery = useWebsiteCartsConversion(filters);
  const summary = summaryQuery.data;

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Re-pull upstream once, then let the queries read the fresh copy.
      await refreshWebsiteCarts(filters);
      await queryClient.invalidateQueries({ queryKey: ["website-carts"] });
    } finally {
      setIsRefreshing(false);
    }
  }, [filters, queryClient]);

  const handleExport = React.useCallback(async () => {
    setIsExporting(true);
    try {
      downloadCartsCsv(await fetchAllMatchingCarts(filters));
    } finally {
      setIsExporting(false);
    }
  }, [filters]);

  const [outreachCart, setOutreachCart] = React.useState<WebsiteCart | null>(null);

  const refreshAfterOutreach = () => queryClient.invalidateQueries({ queryKey: ["website-carts"] });
  const saveOutreach = useMutation({
    mutationFn: ({ cartId, input }: { cartId: string; input: OutreachInput }) => saveCartOutreach(cartId, input),
    onSuccess: () => {
      setOutreachCart(null);
      return refreshAfterOutreach();
    },
  });
  const clearOutreach = useMutation({
    mutationFn: (cartId: string) => clearCartOutreach(cartId),
    onSuccess: () => {
      setOutreachCart(null);
      return refreshAfterOutreach();
    },
  });

  // Clicking WhatsApp / call / email is as good as a log entry: record it once, so the
  // team does not have to remember to. A cart that is already logged is left alone.
  const handleContact = React.useCallback(
    (cart: WebsiteCart, channel: OutreachChannel) => {
      if (cart.outreach) return;
      saveOutreach.mutate({
        cartId: cart.id,
        input: { status: "CONTACTED", channel, customerId: cart.customer.id },
      });
    },
    [saveOutreach],
  );

  const stale = summary ? summary.byAge.month.count + summary.byAge.older.count : 0;

  return (
    <AppLayout>
      <div className="space-y-6 py-6">
        <header>
          <h1 className="text-3xl font-normal text-gray-900">Abandoned Carts</h1>
          <p className="mt-2 text-gray-600">
            Carts on rajkamalprakashan.com that were filled but never checked out.
            {cartsQuery.data?.fetchedAt &&
              ` Data as of ${new Date(cartsQuery.data.fetchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`}
          </p>
        </header>

        <CartFilterPanel
          filters={filters}
          searchDraft={searchDraft}
          onSearchDraftChange={setSearchDraft}
          onChange={updateFilters}
          onApply={(next) => {
            setSearchDraft(next.search);
            setFilters(next);
          }}
          onReset={() => {
            setSearchDraft("");
            resetFilters(DEFAULT_CART_FILTERS);
          }}
          isLocked={isLocked}
          onToggleLock={toggleLock}
          onRefresh={handleRefresh}
          onExport={handleExport}
          isFetching={isRefreshing || cartsQuery.isFetching || summaryQuery.isFetching}
          isExporting={isExporting}
          matchCount={cartsQuery.data?.meta.total}
          groupStats={summary?.byGroup}
        />

        {summaryQuery.error ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Summary metrics are unavailable right now — the cart list below is still live.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <KpiCard
              title="Abandoned carts"
              value={summary ? formatNumber(summary.cartCount) : "—"}
              icon={<FiShoppingCart className="h-12 w-12" />}
              badge={
                summary ? (
                  <p className="mt-2 text-xs text-gray-400">{formatNumber(summary.totalItems)} books in carts</p>
                ) : undefined
              }
            />
            <KpiCard
              title="Revenue left behind"
              value={summary ? formatINR(summary.totalValue) : "—"}
              icon={<FiTrendingUp className="h-12 w-12" />}
              badge={
                summary ? (
                  <p className="mt-2 text-xs text-gray-400">
                    Avg {formatINR(summary.averageCartValue)} · median {formatINR(summary.medianCartValue)}
                  </p>
                ) : undefined
              }
            />
            <KpiCard
              title="Recoverable now"
              value={summary ? formatINR(summary.recoverable.value) : "—"}
              icon={<FiTarget className="h-12 w-12" />}
              badge={
                summary ? (
                  <p className="mt-2 text-xs text-gray-400">
                    {formatNumber(summary.recoverable.count)} contactable, in-stock, active carts
                  </p>
                ) : undefined
              }
            />
            <KpiCard
              title="Customers"
              value={summary ? formatNumber(summary.uniqueCustomers) : "—"}
              icon={<FiUsers className="h-12 w-12" />}
            />
            <KpiCard
              title="Gone cold (7+ days)"
              value={summary ? formatINR(summary.staleValue) : "—"}
              icon={<FiClock className="h-12 w-12" />}
              badge={
                summary ? (
                  <p className="mt-2 text-xs text-gray-400">{formatNumber(stale)} carts untouched for a week or more</p>
                ) : undefined
              }
            />
            <KpiCard
              title="Blocked by stock"
              value={summary ? formatINR(summary.stockIssues.value) : "—"}
              icon={<FiAlertTriangle className="h-12 w-12" />}
              badge={
                summary ? (
                  <p className="mt-2 text-xs text-gray-400">
                    {formatNumber(summary.stockIssues.count)} carts hold an out-of-stock book
                  </p>
                ) : undefined
              }
            />
          </div>
        )}

        {cartsQuery.data && !cartsQuery.data.ordersReady && !filters.includeOrdered && (
          <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Checking which customers have already ordered… carts that were really checkouts will drop out of these figures
            in about a minute.
          </p>
        )}
        {cartsQuery.data && cartsQuery.data.ordersReady && cartsQuery.data.hiddenCheckedOut > 0 && !filters.includeOrdered && (
          <p className="flex flex-wrap items-center gap-x-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <span>
              {formatNumber(cartsQuery.data.hiddenCheckedOut)} carts are hidden because the customer already ordered
              (the site leaves a cart open after checkout).
            </span>
            <button
              type="button"
              onClick={() => updateFilters({ includeOrdered: true })}
              className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800"
            >
              Show them
            </button>
          </p>
        )}

        <CartConversionSection
          conversion={conversionQuery.data}
          isLoading={conversionQuery.isLoading}
          error={conversionQuery.error}
        />

        <CartTrendChart summary={summary} isLoading={summaryQuery.isLoading} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CartAgePanel summary={summary} isLoading={summaryQuery.isLoading} />
          <CartRecoveryPanel summary={summary} isLoading={summaryQuery.isLoading} />
          <TopCartCustomersPanel
            summary={summary}
            isLoading={summaryQuery.isLoading}
            onPickCustomer={(term) => updateFilters({ search: term })}
          />
        </div>

        <TopCartProductsPanel
          summary={summary}
          isLoading={summaryQuery.isLoading}
          onPickProduct={(term) => updateFilters({ product: term })}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
          <CartValueBandsChart summary={summary} isLoading={summaryQuery.isLoading} />
          <CartSizeBandsChart summary={summary} isLoading={summaryQuery.isLoading} />
          <CartWeekdayChart summary={summary} isLoading={summaryQuery.isLoading} />
          <CartHourChart summary={summary} isLoading={summaryQuery.isLoading} />
        </div>

        <AbandonedCartsTable
          page={cartsQuery.data}
          isLoading={cartsQuery.isLoading}
          isFetching={cartsQuery.isFetching}
          error={cartsQuery.error}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          groupStats={summary?.byGroup}
          onEditOutreach={setOutreachCart}
          onContact={handleContact}
        />
      </div>

      <OutreachDialog
        cart={outreachCart}
        isSaving={saveOutreach.isPending || clearOutreach.isPending}
        onSave={(cartId, input) => saveOutreach.mutate({ cartId, input })}
        onClear={(cartId) => clearOutreach.mutate(cartId)}
        onClose={() => setOutreachCart(null)}
      />
    </AppLayout>
  );
}
