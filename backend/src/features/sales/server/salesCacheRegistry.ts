// ─────────────────────────────────────────────────────────────────────────────
// salesCacheRegistry.ts
//
// Central registry of per-region cache-clear functions. Each region route module
// registers its clearCaches() at load time; the sync scheduler calls
// clearAllSalesCaches() right after a sync so the live in-memory caches are
// invalidated as soon as the underlying data changes (instead of waiting for TTL).
// ─────────────────────────────────────────────────────────────────────────────

type ClearFn = () => void;

const clearFns = new Set<ClearFn>();

/** Registers a cache-clear function (idempotent — a given fn registers once). */
export function registerSalesCacheClear(fn: ClearFn): void {
  clearFns.add(fn);
}

/** Invokes every registered cache-clear function. Resilient: one failure won't stop the rest. */
export function clearAllSalesCaches(): void {
  for (const fn of clearFns) {
    try {
      fn();
    } catch (e: any) {
      console.error("[sales-cache] clear failed:", e?.message || e);
    }
  }
}
