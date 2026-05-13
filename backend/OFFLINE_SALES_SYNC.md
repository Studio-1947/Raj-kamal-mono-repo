# Regional Offline Sales Sync Documentation

This document outlines the system for synchronizing offline sales data from Google Sheets into the regional database tables.

## 📊 Regional Tables
Each region has its own dedicated table to prevent data conflicts and allow for independent reporting:

| Region | Database Model | Table Name |
| :--- | :--- | :--- |
| **General/Delhi** | `GoogleSheetOfflineSale` | `google_sheet_offline_sales` |
| **Mumbai** | `MumbaiOfflineSale` | `mumbai_offline_sales` |
| **Patna** | `PatnaOfflineSale` | `patna_offline_sales` |

---

## 🚀 CLI Commands
You can manually trigger a synchronization for any region using the following `npm` commands from the `backend` directory:

### 1. Mumbai Sync
Triggers sync from the Mumbai Google Sheet (GID: 696866974).
```bash
npm run sync:mumbai
```

### 2. Patna Sync
Triggers sync from the Patna Google Sheet (GID: 1521335023).
```bash
npm run sync:patna
```

### 3. General/Delhi Sync
Triggers sync from the default ERP URL.
```bash
# This is currently triggered internally or via the /api/offline-sales/google-sheets endpoint
```

---

## 🌐 API Endpoints
Each region has its own set of REST API endpoints for the frontend to consume.

### Mumbai Sales
- **List/Search**: `GET /api/mumbai-offline-sales`
- **Summary/Analytics**: `GET /api/mumbai-offline-sales/summary`
- **Trigger Sync**: `GET /api/mumbai-offline-sales/sync`

### Patna Sales
- **List/Search**: `GET /api/patna-offline-sales`
- **Summary/Analytics**: `GET /api/patna-offline-sales/summary`
- **Trigger Sync**: `GET /api/patna-offline-sales/sync`

### General Offline Sales
- **List/Search**: `GET /api/offline-sales`
- **Summary/Analytics**: `GET /api/offline-sales/summary`
- **Trigger Sync**: `GET /api/offline-sales/google-sheets`

---

## 🔄 Automatic Background Sync
The system is configured to automatically perform a background sync for **all regions** every time the backend server starts. 
- The sync begins 5 seconds after startup to ensure all services are ready.
- It uses the `OfflineSyncService` to fetch, deduplicate (using `rowHash`), and ingest data.

---

## 🛠️ Internal Structure
- **Service**: `src/features/sales/server/offlineSyncService.ts` (Contains core logic for fetching and parsing Sheets).
- **Routes**:
    - `src/features/sales/server/mumbai-offline.routes.ts`
    - `src/features/sales/server/patna-offline.routes.ts`
    - `src/features/sales/server/offline.routes.ts`
- **Scripts**: 
    - `scripts/sync-mumbai.ts`
    - `scripts/sync-patna.ts`
