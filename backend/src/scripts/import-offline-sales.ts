#!/usr/bin/env node
/**
 * Import script for Offline Cash/UPI/CC Sales Excel workbook.
 * Usage: npx tsx backend/src/scripts/import-offline-sales.ts [--file "./data/file.xlsx"] [--chunk 500]
 */
import { PrismaClient, Prisma, PaymentMode, SalesOrderStatus } from '@prisma/client';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import XLSX from 'xlsx';

const prisma = new PrismaClient();

// Default chunk size can be overridden via env
const DEFAULT_CHUNK_SIZE = Number(process.env.IMPORT_CHUNK_SIZE || 500);

/**
 * Canonicalize fields for hashing to derive a deterministic, idempotent key.
 */
function canonicalKey(input: {
  orderNo?: string | null;
  isbn?: string | null;
  date?: Date | string | null;
  amount?: Prisma.Decimal | number | string | null;
  customerName?: string | null;
  title?: string | null;
}) {
  const parts = [
    (input.orderNo ?? '').toString().trim().toLowerCase(),
    (input.isbn ?? '').toString().trim().toLowerCase(),
    input.date ? new Date(input.date).toISOString().slice(0, 10) : '',
    (input.amount ?? '').toString().trim(),
    (input.customerName ?? '').toString().trim().toLowerCase(),
    (input.title ?? '').toString().trim().toLowerCase(),
  ];
  return parts.join('|');
}

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Column aliases for normalization
const COLS = {
  orderNo: ['TrnsdocNo', 'Order', 'Order No', 'Order Number', 'order', 'orderno', 'OrderNo'],
  orderStatus: ['Order Status', 'Status', 'orderstatus', 'order_status'],
  month: ['Month', 'month'],
  year: ['Year', 'year'],
  isbn: ['BookCode', 'ISBN', 'isbn'],
  itemCode: ['Item Code', 'ItemCode', 'itemcode', 'item_code', 'Code', 'BookCode'],
  title: ['BookName', 'Title', 'title', 'Book Title', 'Book Name'],
  author: ['Author', 'author'],
  publisher: ['Publishername', 'Publisher', 'publisher'],
  category: ['Category', 'category'],
  description: ['Description', 'description', 'Desc'],
  qty: ['OUT', 'Qty', 'Quantity', 'qty', 'quantity'],
  rate: ['BOOKRATE', 'Rate', 'rate', 'Price', 'Unit Price'],
  amount: ['BOOKRATE', 'Amount', 'Total', 'amount', 'total'],
  discount: ['Discount', 'discount'],
  tax: ['Tax', 'GST', 'tax', 'gst'],
  shipping: ['Shipping', 'Delivery', 'shipping', 'delivery'],
  paymentMode: ['Payment Mode', 'Mode', 'payment', 'paymentmode', 'Payment'],
  customerName: ['Customer Name', 'Customer', 'Name', 'customer', 'customername'],
  mobile: ['Mobile', 'Phone', 'Contact', 'mobile', 'phone'],
  email: ['Email', 'email', 'E-mail'],
  date: ['Trnsdocdate', 'Date', 'date', 'Transaction Date', 'Txn Date', 'Sale Date'],
  publisherCode: ['Publisher Code', 'publishercode', 'publisher_code', 'Pub Code'],
};

function pickByAliases(row: Record<string, any>, aliases: string[]): any {
  for (const key of Object.keys(row)) {
    const norm = key.trim();
    if (aliases.some(a => a.toLowerCase() === norm.toLowerCase())) {
      return row[key];
    }
  }
  return undefined;
}

function toNumberSafe(v: any): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(/[,\s]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIntSafe(v: any): number | null {
  const n = toNumberSafe(v);
  return n == null ? null : Math.trunc(n);
}

function toDateSafe(v: any): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(+v)) return v;
  // Excel may give numbers for dates
  if (typeof v === 'number') {
    const EPOCH = new Date(Date.UTC(1899, 11, 30));
    const ms = v * 24 * 60 * 60 * 1000;
    const d = new Date(EPOCH.getTime() + ms);
    return isNaN(+d) ? null : d;
  }
  const d = new Date(v);
  return isNaN(+d) ? null : d;
}

