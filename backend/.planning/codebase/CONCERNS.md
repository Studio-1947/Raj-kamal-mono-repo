# Codebase Concerns

**Analysis Date:** 2026-03-23

---

## Tech Debt

**Dashboard, Rankings, and Inventory routes serve entirely hardcoded mock data:**
- Issue: All four main API route files return static in-memory fixture arrays, not real database queries. The actual Prisma `Product`, `Order`, `Review`, and `Category` models exist in the schema but are never queried.
- Files: `src/routes/dashboard.ts`, `src/routes/rankings.ts`, `src/routes/inventory.ts`
- Impact: Deployed endpoints return year-2024 dummy data to real users. Any frontend relying on these routes cannot display live information.
- Fix approach: Replace in-memory arrays with Prisma queries against the `Product`, `Order`, `User`, and `Category` models; the schema already has these fully defined.

**Duplicate utility functions copied across every sales route file:**
- Issue: The helper functions `decToNumber`, `round2`, `numSafe`, `pick`, `monthNameToIndex`, and `resolveRowDate` are copy-pasted verbatim into four separate route files with no shared module.
- Files: `src/features/sales/server/online.routes.ts`, `src/features/sales/server/offline.routes.ts`, `src/features/sales/server/lok-event.routes.ts`, `src/features/sales/server/rajradha-event.routes.ts`
- Impact: Bug fixes or logic changes must be applied in four places simultaneously; inconsistencies already exist (e.g., `online.routes.ts` has an extra `parseIsoInRow` helper absent from the others).
- Fix approach: Extract utilities into `src/features/sales/server/utils.ts` and import from all route files.

**Two separate, incompatible Prisma schemas sharing the same `DATABASE_URL`:**
- Issue: `prisma/schema.prisma` defines `User`, `Product`, `Order`, `OrderItem`, `Review`, `Category` (the main app models). `src/features/sales/prisma/schema.prisma` defines `Sale`, `OnlineSale`, `OfflineCashUPICCSale`, `GoogleSheetOfflineSale`, `RajRadhaEventSale`, `LokEventSale`, `RajkamalData`. Both point to `env("DATABASE_URL")`. Two Prisma clients are instantiated at runtime: the main `prisma` singleton in `src/lib/prisma.ts` and a `salesPrisma` inside `src/features/sales/server/sales.routes.ts`.
- Files: `prisma/schema.prisma`, `src/features/sales/prisma/schema.prisma`, `src/lib/prisma.ts`, `src/features/sales/server/sales.routes.ts`
- Impact: Migration coordination is fragile. Running `prisma migrate` without specifying `--schema` will only migrate the main schema. The sales schema relies on `prisma generate --schema src/features/sales/prisma/schema.prisma` as a separate step. Two connection pools are open simultaneously.
- Fix approach: Consolidate all models into one schema, or clearly document the two-schema workflow and add a dedicated `db:migrate:sales` npm script.

**`notFound` middleware is registered after `errorHandler` and after a wildcard route:**
- Issue: In `src/app.ts` the wildcard catch-all `app.use("*", ...)` returns a `200 OK` response for every unmatched path, making the `notFound` middleware on line 203 unreachable.
- Files: `src/app.ts` (lines 181-203)
- Impact: 404 responses are never sent for unknown routes; unknown paths silently return success JSON, which confuses API consumers and breaks standard REST conventions.
- Fix approach: Remove the wildcard fallback handler or convert it to use `next()` to pass control to `notFound`.

---

## Known Bugs

**Date filtering fetches up to 50x more rows than requested:**
- Symptoms: When `startDate` or `endDate` query parameters are provided, the code sets `fetchLimit = Math.min(limit * 10, 5000)` and fetches that many rows from the database, then filters in application memory and slices back down to `limit`. At the default `limit=200`, up to 2000 rows are transferred from the database regardless of how many match the date range.
- Files: `src/features/sales/server/online.routes.ts` (line 141), `src/features/sales/server/offline.routes.ts` (line 221), `src/features/sales/server/lok-event.routes.ts` (line 115)
- Trigger: Any list request with `startDate` or `endDate` query parameters.
- Workaround: None; overfetch is intentional per comments but is architecturally unsound. The root cause is that many rows lack a stored `date` value.

