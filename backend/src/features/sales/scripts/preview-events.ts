#!/usr/bin/env node
/**
 * Preview/import diagnostics for the 4-sheet workbook (or CSV).
 * Prints counts, distinct rowHash stats, and top duplicate keys so we can see
 * why inserts may be 0 (e.g., every row dedupes to the same key).
 *
 * Usage:
 *   npx tsx backend/src/features/sales/scripts/preview-events.ts \
 *     --file "../frontend/RKP offline Sales.xlsx" [--only offline] [--limit 200]
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import XLSX from 'xlsx';

type SheetKey = 'Online' | 'Offline-CashUPICC Sales' | 'RajRadha Event' | 'Lok Event' | string;

function toNumberSafe(v: any): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(/[\s,]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
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

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { file?: string; only?: string; limit?: number; list?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file' && args[i + 1]) out.file = String(args[++i]);
    else if (a === '--only' && args[i + 1]) out.only = String(args[++i]);
    else if (a === '--limit' && args[i + 1]) out.limit = Number(args[++i]);
    else if (a === '--list' || a === '-l') out.list = true;
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

(async () => {
  const { file, only, limit, list } = parseArgs();
  const filePath = await resolveFilePath(file);
  const wb = XLSX.readFile(filePath, { cellDates: true });
  if (list) {
    console.log(JSON.stringify({ sheets: wb.SheetNames }, null, 2));
    return;
  }

  const filter = (only || '').toLowerCase();
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const filterNorm = normalize(filter);

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
    const sampleRows = typeof limit === 'number' && limit > 0 ? rows.slice(0, limit) : rows;

    type Common = {
      orderNo: string | null;
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
      amount: number | null;
      customerName: string | null;
      date: Date | null;
      rowHash: string | null;
    };

    const mapped: Common[] = sampleRows.map((r) => {
      const rateNum = toNumberSafe(pick(r, ['Rate', 'rate', 'Price', 'MRP', 'BOOKRATE']));
      const qtyNum = toNumberSafe(pick(r, ['Qty', 'Quantity', 'OUT']));
      let amountNum = toNumberSafe(pick(r, ['Selling Price', 'Amount', 'amount', 'Total', 'Net Amount', 'Total Amount']));
      if ((amountNum == null || amountNum === 0) && (qtyNum != null) && (rateNum != null)) {
        amountNum = Number((qtyNum * rateNum).toFixed(2));
      }
      const common: Common = {
        orderNo: normalizeString(pick(r, ['Order No', 'Order', 'orderNo', 'Order Number'])),
        month: normalizeString(pick(r, ['Month'])),
        year: toNumberSafe(pick(r, ['Year'])) ?? null,
        isbn: normalizeString(pick(r, ['ISBN', 'Isbn'])),
        itemCode: normalizeString(pick(r, ['Item Code', 'ItemCode', 'Code'])),
        title: normalizeString(pick(r, ['Title', 'Book Title', 'BookName', 'Book', 'Product', 'Item', 'Description'])),
        author: normalizeString(pick(r, ['Author'])),
        publisher: normalizeString(pick(r, ['Publisher'])),
        category: normalizeString(pick(r, ['Category'])),
        description: normalizeString(pick(r, ['Description'])),
        qty: qtyNum ?? null,
        amount: amountNum ?? null,
        customerName: normalizeString(pick(r, ['Customer Name', 'Customer', 'Name'])),
        date: ((): Date | null => {
          const d1 = toDateSafe(pick(r, ['Date', 'Txn Date', 'Transaction Date', 'Trnsdocdate']));
          if (d1) return d1;
          for (const v of Object.values(r)) {
            if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
              const d = new Date(v);
              if (!isNaN(+d)) return d;
            }
          }
          return null;
        })(),
        rowHash: null,
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
        rate: rateNum?.toString() || '',
      });
      common.rowHash = sha256Hex(key);
      return common;
    });

    const stats = new Map<string, number>();
    for (const m of mapped) stats.set(m.rowHash!, (stats.get(m.rowHash!) || 0) + 1);

    const top = [...stats.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hash, count]) => ({ hash, count }));

    console.log(JSON.stringify({
      msg: 'events_preview',
      sheet: sheetName,
      rows: rows.length,
      sampled: mapped.length,
      distinctRowHashes: stats.size,
      topDuplicateKeys: top,
      sample: mapped.slice(0, 3).map(r => ({
        orderNo: r.orderNo,
        isbn: r.isbn,
        title: r.title,
        customerName: r.customerName,
        amount: r.amount,
        date: r.date?.toISOString(),
        rowHash: r.rowHash,
      })),
    }, null, 2));
  }
})().catch((e) => {
  console.error('events_preview_failed', e);
  process.exit(1);
});
