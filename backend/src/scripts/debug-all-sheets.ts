#!/usr/bin/env node
/**
 * Debug script to examine all sheets in Excel
 */
import path from 'node:path';
import XLSX from 'xlsx';

const filePath = path.resolve(process.cwd(), 'data', 'RKP offline Sales.xlsx');
const wb = XLSX.readFile(filePath, { cellDates: true });

console.log(`📊 Workbook has ${wb.SheetNames.length} sheets\n`);

for (const sheetName of wb.SheetNames) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 Sheet: "${sheetName}"`);
  console.log(`${'='.repeat(60)}`);
  
  const ws = wb.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null });
  
  console.log(`Total rows: ${rawRows.length}`);
  
  if (rawRows.length > 0) {
    console.log(`\n📋 Column Names:`);
    const columns = Object.keys(rawRows[0]);
    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col}`);
    });
    
    console.log(`\n📝 Sample Row (first row):`);
    console.log(JSON.stringify(rawRows[0], null, 2));
  }
}