**Summary and counts endpoints load up to 100,000 rows into memory unconditionally:**
- Symptoms: `/api/online-sales/summary`, `/api/offline-sales/summary`, `/api/offline-sales/counts`, `/api/online-sales/counts`, and the event-sale equivalents all call `prisma.*.findMany({ take: 100000 })` with no database-level filtering, then aggregate in JavaScript.
- Files: `src/features/sales/server/online.routes.ts` (line 242), `src/features/sales/server/offline.routes.ts` (lines 315, 458)
- Trigger: Any request to summary or counts endpoints as the dataset grows.
- Workaround: None enforced.

**Fallback catches unmatched paths with HTTP 200:**
- Symptoms: Requests to non-existent routes such as `/api/unknown` return `{ "message": "Raj-Kamal Backend API is running!", "status": "OK" }` with status 200.
- Files: `src/app.ts` (lines 181-200)
- Trigger: Any request to an undefined path.

---

## Security Considerations

**`/api/offline-sales/push` uses a static fallback secret hardcoded in source:**
- Risk: If `GOOGLE_SYNC_TOKEN` env var is not set, the token defaults to the string `"rk_default_token_2026"` which is now committed to source history. Any attacker with source access can push arbitrary data rows into the database.
- Files: `src/features/sales/server/offline.routes.ts` (line 605)
- Current mitigation: The env var overrides the default if set.
- Recommendations: Remove the default value; throw an error at startup if `GOOGLE_SYNC_TOKEN` is not set; rotate the token.

**`/api/offline-sales/google-sheets` endpoint triggers an external ERP HTTP fetch with no authentication guard:**
- Risk: The route is accessible without a JWT token. Any unauthenticated caller can trigger a live HTTP fetch to the ERP URL `https://rajkamal.cloudpub.in/Reports/...`, then write the result into the database.
- Files: `src/features/sales/server/offline.routes.ts` (lines 558-566), `src/features/sales/server/offlineSyncService.ts` (lines 5, 173-198)
- Current mitigation: None. The ERP URL is also hardcoded in source with a fixed year range (2026-01-01 to 2026-12-31).
- Recommendations: Add `authenticateToken` middleware to this route; move the ERP URL to an env var; make the date range dynamic.

**JWT tokens are long-lived with no revocation mechanism:**
- Risk: Tokens are signed with a 7-day expiry (`60 * 60 * 24 * 7`). There is no token blocklist, no refresh token flow, and no session invalidation. The `/api/auth/logout` endpoint is a no-op that only tells the client to discard the token server-side.
- Files: `src/routes/auth.ts` (lines 109-113, 200-204), `src/middleware/authPrisma.ts`
- Current mitigation: `authPrisma.ts` does re-query the database on every authenticated request to confirm the user still exists, which partially mitigates deleted-user scenarios.
- Recommendations: Implement refresh tokens or a short-lived access token (15 minutes); add a server-side revocation list or session table.

**`/api/auth/admin-status` leaks admin presence to unauthenticated callers:**
- Risk: Any unauthenticated client can query whether an admin account exists and how many exist. This reveals account enumeration information.
- Files: `src/routes/auth.ts` (lines 302-310)
- Current mitigation: Only returns count, not identity details.
- Recommendations: Restrict to authenticated users, or at minimum do not expose the numeric `count`.

**Hardcoded Metricool user/blog IDs in source for `meta_ads` network:**
- Risk: Account identifiers `userId = "4145269"` and `blogId = "5370120"` are hardcoded for the Facebook Ads override path rather than reading from env vars `METRICOOL_USER_ID` / `METRICOOL_BLOG_ID`.
- Files: `src/services/metricoolService.ts` (lines 57-58, 106-107)
- Current mitigation: None; these override the env-var-sourced values for `meta_ads` requests.
- Recommendations: Remove hardcoded values; use `METRICOOL_USER_ID` and `METRICOOL_BLOG_ID` env vars consistently.

