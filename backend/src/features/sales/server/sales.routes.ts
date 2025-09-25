import express from 'express';
import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import XLSX from 'xlsx';
import { Prisma, PrismaClient } from '../prisma/generated/client/index.js';

// Subtle: keep a singleton client for this feature to avoid multiple connection pools
const salesPrisma = new PrismaClient();

// Default chunk size can be overridden via env
const DEFAULT_CHUNK_SIZE = Number(process.env.IMPORT_CHUNK_SIZE || 500);

/**
 * Canonicalize fields for hashing to derive a deterministic, idempotent key.
 * Keep the set small and stable to avoid accidental hash diffs on unrelated data.
 */
function canonicalKey(input: {
  source?: string | null;
  orderNo?: string | null;
  isbn?: string | null;
  date?: Date | string | null;
  amount?: Prisma.Decimal | number | string | null;
  customerName?: string | null;
}) {
  const parts = [
    (input.source ?? '').toString().trim().toLowerCase(),
    (input.orderNo ?? '').toString().trim().toLowerCase(),
    (input.isbn ?? '').toString().trim().toLowerCase(),
    input.date ? new Date(input.date).toISOString().slice(0, 10) : '',
    (input.amount ?? '').toString().trim(),
    (input.customerName ?? '').toString().trim().toLowerCase(),
  ];
  return parts.join('|');
}

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Column aliases for normalization
const COLS = {
  customerName: ['Customer Name', 'Customer', 'Name', 'customer', 'customername'],
  mobile: ['Mobile', 'Phone', 'Contact', 'mobile'],
  paymentMode: ['Payment Mode', 'Mode', 'payment', 'paymentmode'],
  amount: ['Amount', 'Rate', 'Total', 'amount', 'rate', 'total'],
  date: ['Date', 'date', 'Transaction Date', 'Txn Date'],
  orderNo: ['Order', 'Order No', 'Order Number', 'order', 'orderno'],
  isbn: ['ISBN', 'isbn'],
  title: ['Title', 'title', 'Book Title'],
  author: ['Author', 'author'],
  publisher: ['Publisher', 'publisher'],
  qty: ['Qty', 'Quantity', 'qty', 'quantity'],
  rate: ['Rate', 'rate'],
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

function toDateSafe(v: any): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(+v)) return v;
  // Excel may give numbers for dates if cell type not preserved; attempt conversion heuristically
  if (typeof v === 'number') {
    // Excel serial (days since 1899-12-30). We avoid SSF to keep deps minimal.
    const EPOCH = new Date(Date.UTC(1899, 11, 30));
    const ms = v * 24 * 60 * 60 * 1000;
    const d = new Date(EPOCH.getTime() + ms);
    return isNaN(+d) ? null : d;
  }
  const d = new Date(v);
  return isNaN(+d) ? null : d;
}

/** Map a raw Excel row into the Sale create input */
function mapRow(sheetName: string, raw: Record<string, any>) {
  const mapped: Prisma.SaleCreateManyInput = {
    source: sheetName,
    orderNo: pickByAliases(raw, COLS.orderNo)?.toString()?.trim() || null,
    isbn: pickByAliases(raw, COLS.isbn)?.toString()?.trim() || null,
    title: pickByAliases(raw, COLS.title)?.toString()?.trim() || null,
    author: pickByAliases(raw, COLS.author)?.toString()?.trim() || null,
    publisher: pickByAliases(raw, COLS.publisher)?.toString()?.trim() || null,
    customerName: pickByAliases(raw, COLS.customerName)?.toString()?.trim() || null,
    mobile: pickByAliases(raw, COLS.mobile)?.toString()?.trim() || null,
    paymentMode: pickByAliases(raw, COLS.paymentMode)?.toString()?.trim() || null,
    amount: ((): Prisma.Decimal | null => {
      const num = toNumberSafe(pickByAliases(raw, COLS.amount));
      return num == null ? null : new Prisma.Decimal(num.toString());
    })(),
    qty: ((): number | null => {
      const n = toNumberSafe(pickByAliases(raw, COLS.qty));
      return n == null ? null : Math.trunc(n);
    })(),
    rate: ((): Prisma.Decimal | null => {
      const num = toNumberSafe(pickByAliases(raw, COLS.rate));
      return num == null ? null : new Prisma.Decimal(num.toString());
    })(),
    date: toDateSafe(pickByAliases(raw, COLS.date)),
    rawJson: raw as any,
    rowHash: null, // computed next
  } as any;

  const key = canonicalKey({
    source: mapped.source,
    orderNo: mapped.orderNo ?? null,
    isbn: mapped.isbn ?? null,
    date: mapped.date ?? null,
    amount: mapped.amount ? (mapped.amount as any).toString?.() ?? String(mapped.amount) : '',
    customerName: mapped.customerName ?? null,
  });
  (mapped as any).rowHash = sha256Hex(key);
  return mapped;
}

