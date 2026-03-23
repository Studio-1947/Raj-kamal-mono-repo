# Roadmap: Google Sheets Offline Sales Backend

## Overview

The existing backend hits PostgreSQL directly on every request with no caching, unbounded queries, and a blocking sync. This roadmap transforms it into a sub-second system: first stabilize the API infrastructure, then add database indexes and fix query patterns, then add an in-memory cache on top of optimized queries, then make the Google Sheets sync non-blocking and resilient.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure Baseline** - Configure connection pool, compression, timeouts, and slow-query logging
- [ ] **Phase 2: Database Query Optimization** - Apply indexes, enforce pagination, audit slow queries, and materialize aggregations
- [ ] **Phase 3: In-Memory Caching** - Add node-cache layer for dashboard and filter endpoints with sync-triggered invalidation
- [ ] **Phase 4: Async Google Sheets Sync** - Make sync non-blocking, add status tracking, incremental fetching, and retry backoff

## Phase Details

### Phase 1: Infrastructure Baseline
**Goal**: The API server is correctly configured for concurrent load and all responses are safe to time out and easy to diagnose
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. The PostgreSQL connection pool min/max values are set in config and the server handles 20-200 concurrent connections without "too many clients" errors
  2. All API responses arrive gzip-compressed — visible as `Content-Encoding: gzip` in response headers
  3. A request to a slow or hung endpoint times out and returns an error within the configured threshold instead of hanging indefinitely
  4. Slow queries above a configurable millisecond threshold appear in application logs with the endpoint name and duration
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Install vitest + create failing test stubs for all 4 INFRA requirements
- [ ] 01-02-PLAN.md — Prisma pool config (INFRA-01) and slow-query event logging (INFRA-04)
- [ ] 01-03-PLAN.md — Gzip compression (INFRA-02) and request timeout enforcement (INFRA-03)

### Phase 2: Database Query Optimization
**Goal**: All filter queries use indexes and return only the requested page of data — no full table scans, no unbounded result sets
**Depends on**: Phase 1
**Requirements**: DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. A filtered query on date range + sales rep + product + location + status executes with an index seek (EXPLAIN ANALYZE shows no Seq Scan on the main sales table)
  2. Every list and filter endpoint returns a paginated response with a defined page size — no request can return all rows in a single response
  3. The top slow queries identified in the audit have been rewritten or indexed and their query plans show improved execution
  4. Dashboard summary and ranking endpoints read from pre-aggregated data rather than scanning the full sales table on every request
**Plans**: TBD

### Phase 3: In-Memory Caching
**Goal**: Repeated dashboard and filter requests are served from cache, not the database, and cache entries are always invalidated after a sync
**Depends on**: Phase 2
**Requirements**: CACHE-01, CACHE-02, CACHE-03
**Success Criteria** (what must be TRUE):
  1. A second identical request to the dashboard summary endpoint within the TTL window returns the same data noticeably faster (cache hit vs. cache miss latency difference is observable in logs)
  2. A repeated sales filter query with the same parameters within the TTL window is served from cache — the database is not queried a second time
  3. After a Google Sheets sync completes, the next request to a previously-cached summary or filter endpoint returns fresh data (the old cache entry is gone)
**Plans**: TBD

### Phase 4: Async Google Sheets Sync
**Goal**: Triggering a sync returns immediately, the caller can check sync progress, only changed rows are fetched, and transient API failures retry automatically
**Depends on**: Phase 3
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. A POST to the sync trigger endpoint returns an HTTP 202 response within milliseconds — it does not wait for the sync to finish
  2. A GET to the sync status endpoint returns one of: idle, running, or the timestamp and row count of the last completed sync, and any last error message
  3. A sync run after the first full sync fetches only rows changed since the previous sync — the ERP request and upsert count are smaller than a full sync
  4. When the Google Sheets API returns a transient error, the sync retries automatically with exponential backoff and does not crash the server
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Baseline | 1/3 | In Progress|  |
| 2. Database Query Optimization | 0/TBD | Not started | - |
| 3. In-Memory Caching | 0/TBD | Not started | - |
| 4. Async Google Sheets Sync | 0/TBD | Not started | - |