**CORS misconfiguration silently allows requests from blocked origins:**
- Risk: When an origin is not in the allowlist, the code calls `callback(null, false)` (line 61 in `src/app.ts`), which does not reject the request — it only omits CORS headers. The request still proceeds and the server still responds. This is not the same as blocking the origin.
- Files: `src/app.ts` (lines 56-62)
- Current mitigation: Browsers will enforce the missing CORS headers for cross-origin requests, but non-browser clients (curl, Postman, server-to-server) are unaffected.
- Recommendations: Return `callback(new Error('Not allowed by CORS'))` to actively reject disallowed origins, or document that this permissive behavior is intentional.

---

## Performance Bottlenecks

**In-memory aggregation over up to 100,000 rows for every summary/counts request:**
- Problem: All four sales channel summary and counts endpoints (`/summary`, `/counts`) load the entire dataset into Node.js memory, iterate all rows in JavaScript, then return computed totals. No database-level `GROUP BY`, `SUM`, or `COUNT` is used.
- Files: `src/features/sales/server/online.routes.ts`, `src/features/sales/server/offline.routes.ts`, `src/features/sales/server/lok-event.routes.ts`, `src/features/sales/server/rajradha-event.routes.ts`
- Cause: Many rows have null `date` columns; date resolution falls back to `rawJson` parsing, which cannot be done in SQL.
- Improvement path: Normalize dates into a reliable `date` column during import (backfill existing nulls), then push aggregation to SQL with Prisma's `groupBy` and `aggregate`.

**Body parser limit set to 300MB:**
- Problem: `app.use(express.json({ limit: "300mb" }))` allows any single request to consume up to 300MB of memory for body parsing, with no per-endpoint enforcement.
- Files: `src/app.ts` (line 108)
- Cause: Set to accommodate Excel file uploads and large sync payloads.
- Improvement path: Set a reasonable global default (e.g., 1MB) and use a higher limit only on the specific upload/push routes.

**Auto-sync on server startup fires a full ERP fetch 5 seconds after boot:**
- Problem: Every server startup triggers a full HTTP fetch from the ERP URL and bulk upsert into the database. In serverless environments (Vercel) where the process may restart frequently, this fires on every cold start.
- Files: `src/app.ts` (lines 207-212)
- Cause: Startup sync is unconditional except for `NODE_ENV !== 'test'`.
- Improvement path: Move sync to a scheduled job (cron) or only trigger via the explicit `/api/offline-sales/google-sheets` endpoint.

---

## Fragile Areas

**MD5 hash deduplication in `OfflineSyncService`:**
- Files: `src/features/sales/server/offlineSyncService.ts` (lines 105-106)
- Why fragile: The `rowHash` is derived from `JSON.stringify(row)` where `row` is a raw array. Any change in column order, whitespace, or numeric representation in the source spreadsheet produces a different hash for the same logical record, creating duplicates. MD5 is also not collision-resistant.
- Safe modification: When changing import logic, always verify row ordering is stable before relying on hash-based deduplication.
- Test coverage: No tests exist.

**Unfinished Metricool endpoint constants committed with placeholder values:**
- Files: `src/config/metricool.ts` (lines 13-26)
- Why fragile: Six exported constants (`METRICOOL_ANALYTICS_ENDPOINT_OVERVIEW`, `METRICOOL_ANALYTICS_ENDPOINT_FACEBOOK`, etc.) are set to `"<FILL_...>"` placeholder strings. If any downstream code imports and uses these constants, it will construct invalid URLs silently.
- Safe modification: Search for usages of these constants before removing or replacing them; currently they appear unused by the active service code but remain exported.

