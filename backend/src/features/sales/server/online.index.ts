import type { Express } from 'express';
import router from './online.routes.js';

export function mountOnlineSales(app: Express, basePath = '/api/online-sales') {
  app.use(basePath, router);
}

export default router;

