# Codebase Structure

**Analysis Date:** 2026-03-23

## Directory Layout

```
backend/
├── api/                        # Vercel serverless entry point
│   └── index.ts                # Re-exports Express app; lazy admin bootstrap
├── src/                        # All application source code
│   ├── app.ts                  # Express app factory (middleware + route wiring)
│   ├── index.ts                # Node server entry (local / traditional hosting)
│   ├── api.ts                  # Thin re-export shim (unused by main paths)
│   ├── config/                 # Shared configuration modules
│   │   ├── swagger.ts          # swagger-jsdoc spec definition
│   │   └── metricool.ts        # Metricool API client config and base params
│   ├── features/               # Self-contained feature modules
│   │   ├── sales/              # Sales data feature (main domain)
│   │   │   ├── prisma/         # Isolated Prisma schema for Sales feature
│   │   │   │   ├── schema.prisma             # Defines only the Sale model
│   │   │   │   └── generated/client/         # Generated Prisma client (gitignored)
│   │   │   ├── scripts/        # One-off data import and maintenance scripts
│   │   │   │   ├── import-excel.ts
│   │   │   │   ├── import-excel-events.ts
│   │   │   │   ├── backfill-online.ts
│   │   │   │   ├── preview-events.ts
│   │   │   │   ├── truncate-events.ts
│   │   │   │   └── verify-import.ts
│   │   │   └── server/         # Route handlers and service for sales
│   │   │       ├── index.ts                  # Re-export barrel
│   │   │       ├── online.index.ts           # mount function for online sales
│   │   │       ├── online.routes.ts          # /api/online-sales handlers
│   │   │       ├── offline.index.ts          # mount function for offline sales
│   │   │       ├── offline.routes.ts         # /api/offline-sales handlers
│   │   │       ├── lok-event.index.ts        # mount function for Lok event sales
│   │   │       ├── lok-event.routes.ts       # /api/lok-event-sales handlers
│   │   │       ├── rajradha-event.index.ts   # mount function for RajRadha event sales
│   │   │       ├── rajradha-event.routes.ts  # /api/rajradha-event-sales handlers
│   │   │       ├── sales.routes.ts           # Legacy XLSX-upload import route
│   │   │       └── offlineSyncService.ts     # OfflineSyncService class (ERP sync)
│   │   └── excel-import/       # Stub/placeholder (empty directory)
│   ├── lib/                    # Shared infrastructure singletons
│   │   ├── prisma.ts           # Main PrismaClient singleton with graceful shutdown
│   │   └── bootstrap.ts        # ensureAdminExists() — seeds default admin from env
│   ├── middleware/             # Express middleware
│   │   ├── authPrisma.ts       # JWT auth + DB user verification (primary)
│   │   ├── auth.ts             # JWT auth without DB lookup (legacy)
│   │   ├── errorHandler.ts     # Centralized error handler
│   │   └── notFound.ts         # 404 handler
│   ├── routes/                 # Standard REST route handlers
│   │   ├── auth.ts             # /api/auth — register, login, me, logout, admin-status
│   │   ├── dashboard.ts        # /api/dashboard — overview, sales, orders, customers (mock data)
│   │   ├── inventory.ts        # /api/inventory — items listing (mock data)
│   │   ├── rankings.ts         # /api/rankings — product rankings (mock data)
│   │   ├── social.ts           # /api/social — social stats
│   │   └── metricool.ts        # /api/metricool — Metricool analytics proxy
│   ├── services/               # Reusable service modules (external API clients)
│   │   └── metricoolService.ts # Metricool API calls (distribution, timeline, posts)
│   └── scripts/                # General maintenance scripts
│       ├── seed-admin.ts       # Seed admin user manually
│       └── debug_data.ts       # Debug/inspection utility
├── prisma/                     # Main Prisma schema and migrations
│   ├── schema.prisma           # Primary schema (User, Product, Order, Sales event models)
│   └── migrations/             # SQL migration history
│       ├── 20250925025654_/
│       ├── 20251027113920_new_table/
│       └── 20251028050742_align_rajkamaldata/
├── data/                       # Local Excel/CSV data files for import (not committed)
├── dist/                       # Compiled TypeScript output (gitignored, generated)
├── scripts/                    # Root-level utility scripts
├── api/                        # Vercel adapter (also listed above)
├── .planning/                  # GSD planning artifacts
│   └── codebase/               # Codebase analysis documents
├── package.json
├── tsconfig.json
├── vercel.json                 # Vercel deployment config (routes all to api/index.ts)
├── .eslintrc.json
├── env.example                 # Template for required environment variables
└── README.md
```

