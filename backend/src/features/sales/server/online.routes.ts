import express from "express";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.js";

const router = express.Router();

// Utilities for resilient aggregation when DB fields are missing
function decToNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  try {
    return Number(v.toString());
  } catch {
    return Number(v) || 0;
  }
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function numSafe(v: any): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace(/[\s,]/g, "")) : Number(v);
  return Number.isFinite(n) ? n : null;
}
function pick(
  row: Record<string, any> | null | undefined,
  names: string[],
): any {
  if (!row) return undefined;
  for (const k of Object.keys(row))
    if (names.some((n) => n.toLowerCase() === k.toLowerCase()))
      return (row as any)[k];
  return undefined;
}
function parseIsoInRow(
  row: Record<string, any> | null | undefined,
): Date | null {
  if (!row) return null;
  for (const v of Object.values(row)) {
    if (
      typeof v === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)
    ) {
      const d = new Date(v);
      if (!isNaN(+d)) return d;
    }
  }
  return null;
}
function monthNameToIndex(m?: string | null): number | null {
  if (!m) return null;
  const map: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    sept: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const i = map[m.toLowerCase()];
  return i === undefined ? null : i;
}

// Best-effort date resolver used across handlers
function resolveRowDate(r: any): Date | null {
  let d: Date | null = r.date ? new Date(r.date) : null;
  if (!d) {
    const raw = r.rawJson as Record<string, any> | undefined;
    if (raw && typeof raw === "object") {
      // Normalize keys by trimming to handle "                                                          "
      const normalizedRaw: Record<string, any> = {};
      for (const [k, v] of Object.entries(raw)) {
        normalizedRaw[k.trim()] = v;
      }

      const d1 = pick(normalizedRaw, ["Date", "Txn Date", "Transaction Date"]);
      if (d1) {
        const dd = new Date(d1);
        if (!isNaN(+dd)) d = dd;
      }
      if (!d) d = parseIsoInRow(raw);
    }

    if (!d) {
      const mi = monthNameToIndex(r.month);
      if (mi != null && r.year && r.year > 0)
        d = new Date(Date.UTC(r.year, mi, 1));
    }
  }
  return d;
}

