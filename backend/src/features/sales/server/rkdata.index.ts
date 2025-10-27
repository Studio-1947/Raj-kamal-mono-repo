import type { Express } from 'express';
import router from './rkdata.routes.js';

export function getRkDataRouter() {
  return router;
}

export function mountRkData(app: Express, basePath = '/api/rkdata') {
  app.use(basePath, router);
}

export default router;

