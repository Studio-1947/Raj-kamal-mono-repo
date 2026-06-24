import app from './app.js';
import { prisma } from './lib/prisma.js';

const PORT = process.env.PORT || 4000;

// Start server (for local / traditional hosting). On Vercel, this file isn't used.
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/api-docs`);
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