## Directory Purposes

**`src/app.ts`:**
- Purpose: Single source of truth for Express app configuration
- Contains: All middleware registration, route mounting, Swagger UI, health check, startup sync
- Key files: `src/app.ts`

**`src/routes/`:**
- Purpose: Standard HTTP route handlers grouped by domain
- Contains: Thin route files; handlers may call Prisma directly or delegate to `src/services/`
- Key files: `src/routes/auth.ts` (real auth logic), all others currently use mock data

**`src/features/sales/`:**
- Purpose: Self-contained vertical slice for all sales data types
- Contains: Routes, service class, isolated Prisma schema, and data import scripts
- Key files: `src/features/sales/server/offlineSyncService.ts`, `src/features/sales/server/offline.routes.ts`

**`src/middleware/`:**
- Purpose: Reusable Express middleware for cross-cutting concerns
- Contains: Auth verification, error handling, not-found fallback
- Key files: `src/middleware/authPrisma.ts` (use this one, not `auth.ts`)

**`src/lib/`:**
- Purpose: Infrastructure singletons shared across the codebase
- Contains: `prisma.ts` (database client), `bootstrap.ts` (admin seeding)
- Key files: `src/lib/prisma.ts` — import `prisma` from here for all DB access outside the sales feature

**`src/services/`:**
- Purpose: Business logic / external API integrations decoupled from route handlers
- Contains: `metricoolService.ts`

**`src/config/`:**
- Purpose: Service configuration and specification modules
- Contains: Swagger spec builder, Metricool API base config

**`prisma/`:**
- Purpose: Main database schema and migration history
- Contains: `schema.prisma` with models: `User`, `Product`, `Order`, `OrderItem`, `Review`, `Category`, `OnlineSale`, `OfflineCashUPICCSale`, `GoogleSheetOfflineSale`, `RajRadhaEventSale`, `LokEventSale`, `RajkamalData`

**`src/features/sales/prisma/`:**
- Purpose: Isolated Prisma schema for the legacy `Sale` model used by `sales.routes.ts`
- Contains: `schema.prisma` (only defines `Sale`), `generated/client/` (generated, not committed)
- Note: Separate from main schema to avoid conflicts; both share the same `DATABASE_URL`

**`api/`:**
- Purpose: Vercel serverless adapter
- Generated: No
- Committed: Yes

**`dist/`:**
- Purpose: TypeScript compilation output
- Generated: Yes
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**
- `src/index.ts`: Local development and traditional Node server
- `api/index.ts`: Vercel serverless handler

**Application Assembly:**
- `src/app.ts`: All middleware wiring and route registration

**Configuration:**
- `tsconfig.json`: TypeScript compiler options (strict mode, NodeNext modules, ES2022 target)
- `vercel.json`: Vercel deployment routing (all paths → `api/index.ts`)
- `env.example`: Required environment variable template
- `src/config/swagger.ts`: OpenAPI spec builder
- `src/config/metricool.ts`: Metricool API client configuration

**Core Library:**
- `src/lib/prisma.ts`: Prisma singleton — import `{ prisma }` from here
- `src/lib/bootstrap.ts`: `ensureAdminExists()` — called on Vercel cold start

