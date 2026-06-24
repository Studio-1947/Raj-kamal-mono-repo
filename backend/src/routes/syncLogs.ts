import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/authPrisma.js";
import { getRecentSyncLogs } from "../features/sales/server/syncLogStore.js";

const router = Router();

// GET /api/sync-logs?limit=30 — recent Google-Sheet sync runs (most recent first).
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 200);
  try {
    const items = await getRecentSyncLogs(limit);
    res.json({ ok: true, items });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to read sync logs" });
  }
});

export default router;
