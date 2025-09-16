import app from '../src/app.js';
import { ensureAdminExists } from '../src/lib/bootstrap.js';

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

// Initialize admin before handling requests
await initializeAdmin();

// Export the Express app as the default handler
export default app;