// GET /api/online-sales?limit=200&cursorId=<id>
router.get("/", async (req, res) => {
  const Q = z.object({
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .default("200")
      .pipe(z.number().min(1).max(5000)),
    cursorId: z.string().regex(/^\d+$/).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    paymentMode: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse({
    limit: req.query.limit ?? "200",
    cursorId: req.query.cursorId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    paymentMode: req.query.paymentMode,
    q: req.query.q,
  });
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid query" });
  const { limit, cursorId, startDate, endDate, paymentMode, q } = parsed.data;

  try {
    const where: any = {};
    if (paymentMode) where.paymentMode = paymentMode;
    if (q) {
      const contains = q.toString();
      where.OR = [
        { title: { contains, mode: "insensitive" } },
        { customerName: { contains, mode: "insensitive" } },
        { isbn: { contains, mode: "insensitive" } },
        { orderNo: { contains, mode: "insensitive" } },
      ];
    }

    // When date filters are provided, fetch many more rows since we filter by date post-query
    // (many rows have null dates and we need to parse dates from rawJson)
    const fetchLimit =
      startDate || endDate ? Math.min(limit * 10, 5000) : limit;

    const args: any = {
      take: fetchLimit,
      orderBy: { id: "desc" as const },
      where,
    };
    if (cursorId) {
      args.skip = 1;
      args.cursor = { id: BigInt(cursorId) };
    }
    const items = await prisma.onlineSale.findMany(args);
    const dataAll = items.map((it) => ({
      ...it,
      id: it.id.toString(),
      amount: it.amount != null ? round2(decToNumber(it.amount)) : null,
      rate: it.rate != null ? round2(decToNumber(it.rate)) : null,
    }));

    // Post-filter by resolved date (including rawJson fallback)
    const data =
      startDate || endDate
        ? dataAll
            .filter((r: any) => {
              const d = resolveRowDate(r);
              if (!d) return false;
              if (startDate && d < new Date(startDate)) return false;
              if (endDate && d > new Date(endDate)) return false;
              return true;
            })
            .slice(0, limit) // Limit to requested amount after filtering
        : dataAll;

    const last = (data as any[]).at(-1);
    return res.json({ ok: true, items: data, nextCursorId: last?.id ?? null });
  } catch (e: any) {
    console.error("online_sales_list_failed", e);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to fetch online sales" });
  }
});

// GET /api/online-sales/summary?days=90
router.get("/summary", async (req, res) => {
  const Q = z.object({
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    paymentMode: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse({
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    paymentMode: req.query.paymentMode,
    q: req.query.q,
  });
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid query" });
  const days = parsed.data.days ?? 90;
  const startDate = parsed.data.startDate
    ? new Date(parsed.data.startDate)
    : undefined;
  const endDate = parsed.data.endDate
    ? new Date(parsed.data.endDate)
    : undefined;
  const paymentMode = parsed.data.paymentMode;
  const q = parsed.data.q;

  try {
    const since = startDate ?? new Date(Date.now() - days * 86400000);

    // Pull candidates; include null dates to compute fallback from rawJson/month/year
    const andFilters: any[] = [];
    if (paymentMode) andFilters.push({ paymentMode });
    if (q)
      andFilters.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { isbn: { contains: q, mode: "insensitive" } },
          { orderNo: { contains: q, mode: "insensitive" } },
        ],
      });

    // Add DB-side date filter (even if imperfect, it reduces rows massively)
    andFilters.push({
      OR: [
        { date: { gte: since } },
        { date: null }, // Fallback for rows where date is only in rawJson
      ],
    });

    const rows = await prisma.onlineSale.findMany({
      where: andFilters.length ? ({ AND: andFilters } as any) : undefined,
      select: {
        date: true,
        amount: true,
        paymentMode: true,
        title: true,
        qty: true,
        rate: true,
        month: true,
        year: true,
        // rawJson excluded for performance in bulk summary
      },
      take: 20000,
    });

    const payment = new Map<string, number>();
    const ts = new Map<string, number>();
    const top = new Map<
      string,
      {
        total: number;
        qty: number;
        isbn?: string;
        author?: string;
        language?: string;
        sampleRaw?: any;
      }
    >();


    let processedCount = 0;
    let skippedCount = 0;

    for (const r of rows) {
      try {
        // Date resolution
        let d: Date | null = r.date ? new Date(r.date) : null;
        if (!d) {
          const raw = (r as any).rawJson as Record<string, any> | undefined;
          if (raw && typeof raw === "object") {
             const d1 = pick(raw, ["Date", "Txn Date", "Transaction Date"]);
             if (d1) {
               const dd = new Date(d1);
               if (!isNaN(+dd)) d = dd;
             }
             if (!d) d = parseIsoInRow(raw);
          }
          if (!d) {
            const mi = monthNameToIndex(r.month);
            if (mi != null && r.year && r.year > 0)
              d = new Date(Date.UTC(r.year, mi, 1));
          }
        }
        if (d && d < since) continue;
        if (endDate && d && d > endDate) continue;

        // Amount resolution
        let amt = decToNumber(r.amount);
        if (!amt) {
          const raw = (r as any).rawJson as Record<string, any> | undefined;
          if (raw && typeof raw === "object") {
            const v = pick(raw, [
              "Selling Price",
              "Amount",
              "Total",
              "amount",
              "SellingPrice",
              "Selling_Price",
            ]);
            const n = numSafe(v);
            if (n != null) amt = n;
            else amt = (numSafe(r.rate as any) || 0) * (r.qty ?? 0);
          }
        }

        let pm = r.paymentMode as any as string | undefined;
        if (!pm && (r as any).rawJson && typeof (r as any).rawJson === "object") {
          const raw = (r as any).rawJson as Record<string, any>;
          const v = pick(raw, [
            "Payment Mode",
            "paymentMode",
            "Mode",
            "Payment",
          ]);
          if (typeof v === "string" && v.trim()) pm = v.trim();
        }
        pm = pm || "Unknown";
        payment.set(pm, (payment.get(pm) || 0) + amt);

        if (d) {
          const key = d.toISOString().slice(0, 10);
          ts.set(key, (ts.get(key) || 0) + amt);
        }

        // Better title extraction - try multiple fields
        let title = r.title as string | null | undefined;

        if (!title || (typeof title === "string" && title.trim() === "")) {
          if ((r as any).rawJson && typeof (r as any).rawJson === "object") {
            const raw = (r as any).rawJson as Record<string, any>;
            const rawTitle = pick(raw, [
              "Title",
              "title",
              "Book",
              "book",
              "Product",
              "Item",
              "Title ",
              "Product Name",
              "Item Name",
            ]);
            title =
              typeof rawTitle === "string" && rawTitle.trim() ? rawTitle : null;
          }
        }

        // If still no title, check if we have any identifying info in rawJson
        if (!title && (r as any).rawJson && typeof (r as any).rawJson === "object") {
          const raw = (r as any).rawJson as Record<string, any>;
          // Try to find ANY field that might be a title
          for (const key of Object.keys(raw)) {
            if (
              key &&
              typeof raw[key] === "string" &&
              raw[key].trim().length > 3
            ) {
              // Use first non-empty string field as title
              title = raw[key];
              break;
            }
          }
        }

        // Use "Untitled Item" as absolute fallback - don't skip the sale!
        const tkey =
          title && typeof title === "string" && title.trim()
            ? title.trim()
            : "Untitled Item";
        const cur = top.get(tkey) || { total: 0, qty: 0 };
        cur.total += amt;
        cur.qty +=
          r.qty ||
          ((r as any).rawJson && typeof (r as any).rawJson === "object"
            ? numSafe(pick((r as any).rawJson as any, ["Qty", "Quantity", "qty"])) || 0
            : 0);
        top.set(tkey, cur);

        // Extract additional book details from rawJson - with type safety
        if ((r as any).rawJson && typeof (r as any).rawJson === "object" && !cur.isbn) {
          const raw = (r as any).rawJson as Record<string, any>;
          const isbnRaw = pick(raw, ["ISBN", "isbn", "ISBN13", "Isbn"]);
          const authorRaw = pick(raw, ["Author", "author", "Writer", "writer"]);
          const langRaw = pick(raw, ["Language", "language", "Lang"]);

          if (typeof isbnRaw === "string" && isbnRaw.trim()) {
            cur.isbn = isbnRaw.trim();
          }
          if (typeof authorRaw === "string" && authorRaw.trim()) {
            cur.author = authorRaw.trim();
          }
          if (typeof langRaw === "string" && langRaw.trim()) {
            cur.language = langRaw.trim();
          }
        }

        processedCount++;
      } catch (rowError: any) {
        // Log individual row errors but continue processing
        console.error("Error processing row:", rowError?.message);
        skippedCount++;
        continue;
      }
    }


    const byPayment = Array.from(payment.entries()).map(
      ([paymentMode, total]) => ({
        paymentMode: paymentMode || "Unknown",
        total: round2(total),
      }),
    );

    const timeSeries = Array.from(ts.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, total]) => ({
        date,
        total: round2(total),
      }));

    // Log what we have before filtering

    const topItems = Array.from(top.entries())
      .filter(([title, v]) => {
        try {
          // Very lenient filter - only exclude completely invalid entries
          const isValid = v && (v.total > 0 || v.qty > 0);
          if (!isValid) {
            console.log("❌ Filtered out:", title, v);
          }
          return isValid;
        } catch {
          return false;
        }
      })
      .map(([title, v]) => {
        try {
          return {
            title: title || "Untitled",
            total: round2(v.total || 0),
            qty: v.qty || 0,
            isbn: v.isbn || undefined,
            author: v.author || undefined,
            language: v.language || undefined,
          };
        } catch (e) {
          console.error("Error mapping top item:", e);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => (b.total || 0) - (a.total || 0)) // Sort by revenue (primary)
      .slice(0, 10);


    res.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
    return res.json({ ok: true, paymentMode: byPayment, timeSeries, topItems });
  } catch (e: any) {
    console.error("online_sales_summary_failed", e);
    console.error("Error stack:", e?.stack);
    console.error("Error message:", e?.message);
    return res
      .status(500)
      .json({
        ok: false,
        error: "Failed to compute summary",
        details: process.env.NODE_ENV !== "production" ? e?.message : undefined,
      });
  }
});

// GET /api/online-sales/counts
router.get("/counts", async (req, res) => {
  const Q = z.object({
    // New optional convenience param to mirror /summary
    days: z.string().regex(/^\d+$/).transform(Number).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    paymentMode: z.string().optional(),
    q: z.string().optional(),
  });
  const parsed = Q.safeParse({
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    paymentMode: req.query.paymentMode,
    q: req.query.q,
  });
  if (!parsed.success)
    return res.status(400).json({ ok: false, error: "Invalid query" });
  const { days, paymentMode, q } = parsed.data;
  let { startDate, endDate } = parsed.data;

  // If days is provided, derive a [start, end] window ending at now
  if (days && !startDate && !endDate) {
    const now = new Date();
    const since = new Date(now.getTime() - days * 86400000);
    startDate = since.toISOString();
    endDate = now.toISOString();
  }

  try {
    const start = startDate ? new Date(startDate) : null;
    const andFilters: any[] = [];
    if (paymentMode) andFilters.push({ paymentMode });
    if (q) {
      const contains = q.toString();
      andFilters.push({
        OR: [
          { title: { contains, mode: "insensitive" } },
          { customerName: { contains, mode: "insensitive" } },
          { isbn: { contains, mode: "insensitive" } },
          { orderNo: { contains, mode: "insensitive" } },
        ],
      });
    }

    if (start) {
      andFilters.push({
        OR: [{ date: { gte: start } }, { date: null }],
      });
    }

    const items = await prisma.onlineSale.findMany({
      where: andFilters.length ? ({ AND: andFilters } as any) : {},
      select: {
        amount: true,
        qty: true,
        rate: true,
        rawJson: true,
        customerName: true,
        email: true,
        mobile: true,
        orderStatus: true,
        date: true,
        month: true,
        year: true,
      },
      take: 20000,
    });

    const end = endDate ? new Date(endDate) : null;

    let totalAmount = 0;
    let count = 0;
    const customerSet = new Set<string>();
    let refundCount = 0;
    for (const r of items) {
      const d = resolveRowDate(r);
      if (start && (!d || d < start)) continue;
      if (end && (!d || d > end)) continue;
      count++;
      // amount aggregation
      const v = decToNumber(r.amount);
      let amt = 0;
      if (v) {
        amt = v;
      } else if ((r as any).rawJson && typeof (r as any).rawJson === "object") {
        const raw = (r as any).rawJson as Record<string, any>;
        const y = numSafe(
          pick(raw, [
            "Selling Price",
            "Amount",
            "Total",
            "amount",
            "SellingPrice",
            "Selling_Price",
          ]),
        );
        if (y != null) amt = y;
        else amt = (numSafe(r.rate as any) || 0) * (r.qty ?? 0);
      }
      totalAmount += amt;

      // refunds
      const st =
        (r.orderStatus as any as string) ||
        ((r as any).rawJson && typeof (r as any).rawJson === "object"
          ? String(
              pick((r as any).rawJson as any, ["Order Status", "Status"]) || "",
            ).toLowerCase()
          : "");
      if (st && st.toLowerCase() === "refunded") refundCount++;

      // customer uniqueness heuristic
      const name = (r.customerName || "").trim().toLowerCase();
      const email = (r.email || "").trim().toLowerCase();
      const mobile = (r.mobile || "").trim();
      const key = [email || null, mobile || null, name || null]
        .filter(Boolean)
        .join("|");
      if (key) customerSet.add(key);
    }

    res.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
    return res.json({
      ok: true,
      totalCount: count,
      totalAmount: round2(totalAmount),
      uniqueCustomers: customerSet.size,
      refundCount,
    });
  } catch (e: any) {
    console.error("online_sales_counts_failed", e);
    return res.status(500).json({ ok: false, error: "Failed to fetch counts" });
  }
});

export default router;
