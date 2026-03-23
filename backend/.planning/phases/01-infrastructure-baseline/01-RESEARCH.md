# Phase 1: Infrastructure Baseline - Research

**Researched:** 2026-03-23
**Domain:** Express + Prisma 5 API infrastructure — connection pooling, compression, request timeouts, slow query logging
**Confidence:** HIGH

---

## Summary

Phase 1 installs four foundational infrastructure capabilities onto an existing Express 4 + Prisma 5.7 + PostgreSQL backend. None of the four requirements involve new business logic — they are all cross-cutting middleware and client configuration changes applied in `src/app.ts` and `src/lib/prisma.ts`.

The project currently has zero compression, no request timeout enforcement, no connection pool tuning, and no slow-query logging threshold. All four gaps can be closed with small, well-understood npm packages or built-in Prisma event APIs. The riskiest area is request timeout: `connect-timeout` emits a timeout event but cannot cancel in-flight async work (database queries keep running). The only safe pattern is to use it as a "respond early and log" mechanism, not as a true query canceller.

A secondary complexity: the project has two Prisma client instances (`src/lib/prisma.ts` for the main schema and a second `new PrismaClient()` in `src/features/sales/server/sales.routes.ts`). INFRA-01 (pool config) and INFRA-04 (slow query logging) must be applied to both, or the second client will silently operate with unconfigured defaults.

**Primary recommendation:** Apply `compression` middleware in `src/app.ts`, tune `connection_limit` and `pool_timeout` in `DATABASE_URL`, attach `prisma.$on('query', ...)` for slow-query logging, and add `connect-timeout` middleware with a `haltOnTimedout` check in route-level middleware.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | PostgreSQL connection pool configured with appropriate min/max connections for 20-200 concurrent users | Prisma 5.x `connection_limit` and `pool_timeout` URL parameters; defaults and recommended values documented below |
| INFRA-02 | All API responses compressed with gzip to reduce payload size | `compression` npm package 1.8.x; single `app.use(compression())` call in `src/app.ts` |
| INFRA-03 | Request timeout enforced on slow queries — no endpoint hangs indefinitely | `connect-timeout` npm package; must be paired with a `haltOnTimedout` check; limitations documented below |
| INFRA-04 | Slow queries logged above configurable threshold so bottlenecks are visible in logs | Prisma 5.x `$on('query', e => ...)` event API; threshold driven by env var |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| compression | ^1.8.1 | Express middleware — gzip/deflate/brotli response compression | Official Express middleware; maintained under expressjs org; single `app.use()` call |
| connect-timeout | ^1.9.0 | Sets `req.timedout` flag and emits timeout event after N ms | Official Express middleware; pairs with `haltOnTimedout` helper |

