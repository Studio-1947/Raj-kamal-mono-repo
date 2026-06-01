import fetch from 'node-fetch';
import * as XLSX from 'xlsx';

async function testFetch() {
  const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=xlsx";
  console.log("Fetching sheet...");
  const res = await fetch(URL);
  if (!res.ok) {
    console.error("Failed to fetch:", res.statusText);
    return;
  }
  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets['Offline'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  console.log(`Total rows in 'Offline' sheet array: ${rows.length}`);
  
  // Let's count how many rows are non-empty
  let nonEmptyCount = 0;
  const sampleIndices: number[] = [];
  rows.forEach((r, idx) => {
    if (Array.isArray(r) && r.length > 0 && !r.every(c => c === "" || c === null || c === undefined)) {
      nonEmptyCount++;
      if (sampleIndices.length < 10) {
        sampleIndices.push(idx);
      }
    }
  });
  console.log(`Non-empty rows found: ${nonEmptyCount}`);
  console.log("First 10 non-empty row indices:", sampleIndices);
  
  // Let's print the first 5 non-empty rows
  for (let i = 0; i < Math.min(5, sampleIndices.length); i++) {
    console.log(`Row ${sampleIndices[i]}:`, rows[sampleIndices[i]]);
  }
}

testFetch().catch(console.error);
