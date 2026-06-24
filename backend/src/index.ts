import app from './app.js';
import { prisma } from './lib/prisma.js';
import { startSyncScheduler, runScheduledSync } from './features/sales/server/syncScheduler.js';
import { ensureSyncLogTable } from './features/sales/server/syncLogStore.js';

const PORT = process.env.PORT || 4000;

// Start server (for local / traditional hosting). On Vercel, this file isn't used.
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api-docs`);

  // Ensure the sync audit table exists (idempotent), then start the daily auto-sync
  // (VPS only; no-op unless ENABLE_SCHEDULED_SYNC=true).
  ensureSyncLogTable().catch((e) => console.error("[sync-log] ensure table failed:", e?.message || e));
  startSyncScheduler();

  // Boot-time sync so data is fresh after a deploy/restart. VPS-only (this file isn't
  // used on Vercel), routes through runScheduledSync so it invalidates caches + logs to
  // sync_logs. Default ON; set SYNC_ON_STARTUP=false to disable. Short delay lets the
  // server settle (and answer health checks) before the heavy sync begins.
  if (process.env.NODE_ENV !== 'test' && process.env.SYNC_ON_STARTUP !== 'false') {
    setTimeout(() => {
      runScheduledSync('startup').catch((e) => console.error('[sync-scheduler] startup sync failed:', e?.message || e));
    }, 5000);
  }
});

// ── DB keep-warm heartbeat ───────────────────────────────────────────────────
// Neon's serverless compute auto-suspends when idle, so the first request after
// a quiet period pays a multi-second cold start. A lightweight periodic ping keeps
// it awake → consistently fast queries. Enabled by default; set DB_KEEPALIVE=false
// to turn it off. Interval defaults to 240s (under Neon's ~5-min suspend window).
// NOTE: this keeps the compute running, which uses more compute-hours.
if (process.env.DB_KEEPALIVE !== 'false') {
  const intervalMs = Number(process.env.DB_KEEPALIVE_MS) || 240_000;
  const timer = setInterval(() => {
    prisma.$queryRaw`SELECT 1`.catch(() => { /* transient; safe to ignore */ });
  }, intervalMs);
  // Don't let the heartbeat alone keep the process alive on shutdown.
  timer.unref?.();
}

export default app;
