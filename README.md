# Raj‑Kamal Dashboard — Product Requirements Document (PRD)

This PRD describes the product goals, architecture, APIs, data models, configuration, security, deployment, and acceptance criteria for the Raj‑Kamal Dashboard monorepo.

## Overview

- Monorepo with a React frontend and an Express/Prisma backend.
- Purpose: Admin‑only dashboard for sales, inventory, and rankings insights.
- Scope now: Secure auth, protected routes, mock data responses for analytics; real data wiring enabled by Prisma schema.

## Goals

- Deliver a branded, responsive dashboard with protected routes.
- Provide authenticated APIs for dashboard stats, inventory browsing, and rankings.
- Establish foundational data models (Prisma + PostgreSQL) for future real data integration.
- Keep security, performance, and deployment simple and scalable.

## Users & Roles

- Admin: Single administrative account with full access to all features.
- Other roles (USER, MODERATOR) exist in schema for future expansion; current login is restricted to ADMIN.

## Tech Stack

- Frontend
  - React 18, TypeScript, Vite
  - React Router v6, Redux Toolkit, React Query
  - Axios, TailwindCSS
  - Env: `VITE_API_URL`, `VITE_APP_*` (see `frontend/.env`)
  - Build/Deploy: Netlify (see `frontend/netlify.toml`)

