# Google Sheets Offline Sales Backend

## What This Is

A backend API service that syncs offline sales data from Google Sheets and serves it to a dashboard with filtering, rankings, inventory views, and time-series analysis. Used by 20-200 internal sales team members. The system currently hits PostgreSQL directly on every request with no caching, causing slow dashboards, sluggish multi-filter queries, and laggy syncs under load.

## Core Value

Sales reps and managers can filter and analyze hundreds of thousands of sales records instantly — sub-second response on any filter combination.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-column database indexes for common filter combinations (date range, sales rep, product, location, status)
- [ ] Redis caching layer for expensive dashboard aggregations and summary endpoints
- [ ] Optimized filter query patterns — eliminate full table scans on sales data
- [ ] Paginated responses on all list/filter endpoints (no unbounded queries)
- [ ] Async/background Google Sheets sync — non-blocking, queued, with status tracking
- [ ] PostgreSQL connection pooling configured correctly for concurrent load
- [ ] Query performance monitoring to identify and fix slow endpoints
- [ ] API response compression and field selection to reduce payload size

### Out of Scope

- Real-time webhook-based Google Sheets sync — manual trigger is sufficient for now
- Frontend changes — backend API performance only
- Database migration away from PostgreSQL — optimize what's there
- Auth system changes — existing auth stays as-is

## Context

- **Stack**: Node.js + Express + Prisma ORM + PostgreSQL
- **Current state**: No caching layer — every request hits the database directly
- **Sync mechanism**: Manual trigger endpoint pulls data from Google Sheets API
- **Data volume**: Hundreds of thousands of sales records (100k–1M range), growing monthly
- **Routes**: dashboard, rankings, inventory, offline sales (list/filter/summary/time-series), auth
- **Codebase**: Initial implementation complete, routes and Prisma schema exist but not optimized for performance
- **Key bottleneck**: Multi-filter sales analysis queries — users apply date range + rep + product + location + status combinations, all hitting DB without indexes or cache

## Constraints

- **Tech stack**: Node.js + Prisma + PostgreSQL — no DB migration
- **Compatibility**: Existing API contract must be preserved — clients depend on current endpoint shapes
- **Performance target**: Sub-second response for filtered queries on up to 1M records
- **Concurrency**: Must handle 20-200 simultaneous users without degradation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Redis for caching | Standard choice for API-level caching, works well with Node.js | — Pending |
| Index-first approach | Indexes give the biggest bang-for-buck before adding infrastructure | — Pending |
| Background sync queue | Blocking sync on manual trigger is a quick win to eliminate | — Pending |

---
*Last updated: 2026-03-23 after initialization*
