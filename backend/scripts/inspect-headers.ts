import fetch from "node-fetch";
import * as XLSX from "xlsx";

const sheets = [
  { name: "Delhi", url: "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv" },
  { name: "Mumbai", url: "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=696866974" },
  { name: "Patna", url: "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=1521335023" },
  { name: "Online", url: "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=541252527" },
  { name: "BookFair", url: "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=750818183" },
  { name: "Lokbharti", url: "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=428885829" },
];

async function run() {
  for (const sheet of sheets) {
    console.log(`\n=== Sheet: ${sheet.name} ===`);
    try {
      const response = await fetch(sheet.url);
      if (!response.ok) {
        console.error(`Failed to fetch ${sheet.name}: ${response.statusText}`);
        continue;
      }
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      console.log(`Total rows in downloaded sheet: ${rows.length}`);
      if (rows.length > 0) {
        console.log("Headers:", JSON.stringify(rows[0]));
      }
      if (rows.length > 1) {
        console.log("Row 1:", JSON.stringify(rows[1]));
      }
      if (rows.length > 2) {
        console.log("Row 2:", JSON.stringify(rows[2]));
      }

      // Check dates in first 10 rows
      const headers = rows[0] || [];
      const trnsdocdateIdx = headers.findIndex(h => String(h).trim().toLowerCase() === "trnsdocdate");
      const trnsdocdateStrIdx = headers.findIndex(h => String(h).trim().toLowerCase() === "trnsdocdatestr");
      const dateIdx = headers.findIndex(h => String(h).trim().toLowerCase() === "date");
      const dateStrIdx = headers.findIndex(h => String(h).trim().toLowerCase() === "datestr");

      console.log(`Header Indices - Trnsdocdate: ${trnsdocdateIdx}, TrnsdocdateStr: ${trnsdocdateStrIdx}, Date: ${dateIdx}, DateStr: ${dateStrIdx}`);
      
      console.log("Sample values from first 10 rows:");
      for (let i = 1; i < Math.min(rows.length, 11); i++) {
        const row = rows[i];
        console.log(`Row ${i}: trnsdocdate=${row[trnsdocdateIdx]}, trnsdocdateStr=${row[trnsdocdateStrIdx]}, date=${row[dateIdx]}, dateStr=${row[dateStrIdx]}`);
      }
    } catch (err: any) {
      console.error(`Error processing ${sheet.name}:`, err.message);
    }
  }
}

run();