async function ensureDataDir(): Promise<string> {
  const p = path.resolve(process.cwd(), 'data');
  await fs.mkdir(p, { recursive: true });
  return p;
}

/**
 * Import the Excel workbook from the repo's ./data directory.
 * Continues on chunk errors, writing an error report and returning counts.
 */
export async function importWorkbookFromDisk(opts?: { filePath?: string; chunkSize?: number }) {
  const start = Date.now();
  const dataDir = await ensureDataDir();
  const filePath = opts?.filePath || path.resolve(process.cwd(), 'data', 'RKP offline Sales.xlsx');
  const chunkSize = opts?.chunkSize || DEFAULT_CHUNK_SIZE;

  const errors: Array<{ sheet: string; index: number; error: string; row?: any }> = [];
  let totalRows = 0;
  let inserted = 0;

  // Read workbook
  const wb = XLSX.readFile(filePath, { cellDates: true });

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

    const toInsert: Prisma.SaleCreateManyInput[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      if (!r) continue;
      try {
        const mapped = mapRow(sheetName, r);
        // Minimal validation: require source and at least one identifier or amount/date
        if (!mapped.source) throw new Error('Missing source');
        toInsert.push(mapped);
      } catch (e: any) {
        errors.push({ sheet: sheetName, index: i, error: e?.message || String(e), row: r });
      }
    }

    totalRows += rawRows.length;

    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      try {
        const res = await salesPrisma.sale.createMany({ data: chunk, skipDuplicates: true });
        inserted += res.count;
        // concise log for observability
        console.log(JSON.stringify({ msg: 'sales_import_chunk_ok', sheet: sheetName, from: i, to: i + chunk.length, inserted: res.count }));
      } catch (err: any) {
        console.error(JSON.stringify({ msg: 'sales_import_chunk_error', sheet: sheetName, from: i, to: i + chunk.length, error: err?.message }));
        // Collect per-row error references rather than duplicating rows
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
    errorReportPath = path.join(dataDir, `import-errors-${ts}.json`);
    try {
      await fs.writeFile(errorReportPath, JSON.stringify({ errors }, null, 2), 'utf8');
    } catch (e) {
      console.error('failed_write_error_report', e);
    }
  }

  const tookMs = Date.now() - start;
  console.log(JSON.stringify({ msg: 'sales_import_done', totalRows, inserted, errors: errors.length, tookMs }));

  return { totalRows, inserted, errors: errors.length, errorReportPath };
}

const router = express.Router();

// POST /api/sales/import — triggers server-side import
router.post('/import', async (_req, res) => {
  try {
    const result = await importWorkbookFromDisk();
    res.status(200).json({ ok: true, ...result });
  } catch (e: any) {
    console.error('sales_import_failed', e);
    res.status(500).json({ ok: false, error: 'Import failed' });
  }
});

