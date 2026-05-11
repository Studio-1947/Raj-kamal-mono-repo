
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting optimized migration...");
  
  const records = await prisma.googleSheetOfflineSale.findMany({
    where: { date: null },
    select: { dateStr: true }
  });
  
  const dateGroups: Record<string, string[]> = {};
  records.forEach(r => {
    if (r.dateStr) {
      if (!dateGroups[r.dateStr]) dateGroups[r.dateStr] = [];
      // dateGroups[r.dateStr].push(r.id); // Not needed for updateMany where dateStr matches
    }
  });
  
  const uniqueDateStrings = Object.keys(dateGroups);
  console.log(`Found ${records.length} records to fix across ${uniqueDateStrings.length} unique dates.`);
  
  let totalFixed = 0;
  for (const ds of uniqueDateStrings) {
    let parsedDate = new Date(ds);
    
    // Handle DD/MM/YYYY if it failed
    if (isNaN(parsedDate.getTime()) || (parsedDate.getFullYear() > 2100) || (parsedDate.getFullYear() < 1900)) {
        const parts = ds.split(/[\/\-]/);
        if (parts.length === 3) {
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const y = parseInt(parts[2]);
            const d2 = new Date(y, m, d);
            if (!isNaN(d2.getTime())) parsedDate = d2;
        }
    }

    if (!isNaN(parsedDate.getTime())) {
      const result = await prisma.googleSheetOfflineSale.updateMany({
        where: { dateStr: ds, date: null },
        data: { date: parsedDate }
      });
      totalFixed += result.count;
      console.log(`Fixed ${result.count} records for date ${ds} (${parsedDate.toISOString()})`);
    } else {
      console.log(`Skipping invalid date string: ${ds}`);
    }
  }
  
  console.log(`Optimized migration complete. Fixed ${totalFixed} records.`);
}

main().finally(() => prisma.$disconnect());