- Backend
  - Node 20, Express 4, TypeScript
  - Prisma ORM + PostgreSQL
  - JWT auth (`jsonwebtoken`), password hashing (`bcryptjs`)
  - Input validation (`zod`)
  - Security: `helmet`, CORS, `express-rate-limit`, `morgan`
  - Deploy: Vercel serverless (see `backend/vercel.json`, entry `backend/src/api.ts`)
  - Env: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`/`CORS_ORIGINS`, `ADMIN_*` (see `backend/env.example`)

## Architecture

- Monorepo layout
  - Frontend SPA under `frontend/` consumes `/api/*` endpoints via Axios.
  - Backend Express app under `backend/src/` mounts routes under `/api`.

- Auth flow
  - If no admin exists, one‑time registration allowed; otherwise login only.
  - Frontend stores JWT in `localStorage` and hydrates session with `/auth/me` on load.
  - Protected routes require `Authorization: Bearer <token>`.

- Data
  - Prisma schema (PostgreSQL) models Users, Products, Orders, etc. (see `backend/prisma/schema.prisma`).
  - Current non‑auth routes return mock data; schema enables future DB wiring.

## Backend

- App setup: `backend/src/app.ts`
  - Security: `helmet`, CORS with allowlist from `CORS_ORIGINS` or `FRONTEND_URL`.
  - Rate limiting: 100 requests / 15 minutes per IP.
  - Logging: `morgan` combined.
  - Health: `GET /health`. Status page: `GET /`.
  - Routes: `/api/auth`, `/api/dashboard`, `/api/inventory`, `/api/rankings`.
  - Errors: `notFound`, `errorHandler` middleware.

- Server/Serverless
  - Local dev server: `backend/src/index.ts`.
  - Vercel serverless entry: `backend/src/api.ts` (exports the Express app).

- Auth middleware: `backend/src/middleware/authPrisma.ts`
  - Verifies JWT with `JWT_SECRET`, loads user from DB, injects `req.user`.
  - Role guard helper also available in `backend/src/middleware/auth.ts`.

- Prisma client: `backend/src/lib/prisma.ts`
  - Single instance, verbose logging in dev, graceful shutdown.

- Bootstrap admin: `backend/src/lib/bootstrap.ts`
  - `ensureAdminExists()` creates/promotes an admin from `ADMIN_*` envs if none exists. Call during startup when bootstrapping environments.

### API Summary (all JSON; protected endpoints require Bearer token)

- Base: `/api`

- Auth (`backend/src/routes/auth.ts`)
  - POST `/auth/register` — Only if no ADMIN exists; creates ADMIN.
    - Body: `{ email, password, name }`
    - 201: `{ success, data: { user, token } }`
  - POST `/auth/login` — ADMIN login.
    - Body: `{ email, password }`
    - 200: `{ success, data: { user, token } }`
  - GET `/auth/me` — Current user.
    - 200: `{ success, data: { user } }`
  - POST `/auth/logout` — Stateles; client clears token.
  - GET `/auth/admin-status` — `{ success, data: { hasAdmin, count } }` (public)

- Dashboard (`backend/src/routes/dashboard.ts`) [mock]
  - GET `/dashboard/overview` — stats, recent orders, chart
  - GET `/dashboard/sales` — totals + growth + chart
  - GET `/dashboard/orders` — totals + growth + recent
  - GET `/dashboard/customers` — totals + growth

- Inventory (`backend/src/routes/inventory.ts`) [mock]
  - GET `/inventory/items?category&status&search`
  - GET `/inventory/items/:id`
  - GET `/inventory/categories`
  - GET `/inventory/summary`

- Rankings (`backend/src/routes/rankings.ts`) [mock]
  - GET `/rankings/products?limit&sortBy=sales|revenue`
  - GET `/rankings/customers?limit&sortBy=totalOrders|totalSpent`
  - GET `/rankings/categories`
  - GET `/rankings/summary`

### Sample Requests

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@example.com", "password": "ChangeMe_123!" }
```

```json
// 200 OK
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "admin@example.com", "name": "Administrator", "role": "ADMIN" },
    "token": "<jwt>"
  }
}
```

```http
GET /api/inventory/summary
Authorization: Bearer <jwt>
```

```json
{
  "success": true,
  "data": {
    "totalItems": 4,
    "totalValue": 12345.67,
    "lowStockItems": 1,
    "outOfStockItems": 1,
    "inStockItems": 2
  }
}
```

## Data Model (Prisma)

Defined in `backend/prisma/schema.prisma`:

- User: id, email (unique), password, name, role (USER|ADMIN|MODERATOR), timestamps; relations: orders, reviews.
- Product: id, name, sku (unique), description, category, price, cost, quantity, status, imageUrl, timestamps; relations: orderItems, reviews.
- Order: id, orderNumber (unique), userId, status, totalAmount, addresses, notes, timestamps; relations: user, orderItems.
- OrderItem: id, orderId, productId, quantity, price; relations: order, product.
- Review: id, userId, productId, rating, comment, timestamps; unique [userId, productId].
- Category: id, name (unique), description, timestamps.

## Frontend

- Bootstrapping: `frontend/src/main.tsx`
  - Providers: Redux, React Query (Devtools), AuthContext, LangContext, Router.

- Routing: `frontend/src/routes/AppRoutes.tsx`
  - Public: `/login`
  - Protected: `/`, `/dashboard`, `/inventory`, `/rankings`, `/social`, `/settings`, `/language`
  - Not found: `/404`

- API client: `frontend/src/lib/apiClient.ts`
  - Base URL from `VITE_API_URL` (normalized) or default `https://raj-kamal-mono-repo.vercel.app/api`.
  - Injects `Authorization` header from Redux state; redirects to `/login` on 401.

- Auth Context: `frontend/src/modules/auth/AuthContext.tsx`
  - Hydrates token from localStorage; fetches `/auth/me`; clears invalid tokens.
  - Exposes `login(token)` and `logout()`.

- i18n: `frontend/src/modules/lang/LangContext.tsx`
  - English/Hindi labels; `t(key)` helper; persists selection.

## Configuration

- Frontend envs (see `frontend/.env` and examples)
  - `VITE_API_URL` — API base (e.g., `http://localhost:4000/api` for dev; production URL for deployments)
  - `VITE_APP_NAME`, `VITE_APP_VERSION`, `VITE_DEV_MODE`

- Backend envs (see `backend/env.example`)
  - `DATABASE_URL` — PostgreSQL connection string
  - `JWT_SECRET` — Strong secret for JWT signing
  - `FRONTEND_URL` or `CORS_ORIGINS` — Allowed origins (comma‑separated support)
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — Bootstrap admin
  - Optional rate limit/logging vars

## Security & NFRs

- Security
  - HTTPS in production (platform provided).
  - JWTs (7d expiry default), `helmet`, strict CORS, rate limiting, zod validation for auth.

- Performance
  - Vite build, Tailwind JIT, React Query caching with tuned `staleTime`.

- Reliability
  - Health probe `/health`; Prisma graceful shutdown; consistent `{ success, data|error }` responses.

- Observability
  - `morgan` combined logs; central error handler.

- UX
  - Responsive UI, accessible forms and feedback on login; sidebar with active states; bilingual labels.

## Deployment

- Frontend (Netlify): `frontend/netlify.toml`
  - Base `frontend`, `npm run build`, publish `dist`, SPA redirect to `index.html`.

- Backend (Vercel): `backend/vercel.json`
  - Build `@vercel/node` from `src/api.ts`; all routes to `src/api.ts`.
  - `vercel-build` runs `prisma generate && tsc`.

## Acceptance Criteria

- Admin can register only if no admin exists; otherwise cannot register.
- Admin can login and access all protected views.
- Frontend persists token and rehydrates session via `/auth/me` on refresh.
- CORS restricts to configured origins; requests from others are blocked.
- `/health` returns 200 with environment and uptime.
- Frontend builds on Netlify; backend deploys on Vercel; FE ↔ BE communication works using configured `VITE_API_URL`.

## Roadmap / Next Steps

- Replace mock dashboard/inventory/rankings with Prisma queries.
- Invoke `ensureAdminExists()` during startup for zero‑touch bootstrapping.
- Consider refresh tokens/rotation and revocation lists for higher security.
- Centralize API response types between FE/BE.
- Optional: Add E2E smoke tests for auth and key routes.

