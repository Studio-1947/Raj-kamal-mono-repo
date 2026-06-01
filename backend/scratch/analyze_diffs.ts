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

  const matchingRows: any[][] = [];

  for (const row of dataRows) {
    if (!Array.isArray(row) || row.length === 0 || row.every(cell => cell === "" || cell === null)) {
      continue;
    }

    const docNo = getVal(row, headerMap, "TrnsdocNo") || getVal(row, headerMap, "Doc No");
    const isbn = getVal(row, headerMap, "BookCode") || getVal(row, headerMap, "ISBN");
    
    if (docNo === 'RJ/BR/14448' && isbn === '9788126726158') {
      matchingRows.push(row);
    }
  }

  console.log(`Found ${matchingRows.length} matching rows for RJ/BR/14448 and 9788126726158 in sheet!`);
  if (matchingRows.length > 0) {
    console.log("Headers:", headers);
    console.log("Row 1:", matchingRows[0]);
    console.log("Row 2:", matchingRows[1]);
    console.log("Row 3:", matchingRows[2]);
    // check if all rows are identical or if they differ
    const differences: Record<string, number> = {};
    for (let c = 0; c < headers.length; c++) {
      const values = new Set(matchingRows.map(r => String(r[c] === undefined ? "" : r[c])));
      if (values.size > 1) {
        differences[headers[c]] = values.size;
      }
    }
    console.log("Differences in columns:", differences);
  }
}

main().catch(console.error);
