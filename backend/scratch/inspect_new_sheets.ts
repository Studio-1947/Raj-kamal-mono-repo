import fetch from 'node-fetch';
import * as XLSX from 'xlsx';

async function main() {
  const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=xlsx";
  console.log("Fetching workbook...");
  const res = await fetch(URL);
  if (!res.ok) {
    console.error("Fetch failed:", res.statusText);
    return;
  }
  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });
  console.log("All sheets in workbook:", workbook.SheetNames);
  
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    console.log(`\nSheet: "${name}"`);
    console.log(`Total rows: ${rows.length}`);
    if (rows.length > 0) {
      console.log("Headers:", rows[0]);
      // find first non-empty data row
      let firstDataRow: any[] | null = null;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i].length > 0 && !rows[i].every(c => c === "" || c === null || c === undefined)) {
          firstDataRow = rows[i];
          break;
        }
      }
      if (firstDataRow) {
        console.log("Sample Data Row:", firstDataRow);
      }
    }
  }
}

main().catch(console.error);
