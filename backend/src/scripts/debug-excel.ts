#!/usr/bin/env node
/**
 * Debug script to examine Excel data
 */
import path from 'node:path';
import XLSX from 'xlsx';
import crypto from 'node:crypto';

const filePath = path.resolve(process.cwd(), 'data', 'RKP offline Sales.xlsx');
const wb = XLSX.readFile(filePath, { cellDates: true });

const sheetName = 'Offline-CashUPICC Sales';
const ws = wb.Sheets[sheetName];
const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

console.log(`\n📊 Sheet: ${sheetName}`);
console.log(`Total rows: ${rawRows.length}\n`);

// Show first 5 rows
console.log('=== First 5 Rows ===');
for (let i = 0; i < Math.min(5, rawRows.length); i++) {
  console.log(`\nRow ${i + 1}:`);
  console.log(JSON.stringify(rawRows[i], null, 2));
}

// Show column names
console.log('\n=== Column Names ===');
if (rawRows.length > 0) {
  console.log(Object.keys(rawRows[0]));
}

// Check for duplicate hashes
console.log('\n=== Hash Analysis ===');

// Helper function to pick by aliases
function pickByAliases(row: Record<string, any>, aliases: string[]): any {
  for (const key of Object.keys(row)) {
    const norm = key.trim();
    if (aliases.some(a => a.toLowerCase() === norm.toLowerCase())) {
      return row[key];
    }
  }
  return undefined;
}

const COLS = {
  orderNo: ['TrnsdocNo', 'Order', 'Order No'],
  isbn: ['BookCode', 'ISBN', 'isbn'],
  title: ['BookName', 'Title'],
  date: ['Trnsdocdate', 'Date'],
  amount: ['BOOKRATE', 'Amount'],
};

function canonicalKey(input: any) {
  const orderNo = pickByAliases(input, COLS.orderNo);
  const isbn = pickByAliases(input, COLS.isbn);
  const title = pickByAliases(input, COLS.title);
  const date = pickByAliases(input, COLS.date);
  const amount = pickByAliases(input, COLS.amount);
  
  let dateStr = '';
  try {
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().slice(0, 10);
      }
    }
  } catch (e) {
    // Invalid date
  }
  
  const parts = [
    (orderNo ?? '').toString().trim().toLowerCase(),
    (isbn ?? '').toString().trim().toLowerCase(),
    dateStr,
    (amount ?? '').toString().trim(),
    '', // customerName (not in this sheet)
    (title ?? '').toString().trim().toLowerCase(),
  ];
  return parts.join('|');
}

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

const hashMap = new Map<string, number>();
for (const row of rawRows) {
  const key = canonicalKey(row);
  const hash = sha256Hex(key);
  hashMap.set(hash, (hashMap.get(hash) || 0) + 1);
}

console.log(`Total unique hashes: ${hashMap.size}`);
console.log(`Total rows: ${rawRows.length}`);
console.log(`Duplicate rows: ${rawRows.length - hashMap.size}`);

// Show most common duplicates
const sorted = Array.from(hashMap.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

console.log('\n=== Top 5 Most Common Hashes ===');
for (const [hash, count] of sorted) {
  console.log(`Hash: ${hash.substring(0, 16)}... appears ${count} times`);
}

