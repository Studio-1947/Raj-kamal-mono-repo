import app from '../src/app';
import { ensureAdminExists } from '../src/lib/bootstrap';

// Initialize admin on cold start
let adminInitialized = false;
const initializeAdmin = async () => {
  if (!adminInitialized) {
    try {
      await ensureAdminExists();
      adminInitialized = true;
      console.log('✅ Admin initialization completed');
    } catch (err) {
      console.error('❌ Admin bootstrap failed:', err);
    }
  }
};

// Lazily trigger admin initialization on first request without blocking
app.use((_req, _res, next) => {
  if (!adminInitialized) {
    initializeAdmin().catch((err) => {
      console.error('Admin bootstrap error (non-blocking):', err);
    });
  }
  next();
});

// Export the Express app as the default handler
export default app;
