import type { Express } from 'express';
import router from './offline.routes.js';

export function mountOfflineSales(app: Express, basePath = '/api/offline-sales') {
  app.use(basePath, router);
}

export default router;
