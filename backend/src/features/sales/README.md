# Sales Feature (Excel Import + API + UI)

This feature adds a robust Excel import for sales, isolated Prisma schema/client, production‑ready Express endpoints, and a React dashboard (charts + virtualized table).

Paths:
- Prisma schema: `backend/src/features/sales/prisma/schema.prisma`
- Import script: `backend/src/features/sales/scripts/import-excel.ts`
- Verify script: `backend/src/features/sales/scripts/verify-import.ts`
- Express routes: `backend/src/features/sales/server/sales.routes.ts`
- Router entry: `backend/src/features/sales/server/index.ts`
- React UI: `frontend/src/features/sales/client/`

Data file expected at: `./data/RKP offline Sales.xlsx` (repo root `data/`).

## Migrations & Client (isolated)

This feature uses its own Prisma schema and generated client output to avoid changing the existing backend Prisma setup.

Commands:

- Set `DATABASE_URL` in `backend/.env` (PostgreSQL)
- Generate client: `npx prisma generate --schema backend/src/features/sales/prisma/schema.prisma`
- Create migrations: `npx prisma migrate dev --schema backend/src/features/sales/prisma/schema.prisma --name sales_init`

This creates the `Sale` table with indexes and a unique `rowHash` to ensure idempotent imports.

## Importing the Excel workbook

Place your Excel file at `data/RKP offline Sales.xlsx`.

Run import (Node >= 18):

- `npx tsx backend/src/features/sales/scripts/import-excel.ts`
- Optional args: `--file "./data/Your.xlsx" --chunk 500`

Observability:
- Logs per chunk and final summary (JSON-friendly lines)
- On errors, writes `./data/import-errors-<timestamp>.json`

Example output:
```
{"msg":"sales_import_chunk_ok","sheet":"Offline","from":0,"to":500,"inserted":498}
{"msg":"sales_import_done","totalRows":2345,"inserted":2201,"errors":4,"tookMs":5421}
```

Quick verify:
- `npx tsx backend/src/features/sales/scripts/verify-import.ts`

## Mounting the API

The router is provided but not auto‑mounted to avoid changing existing files.

Add in `backend/src/app.ts`:

```ts
import { mountSales } from './features/sales/server/index.js';
// ... after other routes
mountSales(app, '/api/sales');
```

Endpoints:
- `POST /api/sales/import` — run server‑side import from `./data/RKP offline Sales.xlsx`
- `GET /api/sales?limit=200&cursorId=<id>` — cursor pagination by id desc
- `GET /api/sales/summary?days=90&source=...` — sums by source, paymentMode, time‑series (last N days), top items
- `GET /api/sales/counts` — total count and total amount

Responses have the shape `{ ok: boolean, ... }`. All errors are sanitized; stack traces are logged server-side only.

### cURL examples

- Import:
```
curl -X POST http://localhost:3000/api/sales/import
```
- List (page):
```
curl "http://localhost:3000/api/sales?limit=200"
```
- Summary (90 days, all sources):
```
curl "http://localhost:3000/api/sales/summary?days=90"
```
- Counts:
```
curl "http://localhost:3000/api/sales/counts"
```

Example list response:
```
{
  "ok": true,
  "items": [ { "id": "123", "source": "Offline", "title": "Book" } ],
  "nextCursorId": "101"
}
```

## Frontend UI

React components under `frontend/src/features/sales/client/`:
- `SalesDashboard.tsx` — 2x2 grid charts + virtualized table; Import button
- `UploadCsv.tsx` — triggers server import and shows result
- `VirtualTable.tsx` — react‑window table with cursor‑based infinite scroll

To add a route (example):

```ts
// in frontend/src/routes/AppRoutes.tsx
import SalesDashboard from '../features/sales/client/SalesDashboard';
// ...
Route path="/sales" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
```

Start frontend:
- `npm run dev` in `frontend/`
- Open `/sales`

## Column mapping

- customerName ⇐ Customer Name | Customer | Name
- mobile ⇐ Mobile | Phone | Contact
- paymentMode ⇐ Payment Mode | Mode
- amount ⇐ Amount | Rate | Total (Decimal 12,2)
- date ⇐ Date (Excel date or parseable string)
- isbn, title, author, publisher, qty, rate kept if present
- rawJson preserved for each row

## Idempotency

- Deterministic `rowHash = sha256(canonical(source|orderNo|isbn|date|amount|customerName))`
- Unique index on `rowHash`
- Import uses `createMany({ skipDuplicates: true })`

## Notes

- Set `IMPORT_CHUNK_SIZE` to tune chunking.
- APIs convert `BigInt` ids to strings for JSON safety.
- Aggregations convert Prisma Decimal to numbers via `.toString()`.
- Time series computed in app layer for last N days to avoid raw SQL.

