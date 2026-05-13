import { prisma } from "./src/lib/prisma.js";

async function check() {
  const mumbai = await prisma.mumbaiOfflineSale.aggregate({
    _max: { date: true },
    _min: { date: true },
    _count: { _all: true }
  });
  console.log("Mumbai Stats:", mumbai);

  const patna = await prisma.patnaOfflineSale.aggregate({
    _max: { date: true },
    _min: { date: true },
    _count: { _all: true }
  });
  console.log("Patna Stats:", patna);
}

check();
