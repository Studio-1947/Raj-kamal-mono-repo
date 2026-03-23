# Requirements: Google Sheets Offline Sales Backend

**Defined:** 2026-03-23
**Core Value:** Sub-second filter queries across hundreds of thousands of sales records

## v1 Requirements

### Database Performance

- [ ] **DB-01**: System applies composite indexes on common filter columns (date range, sales rep, product, location, status) so multi-filter queries avoid full table scans
- [ ] **DB-02**: All list and filter endpoints return paginated responses — no unbounded queries that return all rows
- [ ] **DB-03**: Top slow queries identified via query plan audit and rewritten/indexed for fast execution
- [ ] **DB-04**: Materialized views or pre-aggregated tables power dashboard summary and ranking endpoints

### Caching

- [ ] **CACHE-01**: In-memory cache (node-cache) serves dashboard summary endpoint responses with configurable TTL
- [ ] **CACHE-02**: In-memory cache serves common sales filter query results so repeated filter combinations hit cache not DB
- [ ] **CACHE-03**: Cache is invalidated when a Google Sheets sync completes so stale data is never served

### Google Sheets Sync

- [ ] **SYNC-01**: Sync trigger endpoint returns immediately — actual sync runs in background (non-blocking)
- [ ] **SYNC-02**: Sync status endpoint returns current state (idle / running / last sync timestamp / last error)
- [ ] **SYNC-03**: Incremental sync fetches only rows changed since last sync, not the full sheet every time
- [ ] **SYNC-04**: Sync automatically retries on Google Sheets API failure with exponential backoff

### API Infrastructure

- [ ] **INFRA-01**: PostgreSQL connection pool configured with appropriate min/max connections for 20-200 concurrent users
- [ ] **INFRA-02**: All API responses compressed with gzip to reduce payload size
- [ ] **INFRA-03**: Request timeout enforced on slow queries — no endpoint hangs indefinitely
- [ ] **INFRA-04**: Slow queries logged (above configurable threshold) so bottlenecks are visible in logs

## v2 Requirements

### Caching Upgrade

- **CACHE-V2-01**: Redis replaces in-memory cache when horizontal scaling is needed
- **CACHE-V2-02**: Per-user or per-filter-combination cache keys for finer-grained invalidation

### Advanced Query Optimization

- **DB-V2-01**: Partial indexes for high-frequency query patterns (e.g. current month only)
- **DB-V2-02**: Read replicas for dashboard/reporting queries to offload primary DB

### Observability

- **OBS-V2-01**: Query performance dashboard (p50/p95/p99 response times per endpoint)
- **OBS-V2-02**: Rate limiting per user to prevent runaway queries

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time webhook sync from Google Sheets | Manual trigger is sufficient; webhook adds infra complexity |
| Frontend changes | Backend API performance only |
| Database migration (away from PostgreSQL) | Optimize existing Prisma + PostgreSQL setup |
| Auth system changes | Existing auth is out of scope |
| Redis in v1 | In-memory cache handles single-server load; Redis is v2 upgrade |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| DB-01 | Phase 2 | Pending |
| DB-02 | Phase 2 | Pending |
| DB-03 | Phase 2 | Pending |
| DB-04 | Phase 2 | Pending |
| CACHE-01 | Phase 3 | Pending |
| CACHE-02 | Phase 3 | Pending |
| CACHE-03 | Phase 3 | Pending |
| SYNC-01 | Phase 4 | Pending |
| SYNC-02 | Phase 4 | Pending |
| SYNC-03 | Phase 4 | Pending |
| SYNC-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after roadmap creation*
