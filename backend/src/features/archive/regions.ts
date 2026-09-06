// ─────────────────────────────────────────────────────────────────────────────
// regions.ts
//
// Single registry of the six Google-Sheet-backed regions: the Prisma model each one
// syncs into, its physical table name, and the export URL it pulls from.
//
// offlineSyncService.ts holds the same URLs inline (one method per region). This
// registry exists so the archive and restore paths can address a region by NAME —
// a CLI flag, an API query param — without importing the sync service and creating
// a cycle. Keep the URLs in step if a gid ever changes.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "../../lib/prisma.js";

export type RegionName = "delhi" | "mumbai" | "patna" | "online" | "bookfair" | "lokbharti";

export interface RegionSpec {
  region: RegionName;
  /** Physical Postgres table, used by snapshot/restore SQL. */
  table: string;
  /** Prisma delegate for the region's live table. */
  model: () => any;
  /** CSV export URL for the region's tab. */
  url: string;
}

const SHEET_ID = "1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw";
const exportUrl = (gid?: string) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv${gid ? `&gid=${gid}` : ""}`;

export const REGIONS: Record<RegionName, RegionSpec> = {
  delhi: {
    region: "delhi",
    table: "google_sheet_offline_sales",
    model: () => prisma.googleSheetOfflineSale,
    url: exportUrl(),
  },
  mumbai: {
    region: "mumbai",
    table: "mumbai_offline_sales",
    model: () => prisma.mumbaiOfflineSale,
    url: exportUrl("696866974"),
  },
  patna: {
    region: "patna",
    table: "patna_offline_sales",
    model: () => prisma.patnaOfflineSale,
    url: exportUrl("1521335023"),
  },
  online: {
    region: "online",
    table: "online_offline_sales",
    model: () => prisma.onlineOfflineSale,
    url: exportUrl("541252527"),
  },
  bookfair: {
    region: "bookfair",
    table: "bookfair_offline_sales",
    model: () => prisma.bookFairOfflineSale,
    url: exportUrl("750818183"),
  },
  lokbharti: {
    region: "lokbharti",
    table: "lokbharti_offline_sales",
    model: () => prisma.lokbhartiOfflineSale,
    url: exportUrl("428885829"),
  },
};

export const REGION_NAMES = Object.keys(REGIONS) as RegionName[];

export function isRegionName(v: string): v is RegionName {
  return Object.prototype.hasOwnProperty.call(REGIONS, v);
}

/** Resolves a region name, throwing a helpful error for CLI/API callers. */
export function requireRegion(v: string): RegionSpec {
  const key = String(v || "").trim().toLowerCase();
  if (!isRegionName(key)) {
    throw new Error(`Unknown region "${v}". Expected one of: ${REGION_NAMES.join(", ")}`);
  }
  return REGIONS[key];
}

/** Maps a Prisma model delegate back to its region, for call sites that only have the model. */
export function regionForModel(model: any): RegionSpec | null {
  for (const spec of Object.values(REGIONS)) {
    try {
      if (spec.model() === model) return spec;
    } catch {
      /* model getter unavailable — skip */
    }
  }
  return null;
}
