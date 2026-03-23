# Architecture

**Analysis Date:** 2026-03-23

## Pattern Overview

**Overall:** Layered Express REST API with a feature-module pattern for sales data

**Key Characteristics:**
- Express application assembled in `src/app.ts` with all middleware and route registration centralized
- Two distinct zones: standard REST routes in `src/routes/` (thin, some using mock data) and self-contained sales feature modules in `src/features/sales/`
- Two Prisma clients: main client at `src/lib/prisma.ts` (for users, products, orders) and a feature-isolated client generated from `src/features/sales/prisma/schema.prisma`
- Deployed as a serverless function on Vercel via `api/index.ts` and also runnable as a traditional Node server via `src/index.ts`

## Layers

**Entry / Adapter Layer:**
- Purpose: Bootstraps the server for the target runtime
- Location: `src/index.ts` (Node process), `api/index.ts` (Vercel serverless)
- Contains: Port binding or serverless export, lazy admin bootstrap
- Depends on: `src/app.ts`
- Used by: Node runtime / Vercel platform

**Application Assembly Layer:**
- Purpose: Wires all middleware, routes, and startup logic into the Express app
- Location: `src/app.ts`
- Contains: CORS, Helmet, rate limiting, Morgan logging, body parsing, Swagger UI, route mounting, error handler, post-boot offline sync trigger
- Depends on: All route files, feature mounts, middleware
- Used by: Entry layer

**Middleware Layer:**
- Purpose: Cross-cutting request processing
- Location: `src/middleware/`
- Contains:
  - `auth.ts` — stateless JWT decode (no DB lookup, used in legacy paths)
  - `authPrisma.ts` — JWT decode + live DB user verification (primary, used in most routes)
  - `errorHandler.ts` — centralized Express error handler
  - `notFound.ts` — 404 handler
- Depends on: `src/lib/prisma.ts`
- Used by: All route files

**Standard Routes Layer:**
- Purpose: HTTP handlers for non-sales domain areas
- Location: `src/routes/`
- Contains: `auth.ts`, `dashboard.ts`, `inventory.ts`, `rankings.ts`, `social.ts`, `metricool.ts`
- Depends on: Middleware, `src/lib/prisma.ts`, `src/services/`
- Used by: `src/app.ts` via `app.use('/api/...')`

**Sales Feature Module:**
- Purpose: Self-contained feature handling all sales data pipelines (online, offline, events)
- Location: `src/features/sales/`
- Contains: Route files, service class, data import scripts, isolated Prisma schema and client
- Depends on: Own generated Prisma client (`src/features/sales/prisma/generated/client/`), main `src/lib/prisma.ts` for some sub-paths
- Used by: `src/app.ts` via `mountOnlineSales`, `mountOfflineSales`, etc.

**Services Layer:**
- Purpose: Reusable business logic / API proxy clients, separate from route handlers
- Location: `src/services/`
- Contains: `metricoolService.ts` — Metricool analytics API integration
- Depends on: `src/config/metricool.ts`
- Used by: `src/routes/metricool.ts`

**Configuration Layer:**
- Purpose: Shared config initialization for external services and API docs
- Location: `src/config/`
- Contains: `swagger.ts` (swagger-jsdoc spec), `metricool.ts` (Metricool API client config)
- Depends on: Environment variables
- Used by: `src/app.ts`, `src/services/metricoolService.ts`

**Data / ORM Layer:**
- Purpose: Database access via Prisma
- Location: `src/lib/prisma.ts` (main singleton), `src/features/sales/prisma/` (feature-isolated)
- Contains: Singleton PrismaClient with graceful shutdown handlers; second isolated client for the sales feature
- Depends on: `DATABASE_URL` env var, generated Prisma clients
- Used by: All routes and the OfflineSyncService

## Data Flow

**Standard Authenticated Request:**
1. HTTP request arrives at Express
2. `cors`, `helmet`, `rateLimit`, `morgan` middleware process the request
3. Route handler invokes `authenticateToken` middleware (`src/middleware/authPrisma.ts`)
4. `authPrisma` decodes JWT, performs a live DB lookup via `src/lib/prisma.ts`
5. Route handler executes business logic, querying Prisma as needed
6. Response returned as `{ success: true, data: {...} }` JSON envelope
7. On error: thrown errors bubble to `errorHandler` middleware; errors with `statusCode` are forwarded directly

**Sales Feature Request (offline/online/event):**
1. Request routed to `mountOfflineSales` / `mountOnlineSales` / etc. via `src/app.ts`
2. Feature router (`offline.routes.ts`, etc.) handles the request directly — no authentication middleware currently applied at the router level
3. Cursor-based pagination with `cursorId` and `limit` query params
4. Queries execute against the main Prisma client (`src/lib/prisma.ts`) using models like `GoogleSheetOfflineSale`, `OnlineSale`, `LokEventSale`, `RajRadhaEventSale`
5. Aggregation and time-series summary computed in-process from query results

