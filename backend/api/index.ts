import { VercelRequest, VercelResponse } from '@vercel/node';
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

// Initialize admin before handling requests
await initializeAdmin();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