function toPaymentMode(v: any): PaymentMode | null {
  if (!v) return null;
  const str = String(v).trim().toLowerCase();
  
  if (str.includes('cash')) return PaymentMode.Cash;
  if (str.includes('upi')) return PaymentMode.UPI;
  if (str.includes('card') || str.includes('credit') || str.includes('debit')) return PaymentMode.Card;
  if (str.includes('netbanking') || str.includes('net banking')) return PaymentMode.NetBanking;
  if (str.includes('wallet')) return PaymentMode.Wallet;
  if (str.includes('cheque') || str.includes('check')) return PaymentMode.Cheque;
  if (str.includes('bank') || str.includes('transfer') || str.includes('neft') || str.includes('rtgs')) return PaymentMode.BankTransfer;
  
  return PaymentMode.Other;
}

function toOrderStatus(v: any): SalesOrderStatus | null {
  if (!v) return null;
  const str = String(v).trim().toLowerCase();
  
  if (str === 'complete' || str === 'completed' || str === 'delivered') return SalesOrderStatus.complete;
  if (str === 'pending') return SalesOrderStatus.pending;
  if (str === 'cancelled' || str === 'canceled') return SalesOrderStatus.cancelled;
  if (str === 'refunded' || str === 'refund') return SalesOrderStatus.refunded;
  
  return SalesOrderStatus.unknown;
}

/** Map a raw Excel row into the OfflineCashUPICCSale create input */
function mapRow(raw: Record<string, any>): Prisma.OfflineCashUPICCSaleCreateManyInput {
  const mapped: Prisma.OfflineCashUPICCSaleCreateManyInput = {
    orderNo: pickByAliases(raw, COLS.orderNo)?.toString()?.trim() || null,
    orderStatus: toOrderStatus(pickByAliases(raw, COLS.orderStatus)),
    month: pickByAliases(raw, COLS.month)?.toString()?.trim() || null,
    year: toIntSafe(pickByAliases(raw, COLS.year)),
    isbn: pickByAliases(raw, COLS.isbn)?.toString()?.trim() || null,
    itemCode: pickByAliases(raw, COLS.itemCode)?.toString()?.trim() || null,
    title: pickByAliases(raw, COLS.title)?.toString()?.trim() || null,
    author: pickByAliases(raw, COLS.author)?.toString()?.trim() || null,
    publisher: pickByAliases(raw, COLS.publisher)?.toString()?.trim() || null,
    category: pickByAliases(raw, COLS.category)?.toString()?.trim() || null,
    description: pickByAliases(raw, COLS.description)?.toString()?.trim() || null,
    customerName: pickByAliases(raw, COLS.customerName)?.toString()?.trim() || null,
    mobile: pickByAliases(raw, COLS.mobile)?.toString()?.trim() || null,
    email: pickByAliases(raw, COLS.email)?.toString()?.trim() || null,
    paymentMode: toPaymentMode(pickByAliases(raw, COLS.paymentMode)),
    publisherCode: pickByAliases(raw, COLS.publisherCode)?.toString()?.trim() || null,
    amount: ((): Prisma.Decimal | null => {
      const num = toNumberSafe(pickByAliases(raw, COLS.amount));
      return num == null ? null : new Prisma.Decimal(num.toString());
    })(),
    qty: toIntSafe(pickByAliases(raw, COLS.qty)),
    rate: ((): Prisma.Decimal | null => {
      const num = toNumberSafe(pickByAliases(raw, COLS.rate));
      return num == null ? null : new Prisma.Decimal(num.toString());
    })(),
    discount: ((): Prisma.Decimal | null => {
      const num = toNumberSafe(pickByAliases(raw, COLS.discount));
      return num == null ? null : new Prisma.Decimal(num.toString());
    })(),
    tax: ((): Prisma.Decimal | null => {
      const num = toNumberSafe(pickByAliases(raw, COLS.tax));
      return num == null ? null : new Prisma.Decimal(num.toString());
    })(),
    shipping: ((): Prisma.Decimal | null => {
      const num = toNumberSafe(pickByAliases(raw, COLS.shipping));
      return num == null ? null : new Prisma.Decimal(num.toString());
    })(),
    date: toDateSafe(pickByAliases(raw, COLS.date)),
    rawJson: raw as any,
    rowHash: null, // computed next
  } as any;

  const key = canonicalKey({
    orderNo: mapped.orderNo ?? null,
    isbn: mapped.isbn ?? null,
    date: mapped.date ?? null,
    amount: mapped.amount ? (mapped.amount as any).toString?.() ?? String(mapped.amount) : '',
    customerName: mapped.customerName ?? null,
    title: mapped.title ?? null,
  });
  (mapped as any).rowHash = sha256Hex(key);
  return mapped;
}

