import { prisma } from "./src/lib/prisma.js";
import { Prisma } from "@prisma/client";

async function check() {
  try {
    const res = await prisma.$queryRaw`SELECT COUNT(*) FROM "mumbai_offline_sales"`;
    console.log("Raw Mumbai Count:", res);
    
    const res2 = await prisma.$queryRaw`SELECT COUNT(*) FROM "patna_offline_sales"`;
    console.log("Raw Patna Count:", res2);
  } catch (e) {
    console.error("Raw SQL failed:", e);
  }
}

check();
