# Coding Conventions

**Analysis Date:** 2026-03-23

## Naming Patterns

**Files:**
- Route files: `kebab-case.ts` (e.g., `auth.ts`, `offline.routes.ts`, `lok-event.routes.ts`)
- Service files: `camelCase` noun + `Service.ts` suffix (e.g., `offlineSyncService.ts`, `metricoolService.ts`)
- Middleware files: `camelCase.ts` (e.g., `errorHandler.ts`, `authPrisma.ts`, `notFound.ts`)
- Feature index mounts: `kebab-case.index.ts` (e.g., `offline.index.ts`, `lok-event.index.ts`)
- Config files: `camelCase.ts` in `src/config/` (e.g., `swagger.ts`, `metricool.ts`)
- Script files: `kebab-case.ts` in `scripts/` (e.g., `seed-admin.ts`, `import-excel.ts`)

**Functions:**
- Exported route handlers: named arrow functions or anonymous inside `router.get/post()`
- Utility functions: `camelCase` (e.g., `decToNumber`, `round2`, `numSafe`, `normalizeText`, `resolveRowDate`)
- Middleware exports: named `camelCase` exports (e.g., `authenticateToken`, `requireRole`, `errorHandler`, `notFound`)
- Service methods: `camelCase` instance methods inside classes (e.g., `syncOfflineSales`, `processData`, `getVal`)
- Async service functions: exported named functions for standalone service modules (e.g., `fetchDistribution`, `fetchTimeline`, `fetchPosts`)
- Bootstrap functions: `camelCase` with verb prefix (e.g., `ensureAdminExists`, `mountOnlineSales`, `mountOfflineSales`)

**Variables:**
- `camelCase` throughout
- Constants that are route-scoped schemas: single-letter uppercase `Q` (e.g., `const Q = z.object({...})`)
- Module-level constants: `SCREAMING_SNAKE_CASE` (e.g., `REPORT_URL`, `SKIP_CUSTOMERS`, `DEFAULT_CHUNK_SIZE`, `COLS`)
- Type aliases for exported parameter shapes: `PascalCase` + `Params` suffix (e.g., `DistributionParams`, `TimelineParams`)

**Types and Interfaces:**
- `PascalCase` for interfaces and types
- Extended Request types: `AuthRequest extends Request` (defined in each middleware file)
- Service return types: named interfaces (e.g., `SyncResult` in `offlineSyncService.ts`)
- Zod schemas: `camelCase` + `Schema` suffix for module-level schemas (e.g., `registerSchema`, `loginSchema`); inline `const Q` for route-level schemas

## Code Style

**Formatting:**
- No Prettier config detected — formatting is not enforced by a formatter tool
- Indentation: 2 spaces (observed throughout)
- Single quotes in most files (auth, middleware, routes); double quotes in features/sales files
- Trailing commas present in most object/array literals
- Semi-colons used throughout

**Linting:**
- ESLint with `@typescript-eslint/recommended` (`.eslintrc.json`)
- Key rules enforced:
  - `@typescript-eslint/no-unused-vars`: **error**
  - `prefer-const`: **error**
  - `no-var`: **error**
  - `@typescript-eslint/no-explicit-any`: **warn** (not error — `any` is used extensively)
  - `@typescript-eslint/no-non-null-assertion`: **warn**
  - `@typescript-eslint/explicit-function-return-type`: **off**
  - `@typescript-eslint/explicit-module-boundary-types`: **off**

