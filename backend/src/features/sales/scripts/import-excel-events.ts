#!/usr/bin/env node
/**
 * Import the 4-sheet Excel workbook into 4 event tables in the main Prisma schema.
 * Tables: OnlineSale, OfflineCashUPICCSale, RajRadhaEventSale, LokEventSale
 *
 * Usage:
 *   npx tsx backend/src/features/sales/scripts/import-excel-events.ts [--file "./data/RKP offline Sales.xlsx"] [--chunk 500]
 *   Filters: --only online|offline|raj|lok (or any substring of sheet name)
 *   Override target model: --target online|offline|raj|lok (forces destination table even if sheet name doesn't match)
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import XLSX from 'xlsx';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_CHUNK_SIZE = Number(process.env.IMPORT_CHUNK_SIZE || 500);

type SheetKey = 'Online' | 'Offline-CashUPICC Sales' | 'RajRadha Event' | 'Lok Event' | string;

function toNumberSafe(v: any): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(/[\s,]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDecimalOrNull(n: number | null): Prisma.Decimal | null {
  return n == null ? null : new Prisma.Decimal(n.toString());
}

function toDateSafe(v: any): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(+v)) return v;
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    return isNaN(+d) ? null : d;
  }
  const d = new Date(v);
  return isNaN(+d) ? null : d;
}

function normalizeString(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

const PaymentModeMap: Record<string, string> = {
  'cash': 'Cash',
  'upi': 'UPI',
  'card': 'Card',
  'cc': 'Card',
  'creditcard': 'Card',
  'credit card': 'Card',
  'debitcard': 'Card',
  'debit card': 'Card',
  'netbanking': 'NetBanking',
  'net banking': 'NetBanking',
  'wallet': 'Wallet',
  'cheque': 'Cheque',
  'banktransfer': 'BankTransfer',
  'bank transfer': 'BankTransfer',
  'cash/upi': 'UPI',
  'upi/cash': 'UPI',
  'cashupi': 'UPI',
};

function mapPaymentMode(v: any): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;
  return PaymentModeMap[s] ?? 'Other';
}

const OrderStatusMap: Record<string, string> = {
  'complete': 'complete',
  'completed': 'complete',
  'pending': 'pending',
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  'refunded': 'refunded',
  'unknown': 'unknown',
};

function mapOrderStatus(v: any): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;
  return OrderStatusMap[s] ?? 'unknown';
}

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function canonicalKey(input: Record<string, any>) {
  const parts = [
    (input.sheet || '').toString().trim().toLowerCase(),
    (input.orderNo || '').toString().trim().toLowerCase(),
    (input.isbn || '').toString().trim().toLowerCase(),
    input.date
      ? new Date(input.date).toISOString().slice(0, 10)
      : `${(input.month || '').toString().trim().toLowerCase()}-${(input.year || '').toString().trim()}`,
    (input.amount || '').toString().trim(),
    (input.customerName || '').toString().trim().toLowerCase(),
    (input.title || '').toString().trim().toLowerCase(),
    (input.itemCode || '').toString().trim().toLowerCase(),
    (input.qty || '').toString().trim(),
    (input.rate || '').toString().trim(),
  ];
  return parts.join('|');
}

// Generic value picker using candidate column names
function pick(row: Record<string, any>, names: string[]): any {
  for (const k of Object.keys(row)) {
    if (names.some(n => n.toLowerCase() === k.toLowerCase())) return row[k];
  }
  return undefined;
}

function normalizeTargetName(input?: string): 'online' | 'offline' | 'raj' | 'lok' | '' {
  if (!input) return '';
  const s = String(input).toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (s === 'online' || s.endsWith('onlinesale')) return 'online';
  if (s === 'offline' || s.endsWith('offlinecashupiccsale')) return 'offline';
  if (s === 'raj' || s.endsWith('rajradhaeventsale') || s.includes('rajradha')) return 'raj';
  if (s === 'lok' || s.endsWith('lokeventsale') || s.includes('lokevent')) return 'lok';
  return '';
}

async function importSheet(sheetName: string, rows: Record<string, any>[], opts?: { target?: string }) {
  const chunkSize = DEFAULT_CHUNK_SIZE;
  let inserted = 0;
  const toWriteErrors: Array<{ index: number; error: string }> = [];

  // Build model-agnostic mapped rows, then dispatch based on sheet
  type Common = {
    orderNo: string | null;
    orderStatus: string | null;
    month: string | null;
    year: number | null;
    isbn: string | null;
    itemCode: string | null;
    title: string | null;
    author: string | null;
    publisher: string | null;
    category: string | null;
    description: string | null;
    qty: number | null;
    rate: Prisma.Decimal | null;
    amount: Prisma.Decimal | null;
    discount: Prisma.Decimal | null;
    tax: Prisma.Decimal | null;
    shipping: Prisma.Decimal | null;
    paymentMode: string | null;
    customerName: string | null;
    mobile: string | null;
    email: string | null;
    date: Date | null;
    publisherCode: string | null;
    rowHash: string | null;
    rawJson: Prisma.InputJsonValue;
  };

  const mapped: Common[] = rows.map((r, idx) => {
    try {
      // Online sheets sometimes use 'Selling Price' for net amount
      const rateNum = toNumberSafe(pick(r, ['Rate', 'rate', 'Price', 'MRP', 'BOOKRATE']));
      let amountNum = toNumberSafe(pick(r, ['Selling Price', 'Amount', 'amount', 'Total', 'Net Amount', 'Total Amount']));
      // qty aliases include OUT in legacy offline exports
      const qtyNum = toNumberSafe(pick(r, ['Qty', 'Quantity', 'OUT']));
      // If amount missing but we have qty and rate, derive it
      if ((amountNum == null || amountNum === 0) && (qtyNum != null) && (rateNum != null)) {
        amountNum = Number((qtyNum * rateNum).toFixed(2));
      }
      const rate = toDecimalOrNull(rateNum);
      const amount = toDecimalOrNull(amountNum);
      const discount = toDecimalOrNull(toNumberSafe(pick(r, ['Discount', 'discount'])));
      const tax = toDecimalOrNull(toNumberSafe(pick(r, ['Tax', 'GST', 'tax'])));
      const shipping = toDecimalOrNull(toNumberSafe(pick(r, ['Shipping', 'Freight', 'shipping'])));
      const common: Common = {
        orderNo: normalizeString(pick(r, ['Order No', 'Order', 'orderNo', 'Order Number'])),
        orderStatus: mapOrderStatus(pick(r, ['Status', 'Order Status'])),
        month: normalizeString(pick(r, ['Month'])),
        year: toNumberSafe(pick(r, ['Year'])) ?? null,
        isbn: normalizeString(pick(r, ['ISBN', 'Isbn'])),
        itemCode: normalizeString(pick(r, ['Item Code', 'ItemCode', 'Code'])),
        title: normalizeString(pick(r, ['Title', 'Book Title', 'BookName', 'Book', 'Product', 'Item', 'Description'])),
        author: normalizeString(pick(r, ['Author'])),
        publisher: normalizeString(pick(r, ['Publisher'])),
        category: normalizeString(pick(r, ['Category'])),
        description: normalizeString(pick(r, ['Description'])),
        qty: (qtyNum ?? null),
        rate,
        amount,
        discount,
        tax,
        shipping,
        paymentMode: mapPaymentMode(pick(r, ['Payment Mode', 'Mode', 'Payment'])),
        customerName: normalizeString(pick(r, ['Customer Name', 'Customer', 'Name'])),
        mobile: normalizeString(pick(r, ['Mobile', 'Phone', 'Contact'])),
        email: normalizeString(pick(r, ['Email', 'E-mail'])),
        date: ((): Date | null => {
          const d1 = toDateSafe(pick(r, ['Date', 'Txn Date', 'Transaction Date', 'Trnsdocdate']));
          if (d1) return d1;
          // Fallback: scan for first ISO-like date value in row
          for (const v of Object.values(r)) {
            if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
              const d = new Date(v);
              if (!isNaN(+d)) return d;
            }
          }
          return null;
        })(),
        publisherCode: normalizeString(pick(r, ['Publisher Code', 'Pub Code'])),
        rowHash: null,
        rawJson: r as any,
      };
      const key = canonicalKey({
        sheet: sheetName,
        orderNo: common.orderNo,
        isbn: common.isbn,
        date: common.date,
        month: common.month,
        year: common.year,
        amount: common.amount?.toString() || '',
        customerName: common.customerName,
        title: common.title,
        itemCode: common.itemCode,
        qty: common.qty,
        rate: common.rate?.toString() || '',
      });
      common.rowHash = sha256Hex(key);
      return common;
    } catch (e: any) {
      toWriteErrors.push({ index: idx, error: e?.message || 'map_failed' });
      return null as any;
    }
  }).filter(Boolean);

  // Insert per sheet/model
  const chunks: Common[][] = [];
  for (let i = 0; i < mapped.length; i += chunkSize) chunks.push(mapped.slice(i, i + chunkSize));

  const target = normalizeTargetName(opts?.target);
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    try {
      let res: { count: number } = { count: 0 };
      if (target === 'online') {
        res = await prisma.onlineSale.createMany({ data: chunk as any, skipDuplicates: true });
      } else if (target === 'offline') {
        res = await prisma.offlineCashUPICCSale.createMany({ data: chunk as any, skipDuplicates: true });
      } else if (target === 'raj') {
        res = await prisma.rajRadhaEventSale.createMany({ data: chunk as any, skipDuplicates: true });
      } else if (target === 'lok') {
        res = await prisma.lokEventSale.createMany({ data: chunk as any, skipDuplicates: true });
      } else if (/^online/i.test(sheetName)) {
        res = await prisma.onlineSale.createMany({ data: chunk as any, skipDuplicates: true });
      } else if (/offline/i.test(sheetName)) {
        res = await prisma.offlineCashUPICCSale.createMany({ data: chunk as any, skipDuplicates: true });
      } else if (/raj\s*radha/i.test(sheetName)) {
        res = await prisma.rajRadhaEventSale.createMany({ data: chunk as any, skipDuplicates: true });
      } else if (/lok/i.test(sheetName)) {
        res = await prisma.lokEventSale.createMany({ data: chunk as any, skipDuplicates: true });
      } else {
        // Fallback: treat as offline unless specified
        res = await prisma.offlineCashUPICCSale.createMany({ data: chunk as any, skipDuplicates: true });
      }
      inserted += res.count;
      console.log(JSON.stringify({ msg: 'events_import_chunk_ok', sheet: sheetName, chunk: ci, inserted: res.count }));
    } catch (e: any) {
      console.error(JSON.stringify({ msg: 'events_import_chunk_error', sheet: sheetName, chunk: ci, error: e?.message }));
    }
  }

  return { inserted, errors: toWriteErrors };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { file?: string; chunk?: number; only?: string; list?: boolean; target?: string } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file' && args[i + 1]) out.file = String(args[++i]);
    else if (a === '--chunk' && args[i + 1]) out.chunk = Number(args[++i]);
    else if (a === '--only' && args[i + 1]) out.only = String(args[++i]);
    else if (a === '--list' || a === '-l') out.list = true;
    else if (a === '--target' && args[i + 1]) out.target = String(args[++i]);
  }
  return out;
}

async function resolveFilePath(input?: string): Promise<string> {
  if (!input) return path.resolve('data', 'RKP offline Sales.xlsx');
  const p = input;
  const candidates = [
    path.isAbsolute(p) ? p : path.resolve(process.cwd(), p),
    path.resolve(process.cwd(), '..', p),
  ];
  for (const c of candidates) {
    try { await fs.access(c); return c; } catch {}
  }
  throw new Error(`File not found at: ${candidates.join(' , ')}`);
}

async function ensureDataDir(): Promise<string> {
  const p = path.resolve(process.cwd(), 'data');
  await fs.mkdir(p, { recursive: true });
  return p;
}

(async () => {
  const { file, chunk, only, list, target } = parseArgs();
  const dataDir = await ensureDataDir();
  const filePath = await resolveFilePath(file);
  const wb = XLSX.readFile(filePath, { cellDates: true });
  if (list) {
    console.log(JSON.stringify({ sheets: wb.SheetNames }, null, 2));
    await prisma.$disconnect();
    return;
  }
  const start = Date.now();

  let totalInserted = 0;
  const errorList: Array<{ sheet: string; index: number; error: string }> = [];

  const filter = (only || '').toLowerCase();
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const filterNorm = normalize(filter);
  const baseName = path.basename(filePath).toLowerCase();
  const baseDerivedTarget = normalizeTargetName(baseName);
  for (const sheetName of wb.SheetNames) {
    if (filter) {
      const s = sheetName.toLowerCase();
      const sNorm = normalize(s);
      const matches = (
        (filter === 'online' && /online/.test(s)) ||
        (filter === 'offline' && /offline/.test(s)) ||
        (filter === 'raj' && /raj\s*radha/.test(s)) ||
        (filter === 'lok' && /lok/.test(s)) ||
        s.includes(filter) ||
        (filterNorm && sNorm.includes(filterNorm))
      );
      if (!matches) continue;
    }
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null });
    // If user didn't pass --target, try to derive from sheet name or file name
    const sheetDerived = normalizeTargetName(sheetName);
    const effTarget = normalizeTargetName(target) || sheetDerived || baseDerivedTarget || '';
    const res = await importSheet(sheetName, rows, { target: effTarget });
    totalInserted += res.inserted;
    for (const e of res.errors) errorList.push({ sheet: sheetName, index: e.index, error: e.error });
  }

  let errorReportPath: string | null = null;
  if (errorList.length > 0) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    errorReportPath = path.join(dataDir, `import-events-errors-${ts}.json`);
    try {
      await fs.writeFile(errorReportPath, JSON.stringify({ errors: errorList }, null, 2), 'utf8');
    } catch (e) {
      console.error('failed_write_error_report', e);
    }
  }

  const tookMs = Date.now() - start;
  console.log(JSON.stringify({ msg: 'events_import_done', inserted: totalInserted, errors: errorList.length, tookMs, errorReportPath }));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('events_import_failed', e);
  await prisma.$disconnect();
  process.exit(1);
});
