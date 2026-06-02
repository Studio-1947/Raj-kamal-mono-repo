# Regional Offline Sales Sync Documentation

This document outlines the system for synchronizing offline, online, and event sales data from Google Sheets into dedicated regional database tables.

## 📊 Regional & Event Tables
Each data source has its own dedicated table to prevent data conflicts, guarantee isolation, and allow for clean independent reporting:

| Region / Source | Database Model | Table Name | Google Sheet tab |
| :--- | :--- | :--- | :--- |
| **General/Delhi** | `GoogleSheetOfflineSale` | `google_sheet_offline_sales` | `"Offline"` |
| **Mumbai** | `MumbaiOfflineSale` | `mumbai_offline_sales` | `"Mumbai"` (GID: 696866974) |
| **Patna** | `PatnaOfflineSale` | `patna_offline_sales` | `"Patna"` (GID: 1521335023) |
| **Online** | `OnlineOfflineSale` | `online_offline_sales` | `"Online"` (GID: 541252527) |
| **BookFair** | `BookFairOfflineSale` | `bookfair_offline_sales` | `"BookFair"` (GID: 750818183) |
| **Lokbharti** | `LokbhartiOfflineSale` | `lokbharti_offline_sales` | `"Lokbharti"` (GID: 428885829) |

---

## 🚀 CLI Commands
You can manually trigger a synchronization for any region at any time using the following `npm` commands from the `backend` directory:

```bash
# 1. Delhi/General Sync
npm run sync:delhi

# 2. Mumbai Sync
npm run sync:mumbai

# 3. Patna Sync
npm run sync:patna

# 4. Online Sync
npm run sync:online

# 5. BookFair Sync
npm run sync:bookfair

# 6. Lokbharti Sync
npm run sync:lokbharti
```

---

## 🌐 API Endpoints
Each source exposes a comprehensive REST API suite for the frontend to list, search, aggregate, and manually trigger syncs:

### 1. General/Delhi Sales
- **List/Search**: `GET /api/offline-sales`
- **Summary/Analytics**: `GET /api/offline-sales/summary`
- **Trigger Sync**: `GET /api/offline-sales/google-sheets`

### 2. Mumbai Sales
- **List/Search**: `GET /api/mumbai-offline-sales`
- **Summary/Analytics**: `GET /api/mumbai-offline-sales/summary`
- **Trigger Sync**: `GET /api/mumbai-offline-sales/sync`

### 3. Patna Sales
- **List/Search**: `GET /api/patna-offline-sales`
- **Summary/Analytics**: `GET /api/patna-offline-sales/summary`
- **Trigger Sync**: `GET /api/patna-offline-sales/sync`

### 4. Online Offline Sales
- **List/Search**: `GET /api/online-offline-sales`
- **Summary/Analytics**: `GET /api/online-offline-sales/summary`
- **Trigger Sync**: `GET /api/online-offline-sales/sync`

### 5. BookFair Sales
- **List/Search**: `GET /api/bookfair-offline-sales`
- **Summary/Analytics**: `GET /api/bookfair-offline-sales/summary`
- **Trigger Sync**: `GET /api/bookfair-offline-sales/sync`

### 6. Lokbharti Sales
- **List/Search**: `GET /api/lokbharti-offline-sales`
- **Summary/Analytics**: `GET /api/lokbharti-offline-sales/summary`
- **Trigger Sync**: `GET /api/lokbharti-offline-sales/sync`

---

## 🔄 Automatic Background Sync
The backend automatically executes background sync for **all six sources** 5 seconds after server startup:
- Wipes the target database tables to prevent duplicates.
- Pulls fresh data from each respective tab in the Google Sheet.
- Efficiently processes, cleans, and indexes the records.

---

## 🛠️ Internal Structure
- **Service**: `src/features/sales/server/offlineSyncService.ts` (Contains core logic for fetching and parsing Sheets).
- **Routes**:
    - `src/features/sales/server/offline.routes.ts`
    - `src/features/sales/server/mumbai-offline.routes.ts`
    - `src/features/sales/server/patna-offline.routes.ts`
    - `src/features/sales/server/online-offline.routes.ts`
    - `src/features/sales/server/bookfair-offline.routes.ts`
    - `src/features/sales/server/lokbharti-offline.routes.ts`
- **Scripts**: 
    - `scripts/sync-delhi.ts`
    - `scripts/sync-mumbai.ts`
    - `scripts/sync-patna.ts`
    - `scripts/sync-online.ts`
    - `scripts/sync-bookfair.ts`
    - `scripts/sync-lokbharti.ts`
