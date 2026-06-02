import { offlineSyncService } from "../src/features/sales/server/offlineSyncService.js";
import fetch from "node-fetch";
import * as XLSX from "xlsx";

async function test() {
  const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=xlsx";
  console.log("Fetching...");
  const res = await fetch(URL);
  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets['Offline'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  console.log("Fetched rows in workbook array:", rows.length);
  
  // Let's call a custom process test
  let count = 0;
  let skippedEmpty = 0;
  rows.slice(1).forEach((row, idx) => {
    if (!Array.isArray(row) || row.length === 0 || row.every(cell => cell === "" || cell === null)) {
      skippedEmpty++;
    } else {
      count++;
      if (count <= 5) {
        console.log(`Non-empty row #${count} (original index ${idx + 1}):`, row);
      }
    }
  });
  console.log(`Total non-empty by processData rules: ${count}`);
  console.log(`Total skipped empty by processData rules: ${skippedEmpty}`);
}

test().catch(console.error);