**`sales.routes.ts` creates a second independent `PrismaClient` instance:**
- Files: `src/features/sales/server/sales.routes.ts` (line 10)
- Why fragile: A `new PrismaClient()` is instantiated directly in the module scope without the global singleton guard present in `src/lib/prisma.ts`. In development with hot reload (`tsx watch`), this creates additional connection pool instances on each module reload.
- Safe modification: Import the shared `prisma` singleton from `src/lib/prisma.ts` instead, or at minimum apply the `globalThis` guard pattern.

**`errorHandler` middleware references Mongoose error names on a Prisma project:**
- Files: `src/middleware/errorHandler.ts` (lines 22-36)
- Why fragile: The handler checks for `CastError`, `MongoError`, and `ValidationError` — all Mongoose/MongoDB error types. The project uses PostgreSQL via Prisma. These branches will never execute, and actual Prisma errors (e.g., `PrismaClientKnownRequestError`) are not handled.
- Safe modification: Replace Mongoose error checks with Prisma error code handling (`P2002` for unique constraint violations, `P2025` for not found, etc.).

---

## Scaling Limits

**Cursor-based pagination breaks when date filtering is required:**
- Current capacity: Pagination cursors work correctly for non-date-filtered requests.
- Limit: When `startDate`/`endDate` are provided, the code fetches `limit * 10` rows from the cursor position then post-filters. If the matching rows within a date range are sparse, pages return fewer results than `limit`, and the caller cannot reliably detect end-of-results.
- Scaling path: Store a reliable `date` index-backed column for all rows and push date filtering into the SQL `WHERE` clause.

**In-memory customer deduplication uses a string Set:**
- Current capacity: Works for datasets up to tens of thousands of rows.
- Limit: The customer uniqueness heuristic in `counts` endpoints builds a `Set<string>` in memory keyed by `email|mobile|name`. At 100,000 rows this Set can hold up to 100,000 entries. It recomputes on every request with no caching.
- Scaling path: Materialize unique customer counts in the database or cache results with a TTL.

---

## Dependencies at Risk

**`xlsx` package (SheetJS community edition) is version `^0.18.5`:**
- Risk: SheetJS `0.18.x` community edition has known security advisories and the library has had licensing/distribution controversies. The package is not actively maintained on npm under this version range.
- Impact: Excel import scripts and `offlineSyncService.ts` depend on this package for all spreadsheet parsing.
- Migration plan: Evaluate `exceljs` as a replacement, or pin to a specific audited version and track CVEs.

**No test framework installed:**
- Risk: `package.json` has no test runner (`jest`, `vitest`, `mocha`) listed in dependencies or devDependencies, and no test files exist in the repository.
- Impact: All logic changes are unverified. Regressions in data parsing, aggregation, and auth flows cannot be caught automatically.
- Migration plan: Add `vitest` (compatible with the ES Module setup) and begin with unit tests for the shared sales utility functions and auth middleware.

---

## Missing Critical Features

**No input validation or size limit on `/api/offline-sales/push` payload:**
- Problem: The POST body is accepted as `{ data: any[][] }` with no maximum row count, no schema validation per row, and a 300MB body parser limit. A malicious or malformed push can insert arbitrarily large or invalid data into the database.
- Blocks: Safe use of the push endpoint from untrusted Google Apps Script sources.

**No structured logging — all observability uses `console.log`/`console.error`:**
- Problem: 39 `console.log` calls and scattered `console.error` calls are the only logging mechanism. There is no log level control, no request correlation IDs, and no structured JSON output.
- Blocks: Production debugging, log aggregation, and alerting.

---

## Test Coverage Gaps

**Zero test coverage across the entire backend:**
- What's not tested: Auth flow, JWT validation, sales data import, sync service, all route handlers, error handler, CORS config.
- Files: All files under `src/`
- Risk: Any change to core logic (date resolution, amount aggregation, deduplication hash) breaks silently in production.
- Priority: High

---

*Concerns audit: 2026-03-23*
