import type { Express } from 'express';
import router from './online-offline.routes.js';

export function mountOnlineOfflineSales(app: Express, basePath = '/api/online-offline-sales') {
  app.use(basePath, router);
}

export default router;
