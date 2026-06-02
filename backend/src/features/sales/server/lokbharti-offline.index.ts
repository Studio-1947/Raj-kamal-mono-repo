import type { Express } from 'express';
import router from './lokbharti-offline.routes.js';

export function mountLokbhartiOfflineSales(app: Express, basePath = '/api/lokbharti-offline-sales') {
  app.use(basePath, router);
}

export default router;