async function ensureDataDir(): Promise<string> {
  const p = path.resolve(process.cwd(), 'data');
  await fs.mkdir(p, { recursive: true });
  return p;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { file?: string; chunk?: number } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file' && args[i + 1]) out.file = String(args[++i]);
    if (a === '--chunk' && args[i + 1]) out.chunk = Number(args[++i]);
  }
  return out;
}

/**
 * Import the Excel workbook from the repo's ./data directory.
 */
async function importWorkbookFromDisk(opts?: { filePath?: string; chunkSize?: number }) {
  const start = Date.now();
  const dataDir = await ensureDataDir();
  const filePath = opts?.filePath || path.resolve(process.cwd(), 'data', 'RKP offline Sales.xlsx');
  const chunkSize = opts?.chunkSize || DEFAULT_CHUNK_SIZE;

  const errors: Array<{ sheet: string; index: number; error: string; row?: any }> = [];
  let totalRows = 0;
  let inserted = 0;

  console.log(`📂 Reading file: ${filePath}`);
  
  // Read workbook
  const wb = XLSX.readFile(filePath, { cellDates: true });

  console.log(`📊 Found ${wb.SheetNames.length} sheet(s): ${wb.SheetNames.join(', ')}`);

  // Only process the "Offline-CashUPICC Sales" sheet
  const targetSheet = 'Offline-CashUPICC Sales';
  if (!wb.SheetNames.includes(targetSheet)) {
    throw new Error(`Sheet "${targetSheet}" not found in workbook. Available sheets: ${wb.SheetNames.join(', ')}`);
  }

  for (const sheetName of wb.SheetNames) {
    // Skip sheets that are not the target
    if (sheetName !== targetSheet) {
      console.log(`\n⏭️  Skipping sheet: ${sheetName}`);
      continue;
    }
    
    console.log(`\n🔄 Processing sheet: ${sheetName}`);
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

    console.log(`   Found ${rawRows.length} rows`);

    const toInsert: Prisma.OfflineCashUPICCSaleCreateManyInput[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      if (!r) continue;
      try {
        const mapped = mapRow(r);
        toInsert.push(mapped);
      } catch (e: any) {
        errors.push({ sheet: sheetName, index: i, error: e?.message || String(e), row: r });
      }
    }

    totalRows += rawRows.length;

    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      try {
        const res = await prisma.offlineCashUPICCSale.createMany({ data: chunk, skipDuplicates: true });
        inserted += res.count;
        console.log(`   ✅ Chunk ${Math.floor(i / chunkSize) + 1}: Rows ${i}-${i + chunk.length}, Inserted: ${res.count}`);
      } catch (err: any) {
        console.error(`   ❌ Chunk error at rows ${i}-${i + chunk.length}: ${err?.message}`);
        for (let j = 0; j < chunk.length; j++) {
          errors.push({ sheet: sheetName, index: i + j, error: 'createMany_failed', row: undefined });
        }
      }
    }
  }

  // Write error report if any
  let errorReportPath: string | null = null;
  if (errors.length > 0) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    errorReportPath = path.join(dataDir, `import-offline-errors-${ts}.json`);
    try {
      await fs.writeFile(errorReportPath, JSON.stringify({ errors }, null, 2), 'utf8');
      console.log(`\n⚠️  Error report written to: ${errorReportPath}`);
    } catch (e) {
      console.error('Failed to write error report', e);
    }
  }

  const tookMs = Date.now() - start;
  
  console.log(`\n✨ Import complete!`);
  console.log(`   Total rows processed: ${totalRows}`);
  console.log(`   Rows inserted: ${inserted}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Time taken: ${(tookMs / 1000).toFixed(2)}s`);

  return { totalRows, inserted, errors: errors.length, errorReportPath };
}

(async () => {
  const { file, chunk } = parseArgs();
  const opts: { filePath?: string; chunkSize?: number } = {};
  if (file) opts.filePath = String(file);
  if (typeof chunk === 'number' && !Number.isNaN(chunk)) opts.chunkSize = chunk;
  
  const result = await importWorkbookFromDisk(opts);
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('❌ Import failed:', e);
  prisma.$disconnect();
  process.exit(1);
});

