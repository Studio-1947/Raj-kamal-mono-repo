import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import XLSX from 'xlsx';
import { Prisma, PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();
const router = express.Router();

function sha256Hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

const COLS = {
  slNo: ['Sl No', 'SlNo', 'S.No', 'S No'],
  date: ['Date', 'date', 'Transaction Date', 'Txn Date'],
  orderId: ['Order Id', 'Order ID', 'OrderId'],
  orderStatus: ['Order Status', 'Status'],
  isbn: ['ISBN No', 'ISBN', 'isbn'],
  title: ['Title', 'Book Title'],
  author: ['Author'],
  category: ['Category'],
  publicationName: ['Publication Name', 'Publisher', 'Publication'],
  releaseDate: ['Release Date'],
  noOfPages: ['No of Pages', 'Pages'],
  name: ['Name', 'Customer Name', 'Customer'],
  pincode: ['Pincode', 'Pin Code', 'Postal Code'],
  gender: ['Gender'],
  ageGroup: ['Age Group'],
  mobile: ['Mobile No', 'Mobile', 'Phone'],
  email: ['Email', 'E-mail'],
  membershipId: ['Membership Id', 'Membership ID'],
  paymentMode: ['Payment Mode', 'Mode', 'Payment'],
  mrp: ['MRP'],
  sellingPrice: ['Selling Price', 'Amount', 'Total'],
  discountCouponCode: ['Discount/Coupon Code', 'Coupon Code', 'Discount Code'],
} as const;

function pickByAliases(row: Record<string, any>, aliases: readonly string[]) {
  for (const key of Object.keys(row)) {
    const norm = key.trim();
    if (aliases.some((a) => a.toLowerCase() === norm.toLowerCase()))
      return row[key];
  }
  return undefined;
}

function toNumberSafe(v: any): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(/[\s,]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDecimal(v: any): Prisma.Decimal | null {
  const n = toNumberSafe(v);
  return n == null ? null : new Prisma.Decimal(n.toString());
}

function toInt(v: any): number | null {
  const n = toNumberSafe(v);
  return n == null ? null : Math.trunc(n);
}

function toDateSafe(v: any): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(+v)) return v;
  if (typeof v === 'number') {
    const EPOCH = new Date(Date.UTC(1899, 11, 30));
    const ms = v * 24 * 60 * 60 * 1000;
    const d = new Date(EPOCH.getTime() + ms);
    return isNaN(+d) ? null : d;
  }
  const d = new Date(v);
  return isNaN(+d) ? null : d;
}

function canonicalKey(input: {
  orderId?: string | null;
  isbn?: string | null;
  date?: Date | string | null;
  sellingPrice?: Prisma.Decimal | number | string | null;
  name?: string | null;
}) {
  const parts = [
    (input.orderId ?? '').toString().trim().toLowerCase(),
    (input.isbn ?? '').toString().trim().toLowerCase(),
    input.date ? new Date(input.date).toISOString().slice(0, 10) : '',
    (input.sellingPrice ?? '').toString().trim(),
    (input.name ?? '').toString().trim().toLowerCase(),
  ];
  return parts.join('|');
}

async function resolveDefaultFilePath(): Promise<string | null> {
  const candidates = [
    process.env.RKDATA_FILE,
    path.join(process.cwd(), 'data', 'Rajkamal-datas.xlsx'),
    path.join(process.cwd(), '..', 'Rajkamal-datas.xlsx'),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {}
  }
  return null;
}

