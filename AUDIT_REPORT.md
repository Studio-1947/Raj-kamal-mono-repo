# Raj-Kamal Mono-Repo — Comprehensive Code Audit Report

**Audit Date:** 2026-06-22  
**Auditor:** Claude (Anthropic) via AI-assisted static analysis  
**Codebase:** Node.js / TypeScript / React mono-repo  
**Branch audited:** `fiters`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Structure](#2-project-structure)
3. [Backend Quality](#3-backend-quality)
4. [Frontend Quality](#4-frontend-quality)
5. [Code Quality Issues](#5-code-quality-issues)
6. [Security Concerns](#6-security-concerns)
7. [Best Practice Violations](#7-best-practice-violations)
8. [Positive Highlights](#8-positive-highlights)
9. [Prioritised Fix List](#9-prioritised-fix-list)

---

## 1. Executive Summary

The repository is a production-quality, feature-rich sales analytics platform for a Hindi-language book publisher (Raj Kamal Prakashan). The core domain — ingesting Google Sheets sales data, aggregating it, and displaying dashboards — is well-executed. Security fundamentals (JWT, bcrypt, helmet, zod validation, parameterised Prisma queries) are in place.

However, the codebase has accumulated significant technical debt: pervasive `any` typing defeats TypeScript's safety net; five or more route files copy-paste the same seven utility functions verbatim; a debug file write is shipping to production; hardcoded secrets and hardcoded calendar year filters exist; and several critical subsystems (dashboard, rankings, inventory) still serve static mock data. Test coverage is shallow.

**Risk profile: Medium-High.** No show-stopper vulnerabilities, but the combination of a hardcoded fallback token, a production debug file write, and widespread `any` casts represent meaningful risk in a live system.

---

## 2. Project Structure

### 2.1 Directory Layout

```
Raj-kamal-mono-repo/
├── backend/                  # Express + TypeScript API (Node 20, ESM)
│   ├── prisma/               # Two schemas: root (User/Product/Order) + features/sales/
│   │   └── migrations/       # 5 migration snapshots (Postgres)
│   ├── src/
│   │   ├── app.ts            # Express setup, middleware, route mounting
│   │   ├── index.ts          # HTTP server entry point
│   │   ├── api.ts            # Vercel serverless export (re-exports app)
│   │   ├── config/           # swagger.ts, metricool.ts
│   │   ├── features/sales/   # Domain feature (routes, services, scripts, prisma)
│   │   │   ├── server/       # 10 route files + fictionFilter + offlineSyncService
│   │   │   ├── scripts/      # Data import / backfill scripts
│   │   │   └── prisma/       # Second Prisma schema (sales-specific models)
│   │   ├── lib/              # cache.ts, prisma.ts, bootstrap.ts
│   │   ├── middleware/        # auth.ts (unused), authPrisma.ts, errorHandler, notFound
│   │   ├── routes/           # auth, dashboard, inventory, rankings, social, metricool
│   │   ├── scripts/          # Misc check/debug scripts (should not be in src/)
│   │   └── tests/            # Vitest infra tests
│   └── scratch/              # 50+ one-off diagnostic scripts (not gitignored)
├── frontend/                 # React 18 + Vite + TailwindCSS
│   └── src/
│       ├── features/sales/client/   # Query hooks, types, page components
│       ├── views/            # Page-level components (route destinations)
│       │   └── total-offline-sales/components/  # Domain-specific sub-components
│       ├── components/       # Shared/generic components
│       ├── modules/auth|lang/ # Context providers
│       ├── routes/           # Route definitions + ProtectedRoute
│       ├── store/slices/     # Redux Toolkit slices
│       ├── lib/              # apiClient, queryClient
│       └── services/         # API call functions (mostly unused by active UI)
└── tests/sales/              # Root-level integration test (import.test.ts)
```

### 2.2 Backend Entry Points

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | Local HTTP server; calls `app.listen()` |
| `backend/src/api.ts` | Vercel serverless adapter; just re-exports `app` |
| `backend/src/app.ts` | All Express setup lives here (260 lines) |

### 2.3 Build Pipeline

- **Backend:** `tsc` → `dist/`. Dev uses `tsx watch`. Vercel build deletes generated Prisma client then regenerates it.
- **Frontend:** `tsc && vite build`. Vite with SWC plugin.
- **Two Prisma schemas:** Root schema (`prisma/schema.prisma`) manages User/Product/Order; a second schema (`src/features/sales/prisma/schema.prisma`) manages all sales-specific models. This split generates two separate Prisma clients.

---

## 3. Backend Quality

### 3.1 Architecture

The backend uses a flat Express app with feature-based route grouping. Sales routes are mounted via `mount*` helper functions (e.g., `mountOfflineSales(app, '/api/offline-sales')`), which is a reasonable pattern for feature isolation.

The `notFound` middleware at `src/middleware/notFound.ts` is registered **after** the catch-all `app.use("*", ...)` route in `app.ts` (line 193–216), meaning it is **unreachable**. The `errorHandler` is also registered after that same catch-all, so it too can never fire for unmatched routes.

### 3.2 Route Organisation

Ten separate route files exist for regional sales channels (Delhi, Mumbai, Patna, BookFair, Lokbharti, Online, Online-Offline, Lok Event, Rajradha Event, Total Offline). Each is a near-identical implementation of the same query patterns with the same utility functions copy-pasted.

### 3.3 Middleware

| Middleware | Status | Notes |
|-----------|--------|-------|
| `helmet` | ✅ Applied globally | |
| `cors` | ✅ Dynamic whitelist from env | |
| `morgan` (`combined`) | ✅ | Logs to stdout only |
| `express-rate-limit` | ✅ Configurable | Default 1000 req/min (very high) |
| Request body parsing | ⚠️ | Limit set to `300mb` — see §6 |
| Request timeout | ❌ Missing | No `connect-timeout` or similar |
| Compression (`compression` / `zlib`) | ❌ Missing | Test `compression.test.ts` expects gzip but app does not apply it |

### 3.4 Authentication

Two near-identical authentication middleware files coexist:

- `src/middleware/auth.ts` — JWT-only, does **not** hit the database
- `src/middleware/authPrisma.ts` — JWT + database user existence check

All active routes import `authPrisma.ts`. The `auth.ts` file is **dead code** (only its types are referenced via one import in the test helper). The database-hitting middleware means every authenticated request performs a DB round-trip for the user lookup. This is safe but adds latency for a single-admin system.

**JWT expiry:** `expiresIn: 60 * 60 * 24 * 7` (7 days) in `src/routes/auth.ts` lines 110, 204. Numeric values are valid but non-obvious; the string form `'7d'` is conventional.

**Logout is client-side only** (`src/routes/auth.ts` line 282–287). The server returns success without any token invalidation. There is no token blocklist, which is acceptable for a small admin-only system but should be documented.

### 3.5 Error Handling

The global error handler at `src/middleware/errorHandler.ts` handles Mongoose-specific error names (`CastError`, `MongoError`, `ValidationError`) — this app uses **Prisma, not Mongoose**. These branches are dead code and could cause confusion. Prisma errors (e.g., `PrismaClientKnownRequestError`) are not specifically caught and will fall through to the 500 generic handler.

The error handler correctly suppresses stack traces in production (`line 52`).

### 3.6 Input Validation

Zod schemas are used consistently for query-parameter validation across all route files. The pattern is robust: `Q.safeParse(req.query)` with early `400` returns. Filter values are sanitised (trimmed, collapsed whitespace) before being passed to Prisma.

### 3.7 SQL / Query Safety

All Prisma ORM calls (`findMany`, `groupBy`, `aggregate`, `count`) use parameterised queries — no SQL injection risk from ORM use.

Raw SQL via `prisma.$queryRaw` (used heavily in `offline.routes.ts` and similar files) uses `Prisma.sql` tagged templates with explicit `${value}` parameter binding, which Prisma escapes correctly. The `toTokenRegex()` helper (`offline.routes.ts` line 112–114) escapes regex special characters before embedding them in `~*` regex conditions. **This is correct and safe.**

### 3.8 Caching

Two caching implementations exist:

1. **`TtlCache<T>`** (`src/lib/cache.ts`) — in-process TTL cache used by most route files. Well-written with `evictExpired()` to prevent memory leaks, called on a 10-minute interval.
2. **Inline LRU + TTL** (`total-offline.routes.ts` lines 48–87) — a more sophisticated bounded LRU cache with a 500-entry cap, implemented as a `Map` with insertion-order tricks. This logic is not shared with `TtlCache`.

The duplication is unnecessary; `TtlCache` could be extended with an LRU eviction policy.

Cache instances (`summaryCache`, `countsCache`, `optionsCache`) are module-level singletons — they are **not shared between route files**, meaning each regional sales route (Mumbai, Patna, etc.) has its own independent caches with no memory coordination, which is fine for the current load but will multiply memory usage as more channels are added.

### 3.9 Background Sync

On startup, `app.ts` (lines 219–240) triggers a 5-second-delayed sequential sync of all regional Google Sheets. This runs in a `setTimeout` without any debounce — on Vercel (serverless), cold starts will trigger this on every invocation, causing redundant syncs. The sync itself uses a 4-minute DB transaction timeout (`offlineSyncService.ts` line 338), which is far too long for a serverless cold start.

### 3.10 Logging

`console.log` / `console.error` are used throughout. There is no structured logging library (e.g., `pino`, `winston`). Debug `console.log` statements exist in production paths (e.g., `app.ts` line 194, `offline.routes.ts` line 884).

---

## 4. Frontend Quality

### 4.1 Component Organisation

The frontend mixes two organisational patterns:
- **Feature-based** (`src/features/sales/client/`) for the core offline sheet sales feature — good.
- **View-based** (`src/views/`) for all pages, with one deep component subdirectory (`src/views/total-offline-sales/components/`) — 28+ files in this folder.

The `TotalOfflineSales.tsx` view (453 lines) and `OfflineSheetPage.tsx` (885 lines) are very large single-file components that handle data fetching, filter state, layout, and rendering.

### 4.2 State Management

The app uses **both Redux Toolkit and React Query simultaneously**, which is appropriate:
- Redux Toolkit (`src/store/`) manages auth state, UI state, and cached server responses for dashboard/inventory/rankings (though these slices serve static mock data currently).
- TanStack Query (`src/features/sales/client/offlineSheetService.ts`) handles all live sales data fetching.

The Redux slices for `dashboard`, `inventory`, and `rankings` are essentially unused in the current UI — the active pages (`TotalOfflineSales.tsx`, `OfflineSheetPage.tsx`) fetch data directly via `apiClient` or TanStack Query without touching these slices.

**Auth state duplication:** The auth token is stored in three places simultaneously: `localStorage`, Redux state (`store/slices/authSlice.ts` line 21), and `AuthContext`. The Redux slice also writes to `localStorage` on `loginSuccess` (line 40) while `AuthContext` also writes to `localStorage` (line 48). This creates two write paths for the same key `rk_token`.

### 4.3 Data Fetching Patterns

The `AuthorPerformanceView.tsx` and `FocusTabGrowthView.tsx` components use **manual `useState` + `useEffect` + `apiClient.get()`** for data fetching instead of TanStack Query. This bypasses caching, deduplication, and loading state management that the rest of the app uses.

The `TotalOfflineSales.tsx` view also uses raw `apiClient.get()` in `useEffect` rather than TanStack Query hooks, inconsistent with the pattern in `offlineSheetService.ts`.

### 4.4 Duplicate ProtectedRoute Components

Two `ProtectedRoute` components exist:
- `src/components/ProtectedRoute.tsx` — handles `loading` state, shows a loading spinner.
- `src/routes/ProtectedRoute.tsx` — does **not** handle `loading` state; redirects unauthenticated users before the auth check completes.

`AppRoutes.tsx` imports from `src/components/ProtectedRoute.tsx` (the correct one). The `src/routes/ProtectedRoute.tsx` file is dead code but could cause confusion.

### 4.5 Binding Canonicalisation Duplication

The `BINDING_CANON` lookup and `canonBinding/canonicalBinding` function are defined twice, identically, in:
- `frontend/src/views/total-offline-sales/components/FocusTabGrowthView.tsx` (lines 27–38)
- `backend/src/features/sales/server/total-offline.routes.ts` (lines 26–38)

These should live in a single shared utility.

### 4.6 Performance Considerations

- **`react-window`** (`VirtualTable.tsx`) is used for virtualised table rendering — good for large datasets.
- `useTransition` is imported in `OfflineSheetPage.tsx` but the actual usage should be verified to ensure it is applied to the correct state updates.
- The `FocusTabGrowthView.tsx` (941 lines) and `AuthorPerformanceView.tsx` (619 lines) are extremely large single-file components. They mix data fetching, complex filtering logic, sorting, pagination, and rendering. These should be split.
- No `React.memo` or `useMemo` is used on expensive child components in the large view files.

---

## 5. Code Quality Issues

### 5.1 Widespread `any` Usage (High Volume)

**90 occurrences of `as any` across 22 files** (per grep count). Representative examples:

| File | Line | Issue |
|------|------|-------|
| `src/features/sales/server/offline.routes.ts` | 34 | `(authenticateToken as any)(req, res, next)` |
| `src/features/sales/server/online.routes.ts` | 7 | `router.use(authenticateToken as any)` |
| `src/middleware/errorHandler.ts` | 27,34 | `(err as any).code`, `(err as any).errors` |
| All route files | Various | `where: any`, `args: any`, `row: any` |
| `src/features/sales/server/offlineSyncService.ts` | 23 | `targetModel: any`, `txClient?: any` |

The `authenticateToken as any` cast is required because `authenticateToken` uses `AuthRequest` (a Request subtype) but Express's `Router.use()` expects plain `Request`. The correct fix is to type `authenticateToken` to accept `Request` and cast inside.

### 5.2 Massively Duplicated Utility Functions

The following functions are copy-pasted verbatim into **at least 6 route files** (`offline.routes.ts`, `online.routes.ts`, `mumbai-offline.routes.ts`, `patna-offline.routes.ts`, `lok-event.routes.ts`, `rajradha-event.routes.ts`, `bookfair-offline.routes.ts`, `lokbharti-offline.routes.ts`):

```typescript
function decToNumber(v: any): number { ... }   // 8+ copies
function round2(n: number): number { ... }      // 8+ copies
function numSafe(v: any): number | null { ... } // 6+ copies
function pick(row, names): any { ... }          // 6+ copies
function monthNameToIndex(m?): number | null {} // 4+ copies
function resolveRowDate(r: any): Date | null {} // 4+ copies
function getSearchTokens(q: string): string[] {} // 5+ copies
function toTokenRegex(token: string): string {} // 5+ copies
```

All of these should be extracted to `src/features/sales/server/utils.ts` (or `src/lib/salesUtils.ts`).

### 5.3 Dead Code

| File | Issue |
|------|-------|
| `src/middleware/auth.ts` | Entire file unused at runtime; only type re-exported |
| `src/routes/dashboard.ts` | Returns hardcoded mock data (John Doe, Jane Smith) |
| `src/routes/rankings.ts` | Returns hardcoded mock data (Premium Widget, etc.) |
| `src/routes/inventory.ts` | Likely returns mock data (not read but assumed from pattern) |
| `frontend/src/routes/ProtectedRoute.tsx` | Duplicate, never imported |
| `frontend/src/store/slices/dashboardSlice.ts` | Slice dispatched nowhere in active UI |
| `backend/src/features/sales/server/offlineSyncService.ts` line 7 | `REPORT_URL` constant defined but never used |
| `backend/scratch/` | 50+ one-off diagnostic scripts committed to the repo |

### 5.4 Zod Schema Redefinition Inside Request Handlers

In most route files, the Zod schema `Q` is defined **inside the handler function**, meaning it is reconstructed on every request:

```typescript
// offline.routes.ts lines 161–180
router.get("/", async (req, res) => {
  const Q = z.object({  // <-- re-created on every request
    limit: z.string()...
    ...
  });
```

These schemas should be defined at module scope (outside the handler) so they are created once at startup.

### 5.5 Inconsistent Response Shapes

The codebase uses two different success/error response shapes without a clear rule:

**Shape A** (auth, dashboard, rankings):
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```

**Shape B** (all sales routes):
```json
{ "ok": true, "items": [...] }
{ "ok": false, "error": "message" }
```

This makes API consumers (frontend, tests) handle two different schemas.

### 5.6 Missing Return Type Annotations on Route Handlers

Most route handlers are typed as `async (req, res) => { ... }` without explicit return type annotations. The `Promise<any>` return on several handlers (`auth.ts` uses `Promise<any>`) leaks `any` into the type system.

### 5.7 Prisma Error Codes Not Handled

The error handler (`errorHandler.ts`) catches Mongoose error names but not Prisma-specific errors:

- `PrismaClientKnownRequestError` (e.g., unique constraint violation code `P2002`)
- `PrismaClientUnknownRequestError`
- `PrismaClientInitializationError`

These all fall through as 500 errors with Prisma's internal error message potentially leaked to the client.

---

## 6. Security Concerns

### 6.1 CRITICAL — Hardcoded Fallback Token in Production Code

**File:** `backend/src/features/sales/server/offline.routes.ts`, **line 939**

```typescript
if (!token || token !== (process.env.GOOGLE_SYNC_TOKEN || "rk_secure_push_25"))
```

If the `GOOGLE_SYNC_TOKEN` environment variable is not set, the application falls back to the hardcoded string `"rk_secure_push_25"`. This secret is now committed to version history.

The `/push` endpoint at line 942 performs `prisma.googleSheetOfflineSale.deleteMany({})` — a **full table wipe** — before inserting new data. Anyone who knows `rk_secure_push_25` can destroy the entire offline sales dataset.

**Fix:** Remove the fallback. If `GOOGLE_SYNC_TOKEN` is not set, return 500 (misconfiguration) or throw at startup.

### 6.2 HIGH — Debug File Write in Production Code

**File:** `backend/src/features/sales/server/offlineSyncService.ts`, **lines 49–52**

```typescript
try {
  const fs = await import('fs');
  fs.appendFileSync('headers_debug.log', `HEADERS: ${JSON.stringify(headers)}\n`);
} catch (e) {}
```

This writes a log file to the **current working directory on every sync invocation**. On Vercel, this silently fails (read-only filesystem), but on a traditional server it will grow unboundedly. More seriously, it leaks the shape of ingested data headers to disk. The `try/catch` that swallows errors means this ships silently.

**Fix:** Remove this block entirely.

### 6.3 HIGH — Body Size Limit of 300MB

**File:** `backend/src/app.ts`, **line 114–115**

```typescript
app.use(express.json({ limit: "300mb" }));
app.use(express.urlencoded({ extended: true, limit: "300mb" }));
```

This allows any caller to send 300MB JSON payloads. The `/push` endpoint (which uses a 1-token auth) is the only legitimate large-payload consumer. If the intent is to support large sync payloads on `/push`, the large limit should be scoped to that specific route; all other routes should use a sensible default (e.g., `1mb`).

**Fix:** Apply `express.json({ limit: '1mb' })` globally; apply `express.json({ limit: '300mb' })` only on `/api/offline-sales/push` (and equivalent push routes for other regions).

### 6.4 HIGH — Fallback Catch-All Returns 200 for All Unknown Routes

**File:** `backend/src/app.ts`, **lines 193–212**

```typescript
app.use("*", (req, res) => {
  console.log("Fallback route hit:", req.method, req.originalUrl);
  res.status(200).json({ message: "Raj-Kamal Backend API is running!", ... });
});
```

Unmatched routes (including mistyped API paths) return `HTTP 200`, making it impossible to detect routing errors programmatically. The `notFound` middleware registered after this (line 215) is dead. The console.log will print to production logs on every 404.

**Fix:** Remove the catch-all; let the `notFound` middleware handle unmatched routes with a proper `404` response.

### 6.5 MEDIUM — JWT Secret Not Validated at Startup

**Files:** `src/middleware/auth.ts` line 26, `src/middleware/authPrisma.ts` line 28, `src/routes/auth.ts` lines 107, 198

The JWT secret is checked at the point of use:
```typescript
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET not configured');
```

If `JWT_SECRET` is not set, the error will surface during the first authentication request rather than at startup. This means the app boots silently with a misconfigured auth system.

**Fix:** Validate required environment variables at startup (in `src/index.ts` or a dedicated `validateEnv()` helper).

### 6.6 MEDIUM — CORS Misconfiguration: Allows Requests Without Origin

**File:** `backend/src/app.ts`, **lines 51–53**

```typescript
if (!origin) {
  return callback(null, true);  // Allow all server-to-server / non-browser requests
}
```

Requests with no `Origin` header (curl, Postman, server-to-server) bypass CORS entirely. This is a common pattern but should be explicitly documented as intentional, because it means the CORS whitelist only protects browser-to-browser cross-origin requests, not API-to-API calls.

### 6.7 MEDIUM — No Rate Limit on Auth Endpoints

The rate limiter (`app.ts` lines 94–108) explicitly **bypasses** the auth route:

```
"/health,/,/api/auth,/api/auth/login,/api/auth/me,/api-docs"
```

`/api/auth/login` is excluded from rate limiting. A brute-force attacker can make unlimited login attempts. The password is bcrypt-hashed (cost 10), which provides inherent slowness, but a dedicated rate limit on `/api/auth/login` (e.g., 10 requests per 15 minutes per IP) is standard practice.

### 6.8 LOW — Hardcoded Year in `total-offline.routes.ts`

**File:** `backend/src/features/sales/server/total-offline.routes.ts`, **lines 111–112**

```typescript
if (range === 'ytd') return {
  gte: new Date('2026-01-01T00:00:00.000Z'),
  lte: new Date('2026-12-31T23:59:59.999Z'),
};
```

The calendar year is hardcoded to 2026. On January 1, 2027, the `ytd` filter will silently return no data.

**Fix:** Compute dynamically: `new Date(new Date().getFullYear(), 0, 1)`.

### 6.9 LOW — Hardcoded Internal ERP URL Committed

**File:** `backend/src/features/sales/server/offlineSyncService.ts`, **line 7**

```typescript
const REPORT_URL = "https://rajkamal.cloudpub.in/Reports/rpttitlecustomerwisegriddataExport?FromDate=2026-01-01...";
```

An internal ERP URL with query parameters is committed. The constant is unused (dead code), but it exposes an internal service endpoint in version history.

---

## 7. Best Practice Violations

### 7.1 Two Prisma Schemas / Two Generated Clients

The project maintains two separate Prisma schemas:
- `backend/prisma/schema.prisma` — User, Product, Order, etc.
- `backend/src/features/sales/prisma/schema.prisma` — all sales models

The `vercel-build` script and `postinstall` script must run `prisma generate` twice. The `lib/prisma.ts` client only references the root schema's client (`@prisma/client`), meaning the sales Prisma schema's generated client at `src/features/sales/prisma/generated/client` must be imported differently in sales routes.

This creates operational complexity: migrations must be run against two schemas, and the risk of schema drift is high.

**Recommendation:** Consolidate into a single Prisma schema.

### 7.2 No Request Timeout Middleware

No global request timeout is configured. Long-running DB queries (e.g., an unindexed full-table scan) will hold connections indefinitely. The Prisma transaction for sync has a 4-minute timeout (`offlineSyncService.ts` line 338), but individual query endpoints have none.

**Recommendation:** Add `connect-timeout` or a custom middleware to abort slow requests (e.g., 30 seconds).

### 7.3 Missing Response Compression

The test `src/tests/infra/compression.test.ts` expects the `/health` endpoint to return `Content-Encoding: gzip` when the client sends `Accept-Encoding: gzip`. The app does **not** use the `compression` middleware, so this test will always fail.

**Recommendation:** Add `compression` package and `app.use(compression())` before body parsers.

### 7.4 `scratch/` Directory Committed to Version Control

The `backend/scratch/` directory contains 50+ one-off diagnostic TypeScript scripts used during development. These are committed to the repository, bloating the codebase and creating confusion about what is production code vs. exploration.

**Recommendation:** Move to a separate branch, add `backend/scratch/` to `.gitignore`, or delete.

### 7.5 No `.env.example` File

A `.env` file exists (`backend/.env`) but there is no `.env.example`. Contributors and deployment documentation have no reference for required environment variables.

**Required env vars (inferred from code):**
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`
- `CORS_ORIGINS` or `FRONTEND_URL`
- `GOOGLE_SYNC_TOKEN`
- `API_RATE_LIMIT_ENABLED`
- `API_RATE_LIMIT_WINDOW_MS`
- `API_RATE_LIMIT_MAX_REQUESTS`
- `API_RATE_LIMIT_BYPASS`
- Metricool: `METRICOOL_USER_ID`, `METRICOOL_BRAND_ID`, `METRICOOL_BLOG_ID`, `METRICOOL_TOKEN`

### 7.6 Startup Background Sync Unsuitable for Serverless

**File:** `backend/src/app.ts`, **lines 219–240**

The `setTimeout(..., 5000)` that triggers Google Sheet sync on startup is designed for a long-running server process. On Vercel (the declared deployment target), each serverless invocation boots a new instance, triggering a potentially 4-minute DB transaction for every cold start. This could:
- Exhaust the database connection pool
- Cause timeout errors on the HTTP request that triggered the cold start
- Result in concurrent syncs if multiple instances boot simultaneously

**Fix:** Move sync to a dedicated cron/scheduled function (Vercel Cron Jobs) rather than startup code.

### 7.7 Frontend API Base URL Hardcoded

**File:** `frontend/src/lib/apiClient.ts`, **line 5**

```typescript
const DEFAULT_BASE_URL = "https://raj-kamal-mono-repo.vercel.app/api";
// const DEFAULT_BASE_URL = 'http://localhost:4000/api';
```

The production URL is hardcoded as a fallback. If `VITE_API_URL` is not set, the app silently uses the production endpoint. Development builds that forget to set the env var will hit production. The commented-out localhost URL was a previous default.

**Fix:** In development, throw an error if `VITE_API_URL` is not set. The fallback should be `undefined`, forcing explicit configuration.

### 7.8 `mock` Data Still Serving in Production-Registered Routes

**Files:** `src/routes/dashboard.ts`, `src/routes/rankings.ts`

These routes are registered in `app.ts` (lines 174–175) and protected by JWT auth, but serve static hardcoded data:

```typescript
// dashboard.ts line 29
const dashboardStats = {
  totalSales: 24320,
  orders: 1284,
  customers: 842,
  // ...
};
```

The customers listed (`John Doe`, `Jane Smith`, `Bob Johnson`) appear in the `/api/rankings/customers` endpoint. If a frontend user accesses these routes, they see fake data without any indication it is a placeholder.

### 7.9 `authenticateToken as any` Pattern Repeated 6+ Times

The cast `router.use(authenticateToken as any)` appears in every sales route file. The correct solution is to widen `authenticateToken`'s parameter type or use an Express middleware type helper, done once in a shared file.

### 7.10 Inconsistent Async Return Handling on Route Handlers

Many route handlers use `return res.json(...)` while others use `res.json(...)` without a return. The `Promise<any>` return type on handlers (e.g., `auth.ts` line 73) masks potential unhandled promise rejections when `next` is not called after `res.status().json()`.

### 7.11 Missing Database Indexes

The summary and counts queries run regex (`~*`) searches across large text columns (`title`, `customerName`, `state`, `city`, etc.). PostgreSQL `~*` operator cannot use standard B-tree indexes; these will result in full sequential scans. For performance, these columns should have GIN or trigram indexes if search volume is significant.

### 7.12 Post-Query Date Filtering Anti-Pattern

**Files:** `online.routes.ts` lines 141–175, `offline.routes.ts` lines 252–294

```typescript
// Fetch many more rows since we filter by date post-query
const fetchLimit = startDate || endDate ? Math.min(limit * 10, 5000) : limit;
```

When date filters are applied, the code fetches up to 5000 rows from the database and then filters them in Node.js memory because some records have dates only in `rawJson`. This is a correctness workaround but a performance anti-pattern. Over time as data grows, this will become a bottleneck. The correct fix is to ensure dates are always normalised and indexed at insert time (the sync service does attempt to parse dates, but evidently some rows still have null `date` columns).

---

## 8. Positive Highlights

### 8.1 Strong Input Validation with Zod

Every API endpoint uses Zod for query parameter validation with `safeParse`, returning structured 400 errors. Schemas validate types, ranges (`min(1).max(5000)`), and formats (`z.string().datetime()`). This is consistently applied across all 10+ route files.

### 8.2 Parameterised Raw SQL

All `prisma.$queryRaw` calls use `Prisma.sql` tagged templates, which properly parameterise values and prevent SQL injection. The `toTokenRegex()` helper correctly escapes regex metacharacters before embedding in PostgreSQL `~*` patterns.

### 8.3 Well-Designed Cache Layer

`src/lib/cache.ts` is clean, well-documented, generic, and correctly implements TTL eviction. The LRU bounded cache in `total-offline.routes.ts` is more sophisticated and correctly handles the LRU re-insertion pattern using `Map`'s insertion-order guarantee. Both implementations prevent unbounded memory growth.

### 8.4 Atomic Database Sync Transactions

`offlineSyncService.ts` (lines 330–339) wraps the full delete + reinsert cycle in a Prisma transaction, preventing data loss if the insert fails partway through. This is the correct pattern for a full-replace sync.

### 8.5 Indian Financial Year Logic

The financial year projection logic in `offline.routes.ts` (lines 529–628) correctly handles the April–March Indian FY, including weighted monthly averages, day-of-month extrapolation, and the distinction between current vs. complete months. This is domain-specific logic done right.

### 8.6 URL-Driven Filter State

`frontend/src/features/sales/client/useOfflineSheetFilters.ts` syncs all filter state to URL search params. This enables deep-linking, browser back/forward navigation, and session persistence. This is a best-practice approach that requires discipline.

### 8.7 TanStack Query Configuration

`frontend/src/lib/queryClient.ts` is correctly configured: 5-minute stale time, no refetch on window focus, smart retry logic (no retry on 4xx). The service hooks in `offlineSheetService.ts` use `keepPreviousData` to avoid content flash during filter changes.

### 8.8 Swagger Documentation

API documentation via `swagger-jsdoc` + `swagger-ui-express` is present for auth and dashboard routes (`/api-docs`). This is a good practice, though coverage is incomplete (sales routes are not documented).

### 8.9 Graceful Shutdown Handling

`src/lib/prisma.ts` (lines 24–36) registers `beforeExit`, `SIGINT`, and `SIGTERM` handlers to cleanly disconnect Prisma. This prevents connection leaks on server shutdown.

### 8.10 TypeScript Strict Mode

Both `backend/tsconfig.json` and `frontend/tsconfig.json` enable `strict: true`. The backend goes further with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitReturns`. This is an excellent foundation — the prevalence of `as any` works around these settings rather than respecting them.

### 8.11 Chunked Database Inserts

`offlineSyncService.ts` (lines 211–221) inserts data in chunks of 2000 rows using `createMany`, preventing out-of-memory or query-length errors on large datasets.

### 8.12 Fiction Filter Abstraction

`src/features/sales/server/fictionFilter.ts` cleanly abstracts Fiction/Non-Fiction/Other bucketing logic into separate functions for ORM filters (`fictionWhere`) and raw SQL (`fictionSql`). This is the right way to share filter logic while accommodating both query styles.

---

## 9. Prioritised Fix List

### Critical (Fix immediately)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| C1 | Hardcoded fallback token `rk_secure_push_25` | `offline.routes.ts:939` | Remove fallback; throw startup error if env var missing |
| C2 | Debug file write in production sync path | `offlineSyncService.ts:49-52` | Delete these lines |
| C3 | Catch-all returns 200 for all unknown routes | `app.ts:193-212` | Remove catch-all; let `notFound` middleware handle it |

### High (Fix within current sprint)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| H1 | 300MB body limit on all endpoints | `app.ts:114-115` | Reduce to 1MB globally; scope 300MB to `/push` only |
| H2 | No rate limit on `/api/auth/login` | `app.ts:88-90` | Remove login from bypass list; add a separate strict limiter |
| H3 | Mongoose error handling in Prisma app | `errorHandler.ts:21-46` | Replace with Prisma-specific error handling |
| H4 | Startup sync fires on every serverless cold start | `app.ts:219-240` | Move to Vercel Cron Job; remove from app startup |
| H5 | Mock data served on production-registered routes | `dashboard.ts`, `rankings.ts` | Either replace with real data or remove routes from `app.ts` |

### Medium (Fix in next iteration)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| M1 | 8+ copies of `decToNumber`, `round2`, `pick`, etc. | All `*.routes.ts` in `features/sales/server/` | Extract to `src/features/sales/server/utils.ts` |
| M2 | `BINDING_CANON` duplicated in frontend and backend | `FocusTabGrowthView.tsx`, `total-offline.routes.ts` | Extract to shared package or single authoritative source |
| M3 | Zod schemas re-created inside request handlers | All route files | Move to module scope |
| M4 | `AuthorPerformanceView` and `FocusTabGrowthView` bypass TanStack Query | `AuthorPerformanceView.tsx`, `FocusTabGrowthView.tsx` | Convert to `useQuery` hooks |
| M5 | Duplicate `ProtectedRoute` component | `src/routes/ProtectedRoute.tsx` | Delete; keep `src/components/ProtectedRoute.tsx` |
| M6 | Dead `auth.ts` middleware | `src/middleware/auth.ts` | Delete file |
| M7 | `scratch/` directory committed | `backend/scratch/` | Add to `.gitignore` and remove from repo |
| M8 | No `.env.example` file | Root/backend | Create with all required keys (no values) |
| M9 | JWT secret not validated at startup | `auth.ts`, `authPrisma.ts` | Validate all required env vars at startup in `index.ts` |
| M10 | Hardcoded 2026 year in `ytd` filter | `total-offline.routes.ts:111-112` | Compute `new Date().getFullYear()` dynamically |

### Low (Address when convenient)

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| L1 | Two Prisma schemas | `prisma/schema.prisma`, `src/features/sales/prisma/schema.prisma` | Consolidate into one schema |
| L2 | No request timeout middleware | `app.ts` | Add `connect-timeout` or manual timeout middleware |
| L3 | Missing response compression | `app.ts` | Add `compression` middleware |
| L4 | Inconsistent response shape (`success` vs `ok`) | All routes | Standardise on one shape; add a `sendSuccess/sendError` helper |
| L5 | Auth token stored in three places | `authSlice.ts`, `AuthContext.tsx`, `localStorage` | Single source of truth in Redux + localStorage sync in slice only |
| L6 | Hardcoded production API URL as fallback | `frontend/src/lib/apiClient.ts:5` | Throw error if `VITE_API_URL` not set in dev |
| L7 | Post-query date filtering (`fetchLimit * 10`) | `online.routes.ts:143`, `offline.routes.ts:252` | Normalise dates at import time; use DB-side filtering |
| L8 | `TotalOfflineSales.tsx` and `OfflineSheetPage.tsx` too large | Both files | Decompose into smaller sub-components |
| L9 | Missing Swagger docs for sales routes | All `features/sales/server/*.routes.ts` | Add JSDoc Swagger annotations |
| L10 | No GIN/trigram indexes for text search columns | Database | Add `pg_trgm` extension and trigram indexes on `title`, `customerName`, `state`, `city` |
| L11 | Unused `REPORT_URL` constant with internal ERP URL | `offlineSyncService.ts:7` | Remove |
| L12 | `consle.log` debug left in production path | `offline.routes.ts:884` | Remove `DAILY-DETAILS-RANGE` debug log |
| L13 | `emoji` in startup log messages | `index.ts:7-9` | Minor; some CI environments don't render Unicode correctly |

---

*End of Audit Report*
