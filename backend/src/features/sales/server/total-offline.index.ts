import { Express } from 'express';
import totalOfflineRoutes from './total-offline.routes.js';

export function mountTotalOfflineSales(app: Express, path: string) {
  app.use(path, totalOfflineRoutes);
  console.log(`[ROUTE MOUNTED] Mounted Total Offline Sales routes at ${path}`);
}
