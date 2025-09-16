import app from '../src/app.js';
import { ensureAdminExists } from '../src/lib/bootstrap.js';

// Initialize admin on cold start
let adminInitialized = false;
const initializeAdmin = async () => {
  if (!adminInitialized) {
    try {
      await ensureAdminExists();
      adminInitialized = true;
    } catch (err) {
      console.error('Admin bootstrap failed:', err);
    }
  }
};

// Initialize admin before handling requests
await initializeAdmin();

export default app;

