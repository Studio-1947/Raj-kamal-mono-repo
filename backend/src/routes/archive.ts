// ─────────────────────────────────────────────────────────────────────────────
// /api/archive — read access to the sheet-dump archive and snapshot history, plus a
// guarded restore trigger for operators without SSH.
//
// Everything here is authenticated. The restore endpoint additionally requires an ADMIN
// role and an explicit `confirm` flag, because it wipes and replaces a live table — the
// kind of thing that should be hard to do by accident from a browser.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/authPrisma.js";
import {
  listDumps,
  listSnapshots,
  archiveStats,
  readDumpBytes,
  getDumpMeta,
} from "../features/archive/archiveStore.js";
import { isArchiveConfigured } from "../features/archive/archiveDb.js";
import { restoreFromSnapshot, restoreFromDump } from "../features/archive/restore.js";
import { REGION_NAMES, isRegionName } from "../features/archive/regions.js";
import { guardMode } from "../features/archive/sheetGuard.js";

const router = Router();

function regionParam(req: AuthRequest): string | null {
  const raw = String(req.query.region || "").trim().toLowerCase();
  if (!raw) return null;
  if (!isRegionName(raw)) throw new Error(`Unknown region "${raw}". Expected one of: ${REGION_NAMES.join(", ")}`);
  return raw;
}

function limitParam(req: AuthRequest): number {
  return Math.min(Math.max(Number(req.query.limit) || 30, 1), 200);
}

// GET /api/archive/status — is the archive healthy, isolated, and current?
router.get("/status", authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await archiveStats();
    res.json({
      ok: true,
      configured: isArchiveConfigured(),
      guardMode: guardMode(),
      enabled: process.env.ARCHIVE_ENABLED !== "false",
      ...stats,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Failed to read archive status" });
  }
});

// GET /api/archive/dumps?region=delhi&limit=30 — archived sheet exports, newest first.
router.get("/dumps", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const items = await listDumps(regionParam(req), limitParam(req));
    res.json({ ok: true, items });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "Failed to read dumps" });
  }
});

// GET /api/archive/snapshots?region=delhi&limit=30 — pre-wipe table captures.
router.get("/snapshots", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const items = await listSnapshots(regionParam(req), limitParam(req));
    res.json({ ok: true, items });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "Failed to read snapshots" });
  }
});

// GET /api/archive/dumps/:id/download — the original export bytes, as fetched.
// Useful for diffing a rejected export against a good one in a spreadsheet app.
router.get("/dumps/:id/download", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid dump id" });

    const meta = await getDumpMeta(id);
    if (!meta) return res.status(404).json({ ok: false, error: `Dump #${id} not found` });

    const raw = await readDumpBytes(id);
    if (!raw) {
      return res.status(410).json({ ok: false, error: `Dump #${id} no longer has stored bytes (aged out by retention)` });
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${meta.region}-dump-${id}.csv"`);
    return res.send(raw);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Failed to read dump" });
  }
});

// POST /api/archive/restore — wipe-and-replace a live table from the archive.
// Body: { snapshotId? , dumpId?, dryRun?, confirm: true, note? }
router.post("/restore", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ ok: false, error: "Restore requires an admin account" });
    }

    const { snapshotId, dumpId, dryRun, confirm, note } = req.body ?? {};
    if (!snapshotId && !dumpId) {
      return res.status(400).json({ ok: false, error: "Provide snapshotId or dumpId" });
    }
    if (snapshotId && dumpId) {
      return res.status(400).json({ ok: false, error: "Provide only one of snapshotId or dumpId" });
    }
    // A restore replaces every row in a live table. Requiring an explicit flag means a
    // mis-fired request can't do it, and a dry run stays available without the flag.
    if (!dryRun && confirm !== true) {
      return res.status(400).json({
        ok: false,
        error: "Refusing to restore without confirm:true — pass dryRun:true first to preview the change",
      });
    }

    const opts = { dryRun: !!dryRun, actor: req.user?.email ?? "api", note: typeof note === "string" ? note : undefined };
    const result = snapshotId
      ? await restoreFromSnapshot(Number(snapshotId), opts)
      : await restoreFromDump(Number(dumpId), opts);

    return res.json({ ok: true, result });
  } catch (e: any) {
    return res.status(400).json({ ok: false, error: e?.message || "Restore failed" });
  }
});

export default router;
