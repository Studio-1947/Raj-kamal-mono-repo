# External Integrations

**Analysis Date:** 2026-03-23

## APIs & External Services

**Social Media Analytics:**
- Metricool - Analytics for Facebook, Instagram, Twitter, LinkedIn, YouTube, TikTok
  - SDK/Client: Native `fetch` (no SDK), custom request wrapper at `src/config/metricool.ts`
  - Auth: `METRICOOL_API_TOKEN` (sent as `X-Mc-Auth` header and `userToken` query param)
  - Identity params: `METRICOOL_USER_ID`, `METRICOOL_BLOG_ID`, `METRICOOL_BRAND_ID`
  - Base URL: `METRICOOL_BASE_URL`
  - Default timezone: `METRICOOL_DEFAULT_TIMEZONE` (default: `Asia/Kolkata`)
  - Endpoints used:
    - `/api/v2/analytics/distribution` - Distribution metrics per network
    - `/api/v2/analytics/timelines` - Timeline metrics per network
    - `/api/v2/analytics/posts/{network}` - Posts per network
    - `/api/v2/analytics/competitors/{network}` - Competitor data
    - `/api/admin/profile` - Admin/brand profile info
  - Rate limiting: Queue-based with batching (max 5 parallel, 300ms between batches), 3 retries with exponential backoff, 15s timeout
  - Service layer: `src/services/metricoolService.ts`
  - Config: `src/config/metricool.ts`
  - Routes consumed: `src/routes/social.ts`, `src/routes/metricool.ts`, `src/routes/dashboard.ts`

**ERP System (Rajkamal CloudPub):**
- Rajkamal ERP - Offline sales report export
  - Integration: Direct HTTP fetch to ERP URL, returns an Excel (XLSX) file
  - URL: `https://rajkamal.cloudpub.in/Reports/rpttitlecustomerwisegriddataExport?...` (hardcoded in `src/features/sales/server/offlineSyncService.ts`)
  - Auth: None (URL-based access)
  - Consumed by: `OfflineSyncService.syncOfflineSales()` in `src/features/sales/server/offlineSyncService.ts`
  - Trigger: Auto-runs on server startup (5s delay), also callable via `GET /api/offline-sales/google-sheets`

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma ORM
  - Main client singleton: `src/lib/prisma.ts` (uses `@prisma/client`)
  - Sales feature client: Separate Prisma client instance in `src/features/sales/server/sales.routes.ts` (uses generated client at `src/features/sales/prisma/generated/client/`)
  - Migrations: `prisma/migrations/`
  - Two schemas: `prisma/schema.prisma` (main) and `src/features/sales/prisma/schema.prisma` (sales feature)

**File Storage:**
- Local filesystem only - Excel files read from `data/` directory during import scripts
  - Import path: `data/RKP offline Sales.xlsx` (default in `src/features/sales/server/sales.routes.ts`)
  - Error reports written to `data/import-errors-{timestamp}.json`
  - No cloud file storage (no S3, GCS, etc.)

**Caching:**
- None - No Redis, Memcached, or in-memory cache layer

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication (no third-party auth provider)
  - Implementation: `src/routes/auth.ts` (login, register, me, logout, admin-status endpoints)
  - Middleware: `src/middleware/auth.ts` (token-only), `src/middleware/authPrisma.ts` (token + DB lookup)
  - Token secret: `JWT_SECRET` environment variable
  - Token expiry: 7 days (hardcoded: `60 * 60 * 24 * 7`)
  - Passwords hashed with bcryptjs (cost factor 10)
  - Single admin model: registration blocked if any ADMIN role user exists
  - Admin bootstrap: `src/lib/bootstrap.ts` creates admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME` env vars on cold start (called from `api/index.ts`)

**Webhook Sync Token:**
- `GOOGLE_SYNC_TOKEN` - Shared secret for incoming push endpoint
  - Used at: `POST /api/offline-sales/push` (header: `x-sync-token`)
  - Default fallback: `rk_default_token_2026` (should be overridden in production)

## Monitoring & Observability

**Error Tracking:**
- None - No Sentry, Datadog, or external error tracking service

**Logs:**
- `morgan` HTTP request logging (format: `combined` in production)
- `console.log` / `console.error` for application logs throughout services
- Prisma query logging enabled in development (`['query', 'error', 'warn']`), errors only in production
- Structured JSON logging in import/sales services: `console.log(JSON.stringify({ msg: ..., ...fields }))`

## CI/CD & Deployment

**Hosting:**
- Vercel (serverless)
  - Config: `vercel.json`
  - All routes handled by `api/index.ts` (Express app exported as default handler)
  - Build command: `npm run vercel-build`
  - Includes Prisma engines in build (`node_modules/.prisma/client/**`, `node_modules/@prisma/engines/**`, `src/features/sales/prisma/generated/**`)
  - Prisma binary target: `debian-openssl-3.0.x` for Vercel Linux environment

**CI Pipeline:**
- None detected - No GitHub Actions, CircleCI, or similar CI configuration files found

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `FRONTEND_URL` or `CORS_ORIGINS` - Allowed CORS origins (comma-separated)
- `METRICOOL_API_TOKEN` - Metricool API authentication
- `METRICOOL_USER_ID` - Metricool account user ID
- `METRICOOL_BLOG_ID` - Metricool blog/brand ID
- `METRICOOL_BASE_URL` - Metricool API base URL

**Optional env vars:**
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment flag
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` - Bootstrap admin credentials
- `API_RATE_LIMIT_WINDOW_MS`, `API_RATE_LIMIT_MAX_REQUESTS`, `API_RATE_LIMIT_ENABLED`, `API_RATE_LIMIT_BYPASS`
- `IMPORT_CHUNK_SIZE` - Rows per DB insert batch during Excel import (default: 500)
- `GOOGLE_SYNC_TOKEN` - Shared token for push webhook
- `METRICOOL_BRAND_ID`, `METRICOOL_DEFAULT_TIMEZONE`
- `VERCEL_URL` - Auto-set by Vercel, used in Swagger server URL

**Secrets location:**
- `.env` file at project root (not committed; `.env.example` / `env.example` provides template)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/offline-sales/push` - Accepts sales rows pushed from Google Sheets or other automation
  - Auth: `x-sync-token` header matched against `GOOGLE_SYNC_TOKEN`
  - Payload: `{ data: any[][] }` (first row treated as headers)
  - Processed by: `offlineSyncService.processData()`

**Outgoing:**
- None - No outgoing webhooks or callback URLs configured

## Google APIs

**googleapis package** (`^171.4.0`) is declared as a dependency but no direct usage of it was found in explored source files. It may be used by import scripts in `src/features/sales/scripts/` or reserved for future Google Sheets API direct integration. The current offline sync path fetches the ERP URL directly rather than using Google Sheets API.

---

*Integration audit: 2026-03-23*
