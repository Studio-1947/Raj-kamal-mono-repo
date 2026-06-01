import fetch from 'node-fetch';
import * as XLSX from 'xlsx';
import crypto from 'crypto';

async function main() {
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
  console.log(`Total rows in sheet: ${rows.length}`);

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);
  const headerMap: Record<string, number> = {};
  headers.forEach((h: any, i: number) => {
    if (h) {
      const normalized = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized) headerMap[normalized] = i;
    }
  });

  const getVal = (row: any[], map: Record<string, number>, key: string): string => {
    const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const index = map[normalizedKey];
    if (index === undefined || index >= row.length) return "";
    return String(row[index] || "").trim().replace(/\s+/g, " ");
  };

  const toInsert: any[] = [];
  const hashCounts: Record<string, number> = {};

  let count = 0;
  let skippedEmpty = 0;

  for (const row of dataRows) {
    if (!Array.isArray(row) || row.length === 0 || row.every(cell => cell === "" || cell === null)) {
      skippedEmpty++;
      continue;
    }

    const customerName = getVal(row, headerMap, "CustomerName");
    const slNo = parseInt(getVal(row, headerMap, "sl/no") || "0");
    const docNo = getVal(row, headerMap, "TrnsdocNo") || getVal(row, headerMap, "Doc No");
    const dateStr = getVal(row, headerMap, "TrnsdocdateStr") || getVal(row, headerMap, "DateStr");
    const isbn = getVal(row, headerMap, "BookCode") || getVal(row, headerMap, "ISBN");
    const title = getVal(row, headerMap, "BookName") || 
                  getVal(row, headerMap, "ItemName") || 
                  getVal(row, headerMap, "Title") || 
                  getVal(row, headerMap, "Name");
    const author = getVal(row, headerMap, "Author") || getVal(row, headerMap, "DisplayAuthorName");
    const binding = getVal(row, headerMap, "Binding");
    const pubYear = parseInt(getVal(row, headerMap, "Pub-Year") || getVal(row, headerMap, "Pub-year") || "0");
    const publisher = getVal(row, headerMap, "Publisher");
    const qty = parseInt(getVal(row, headerMap, "OUT") || getVal(row, headerMap, "Qty") || "0");
    const inQty = parseInt(getVal(row, headerMap, "IN") || "0");
    const currency = getVal(row, headerMap, "CURRENCYID") || "RS";
    const rate = parseFloat(getVal(row, headerMap, "BOOKRATE") || getVal(row, headerMap, "Rate") || "0");
    const discount = parseFloat(getVal(row, headerMap, "BookDiscount") || "0");
    const addDiscount = parseFloat(getVal(row, headerMap, "BookAddDiscount") || "0");
    const amount = parseFloat(getVal(row, headerMap, "OUTAmount") || getVal(row, headerMap, "Amount") || "0");
    const inAmount = parseFloat(getVal(row, headerMap, "INAmount") || "0");
    const state = getVal(row, headerMap, "StateName");
    const city = getVal(row, headerMap, "CityName");
    const type = getVal(row, headerMap, "Type");

    let date: Date | null = null;
    const rawDate = getVal(row, headerMap, "Trnsdocdate") || getVal(row, headerMap, "Date");
    const effectiveDateSource = rawDate || dateStr;
    
    if (effectiveDateSource) {
      if (/^\d{5}(\.\d+)?$/.test(effectiveDateSource)) {
        const serial = parseFloat(effectiveDateSource);
        date = new Date((serial - 25569) * 86400 * 1000);
      } else {
        const parsedDate = new Date(effectiveDateSource);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate;
        }
      }
    }

    const businessData = {
      slNo,
      docNo,
      date: date?.toISOString() || null,
      isbn,
      qty,
      inQty,
      amount,
      inAmount,
      customerName,
      type
    };

    const rowHash = crypto.createHash('md5').update(JSON.stringify(businessData)).digest('hex');

    toInsert.push({
      docNo,
      title,
      isbn,
      qty,
      amount,
      rowHash,
      businessData
    });

    hashCounts[rowHash] = (hashCounts[rowHash] || 0) + 1;
    count++;
  }

  console.log(`\nProcessed Rows: ${count}`);
  console.log(`Unique Row Hashes generated: ${Object.keys(hashCounts).length}`);
  
  // Find which fields are leading to duplicated hashes
  // Let's find a hash that is highly duplicated (if any)
  const duplicates = Object.entries(hashCounts).filter(([_, c]) => c > 1).sort((a, b) => b[1] - a[1]);
  console.log(`Total duplicated hashes: ${duplicates.length}`);
  
  console.log("\n--- Top 5 most duplicated hashes ---");
  for (let i = 0; i < Math.min(5, duplicates.length); i++) {
    const [hash, c] = duplicates[i];
    const match = toInsert.find(x => x.rowHash === hash);
    console.log(`\nHash: ${hash}, Count: ${c}`);
    console.log("Sample title:", match.title);
    console.log("Business Data:", match.businessData);
  }
}

main().catch(console.error);