**TypeScript:**
- `strict: true` with full strict mode flags in `tsconfig.json` (strictNullChecks, strictFunctionTypes, noImplicitAny, noImplicitReturns, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- `ES2022` target, `NodeNext` module resolution
- ESM modules with `.js` extensions on all local imports (e.g., `import { prisma } from '../lib/prisma.js'`)
- `any` cast is common in route handlers and data processing (tolerated by warn-not-error lint rule)
- `as any` casts used when Prisma types don't match exactly (e.g., BigInt cursor args)

## Import Organization

**Order (observed pattern):**
1. Third-party packages (express, zod, jwt, bcryptjs, etc.)
2. Internal lib/config imports (`../lib/prisma.js`, `../config/swagger.js`)
3. Internal middleware imports
4. Internal route/feature imports

**Path Aliases:**
- None configured — all imports use relative paths with `.js` extensions

**Import Style:**
- Named imports preferred: `import { Router, Response } from 'express'`
- Default imports used for packages that require it: `import express from "express"`
- Star imports used for XLSX: `import * as XLSX from "xlsx"`

## Error Handling

**Route Handler Pattern:**
All async route handlers follow a consistent try/catch structure:

```typescript
router.get('/path', async (req, res) => {
  // Validate with Zod first
  const parsed = Q.safeParse({ ...req.query });
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: 'Invalid query' });

  try {
    // Business logic
    return res.json({ ok: true, data: result });
  } catch (e: any) {
    console.error('snake_case_error_label', e);
    return res.status(500).json({ ok: false, error: 'Descriptive error message' });
  }
});
```

**Error Response Shapes:**
Two response envelope styles coexist based on the route module:

- Older/auth routes use `{ success: true/false, data: {...} }` or `{ success: false, error: '...' }`
  - Examples: `src/routes/auth.ts`, `src/routes/dashboard.ts`, `src/routes/rankings.ts`
- Newer/sales feature routes use `{ ok: true/false, ... }` with top-level data fields
  - Examples: `src/features/sales/server/online.routes.ts`, `src/features/sales/server/offline.routes.ts`

**Error Middleware:**
- `src/middleware/errorHandler.ts` — catches `AppError` (extends Error with `statusCode` and `isOperational`)
- `src/middleware/notFound.ts` — creates a 404 error and passes to `errorHandler`
- Error handler includes stack trace in development: `process.env.NODE_ENV === 'development'`
- JWT errors (JsonWebTokenError, TokenExpiredError) handled specially in the central handler

**Throwing Errors:**
- Middleware and services throw standard `Error` objects
- Route handlers `return` early with `res.status(N).json(...)` rather than throwing
- Service methods log errors with `console.error` and rethrow (e.g., `offlineSyncService.syncOfflineSales`)

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- Development debug: `console.log(...)` with emoji prefixes in some route handlers (e.g., `"🔍 Total rows fetched:"`, `"✅ Processed:"`)
- Structured JSON logs in import scripts: `console.log(JSON.stringify({ msg: 'event_label', ...fields }))` (used in `src/features/sales/server/sales.routes.ts`)
- Error logging: `console.error('snake_case_label', error)` pattern at start of catch blocks
- HTTP access logging: `morgan('combined')` middleware in `src/app.ts`
- CORS warnings: `console.warn('Blocked CORS origin: ...')` in non-production

## Comments

**When to Comment:**
- Inline comments explain non-obvious decisions (e.g., "Prevent multiple instances of Prisma Client in development")
- Section labels for middleware groups (e.g., `// Security middleware`, `// API routes`)
- Inline TODOs are absent from production source (only in generated Prisma files)

**JSDoc/Swagger:**
- All public API routes documented with `@swagger` JSDoc annotations in `src/routes/*.ts` and `src/features/sales/server/*.routes.ts`
- Swagger comments include: tags, summary, parameters, request body schema, response codes
- Internal utility functions do not use JSDoc — inline comments used instead

## Function Design

**Size:** Route handler functions are large (50–150 lines each) due to inline Zod schema definitions, query building, and post-processing logic.

**Parameters:** Route handlers receive `(req, res)` — typed with express types. Standalone service functions use typed parameter objects (e.g., `DistributionParams`).

**Return Values:**
- Async route handlers return `Promise<any>` (explicit `Promise<void>` or implicit)
- `return res.json(...)` pattern used consistently to terminate handler branches early
- Utility functions return typed values (`number`, `string | null`, `Date | null`, etc.)

## Module Design

**Exports:**
- Route files: `export default router` — default export of Express Router
- Service files: named exports for functions + a singleton instance (e.g., `export const offlineSyncService = new OfflineSyncService()`)
- Middleware files: named exports (e.g., `export const authenticateToken`, `export const errorHandler`)
- Feature index files: named `mount*` functions (e.g., `export function mountOfflineSales(app, prefix)`)

**Barrel Files:**
- Not used — each module imported directly by path

**Singleton Pattern:**
- Prisma client: singleton via `globalThis.__prisma` in `src/lib/prisma.ts`
- Sales feature Prisma client: separate `const salesPrisma = new PrismaClient()` in `src/features/sales/server/sales.routes.ts`
- Service instances: module-level `export const offlineSyncService = new OfflineSyncService()`

---

*Convention analysis: 2026-03-23*
