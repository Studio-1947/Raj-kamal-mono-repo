/**
 * Lightweight in-process TTL cache.
 *
 * Designed to be used in front of expensive operations (DB scans, external
 * HTTP calls) that would otherwise be repeated on every filter change or
 * tab switch.
 *
 * Usage:
 *   const myCache = new TtlCache<MyType>(5 * 60 * 1000); // 5-minute TTL
 *   const cached = myCache.get(key);
 *   if (cached !== undefined) return cached;
 *   const fresh = await expensiveOp();
 *   myCache.set(key, fresh);
 *   return fresh;
 */
export class TtlCache<T = unknown> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  /** Returns the cached value, or `undefined` if missing/expired. */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Stores a value with the configured TTL. */
  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Returns true when a non-expired entry exists for the key. */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /** Remove all entries (useful in tests). */
  clear(): void {
    this.store.clear();
  }

  /** Evict all keys whose TTL has passed (call periodically to avoid memory growth). */
  evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}