export async function importRkDataFromDisk(opts?: { filePath?: string; chunkSize?: number }) {
  const start = Date.now();
  const filePath = opts?.filePath || (await resolveDefaultFilePath());
  if (!filePath) {
    return { totalRows: 0, inserted: 0, errors: 0, errorReportPath: null };
  }

  const wb = XLSX.readFile(filePath);
  let totalRows = 0;
  let inserted = 0;
  const errors: Array<{ sheet: string; index: number; error: string }> = [];
  const chunkSize = opts?.chunkSize || Number(process.env.IMPORT_CHUNK_SIZE || 500);

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { raw: true });
    totalRows += rows.length;
    if (rows.length === 0) continue;

    const mapped: Prisma.RkDataCreateManyInput[] = rows.map((r) => {
      const o: Prisma.RkDataCreateManyInput = {
        slNo: toInt(pickByAliases(r, COLS.slNo)),
        date: toDateSafe(pickByAliases(r, COLS.date)),
        orderId: pickByAliases(r, COLS.orderId)?.toString()?.trim() || null,
        orderStatus: pickByAliases(r, COLS.orderStatus)?.toString()?.trim() || null,
        isbn: pickByAliases(r, COLS.isbn)?.toString()?.trim() || null,
        title: pickByAliases(r, COLS.title)?.toString()?.trim() || null,
        author: pickByAliases(r, COLS.author)?.toString()?.trim() || null,
        category: pickByAliases(r, COLS.category)?.toString()?.trim() || null,
        publicationName: pickByAliases(r, COLS.publicationName)?.toString()?.trim() || null,
        releaseDate: toDateSafe(pickByAliases(r, COLS.releaseDate)),
        noOfPages: toInt(pickByAliases(r, COLS.noOfPages)),
        name: pickByAliases(r, COLS.name)?.toString()?.trim() || null,
        pincode: pickByAliases(r, COLS.pincode)?.toString()?.trim() || null,
        gender: pickByAliases(r, COLS.gender)?.toString()?.trim() || null,
        ageGroup: pickByAliases(r, COLS.ageGroup)?.toString()?.trim() || null,
        mobile: pickByAliases(r, COLS.mobile)?.toString()?.trim() || null,
        email: pickByAliases(r, COLS.email)?.toString()?.trim() || null,
        membershipId: pickByAliases(r, COLS.membershipId)?.toString()?.trim() || null,
        paymentMode: pickByAliases(r, COLS.paymentMode)?.toString()?.trim() || null,
        mrp: toDecimal(pickByAliases(r, COLS.mrp)),
        sellingPrice: toDecimal(pickByAliases(r, COLS.sellingPrice)),
        discountCouponCode: pickByAliases(r, COLS.discountCouponCode)?.toString()?.trim() || null,
        rawJson: r as any,
        rowHash: null,
      } as any;

      const key = canonicalKey({
        orderId: o.orderId ?? null,
        isbn: o.isbn ?? null,
        date: o.date ?? null,
        sellingPrice: o.sellingPrice ? (o.sellingPrice as any).toString?.() ?? String(o.sellingPrice) : '',
        name: o.name ?? null,
      });
      (o as any).rowHash = sha256Hex(key);
      return o;
    });

    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize);
      try {
        const res = await prisma.rkData.createMany({ data: chunk, skipDuplicates: true });
        inserted += res.count;
      } catch (e) {
        for (let j = 0; j < chunk.length; j++) {
          errors.push({ sheet: sheetName, index: i + j, error: 'createMany_failed' });
        }
      }
    }
  }

  let errorReportPath: string | null = null;
  if (errors.length > 0) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
      errorReportPath = path.join(dataDir, `rkdata-import-errors-${ts}.json`);
      await fs.writeFile(errorReportPath, JSON.stringify({ errors }, null, 2), 'utf8');
    } catch {}
  }

  const tookMs = Date.now() - start;
  return { totalRows, inserted, errors: errors.length, errorReportPath, tookMs };
}

router.post('/import', async (_req, res) => {
  try {
    const result = await importRkDataFromDisk();
    return res.status(200).json({ ok: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: 'Import failed' });
  }
});

router.get('/', async (req, res) => {
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit || 200)));
  const cursorId = req.query.cursorId ? String(req.query.cursorId) : null;
  try {
    const args: Prisma.RkDataFindManyArgs = { orderBy: { id: 'desc' }, take: limit } as any;
    if (cursorId) {
      (args as any).skip = 1;
      (args as any).cursor = { id: BigInt(cursorId) } as any;
    }
    const items = await (prisma as any).rkData.findMany(args);
    const data = items.map((x: any) => ({ ...x, id: x.id.toString() }));
    const last = (data as any[]).at(-1);
    const nextCursorId = last?.id ?? null;
    return res.json({ ok: true, items: data, nextCursorId });
  } catch (e: any) {
    const msg = String(e?.message || '');
    const code = e?.code;
    if (code === 'P2021' || /does not exist/i.test(msg)) {
      // Table not created yet: return empty shape so frontend can show setup hint
      return res.status(200).json({ ok: true, items: [], nextCursorId: null, missingTable: true });
    }
    return res.status(500).json({ ok: false, error: 'Failed to fetch rkdata' });
  }
});

router.get('/summary', async (_req, res) => {
  try {
    const [count, sums, byStatus, byPayment] = await Promise.all([
      (prisma as any).rkData.count(),
      (prisma as any).rkData.aggregate({ _sum: { mrp: true, sellingPrice: true } }),
      (prisma as any).rkData.groupBy({ by: ['orderStatus'], _count: { _all: true } }),
      (prisma as any).rkData.groupBy({ by: ['paymentMode'], _count: { _all: true } }),
    ]);
    return res.json({
      ok: true,
      totalCount: count,
      totalMrp: Number(sums._sum.mrp?.toString() || '0'),
      totalSelling: Number(sums._sum.sellingPrice?.toString() || '0'),
      byOrderStatus: byStatus.map((x: any) => ({ orderStatus: x.orderStatus || 'Unknown', count: x._count._all })),
      byPaymentMode: byPayment.map((x: any) => ({ paymentMode: x.paymentMode || 'Unknown', count: x._count._all })),
    });
  } catch (e: any) {
    const msg = String(e?.message || '');
    const code = e?.code;
    if (code === 'P2021' || /does not exist/i.test(msg)) {
      return res.status(200).json({ ok: true, totalCount: 0, totalMrp: 0, totalSelling: 0, byOrderStatus: [], byPaymentMode: [], missingTable: true });
    }
    return res.status(500).json({ ok: false, error: 'Failed to compute summary' });
  }
});

export default router;
