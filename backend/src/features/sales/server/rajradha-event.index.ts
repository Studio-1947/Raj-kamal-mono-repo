import type { Express } from 'express';
import router from './rajradha-event.routes.js';

export function mountRajRadhaEventSales(app: Express, basePath = '/api/rajradha-event-sales') {
  app.use(basePath, router);
}

export default router;
