import { prisma } from '../src/lib/prisma.js';

async function run() {
  const titles = await prisma.onlineOfflineSale.findMany({
    select: { title: true },
    distinct: ['title'],
    take: 100
  });
  console.log(`Loaded ${titles.length} distinct titles.`);
  const titleList = titles.map(t => t.title).filter(Boolean);
  const hasBook = titleList.some(t => t.toLowerCase().includes("ret"));
  console.log(`Does the top 100 distinct titles include "ret"? ${hasBook}`);
  if (hasBook) {
    console.log("Matching titles in top 100:", titleList.filter(t => t.toLowerCase().includes("ret")));
  } else {
    console.log("No title matching 'ret' in top 100.");
  }

  // Let's count total distinct titles
  const allDistinct = await prisma.onlineOfflineSale.findMany({
    select: { title: true },
    distinct: ['title']
  });
  console.log(`Total distinct titles in onlineOfflineSale: ${allDistinct.length}`);
  
  await prisma.$disconnect();
}
run();
