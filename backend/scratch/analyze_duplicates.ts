import fetch from 'node-fetch';
import * as XLSX from 'xlsx';
import crypto from 'crypto';

async function main() {
  // Let's analyze the Online sheet (GID 541252527)
  const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=xlsx&gid=541252527";
  console.log("Fetching Online sheet...");
  const res = await fetch(URL);
  if (!res.ok) {
    console.error("Fetch failed:", res.statusText);
    return;
  }
  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  console.log(`Total rows in sheet (including empty): ${rows.length}`);

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);
  const headerMap: Record<string, number> = {};
  headers.forEach((h: any, i: number) => {
    if (h) {
      const normalized = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized) headerMap[normalized] = i;
    }
  });

  // Let's helper function to get value
  const getVal = (row: any[], map: Record<string, number>, key: string): string => {
    const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const index = map[normalizedKey];
    if (index === undefined || index >= row.length) return "";
    return String(row[index] || "").trim().replace(/\s+/g, " ");
  };

  const hashCounts: Record<string, { count: number; sampleRows: any[][]; businessDatas: any[] }> = {};
  let emptyCount = 0;
  let totalProcessed = 0;

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx];
    if (!Array.isArray(row) || row.length === 0 || row.every(cell => cell === "" || cell === null)) {
      emptyCount++;
      continue;
    }
    totalProcessed++;

    const customerName = getVal(row, headerMap, "CustomerName");
    const slNo = parseInt(getVal(row, headerMap, "sl/no") || "0");
    const docNo = getVal(row, headerMap, "TrnsdocNo") || getVal(row, headerMap, "Doc No");
    const dateStr = getVal(row, headerMap, "TrnsdocdateStr") || getVal(row, headerMap, "DateStr");
    const isbn = getVal(row, headerMap, "BookCode") || getVal(row, headerMap, "ISBN");
    
    const title = getVal(row, headerMap, "BookName") || 
                  getVal(row, headerMap, "ItemName") || 
                  getVal(row, headerMap, "Title") || 
                  getVal(row, headerMap, "Name");
    const qty = parseInt(getVal(row, headerMap, "OUT") || getVal(row, headerMap, "Qty") || "0");
    const inQty = parseInt(getVal(row, headerMap, "IN") || "0");
    const amount = parseFloat(getVal(row, headerMap, "OUTAmount") || getVal(row, headerMap, "Amount") || "0");
    const inAmount = parseFloat(getVal(row, headerMap, "INAmount") || "0");
    const type = getVal(row, headerMap, "Type");

    const businessData = {
      slNo,
      docNo,
      dateStr, // Let's check with and without dateStr
      isbn,
      qty,
      inQty,
      amount,
      inAmount,
      customerName,
      type
    };

    // Calculate MD5 of businessData
    const rowHash = crypto.createHash('md5').update(JSON.stringify(businessData)).digest('hex');

    if (!hashCounts[rowHash]) {
      hashCounts[rowHash] = { count: 0, sampleRows: [], businessDatas: [] };
    }
    hashCounts[rowHash].count++;
    if (hashCounts[rowHash].count <= 2) {
      hashCounts[rowHash].sampleRows.push(row);
      hashCounts[rowHash].businessDatas.push(businessData);
    }
  }

  console.log(`\nProcessed Rows: ${totalProcessed}`);
  console.log(`Empty Rows Skipped: ${emptyCount}`);
  
  // Find duplicate hashes
  const duplicateHashes = Object.keys(hashCounts).filter(h => hashCounts[h].count > 1);
  console.log(`Unique Hashes (deduped count): ${Object.keys(hashCounts).length}`);
  console.log(`Total duplicate hashes found: ${duplicateHashes.length}`);
  
  let totalDuplicatedRowsCount = 0;
  duplicateHashes.forEach(h => {
    totalDuplicatedRowsCount += hashCounts[h].count;
  });
  console.log(`Total rows associated with duplicate hashes: ${totalDuplicatedRowsCount}`);

  console.log("\n--- Let's inspect 3 samples of duplicate groups ---");
  for (let i = 0; i < Math.min(3, duplicateHashes.length); i++) {
    const hash = duplicateHashes[i];
    const item = hashCounts[hash];
    console.log(`\nDuplicate Group #${i + 1} (Hash: ${hash}, Count: ${item.count})`);
    console.log("Business Data Structure:", item.businessDatas[0]);
    console.log("Sample Row 1 in sheet:", item.sampleRows[0]);
    console.log("Sample Row 2 in sheet:", item.sampleRows[1]);
  }
}

main().catch(console.error);
