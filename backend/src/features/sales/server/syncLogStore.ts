// ─────────────────────────────────────────────────────────────────────────────
// syncLogStore.ts
//
// Persistent audit trail of sync runs in the `sync_logs` table.
//
// The table is created idempotently at runtime (CREATE TABLE IF NOT EXISTS) rather
// than via a Prisma migration — the prod migration history currently has a dangling
// failed entry that blocks `prisma migrate deploy`, so a self-creating table ships
// this without touching that. The Prisma model (SyncLog) still exists in schema.prisma
// purely so the client is typed. If/when the migration history is repaired, replace
// this bootstrap with a normal migration.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "../../../lib/prisma.js";
import type { LastSyncStatus } from "./syncScheduler.js";

let tableReady: Promise<void> | null = null;

/** Idempotently ensures the sync_logs table + index exist. Memoized per process. */
export function ensureSyncLogTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "sync_logs" (
          "id" SERIAL PRIMARY KEY,
          "trigger" TEXT NOT NULL DEFAULT 'scheduled',
          "startedAt" TIMESTAMP(3) NOT NULL,
          "finishedAt" TIMESTAMP(3) NOT NULL,
          "durationMs" INTEGER NOT NULL,
          "ok" BOOLEAN NOT NULL,
          "okCount" INTEGER NOT NULL,
          "totalRegions" INTEGER NOT NULL,
          "totalImported" INTEGER NOT NULL,
          "regions" JSONB NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "sync_logs_startedAt_idx" ON "sync_logs"("startedAt")`,
      );
    })().catch((e) => {
      tableReady = null; // allow a later call to retry
      throw e;
    });
  }
  return tableReady;
}

/** Persists one completed sync run. Resilient: logs and swallows errors so a logging
 *  failure can never break the sync itself. */
export async function recordSyncLog(status: LastSyncStatus, trigger: "scheduled" | "manual"): Promise<void> {
  if (!status.startedAt || !status.finishedAt) return;
  try {
    await ensureSyncLogTable();
    await prisma.syncLog.create({
      data: {
        trigger,
        startedAt: new Date(status.startedAt),
        finishedAt: new Date(status.finishedAt),
        durationMs: status.durationMs ?? 0,
        ok: status.ok ?? false,
        okCount: status.okCount,
        totalRegions: status.totalRegions,
        totalImported: status.totalImported,
        regions: status.regions as object,
      },
    });
  } catch (e: any) {
    console.error("[sync-log] failed to persist sync run:", e?.message || e);
  }
}

/** Reads recent sync runs, most recent first. */
export async function getRecentSyncLogs(limit: number) {
  await ensureSyncLogTable();
  return prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}