### Built-in (No New Package)
| Mechanism | Version | Purpose |
|-----------|---------|---------|
| `prisma.$on('query', e => ...)` | Prisma 5.7.x built-in | Slow query logging via Prisma event bus — no additional package |
| `connection_limit` in DATABASE_URL | Prisma 5.7.x | Connection pool max size tuning — URL query parameter |
| `pool_timeout` in DATABASE_URL | Prisma 5.7.x | How long to wait for a connection from pool before erroring |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| compression | shrink-ray-current (brotli) | shrink-ray adds brotli support but is heavier; brotli is not required by INFRA-02 |
| connect-timeout | Custom server.setTimeout() | `server.setTimeout()` closes the socket entirely; `connect-timeout` allows sending a proper 503 JSON response |
| prisma.$on | Prisma Client Extension (query extension) | Extensions cannot combine with `$on` event listeners in Prisma >=5.0 without issues (known GitHub issue #23108); stick with `$on` for v5.7 |

**Installation (new packages only):**
```bash
npm install compression connect-timeout
npm install --save-dev @types/compression @types/connect-timeout
```

---

## Architecture Patterns

### Where Changes Land

```
src/
├── app.ts                  # INFRA-02: add compression(); INFRA-03: add timeout middleware
├── lib/
│   └── prisma.ts           # INFRA-01: add connection_limit to DATABASE_URL (env)
│                           # INFRA-04: add $on('query', ...) slow-query logger
└── features/sales/server/
    └── sales.routes.ts     # INFRA-04: second PrismaClient also needs $on wiring
                            # INFRA-01: second client uses same DATABASE_URL — no extra change needed
```

All environment variables are read via `dotenv` in `src/app.ts`. New env vars belong in `env.example`.

### Pattern 1: Gzip Compression (INFRA-02)
**What:** Wrap all responses with Express `compression` middleware before any route handler.
**When to use:** Global — applied once at the top of the middleware stack in `src/app.ts`.
**Key rule:** Must come BEFORE `app.use(express.json(...))` and all route registrations to compress all response bodies.

```typescript
// Source: https://github.com/expressjs/compression
import compression from 'compression';

// In src/app.ts, after helmet() and cors(), before body parsing:
app.use(compression());
```

The middleware reads `Accept-Encoding` from the request and sets `Content-Encoding: gzip` automatically when the client supports it. No further configuration needed for INFRA-02.

### Pattern 2: Connection Pool Tuning (INFRA-01)
**What:** Append `connection_limit` and `pool_timeout` as query parameters to `DATABASE_URL`.
**When to use:** In the environment (.env / Vercel env vars). No code change to `prisma.ts` is needed — Prisma 5 reads these from the connection string automatically.

```
# .env / env.example
# connection_limit: max connections in pool (default: num_cpus*2+1, usually 3-5 on small VMs)
# pool_timeout: seconds to wait for a free connection before throwing (default: 10)
DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB?connection_limit=20&pool_timeout=30"
```

**For 20-200 concurrent users:** A `connection_limit` of 20-30 is appropriate for a single Node process on typical hosting. PostgreSQL itself can handle 100+ connections but Prisma's pool should not exceed the DB's `max_connections` minus headroom for admin tools. Expose `connection_limit` and `pool_timeout` as separate env vars so they can be tuned per environment without changing `DATABASE_URL`.

**Note on two Prisma clients:** Both clients use the same `DATABASE_URL`, so the same pool parameters apply to both. However, each client opens its own pool — combined maximum open connections = `connection_limit * 2`. Size accordingly.

### Pattern 3: Request Timeout (INFRA-03)
**What:** `connect-timeout` sets `req.timedout = true` after N ms and emits `'timeout'`. A `haltOnTimedout` helper function checks this flag and short-circuits further processing.
**Critical limitation:** The middleware cannot cancel in-flight Prisma queries. Node.js will continue executing async code until the database call resolves. The timeout only controls whether the HTTP response is sent to the client early — it does NOT stop DB work.
**When to use:** Applied globally after `compression` and `morgan`; `haltOnTimedout` must be placed after every async operation boundary.

```typescript
// Source: https://www.npmjs.com/package/connect-timeout
import timeout from 'connect-timeout';

function haltOnTimedout(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.timedout) next();
}

// In src/app.ts, after helmet and cors:
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 30000;
app.use(timeout(REQUEST_TIMEOUT_MS));
// ... other middleware ...
// After each async-capable middleware, add:
app.use(haltOnTimedout);
```

The `connect-timeout` package's `timeout()` call takes either a number (ms) or a string like `'30s'`. Expose `REQUEST_TIMEOUT_MS` as an env var so it is configurable without code changes.

### Pattern 4: Slow Query Logging (INFRA-04)
**What:** Prisma 5 exposes a `$on('query', handler)` event. The handler receives `{ query, params, duration, target }`. Duration is in milliseconds. Log queries above a configurable threshold, including the endpoint context.
**Limitation:** The event fires on the Prisma client — it has no direct access to `req.path`. The practical solution is to log the duration and query text; endpoint correlation is achieved by including the route's path in a log prefix added by morgan (already installed) or by using Prisma SQL comments.
**When to use:** Configured once in `src/lib/prisma.ts` for the main client. Must also be configured for the second client in `src/features/sales/server/sales.routes.ts`.

```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging
// In src/lib/prisma.ts

const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 500;

export const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    'error',
    'warn',
  ],
});

prisma.$on('query', (e) => {
  if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
    console.warn(
      `[SLOW QUERY] ${e.duration}ms | ${e.query} | params: ${e.params}`
    );
  }
});
```

The same pattern must be applied to the second `PrismaClient` instantiated in `src/features/sales/server/sales.routes.ts`. That client should ideally be refactored to use a shared factory, but for Phase 1 a local `$on` call is acceptable.

**Important:** In Prisma 5.7, `log` must include `{ emit: 'event', level: 'query' }` — if you only pass `'query'` as a string it logs to stdout unconditionally (noisy). The event-based approach allows threshold filtering.

**Known Prisma 5 constraint:** Combining `$on` with Client Extensions (`.client.$extends(...)`) causes `$on` to stop firing on the extended client (GitHub issue #23108). Since this codebase does not use extensions, this constraint does not apply.

### Anti-Patterns to Avoid
- **Placing `compression()` after route handlers:** Responses that have already been sent bypass the middleware; compression must come first.
- **Using `timeout()` without `haltOnTimedout`:** Without a halt check, Express continues calling subsequent middleware and sends a second response after the timeout response, causing `Cannot set headers after they are sent` errors.
- **Setting `connection_limit` to a very high number (e.g., 200):** Each connection consumes memory on the PostgreSQL server. Most managed PostgreSQL tiers (Neon, Supabase free tier) cap `max_connections` at 25-100. Exceeding this causes `P1001` / connection refused errors.
- **Logging ALL queries with `level: 'query'` as stdout:** At 20-200 RPS this floods logs. Use `emit: 'event'` with a duration threshold.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Response compression | Custom zlib Transform stream | `compression` npm package | Handles Accept-Encoding negotiation, chunked encoding, streaming responses, Content-Length stripping |
| Request timeout | `setTimeout(() => res.send(...))` in each handler | `connect-timeout` | Per-handler timers don't compose; middleware approach is centrally configurable |
| Connection pool | Manual `pg.Pool` alongside Prisma | `connection_limit` URL param | Prisma already wraps pg; a parallel pool creates double the connections and loses Prisma's type safety |
| Slow query threshold | Wrapping every `prisma.X.findMany()` in a timer | `prisma.$on('query', ...)` | Event fires for ALL queries automatically; no risk of forgetting to wrap a call |

---

## Common Pitfalls

### Pitfall 1: Compression breaks Swagger UI
**What goes wrong:** `compression()` applied before `swagger-ui-express` can sometimes cause issues with the Swagger UI static file serving if the UI sends a content-type that the middleware compresses aggressively.
**Why it happens:** `swagger-ui-express` serves pre-built static bundles; some versions send files without setting `Content-Type`, which `compression` handles incorrectly.
**How to avoid:** Monitor `/api-docs` after applying compression. If assets break, add a filter function to skip compression for `/api-docs` paths.
**Warning signs:** Swagger UI loads blank or throws JS parse errors after the change.

### Pitfall 2: Duplicate `$on` registrations create duplicate log entries
**What goes wrong:** In development with `tsx watch`, the module is re-executed on each file change. The `globalThis.__prisma` guard prevents duplicate client creation, but if `$on` is registered after the guard block, it re-registers on every reload.
**Why it happens:** `$on` does not deduplicate handlers; it appends.
**How to avoid:** Register `$on` handlers inside the same block that creates the client, not after the singleton guard.

### Pitfall 3: `pool_timeout: 0` silently hangs under load
**What goes wrong:** If `pool_timeout=0` is set (or if the default is not overridden in a serverless context), Prisma waits indefinitely for a free connection. Under concurrent load this cascades — requests pile up waiting for the pool.
**Why it happens:** The default of 10 seconds is usually fine for traditional servers, but if deploying on Vercel with many simultaneous cold starts, connections exhaust quickly.
**How to avoid:** Always set an explicit `pool_timeout` (e.g., 30). Combine with INFRA-03 timeout middleware so the HTTP response terminates even if the pool is exhausted.

### Pitfall 4: `connect-timeout` fires before body parsing completes on large uploads
**What goes wrong:** A 300MB body upload may legitimately take longer than the global timeout threshold. The timeout middleware fires and sends a 503 while the body is still being parsed.
**Why it happens:** Timeout starts counting from when the request hits the middleware stack, before body parsing is done.
**How to avoid:** For the upload/push route (`/api/offline-sales/push`), either skip the timeout middleware (use `req.setTimeout(0)` on that specific route) or raise the threshold to a much higher value for that path.
**Warning signs:** Large sync payloads start failing with 503 after adding timeout middleware.

### Pitfall 5: Two Prisma clients, only one gets configured
**What goes wrong:** `src/lib/prisma.ts` gets pool config and slow query logging, but `src/features/sales/server/sales.routes.ts` creates a second `new PrismaClient()` in module scope without the same configuration. Half the queries run unconfigured.
**Why it happens:** The second client was noted in CONCERNS.md as a fragile area. It is easy to overlook.
**How to avoid:** Apply the same `log: [{ emit: 'event', level: 'query' }]` config and `$on` handler to the sales client in `sales.routes.ts`. Optionally extract a shared `createConfiguredPrismaClient()` factory.

---

## Code Examples

### INFRA-02: Compression in app.ts
```typescript
// Source: https://github.com/expressjs/compression (v1.8.1)
import compression from 'compression';

// Place immediately after helmet() and cors(), before body parsing:
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression()); // <-- add here
app.use(morgan('combined'));
app.use(express.json({ limit: '300mb' }));
```

### INFRA-01: Pool parameters in .env
```bash
# env.example additions
DATABASE_URL="postgresql://USER:PASS@HOST:5432/DB?connection_limit=20&pool_timeout=30"
# Alternatively, keep the base URL clean and append via separate vars:
DB_CONNECTION_LIMIT=20
DB_POOL_TIMEOUT=30
# Then construct in prisma.ts or pass directly in DATABASE_URL on deploy
```

### INFRA-03: Timeout middleware in app.ts
```typescript
// Source: https://www.npmjs.com/package/connect-timeout
import timeout from 'connect-timeout';
import type { Request, Response, NextFunction } from 'express';

function haltOnTimedout(req: Request, res: Response, next: NextFunction): void {
  if (!req.timedout) next();
}

const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 30_000;

app.use(timeout(REQUEST_TIMEOUT_MS));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ extended: true, limit: '300mb' }));
app.use(haltOnTimedout);

// After routes:
app.use(haltOnTimedout);
app.use(errorHandler);
```

### INFRA-04: Slow query logging in prisma.ts
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging
import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 500;

const createPrisma = () => {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      'error',
      'warn',
    ],
  });
  client.$on('query', (e) => {
    if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[SLOW QUERY] ${e.duration}ms | ${e.query} | params: ${e.params}`);
    }
  });
  return client;
};

export const prisma = globalThis.__prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma `$use` middleware for query interception | `prisma.$on('query', ...)` event + Client Extensions | Prisma v4.16 deprecated `$use`; removed in v6.14 | Project is on v5.7 — `$use` still works but `$on` is the forward-compatible pattern |
| `connection_limit` URL parameter | Driver adapter `max` config (for Prisma v7+) | Prisma v7 | Project is on v5.7 — URL parameter approach is correct |
| `compression` v1.7.x (no brotli) | `compression` v1.8.x (brotli added in 1.8.0) | 2024 | Brotli support available; not required by INFRA-02 but available for free |

**Deprecated/outdated:**
- `prisma.$use()` middleware: Deprecated in Prisma 4.16, removed in 6.14. Use `$on` or Client Extensions instead. Not an issue for v5.7 but avoid introducing new `$use` calls.

---

## Open Questions

1. **Vercel serverless deployment and connection pooling**
   - What we know: The app deploys to Vercel where each invocation may spin up a new Node process, creating a new PrismaClient with a fresh pool. Multiple concurrent invocations = multiple pools simultaneously.
   - What's unclear: Whether the existing `DATABASE_URL` points to a provider (Neon, Supabase) that has its own PgBouncer/connection pooler, which would change the optimal `connection_limit` (should be much lower — 1-2 per serverless function).
   - Recommendation: Document that `connection_limit` should be set to 1-3 if using a managed PostgreSQL provider with built-in pooling (Neon's "pooled" connection string, Supabase's pooler). Set to 10-20 if connecting directly. The planner should expose this as a configurable env var with a comment in `env.example`.

2. **Body parser limit vs. timeout interaction**
   - What we know: `/api/offline-sales/push` accepts up to 300MB bodies. A 30s global timeout will fire during large uploads.
   - What's unclear: The actual size of typical push payloads from Google Apps Script.
   - Recommendation: The planner should add an explicit route-level timeout bypass or very high timeout for the push route. This is a known interaction — not a blocker, but must be addressed in the plan.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed — `package.json` has no test runner |
| Config file | None — see Wave 0 |
| Quick run command | `npm test` (after vitest install) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | PrismaClient constructed with `log: [{ emit: 'event', ... }]` config | unit | `npx vitest run tests/lib/prisma.test.ts` | Wave 0 |
| INFRA-02 | HTTP responses include `Content-Encoding: gzip` header | integration/smoke | `npx vitest run tests/integration/compression.test.ts` | Wave 0 |
| INFRA-03 | Slow-simulated endpoint returns 503 within timeout threshold | integration | `npx vitest run tests/integration/timeout.test.ts` | Wave 0 |
| INFRA-04 | `$on('query', ...)` handler fires and logs when query exceeds threshold | unit | `npx vitest run tests/lib/slowQueryLogger.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run` (all unit tests)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/prisma.test.ts` — covers INFRA-01 and INFRA-04 (client config and slow query event)
- [ ] `tests/integration/compression.test.ts` — covers INFRA-02 (Content-Encoding header)
- [ ] `tests/integration/timeout.test.ts` — covers INFRA-03 (503 on hung route)
- [ ] `vitest.config.ts` — vitest configuration for ESM project
- [ ] `tests/helpers/testApp.ts` — shared Express app fixture for integration tests
- [ ] Framework install: `npm install --save-dev vitest @vitest/coverage-v8 supertest @types/supertest`

---

## Sources

### Primary (HIGH confidence)
- [Prisma ORM Connection Pool docs (v5/v6)](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool) — `connection_limit`, `pool_timeout` URL params, defaults
- [Prisma Logging docs](https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging) — `$on('query', ...)` event API, `emit: 'event'` pattern
- [expressjs/compression GitHub](https://github.com/expressjs/compression) — usage, version 1.8.1, brotli support
- [connect-timeout npm](https://www.npmjs.com/package/connect-timeout) — API, `haltOnTimedout` pattern, limitations

### Secondary (MEDIUM confidence)
- [PostgreSQL database connector | Prisma docs (v6)](https://www.prisma.io/docs/v6/orm/overview/databases/postgresql) — confirms `connection_limit` and `pool_timeout` parameters for pre-v7 Prisma
- [Prisma GitHub Discussion #23108](https://github.com/prisma/prisma/issues/23108) — `$on` + Client Extensions incompatibility in Prisma >=5.0

### Tertiary (LOW confidence — needs project-specific validation)
- Vercel + Prisma serverless pooling best practices: whether the project's PostgreSQL provider has a built-in pooler affects the correct `connection_limit` value. Validate by checking the `DATABASE_URL` format used in production.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages are official Express middleware or Prisma built-in APIs; versions verified
- Architecture: HIGH — changes are isolated to `src/app.ts` and `src/lib/prisma.ts`; patterns sourced from official docs
- Pitfalls: HIGH — two-client concern documented in CONCERNS.md; timeout/body-parser interaction is a known Express pattern issue
- Validation architecture: MEDIUM — vitest is the correct choice for ESM + Node 20 but no test files exist yet; Wave 0 must create them

**Research date:** 2026-03-23
**Valid until:** 2026-09-23 (stable ecosystem; Prisma v5 → v7 migration would invalidate pool config section)