**Route Handlers:**
- `src/routes/auth.ts`: Authentication endpoints (real Prisma-backed)
- `src/routes/dashboard.ts`: Dashboard endpoints (mock data)
- `src/routes/metricool.ts`: Metricool proxy
- `src/features/sales/server/offline.routes.ts`: Offline sales CRUD and analytics
- `src/features/sales/server/online.routes.ts`: Online sales CRUD and analytics
- `src/features/sales/server/lok-event.routes.ts`: Lok event sales
- `src/features/sales/server/rajradha-event.routes.ts`: RajRadha event sales

**Database Schemas:**
- `prisma/schema.prisma`: Main schema
- `src/features/sales/prisma/schema.prisma`: Feature-isolated `Sale` model schema

**Data Import:**
- `src/features/sales/server/offlineSyncService.ts`: Background ERP sync service
- `src/features/sales/scripts/import-excel-events.ts`: CLI script for event Excel import

## Naming Conventions

**Files:**
- Route files: kebab-case matching their URL segment — `auth.ts` → `/api/auth`, `offline.routes.ts` → `/api/offline-sales`
- Feature index files: `[feature-name].index.ts` exports a `mount` function
- Service files: camelCase with `Service` suffix — `metricoolService.ts`, `offlineSyncService.ts`
- Middleware files: camelCase describing the concern — `authPrisma.ts`, `errorHandler.ts`

**Directories:**
- Feature modules under `src/features/[feature-name]/`
- HTTP handlers in `server/` subdirectory within each feature
- Data scripts in `scripts/` subdirectory within each feature

**Exports:**
- Route files default-export the `Router` instance
- Feature index files named-export `mount*` functions
- Service files export a singleton instance and/or named functions
- Middleware files named-export their middleware function

## Where to Add New Code

**New standard REST endpoint (non-sales domain):**
- Route handler: `src/routes/[domain].ts`
- Register in: `src/app.ts` with `app.use('/api/[domain]', [domain]Routes)`
- Add Swagger JSDoc annotations inline in the route file

**New sales data type / channel:**
- Routes: `src/features/sales/server/[channel].routes.ts`
- Mount index: `src/features/sales/server/[channel].index.ts` (export `mount[Channel]`)
- Register mount: `src/app.ts` call `mount[Channel](app, '/api/[channel]-sales')`
- Add model: `prisma/schema.prisma` following existing sales model patterns (BigInt id, rowHash unique, rawJson Json, date/index)
- Run migration: `npm run db:migrate`

**New external service integration:**
- Client config: `src/config/[service].ts`
- Service logic: `src/services/[service]Service.ts`
- Route: `src/routes/[service].ts`

**New middleware:**
- File: `src/middleware/[concern].ts`
- Named-export the function
- Register in `src/app.ts` or apply per-router

**Database access (outside sales feature):**
- Import `{ prisma }` from `src/lib/prisma.ts`
- Use typed models from `@prisma/client`

**Database access (within sales feature):**
- For `Sale` model: instantiate from `src/features/sales/prisma/generated/client/index.js`
- For all other models (OnlineSale, GoogleSheetOfflineSale, etc.): use main `src/lib/prisma.ts`

## Special Directories

**`dist/`:**
- Purpose: TypeScript compiler output, mirrors `src/` and `api/` structure
- Generated: Yes (via `tsc` / `npm run build`)
- Committed: No

**`src/features/sales/prisma/generated/`:**
- Purpose: Generated Prisma client for the isolated `Sale` schema
- Generated: Yes (via `prisma generate --schema src/features/sales/prisma/schema.prisma`)
- Committed: No (excluded in `tsconfig.json` and `.gitignore`)

**`data/`:**
- Purpose: Local Excel/CSV data files used by import scripts
- Generated: No
- Committed: No (local data files only)

**`.planning/`:**
- Purpose: GSD planning artifacts and codebase analysis
- Generated: No (manually authored)
- Committed: Yes

---

*Structure analysis: 2026-03-23*
