import { Router } from "express";
import { offlineSyncService } from "../features/sales/server/offlineSyncService.js";

const router = Router();

// Verify the request is a legitimate Vercel cron invocation.
// Vercel sets Authorization: Bearer <CRON_SECRET> on every cron call.
function verifyCronSecret(req: import("express").Request, res: import("express").Response): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.status(500).json({ ok: false, error: "CRON_SECRET is not configured" });
    return false;
  }
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${cronSecret}`) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /api/cron/sync-all
 * Called daily by Vercel Cron Jobs to sync all regional offline sales sheets.
 * Protected by CRON_SECRET (set automatically by Vercel, also configurable manually).
 */
router.get("/sync-all", async (req, res) => {
  if (!verifyCronSecret(req, res)) return;

  const startedAt = new Date().toISOString();
  const syncTasks = [
    { name: "Delhi/General Offline Sales", fn: () => offlineSyncService.syncOfflineSales() },
    { name: "Mumbai Offline Sales", fn: () => offlineSyncService.syncMumbaiSales() },
    { name: "Patna Offline Sales", fn: () => offlineSyncService.syncPatnaSales() },
    { name: "Online Offline Sales", fn: () => offlineSyncService.syncOnlineOfflineSales() },
    { name: "BookFair Offline Sales", fn: () => offlineSyncService.syncBookFairSales() },
    { name: "Lokbharti Offline Sales", fn: () => offlineSyncService.syncLokbhartiSales() },
  ];

  const results: { name: string; ok: boolean; importedCount?: number; error?: string }[] = [];

  for (const task of syncTasks) {
    try {
      const result = await task.fn();
      results.push({ name: task.name, ok: result.success, importedCount: result.importedCount });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[CRON] Sync failed for ${task.name}:`, message);
      results.push({ name: task.name, ok: false, error: message });
    }
  }

  const allOk = results.every((r) => r.ok);
  console.log(`[CRON] sync-all completed (${allOk ? "all ok" : "some failed"}) at ${new Date().toISOString()}`);

  return res.status(allOk ? 200 : 207).json({
    ok: allOk,
    startedAt,
    completedAt: new Date().toISOString(),
    results,
  });
});

export default router;
