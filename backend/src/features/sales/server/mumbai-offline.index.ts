import type { Express } from 'express';
import router from './mumbai-offline.routes.js';

export function mountMumbaiOfflineSales(app: Express, basePath = '/api/mumbai-offline-sales') {
  app.use(basePath, router);
}

export default router;
