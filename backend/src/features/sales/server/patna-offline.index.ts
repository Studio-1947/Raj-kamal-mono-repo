import type { Express } from 'express';
import router from './patna-offline.routes.js';

export function mountPatnaOfflineSales(app: Express, basePath = '/api/patna-offline-sales') {
  app.use(basePath, router);
}

export default router;
