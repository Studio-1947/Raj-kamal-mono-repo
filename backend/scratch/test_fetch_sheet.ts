import fetch from 'node-fetch';
import * as XLSX from 'xlsx';

async function testFetch() {
  const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=xlsx";
  console.log("Fetching test sheet...");
  const res = await fetch(URL);
  if (!res.ok) {
    console.error("Failed to fetch:", res.statusText);
    return;
  }
  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });
  console.log("All sheet names inside workbook:", workbook.SheetNames);
  
  const offlineSheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'offline');
  if (offlineSheetName) {
    const sheet = workbook.Sheets[offlineSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    console.log(`Sheet "${offlineSheetName}" found! It has ${rows.length} rows.`);
    console.log("Headers:", rows[0]);
  } else {
    console.log("Sheet 'Offline' NOT found in the workbook.");
  }
}

testFetch().catch(console.error);
