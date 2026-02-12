#!/usr/bin/env node
/**
 * Debug script to examine RajRadha Event duplicates
 */
import path from 'node:path';
import XLSX from 'xlsx';
import crypto from 'node:crypto';

const filePath = path.resolve(process.cwd(), 'data', 'RKP offline Sales.xlsx');
const wb = XLSX.readFile(filePath, { cellDates: true });

const sheetName = 'RajRadha Event';
const ws = wb.Sheets[sheetName];
const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

console.log(`\n📊 Sheet: ${sheetName}`);
console.log(`Total rows: ${rawRows.length}\n`);

// Show column names
console.log('📋 Columns:', Object.keys(rawRows[0]));

// Check for duplicates
const hashMap = new Map<string, number>();
const rowExamples = new Map<string, any>();

for (let i = 0; i < rawRows.length; i++) {
  const row = rawRows[i];
  const itemCode = row.ItemCode?.toString() || '';
  const title = row.Description?.toString() || '';
  const publisher = row.Publisher?.toString() || '';
  const rate = row.Rate?.toString() || '';
  const qty = row.Qty?.toString() || '';
  
  // Create hash similar to the import script
  const key = `${itemCode.toLowerCase()}|${title.toLowerCase()}|${publisher.toLowerCase()}|${rate}`;
  const hash = crypto.createHash('sha256').update(`rajradha-${key}-${qty}`).digest('hex');
  
  if (!rowExamples.has(hash)) {
    rowExamples.set(hash, row);
  }
  hashMap.set(hash, (hashMap.get(hash) || 0) + 1);
}

console.log(`\nTotal unique hashes: ${hashMap.size}`);
console.log(`Total rows: ${rawRows.length}`);
console.log(`Duplicate rows: ${rawRows.length - hashMap.size}`);

// Show most common duplicates
const sorted = Array.from(hashMap.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('\n=== Top 10 Most Common Hashes ===');
for (const [hash, count] of sorted) {
  const example = rowExamples.get(hash);
  console.log(`\nCount: ${count} times`);
  console.log(`  ItemCode: ${example?.ItemCode}`);
  console.log(`  Description: ${example?.Description}`);
  console.log(`  Publisher: ${example?.Publisher}`);
  console.log(`  Rate: ${example?.Rate}`);
  console.log(`  Qty: ${example?.Qty}`);
}

// Check if removing Qty from hash would be better
console.log('\n\n=== Analysis without Qty in hash ===');
const hashMapNoQty = new Map<string, number>();

for (let i = 0; i < rawRows.length; i++) {
  const row = rawRows[i];
  const itemCode = row.ItemCode?.toString() || '';
  const title = row.Description?.toString() || '';
  const publisher = row.Publisher?.toString() || '';
  const rate = row.Rate?.toString() || '';
  
  const key = `${itemCode.toLowerCase()}|${title.toLowerCase()}|${publisher.toLowerCase()}|${rate}`;
  const hash = crypto.createHash('sha256').update(`rajradha-${key}`).digest('hex');
  
  hashMapNoQty.set(hash, (hashMapNoQty.get(hash) || 0) + 1);
}

console.log(`Unique hashes (without Qty): ${hashMapNoQty.size}`);
console.log(`Duplicate rows (without Qty): ${rawRows.length - hashMapNoQty.size}`);

