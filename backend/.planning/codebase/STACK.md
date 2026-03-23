# Technology Stack

**Analysis Date:** 2026-03-23

## Languages

**Primary:**
- TypeScript 5.3.x - All source code in `src/` and `api/`

**Secondary:**
- JavaScript - Generated Prisma client output (`src/features/sales/prisma/generated/client/`)

## Runtime

**Environment:**
- Node.js 20.x (enforced via `"engines": { "node": "20.x" }` in `package.json`)
- ES module format (`"type": "module"` in `package.json`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Express 4.18.x - HTTP server framework, entry point at `src/app.ts`

**Build/Dev:**
- tsx 4.6.x - TypeScript execution for development (`npm run dev` uses `tsx watch`)
- TypeScript 5.3.x compiler (`tsc`) - Production builds output to `dist/`

## Key Dependencies

**Critical:**
- `@prisma/client` ^5.7.1 - Primary ORM for all database access
- `prisma` ^5.7.1 (devDep) - CLI for migrations, schema generation
- `express` ^4.18.2 - HTTP framework
- `jsonwebtoken` ^9.0.2 - JWT creation and verification for auth
- `bcryptjs` ^2.4.3 - Password hashing
- `zod` ^3.22.4 - Runtime schema validation on all request inputs
- `xlsx` ^0.18.5 - Excel file parsing for sales data import (`sales.routes.ts`, `offlineSyncService.ts`, `import-excel-events.ts`)
- `googleapis` ^171.4.0 - Google APIs SDK (imported in package; used for Sheets integration)

**Security & Middleware:**
- `helmet` ^7.1.0 - HTTP security headers
- `cors` ^2.8.5 - CORS middleware with origin allowlist
- `express-rate-limit` ^7.1.5 - IP-based rate limiting
- `morgan` ^1.10.0 - HTTP request logging
- `dotenv` ^16.3.1 - Environment variable loading

**API Documentation:**
- `swagger-jsdoc` ^6.2.8 - Generates OpenAPI 3.0 spec from JSDoc comments
- `swagger-ui-express` ^5.0.1 - Serves Swagger UI at `/api-docs`

## Configuration

**Environment:**
- Variables loaded via `dotenv` in `src/app.ts`
- Template at `env.example`
- Required vars: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (or `CORS_ORIGINS`)
- Optional vars: `PORT` (default 4000), `NODE_ENV`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `API_RATE_LIMIT_WINDOW_MS`, `API_RATE_LIMIT_MAX_REQUESTS`, `API_RATE_LIMIT_ENABLED`, `API_RATE_LIMIT_BYPASS`, `IMPORT_CHUNK_SIZE`
- Metricool vars: `METRICOOL_BASE_URL`, `METRICOOL_API_TOKEN`, `METRICOOL_BRAND_ID`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_ID`, `METRICOOL_DEFAULT_TIMEZONE`
- Sync var: `GOOGLE_SYNC_TOKEN`

**TypeScript:**
- Config at `tsconfig.json`
- Target: ES2022, module resolution: NodeNext
- Strict mode fully enabled: `noImplicitAny`, `strictNullChecks`, `noImplicitReturns`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- Output: `dist/` directory
- Includes: `src/**/*`, `api/**/*`
- Excludes: generated Prisma client, test files

**Build:**
- `tsc` compiles to `dist/`
- Vercel build: `npm run vercel-build` runs `prisma generate` (both schemas) + `tsc`
- `vercel.json` routes all traffic to `api/index.ts`

## Database Schema

Two separate Prisma schemas exist:

**Main schema** (`prisma/schema.prisma`):
- Provider: PostgreSQL, URL from `DATABASE_URL`
- Models: `User`, `Product`, `Order`, `OrderItem`, `Review`, `Category`, `OnlineSale`, `OfflineCashUPICCSale`, `GoogleSheetOfflineSale`, `RajRadhaEventSale`, `LokEventSale`, `RajkamalData`
- Client generated to default location (`node_modules/@prisma/client`)
- Client singleton at `src/lib/prisma.ts`

**Sales feature schema** (`src/features/sales/prisma/schema.prisma`):
- Isolated schema with its own generated client at `src/features/sales/prisma/generated/client/`
- Models: `Sale` (generic flat model for imported Excel data)
- Client instantiated directly in `src/features/sales/server/sales.routes.ts`

## Platform Requirements

**Development:**
- Node.js 20.x
- PostgreSQL database accessible via `DATABASE_URL`
- All env vars from `env.example` filled in

**Production:**
- Deployed on Vercel (serverless Node.js via `@vercel/node`)
- PostgreSQL database (external, e.g. Neon, Supabase, or any Postgres host)
- Build target includes Debian OpenSSL 3.0.x for Prisma binary (`binaryTargets` in schema)

---

*Stack analysis: 2026-03-23*
