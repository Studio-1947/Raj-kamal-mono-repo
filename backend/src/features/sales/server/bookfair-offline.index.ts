import type { Express } from 'express';
import router from './bookfair-offline.routes.js';

export function mountBookFairOfflineSales(app: Express, basePath = '/api/bookfair-offline-sales') {
  app.use(basePath, router);
}

export default router;