**Offline Sync (Background):**
1. On server startup (5s delay), `offlineSyncService.syncOfflineSales()` fires automatically
2. Service fetches an XLSX report from ERP URL (`rajkamal.cloudpub.in`)
3. XLSX parsed with `xlsx` library into row arrays
4. Rows are filtered (customer skip list), mapped to fields, and MD5-hashed per row
5. Each row is upserted into `GoogleSheetOfflineSale` using `rowHash` as the idempotency key
6. On Vercel, admin bootstrap happens lazily on first request via `api/index.ts`

**Excel Import (Script / API):**
1. Excel files placed in `data/` or uploaded via multipart
2. `sales.routes.ts` and import scripts (`src/features/sales/scripts/`) parse rows with `xlsx`
3. Canonical keys derived from (source, orderNo, isbn, date, amount, customerName) and SHA-256 hashed
4. Records upserted in configurable chunks (default 500) into the isolated sales Prisma client (`Sale` model)

**State Management:**
- No in-process state beyond the Prisma singleton and the `adminInitialized` flag in `api/index.ts`
- All state is persisted to PostgreSQL

## Key Abstractions

**`OfflineSyncService` (class):**
- Purpose: Encapsulates ERP-to-DB sync logic for offline sales
- Location: `src/features/sales/server/offlineSyncService.ts`
- Pattern: Singleton instance exported as `offlineSyncService`; `processData(rows)` is the reusable entry point; `syncOfflineSales()` wraps the ERP fetch

**`mountXxxSales` functions:**
- Purpose: Decouple feature route registration from the app assembly
- Examples: `src/features/sales/server/online.index.ts`, `src/features/sales/server/offline.index.ts`
- Pattern: Each index file exports a `mount` function taking `(app: Express, basePath: string)` — allows base path to be overridden

**`AuthRequest` interface:**
- Purpose: Extends `express.Request` with a typed `user` property populated by auth middleware
- Location: `src/middleware/authPrisma.ts` (primary), `src/middleware/auth.ts` (legacy copy)
- Pattern: All authenticated route handlers type their request parameter as `AuthRequest`

**`AppError` interface:**
- Purpose: Error shape carrying an optional `statusCode` and `isOperational` flag for the central error handler
- Location: `src/middleware/errorHandler.ts`

**Dual Prisma Clients:**
- Purpose: Main client (`@prisma/client`) for the general schema; isolated client in `src/features/sales/prisma/generated/client/` for the `Sale` model from the feature's own schema
- Examples: `src/lib/prisma.ts`, `src/features/sales/server/sales.routes.ts` line 7
- Pattern: `salesPrisma = new PrismaClient()` instantiated inside `sales.routes.ts` for the feature schema

## Entry Points

**`src/index.ts`:**
- Location: `src/index.ts`
- Triggers: `node dist/index.js` or `npm run dev` (tsx watch)
- Responsibilities: Binds the Express app to `PORT` (default 4000)

**`api/index.ts`:**
- Location: `api/index.ts`
- Triggers: Vercel serverless invocation (all routes forward here via `vercel.json`)
- Responsibilities: Lazy admin bootstrap on cold start, re-exports the Express app as the default handler

**`src/app.ts`:**
- Location: `src/app.ts`
- Triggers: Imported by both entry points
- Responsibilities: Full app configuration — CORS, security middleware, Swagger, route mounting, post-boot offline sync trigger

## Error Handling

**Strategy:** Centralized Express error handler with typed `AppError`; route-level try/catch for operational errors

**Patterns:**
- Route handlers catch Zod validation errors explicitly and return 400 with `{ success: false, error, details }`
- Unhandled async errors propagate to `errorHandler` middleware at `src/middleware/errorHandler.ts`
- MongoDB/Mongoose-named error checks exist in the handler (legacy copy-paste; the DB is PostgreSQL/Prisma)
- JWT errors return 403 directly from auth middleware before reaching route logic
- All error responses follow the envelope: `{ success: false, error: string, stack?: string }`

## Cross-Cutting Concerns

**Logging:** `morgan("combined")` for HTTP request logging; `console.error` for application-level errors
**Validation:** Zod schemas defined inline in route files; used in `auth.ts` and sales routes
**Authentication:** JWT Bearer token; primary middleware is `authPrisma.ts` (DB-verified); legacy `auth.ts` exists but is not used by current routes

---

*Architecture analysis: 2026-03-23*
