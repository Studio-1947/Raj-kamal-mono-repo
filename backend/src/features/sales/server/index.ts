import type { Express } from 'express';
import router from './sales.routes.js';

/**
 * Returns the Sales feature router.
 */
export function getSalesRouter() {
  return router;
}

/**
 * Mounts the Sales API under the provided base path (default: /api/sales).
 * This is optional — you can also import and mount the router manually.
 */
export function mountSales(app: Express, basePath = '/api/sales') {
  app.use(basePath, router);
}

export default router;