// GET /api/sales?limit=200&cursorId=<id>
router.get('/', async (req, res) => {
  const Q = z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).default('200').pipe(z.number().min(1).max(1000)),
    cursorId: z.string().regex(/^\d+$/).optional(),
  });
  const parse = Q.safeParse({ limit: req.query.limit ?? '200', cursorId: req.query.cursorId });
  if (!parse.success) return res.status(400).json({ ok: false, error: 'Invalid query' });
  const { limit, cursorId } = parse.data;

  try {
    const where: Prisma.SaleWhereInput = {};
    const orderBy: Prisma.SaleOrderByWithRelationInput = { id: 'desc' };
    const args: Prisma.SaleFindManyArgs = { where, orderBy, take: limit } as any;
    if (cursorId) {
      (args as any).skip = 1;
      (args as any).cursor = { id: BigInt(cursorId) } as any;
    }
    const items = await salesPrisma.sale.findMany(args);
    // BigInt safe serialization
    const data = items.map((it: any) => ({ ...it, id: it.id.toString() }));
    const last = (data as any[]).at(-1);
    const nextCursorId = last?.id ?? null;
    return res.json({ ok: true, items: data, nextCursorId });
  } catch (e: any) {
    console.error('sales_list_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to fetch sales' });
  }
});

// GET /api/sales/summary
router.get('/summary', async (req, res) => {
  const Q = z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    source: z.string().optional(),
  });
  const parse = Q.safeParse({ days: req.query.days, source: req.query.source });
  if (!parse.success) return res.status(400).json({ ok: false, error: 'Invalid query' });
  const days = parse.data.days ?? 90;
  const source = parse.data.source?.toString().trim();

  try {
    const whereBase: Prisma.SaleWhereInput = source ? { source } : {};

    const bySource = await salesPrisma.sale.groupBy({
      by: ['source'],
      _sum: { amount: true },
      where: whereBase,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const byPayment = await salesPrisma.sale.groupBy({
      by: ['paymentMode'],
      _sum: { amount: true },
      where: whereBase,
      orderBy: { _sum: { amount: 'desc' } },
    });

    // Time series in JS: last N days
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const seriesRows = await salesPrisma.sale.findMany({
      where: { ...whereBase, date: { gte: since } },
      select: { date: true, amount: true },
    });
    const tsMap = new Map<string, number>();
    for (const r of seriesRows) {
      if (!r.date) continue;
      const key = new Date(r.date).toISOString().slice(0, 10);
      const val = r.amount ? Number(r.amount.toString()) : 0;
      tsMap.set(key, (tsMap.get(key) || 0) + val);
    }
    const timeSeries = Array.from(tsMap.entries()).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, total]) => ({ date, total }));

    // Top items by sum(amount)
    const topItems = await salesPrisma.sale.groupBy({
      by: ['title'],
      where: { ...whereBase, title: { not: null } },
      _sum: { amount: true, qty: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    return res.json({
      ok: true,
      bySource: bySource.map((x: any) => ({ source: x.source, total: Number(x._sum.amount?.toString() || '0') })),
      paymentMode: byPayment.map((x: any) => ({ paymentMode: x.paymentMode || 'Unknown', total: Number(x._sum.amount?.toString() || '0') })),
      timeSeries,
      topItems: topItems.map((x: any) => ({ title: x.title || 'Unknown', total: Number(x._sum.amount?.toString() || '0'), qty: x._sum.qty || 0 })),
    });
  } catch (e: any) {
    console.error('sales_summary_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to compute summary' });
  }
});

// GET /api/sales/counts — totals
router.get('/counts', async (_req, res) => {
  try {
    const [count, sum] = await Promise.all([
      salesPrisma.sale.count(),
      salesPrisma.sale.aggregate({ _sum: { amount: true } }),
    ]);
    return res.json({ ok: true, totalCount: count, totalAmount: Number(sum._sum.amount?.toString() || '0') });
  } catch (e: any) {
    console.error('sales_counts_failed', e);
    return res.status(500).json({ ok: false, error: 'Failed to fetch counts' });
  }
});

export default router;
