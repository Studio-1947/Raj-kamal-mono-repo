import { prisma } from "../lib/prisma.js";
import fs from "fs";

async function main() {
  const logStream = fs.createWriteStream("debug_output.txt");
  function log(msg: string) {
    console.log(msg);
    logStream.write(msg + "\n");
  }

  log("🔍 Debugging OnlineSale Data...");

  try {
    const count = await prisma.onlineSale.count();
    log(`📊 Total OnlineSale records: ${count}`);

    if (count === 0) {
      log("⚠️ No data found in OnlineSale table.");
      return;
    }

    const items = await prisma.onlineSale.findMany({
      take: 5,
      orderBy: { id: "desc" },
    });

    log("📝 Last 5 records:");
    for (const item of items) {
      log("---------------------------------------------------");
      log(`ID: ${item.id}`);
      log(`Date (DB): ${item.date}`);

      log(`Raw JSON: ${JSON.stringify(item.rawJson, null, 2)}`);

      // Simulate resolveRowDate logic (FIXED VERSION)
      let d: Date | null = item.date ? new Date(item.date) : null;
      if (!d) {
        const raw = item.rawJson as any;
        if (raw) {
          // Normalize keys by trimming
          const normalizedRaw: Record<string, any> = {};
          for (const [k, v] of Object.entries(raw)) {
            normalizedRaw[k.trim()] = v;
          }
          const d1 =
            normalizedRaw["Date"] ||
            normalizedRaw["Txn Date"] ||
            normalizedRaw["Transaction Date"];
          if (d1) {
            const dd = new Date(d1);
            if (!isNaN(+dd)) d = dd;
          }
        }
      }
      log(`Resolved Date: ${d?.toISOString()}`);
    }
  } catch (e) {
    console.error("❌ Error:", e);
    logStream.write(`❌ Error: ${e}\n`);
  } finally {
    await prisma.$disconnect();
    logStream.end();
  }
}

main();
