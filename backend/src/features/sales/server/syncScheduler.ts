// ─────────────────────────────────────────────────────────────────────────────
// syncScheduler.ts
//
// Scheduled (cron) auto-sync of the Google-Sheet offline-sales data so the team
// never has to trigger it by hand.
//
// IMPORTANT: this is started from src/index.ts, which is the VPS / self-hosted
// entrypoint (app.listen). Vercel uses api/index.ts (the Express app only) and
// never imports index.ts, so this scheduler can never run on serverless — where
// a per-invocation cron would be wrong. As a second guard it is also a no-op
// unless ENABLE_SCHEDULED_SYNC=true.
// ─────────────────────────────────────────────────────────────────────────────

import cron from "node-cron";
import { offlineSyncService } from "./offlineSyncService.js";
import { recordSyncLog } from "./syncLogStore.js";

let task: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

export interface LastSyncStatus {
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  ok: boolean | null; // true only if every region succeeded; null = never run since start
  okCount: number;
  totalRegions: number;
  totalImported: number;
  regions: { region: string; success: boolean; importedCount: number; skippedCount: number; error?: string | undefined }[];
}

// In-memory only: reflects the most recent run since process start. Resets on restart
// (acceptable for a single long-lived VPS process). Surfaced on /health for monitoring.
let lastSync: LastSyncStatus = {
  startedAt: null,
  finishedAt: null,
  durationMs: null,
  ok: null,
  okCount: 0,
  totalRegions: 0,
  totalImported: 0,
  regions: [],
};

/** Returns the outcome of the most recent sync run (since process start). */
export function getLastSyncStatus(): LastSyncStatus {
  return lastSync;
}

/**
 * Runs a full sync once, persists the outcome to sync_logs, and updates the in-memory
 * status. Guards against overlapping runs (returns null if one is already in progress).
 * Exported for manual triggering (e.g. `npm run sync:all`).
 */
export async function runScheduledSync(trigger: "scheduled" | "manual" = "scheduled"): Promise<LastSyncStatus | null> {
  if (isRunning) {
    console.warn("[sync-scheduler] previous run still in progress; skipping this tick");
    return null;
  }
  isRunning = true;
  const startedAt = Date.now();
  console.log(`[sync-scheduler] starting full Google-Sheet sync @ ${new Date(startedAt).toISOString()}`);
  try {
    const results = await offlineSyncService.syncAll();
    const okCount = results.filter((r) => r.result.success).length;
    const imported = results.reduce((a, r) => a + (r.result.importedCount || 0), 0);
    for (const r of results) {
      const s = r.result;
      console.log(
        `[sync-scheduler]   ${r.region}: ${s.success ? "OK" : "FAIL"} imported=${s.importedCount} skipped=${s.skippedCount}${s.error ? " error=" + s.error : ""}`,
      );
    }
    const finishedAt = Date.now();
    console.log(`[sync-scheduler] done: ${okCount}/${results.length} regions ok, ${imported} rows imported, took ${Math.round((finishedAt - startedAt) / 1000)}s`);
    lastSync = {
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt,
      ok: okCount === results.length,
      okCount,
      totalRegions: results.length,
      totalImported: imported,
      regions: results.map((r) => ({
        region: r.region,
        success: r.result.success,
        importedCount: r.result.importedCount,
        skippedCount: r.result.skippedCount,
        error: r.result.error,
      })),
    };
    // NOTE: per-region in-memory summary/counts caches self-expire via their TTL.
    // Explicit cache invalidation + warm-on-sync will be wired in the caching task.
  } catch (e: any) {
    console.error("[sync-scheduler] run failed:", e?.message || e);
    const finishedAt = Date.now();
    lastSync = {
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt,
      ok: false,
      okCount: 0,
      totalRegions: 0,
      totalImported: 0,
      regions: [],
    };
  } finally {
    isRunning = false;
  }
  await recordSyncLog(lastSync, trigger);
  return lastSync;
}

/**
 * Starts the daily overnight Google-Sheet sync.
 * No-op unless ENABLE_SCHEDULED_SYNC=true (set this only on the VPS).
 * Schedule and timezone are overridable via SYNC_CRON / SYNC_TZ.
 * Defaults: 03:00 every day, Asia/Kolkata.
 */
export function startSyncScheduler(): void {
  if (process.env.ENABLE_SCHEDULED_SYNC !== "true") {
    console.log("[sync-scheduler] disabled (set ENABLE_SCHEDULED_SYNC=true to enable)");
    return;
  }
  const expression = process.env.SYNC_CRON || "0 3 * * *"; // 03:00 daily
  const timezone = process.env.SYNC_TZ || "Asia/Kolkata";
  if (!cron.validate(expression)) {
    console.error(`[sync-scheduler] invalid SYNC_CRON "${expression}" — scheduler NOT started`);
    return;
  }
  task = cron.schedule(expression, () => runScheduledSync("scheduled"), { timezone, name: "daily-google-sheet-sync" });
  console.log(`[sync-scheduler] scheduled "${expression}" (${timezone})`);
}

/** Stops the scheduled task (used for graceful shutdown / tests). */
export function stopSyncScheduler(): void {
  task?.stop();
  task = null;
}
