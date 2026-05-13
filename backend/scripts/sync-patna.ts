import { offlineSyncService } from "../src/features/sales/server/offlineSyncService.js";

async function run() {
  console.log("Starting Patna Offline Sales Sync...");
  try {
    const result = await offlineSyncService.syncPatnaSales();
    console.log("Sync Complete:", result);
    process.exit(0);
  } catch (err) {
    console.error("Sync Failed:", err);
    process.exit(1);
  }
}

run();
