import type { Express } from 'express';
import router from './lok-event.routes.js';

export function mountLokEventSales(app: Express, basePath = '/api/lok-event-sales') {
  app.use(basePath, router);
}

export default router;
