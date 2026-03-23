# Testing Patterns

**Analysis Date:** 2026-03-23

## Test Framework

**Runner:**
- None configured. No jest, vitest, mocha, or any other test runner is installed or configured.
- `package.json` has no `test` script.
- `tsconfig.json` explicitly excludes `**/*.test.ts` and `**/*.spec.ts` from compilation.

**Assertion Library:**
- None installed.

**Run Commands:**
```bash
# No test commands available in package.json
# tsconfig.json excludes test files from build:
#   "exclude": ["**/*.test.ts", "**/*.spec.ts"]
```

## Test File Organization

**Location:**
- No test files exist anywhere in the codebase (`src/`, `api/`, or project root).
- The `tsconfig.json` exclusion of `*.test.ts` and `*.spec.ts` indicates tests were anticipated but never written.

**Naming:**
- No convention established — no test files present.

**Structure:**
```
(No test directories or files exist)
```

## Test Structure

**Suite Organization:**
- Not applicable — no tests exist.

**Patterns:**
- Not applicable.

## Mocking

**Framework:**
- None installed.

**Patterns:**
- Not applicable. However, `src/app.ts` contains an environment guard that skips the background sync in test environments:

```typescript
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    offlineSyncService.syncOfflineSales().catch(err => console.error("Auto-sync failed:", err));
  }, 5000);
}
```

This indicates the code was designed to be testable but no tests were written.

**What to Mock (when tests are added):**
- `prisma` client — all routes depend on `src/lib/prisma.ts` singleton; mock with `jest.mock('../lib/prisma.js')` or use prisma's mock library
- `offlineSyncService` — background sync service imported in `src/app.ts`
- External fetch calls in `src/features/sales/server/offlineSyncService.ts` (ERP URL fetch)
- `metricoolRequest` in `src/config/metricool.ts` (Metricool API calls)
- `jwt.verify` / `jwt.sign` in auth middleware and routes
- `bcrypt.compare` / `bcrypt.hash` in `src/routes/auth.ts`

## Fixtures and Factories

**Test Data:**
- No test fixtures or factories exist.
- `src/routes/dashboard.ts` and `src/routes/rankings.ts` contain hardcoded mock data objects at module level (not intended as test fixtures — they serve as placeholder data for stub endpoints):

```typescript
// src/routes/dashboard.ts — hardcoded placeholder, not a test fixture
const dashboardStats = { totalSales: 24320, orders: 1284, ... };
const recentOrders = [{ id: '1', customer: 'John Doe', ... }];
```

**Location:**
- No fixture directory exists.

## Coverage

**Requirements:** None enforced — no coverage tooling configured.

**View Coverage:**
```bash
# Not available — no test runner configured
```

## Test Types

**Unit Tests:**
- Not present. Key candidates when added:
  - Utility functions in `src/features/sales/server/offline.routes.ts`: `decToNumber`, `round2`, `numSafe`, `normalizeText`, `resolveRowDate`, `pick`, `monthNameToIndex`
  - Utility functions in `src/features/sales/server/online.routes.ts`: same set plus `parseIsoInRow`
  - `OfflineSyncService.processData()` in `src/features/sales/server/offlineSyncService.ts`
  - `canonicalKey()` and `mapRow()` in `src/features/sales/server/sales.routes.ts`
  - Auth middleware `authenticateToken` and `requireRole` in `src/middleware/auth.ts` and `src/middleware/authPrisma.ts`
  - `ensureAdminExists()` in `src/lib/bootstrap.ts`

**Integration Tests:**
- Not present. Key candidates when added:
  - Auth routes: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
  - Offline sales routes: `GET /api/offline-sales`, `GET /api/offline-sales/summary`, `POST /api/offline-sales/push`
  - Online sales routes: `GET /api/online-sales`, `GET /api/online-sales/summary`
  - Supertest + a test Prisma database would be the natural approach

**E2E Tests:**
- Not used. No E2E framework configured.

## Common Patterns

**Async Testing:**
```typescript
// Recommended pattern when tests are added (Jest/Vitest style)
it('should return 400 for invalid query', async () => {
  const res = await request(app).get('/api/offline-sales?limit=abc');
  expect(res.status).toBe(400);
  expect(res.body.ok).toBe(false);
});
```

**Error Testing:**
```typescript
// Recommended pattern for testing error handling
it('should return 401 without auth token', async () => {
  const res = await request(app).get('/api/dashboard/overview');
  expect(res.status).toBe(401);
  expect(res.body.success).toBe(false);
});
```

## Recommended Setup (When Adding Tests)

The codebase is structured for testability (NODE_ENV guard in `src/app.ts`, Zod validation, service classes) but has zero test coverage. The recommended approach when adding tests:

1. Install `vitest` or `jest` + `@types/jest` + `supertest` + `@types/supertest`
2. Add a `test` script to `package.json`: `"test": "vitest run"` or `"test": "jest"`
3. Remove the `**/*.test.ts` exclusion from `tsconfig.json` (or create a separate `tsconfig.test.json`)
4. Place test files co-located with source files as `*.test.ts`
5. Use `prisma-mock` or `jest.mock` for database isolation
6. Set `NODE_ENV=test` in test environment to skip background sync

---

*Testing analysis: 2026-03-23*
