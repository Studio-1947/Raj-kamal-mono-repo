import { prisma } from "../../../lib/prisma.js";
import crypto from "crypto";
import fs from "fs";
import * as XLSX from "xlsx";
import fetch from "node-fetch";
import { clearTotalOfflineCache } from "./total-offline.routes.js";
import {
  recordDump,
  updateDumpStats,
  setDumpVerdict,
  getLastAcceptedDump,
  summarizeRecords,
  sha256,
} from "../../archive/archiveStore.js";
import {
  evaluateSheet,
  evaluateRawExport,
  unreadableExportVerdict,
  guardMode,
  SheetRejectedError,
} from "../../archive/sheetGuard.js";
import { takePreSyncSnapshot } from "../../archive/snapshot.js";
import { regionForModel } from "../../archive/regions.js";
import { isArchiveConfigured, warnIfUnconfigured } from "../../archive/archiveDb.js";

const REPORT_URL = "https://rajkamal.cloudpub.in/Reports/rpttitlecustomerwisegriddataExport?FromDate=2026-01-01&ToDate=2026-12-31&iCompanyID=1&iBranchID=1,&cmbISBN=&CustomerName=&Documenttype=ALLS&TrnsDocID=&ManageEdition=false&CountryName=&StateName=&CityName=&SalesmanName=&SalesmanMgnrName=&chkshowclbal=N&BookCategoryID=&languageID=&PublisherID=&SelectDiscount=&TxtDiscount=0&AccountID=BookSeller&IncludeExcludeBranchSale=Exclude";

// SKIP_CUSTOMERS filter removed — all rows are now imported

export interface SyncResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  error?: string;
}

/**
 * Last-known-good book metadata for a single ISBN. These four fields are populated by
 * lookup formulas in the Google Sheet, so the CSV export can return them BLANK whenever
 * Google hasn't recalculated (notably the 3 AM scheduled sync). We snapshot them before
 * each wipe so blank exports can be backfilled instead of erasing good data.
 */
interface PreservedMeta {
  author: string;
  binding: string;
  pubYear: number;
  publisher: string;
}

/** Result of parsing a sheet export, before anything is written to the database. */
export interface ParsedRows {
  /** Insert-ready records, in sheet order. */
  records: any[];
  /** Header row exactly as it came from the export. */
  headers: string[];
  /** Records produced (=== records.length). */
  count: number;
  /** Blank rows the parser skipped. */
  skippedEmpty: number;
  /** Rows whose blank metadata was filled from the pre-wipe preserve map. */
  backfilledCount: number;
}

export class OfflineSyncService {
  /**
   * What kicked off the sync currently in flight, recorded on each archived dump so a
   * suspicious export can be traced to the run that fetched it. A plain field rather
   * than a threaded parameter because syncAll is sequential and guarded against
   * overlapping runs, so only one sync is ever in flight per process.
   */
  currentTrigger: string = "manual";

  /**
   * Turns raw sheet rows into insert-ready records. Extracted from processData so the
   * pre-import archive guard can evaluate exactly what WOULD be written, using the same
   * parser rather than a second approximation of it that could drift out of step.
   *
   * Pure: no database access, no side effects beyond the header debug log.
   */
  parseRows(
    rows: any[][],
    // Only consulted for the Patna day/month swap below — but that swap changes the
    // parsed dates, so the guard must parse with the same target to see the same result.
    targetModel: any = prisma.googleSheetOfflineSale,
    preserveMap?: Map<string, PreservedMeta>,
    // Extra columns merged into every inserted row (e.g. { channel, financialYear }
    // for the one-time history archive). When provided alongside omitRawJson, lets
    // the same parser feed the slim offline_sales_history table.
    extraFields?: Record<string, any>,
    // The history table has no rawJson column; skip it so createMany doesn't reject
    // the unknown field.
    omitRawJson = false,
  ): ParsedRows {
    const empty: ParsedRows = { records: [], headers: [], count: 0, skippedEmpty: 0, backfilledCount: 0 };
    if (!rows || rows.length < 2) return empty;

    const headers = rows[0] as string[];
    if (!headers) return empty;

    const dataRows = rows.slice(1);
    const headerMap: Record<string, number> = {};
    headers.forEach((h: any, i: number) => {
      if (h) {
        const normalized = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized) headerMap[normalized] = i;
      }
    });

    // FALLBACK: If "type" column is not found by exact alias, search for any column containing "type"
    if (!["type", "saletype", "transactiontype"].some(k => headerMap[k] !== undefined)) {
      const typeIdx = headers.findIndex(h => String(h).toLowerCase().includes('type'));
      if (typeIdx !== -1) headerMap['type'] = typeIdx;
    }

    // DEBUG: Write headers to a file to see what's actually coming through.
    // Now gated: parseRows became synchronous (so the archive guard can call it) and is
    // invoked twice per sync, which would double the growth of an already-unbounded log.
    // Set SYNC_DEBUG_HEADERS=true to re-enable. The headers are also stored on every
    // archived dump, which is the durable place to look.
    if (process.env.SYNC_DEBUG_HEADERS === 'true') {
      try {
        fs.appendFileSync('headers_debug.log', `HEADERS: ${JSON.stringify(headers)}\n`);
      } catch (e) {}
    }

    let count = 0;
    let skippedEmpty = 0;
    let backfilledCount = 0;

    const toInsert: any[] = [];
    const rowsToProcess = dataRows;

    const isPatna = targetModel === prisma.patnaOfflineSale;

    for (const row of rowsToProcess) {
      if (!Array.isArray(row) || row.length === 0 || row.every(cell => cell === "" || cell === null)) {
        skippedEmpty++;
        continue;
      }

      const customerName = this.getVal(row, headerMap, "CustomerName");
      const slNo = parseInt(this.getVal(row, headerMap, "sl/no") || "0");
      const docNo = this.getVal(row, headerMap, "TrnsdocNo") || this.getVal(row, headerMap, "Doc No");
      const dateStr = this.getVal(row, headerMap, "TrnsdocdateStr") || this.getVal(row, headerMap, "DateStr");
      const isbn = this.getVal(row, headerMap, "BookCode") || this.getVal(row, headerMap, "ISBN");
      const title = this.getVal(row, headerMap, "BookName") || 
                    this.getVal(row, headerMap, "ItemName") || 
                    this.getVal(row, headerMap, "Title") || 
                    this.getVal(row, headerMap, "Name");
      let author = this.getVal(row, headerMap, "Author") || this.getVal(row, headerMap, "DisplayAuthorName");
      let binding = this.getVal(row, headerMap, "Binding");
      let pubYear = parseInt(this.getVal(row, headerMap, "Pub-Year") || this.getVal(row, headerMap, "Pub-year") || "0");
      // Mumbai & Lokbharti historical sheets label this column "Publishername".
      let publisher = this.getVal(row, headerMap, "Publisher") || this.getVal(row, headerMap, "Publishername");

      // SELF-HEAL: author/binding/pubYear/publisher come from lookup-formula columns in
      // the sheet, which the CSV export returns BLANK when Google hasn't recalculated
      // (e.g. the 3 AM scheduled run). Since this sync is a destructive wipe-and-replace,
      // importing those blanks would erase good metadata. So if the fresh export is blank
      // but we captured a non-blank value for this ISBN before wiping, carry it forward.
      // We never override a value the export DID provide, so legitimate updates still win.
      if (preserveMap && isbn) {
        const prev = preserveMap.get(isbn);
        if (prev) {
          if (!author && prev.author) { author = prev.author; backfilledCount++; }
          if (!binding && prev.binding) binding = prev.binding;
          if ((!pubYear || pubYear === 0) && prev.pubYear) pubYear = prev.pubYear;
          if (!publisher && prev.publisher) publisher = prev.publisher;
        }
      }
      const qty = parseInt(this.getVal(row, headerMap, "OUT") || this.getVal(row, headerMap, "Qty") || "0");
      const inQty = parseInt(this.getVal(row, headerMap, "IN") || "0");
      const currency = this.getVal(row, headerMap, "CURRENCYID") || "RS";
      const rate = parseFloat(this.getVal(row, headerMap, "BOOKRATE") || this.getVal(row, headerMap, "Rate") || "0");
      const discount = parseFloat(this.getVal(row, headerMap, "BookDiscount") || "0");
      const addDiscount = parseFloat(this.getVal(row, headerMap, "BookAddDiscount") || "0");
      const amount = parseFloat(this.getVal(row, headerMap, "OUTAmount") || this.getVal(row, headerMap, "Amount") || "0");
      const inAmount = parseFloat(this.getVal(row, headerMap, "INAmount") || "0");
      const state = this.getVal(row, headerMap, "StateName");
      const city = this.getVal(row, headerMap, "CityName");
      
      const typeRaw = this.getVal(row, headerMap, "Type") || 
                      this.getVal(row, headerMap, "Sale Type") || 
                      this.getVal(row, headerMap, "Sale-Type") || 
                      this.getVal(row, headerMap, "Transaction Type") || 
                      this.getVal(row, headerMap, "SaleType") || 
                      this.getVal(row, headerMap, "DocumentDesc") || 
                      this.getVal(row, headerMap, "Document Type");

      let type = typeRaw || null;

      const fictionRaw = this.getVal(row, headerMap, "Fiction/ Non-Fiction") ||
                         this.getVal(row, headerMap, "Fiction/Non-Fiction") ||
                         this.getVal(row, headerMap, "Fiction Non-Fiction") ||
                         this.getVal(row, headerMap, "FictionNonFiction");
      // Preserve the raw label; treat sheet error/empty markers as null (no data lost — original stays in rawJson)
      const fictionType = (!fictionRaw || fictionRaw.toUpperCase() === "#N/A") ? null : fictionRaw;

      if (!type) {
        [20, 19].forEach(idx => {
          if (row[idx]) {
            const v = String(row[idx]).toLowerCase();
            if (v.includes("sales") || v.includes("online") || v.includes("offline")) {
              type = String(row[idx]).trim();
            }
          }
        });
      }

      let date: Date | null = null;
      const rawDate = this.getVal(row, headerMap, "Trnsdocdate") || this.getVal(row, headerMap, "Date");
      const effectiveDateSource = rawDate || dateStr;
      
      if (effectiveDateSource) {
        const val = String(effectiveDateSource).trim();
        if (/^\d{5}(\.\d+)?$/.test(val)) {
          const serial = parseFloat(val);
          let parsedDate = new Date((serial - 25569) * 86400 * 1000);
          if (isPatna && !isNaN(parsedDate.getTime()) && parsedDate.getUTCDate() <= 12) {
            // Swap month and day: e.g. 2026-07-01 (July 1st) -> 2026-01-07 (Jan 7th)
            const year = parsedDate.getUTCFullYear();
            const month = parsedDate.getUTCDate() - 1; // Month becomes original Day (0-indexed)
            const day = parsedDate.getUTCMonth() + 1;  // Day becomes original Month
            const hours = parsedDate.getUTCHours();
            const minutes = parsedDate.getUTCMinutes();
            const seconds = parsedDate.getUTCSeconds();
            parsedDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
          }
          date = parsedDate;
        } else {
          const dmyMatch = val.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
          if (dmyMatch) {
            const day = parseInt(dmyMatch[1]!, 10);
            const month = parseInt(dmyMatch[2]!, 10) - 1; // 0-indexed month
            const year = parseInt(dmyMatch[3]!, 10);
            const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
            const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
            const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
            
            const parsedDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate;
            }
          } else {
            const parsedDate = new Date(val);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate;
            }
          }
        }
      }

      // Stable rowHash based on business fields
      const businessData = {
        slNo,
        docNo,
        date: date?.toISOString() || null,
        isbn,
        qty,
        inQty,
        amount,
        inAmount,
        customerName,
        type
      };
      const rowHash = crypto.createHash('md5').update(JSON.stringify(businessData)).digest('hex');

      const record: any = {
        slNo,
        docNo,
        date,
        dateStr,
        isbn,
        title,
        author,
        binding,
        pubYear,
        publisher,
        qty,
        inQty,
        currency,
        rate,
        discount,
        addDiscount,
        amount,
        inAmount,
        customerName,
        state,
        city,
        type,
        fictionType,
        rowHash,
        ...(extraFields ?? {}),
      };
      if (!omitRawJson) {
        record.rawJson = Array.from({ length: headers.length }, (_, i) => (row[i] === undefined ? null : row[i])) as any;
      }
      toInsert.push(record);
      count++;
    }

    return { records: toInsert, headers, count, skippedEmpty, backfilledCount };
  }

  /**
   * Main entry point to process an array of rows from any source (Sheets, ERP, etc.)
   * Parses via parseRows, then bulk-inserts into the target model.
   */
  async processData(
    rows: any[][],
    targetModel: any = prisma.googleSheetOfflineSale,
    txClient?: any,
    preserveMap?: Map<string, PreservedMeta>,
    extraFields?: Record<string, any>,
    omitRawJson = false,
  ): Promise<SyncResult> {
    const { records: toInsert, count, skippedEmpty, backfilledCount } = this.parseRows(
      rows,
      targetModel,
      preserveMap,
      extraFields,
      omitRawJson,
    );

    let importedCount = 0;
    let duplicateCount = 0;

    if (toInsert.length > 0) {
      try {
        // Chunk toInsert to avoid potential database limit issues with massive arrays
        const chunkSize = 2000;
        const dbModel = txClient || targetModel;
        for (let i = 0; i < toInsert.length; i += chunkSize) {
          const chunk = toInsert.slice(i, i + chunkSize);
          const result = await dbModel.createMany({
            data: chunk,
            skipDuplicates: true,
          });
          importedCount += result.count;
        }
        duplicateCount = toInsert.length - importedCount;
      } catch (err: any) {
        console.error(`[SYNC ERROR] createMany failed:`, err.message);
        throw err;
      }
    }

    console.log(`[SYNC LOG] Total Rows: ${count}, Newly Imported: ${importedCount}, Duplicates Skipped: ${duplicateCount}, Empty Skipped: ${skippedEmpty}, Metadata Backfilled: ${backfilledCount}`);
    if (preserveMap && count > 0 && backfilledCount / count > 0.5) {
      console.warn(`[SYNC WARN] ${backfilledCount}/${count} rows had blank author in the export — the sheet's lookup formulas were almost certainly not recalculated (stale CSV export). Backfilled from last-known-good; verify the source sheet.`);
    }
    return { success: true, importedCount, skippedCount: skippedEmpty };
  }

  /**
   * Snapshot ISBN -> last-known-good book metadata from the CURRENT table contents,
   * taken just before a wipe-and-replace sync. Lets processData backfill rows whose
   * metadata columns come back blank from a stale sheet export. Best-effort: any failure
   * degrades gracefully to "no backfill" rather than aborting the sync.
   */
  async buildPreserveMap(model: any): Promise<Map<string, PreservedMeta>> {
    const map = new Map<string, PreservedMeta>();
    try {
      const existing: any[] = await model.findMany({
        select: { isbn: true, author: true, binding: true, pubYear: true, publisher: true },
      });
      for (const r of existing) {
        if (!r.isbn) continue;
        const hasMeta =
          (r.author && r.author !== "") ||
          (r.binding && r.binding !== "") ||
          (r.publisher && r.publisher !== "") ||
          (r.pubYear && r.pubYear !== 0);
        if (!hasMeta) continue;
        const prev = map.get(r.isbn);
        if (!prev) {
          map.set(r.isbn, {
            author: r.author || "",
            binding: r.binding || "",
            pubYear: r.pubYear || 0,
            publisher: r.publisher || "",
          });
        } else {
          // Merge so each ISBN ends up with the most complete metadata across its rows.
          if (!prev.author && r.author) prev.author = r.author;
          if (!prev.binding && r.binding) prev.binding = r.binding;
          if (!prev.pubYear && r.pubYear) prev.pubYear = r.pubYear;
          if (!prev.publisher && r.publisher) prev.publisher = r.publisher;
        }
      }
      console.log(`[SYNC] Captured last-known-good metadata for ${map.size} ISBNs before wipe.`);
    } catch (e: any) {
      console.warn(`[SYNC] buildPreserveMap failed (continuing without backfill): ${e?.message || e}`);
    }
    return map;
  }
  /**
   * Sync Delhi/General Offline Sales from Google Sheet
   */
  async syncOfflineSales() {
    console.log("Starting Delhi Offline Sales Sync from Google Sheet...");
    const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv";
    return this.syncFromGoogleSheet(URL, prisma.googleSheetOfflineSale);
  }

  /**
   * Sync Mumbai Sales from Google Sheet
   */
  async syncMumbaiSales() {
    const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=696866974";
    return this.syncFromGoogleSheet(URL, prisma.mumbaiOfflineSale);
  }

  /**
   * Sync Patna Sales from Google Sheet
   */
  async syncPatnaSales() {
    const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=1521335023";
    return this.syncFromGoogleSheet(URL, prisma.patnaOfflineSale);
  }

  /**
   * Sync Online Offline Sales from Google Sheet
   */
  async syncOnlineOfflineSales() {
    console.log("Starting Online Offline Sales Sync...");
    const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=541252527";
    return this.syncFromGoogleSheet(URL, prisma.onlineOfflineSale);
  }

  /**
   * Sync BookFair Offline Sales from Google Sheet
   */
  async syncBookFairSales() {
    console.log("Starting BookFair Offline Sales Sync...");
    const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=750818183";
    return this.syncFromGoogleSheet(URL, prisma.bookFairOfflineSale);
  }

  /**
   * Sync Lokbharti Offline Sales from Google Sheet
   */
  async syncLokbhartiSales() {
    console.log("Starting Lokbharti Offline Sales Sync...");
    const URL = "https://docs.google.com/spreadsheets/d/1Idzu6Df1M1LhrWU9YogVkZgIgwYwYEPh1ZyfHGbdvjw/export?format=csv&gid=428885829";
    return this.syncFromGoogleSheet(URL, prisma.lokbhartiOfflineSale);
  }

  /**
   * Run every Google-Sheet region sync sequentially. One region failing does NOT
   * abort the others; each result (or error) is collected and returned. Sequential
   * (not parallel) on purpose, to avoid hammering Google Sheets and the DB with six
   * concurrent bulk upserts. Used by the scheduled overnight sync and `sync:all`.
   */
  async syncAll(): Promise<{ region: string; result: SyncResult }[]> {
    const jobs: { region: string; run: () => Promise<SyncResult> }[] = [
      { region: "delhi",     run: () => this.syncOfflineSales() },
      { region: "mumbai",    run: () => this.syncMumbaiSales() },
      { region: "patna",     run: () => this.syncPatnaSales() },
      { region: "online",    run: () => this.syncOnlineOfflineSales() },
      { region: "bookfair",  run: () => this.syncBookFairSales() },
      { region: "lokbharti", run: () => this.syncLokbhartiSales() },
    ];
    const out: { region: string; result: SyncResult }[] = [];
    for (const job of jobs) {
      try {
        const result = await job.run();
        out.push({ region: job.region, result });
      } catch (e: any) {
        out.push({
          region: job.region,
          result: { success: false, importedCount: 0, skippedCount: 0, error: e?.message || String(e) },
        });
      }
    }
    return out;
  }

  /**
   * Whether archiving applies to this sync. Null means the whole feature sits out and
   * the sync behaves exactly as it did before it existed — either because no archive DB
   * is configured, or because the target isn't one of the six registry regions (the
   * history backfill, say, which doesn't wipe a live dashboard table).
   */
  private archiveTargetFor(targetModel: any) {
    if (!isArchiveConfigured()) {
      warnIfUnconfigured();
      return null;
    }
    return regionForModel(targetModel);
  }

  /**
   * Archives the bytes exactly as fetched, BEFORE anything tries to parse them, and
   * applies the checks that need only those bytes.
   *
   * Order matters: XLSX.read throws outright on some malformed responses ("Invalid HTML:
   * could not find <table>"). Archiving first means even an export the parser refuses is
   * preserved for inspection, and the operator gets "the sheet is no longer shared"
   * rather than a parser stack trace.
   *
   * Throws SheetRejectedError if the bytes alone are damning. Any other failure is
   * swallowed: losing a backup is bad, breaking the sync that feeds the dashboard is worse.
   */
  private async archiveRawExport(url: string, targetModel: any, buffer: ArrayBuffer): Promise<number | null> {
    const region = this.archiveTargetFor(targetModel);
    if (!region) return null;

    let dumpId: number | null = null;
    try {
      const raw = Buffer.from(buffer);
      // Stats are filled in by guardParsedExport once the workbook has been read.
      const dump = await recordDump({
        region: region.region,
        sourceUrl: url,
        trigger: this.currentTrigger,
        raw,
        stats: { sheetRowCount: 0, headers: [], parsedRowCount: 0, parsedTotalAmount: 0, parsedTotalQty: 0 },
      });
      dumpId = dump?.id ?? null;

      const verdict = evaluateRawExport(raw);
      if (!verdict.ok && verdict.mode === "block") {
        if (dumpId) await setDumpVerdict(dumpId, "rejected", verdict.reason, verdict.checks);
        console.error(`[archive] REFUSING to import ${region.region}: ${verdict.reason}. Live table left untouched.`);
        throw new SheetRejectedError(region.region, verdict.reason || "failed validation", dumpId, verdict.checks);
      }
    } catch (e: any) {
      if (e instanceof SheetRejectedError) throw e;
      console.error(`[archive] archiveRawExport(${region.region}) failed, continuing sync:`, e?.message || e);
    }
    return dumpId;
  }

  /** Marks an already-archived dump as unreadable, then rejects it. */
  private async rejectUnreadableExport(targetModel: any, dumpId: number | null, err: any): Promise<never> {
    const region = regionForModel(targetModel);
    const verdict = unreadableExportVerdict(err?.message || String(err));
    if (dumpId) await setDumpVerdict(dumpId, "rejected", verdict.reason, verdict.checks);
    if (region && guardMode() === "block") {
      console.error(`[archive] REFUSING to import ${region.region}: ${verdict.reason}. Live table left untouched.`);
      throw new SheetRejectedError(region.region, verdict.reason || "unreadable export", dumpId, verdict.checks);
    }
    throw err;
  }

  /**
   * Completes the archive record with what the parser produced, applies the full guard,
   * and snapshots the live table before it is wiped.
   */
  private async guardParsedExport(
    targetModel: any,
    dumpId: number | null,
    buffer: ArrayBuffer,
    rows: any[][],
  ): Promise<void> {
    const region = this.archiveTargetFor(targetModel);
    if (!region) return;

    try {
      const raw = Buffer.from(buffer);

      // Parsed a second time here (processData parses again inside the transaction with
      // the preserve map). Costs a few hundred ms on the largest region, and buys the
      // guard the real parser's output instead of a lookalike that could drift. rawJson
      // is omitted because these records are measured, never inserted.
      const preview = this.parseRows(rows, targetModel, undefined, undefined, true);
      const totals = summarizeRecords(preview.records);

      if (dumpId) {
        await updateDumpStats(dumpId, {
          headers: preview.headers,
          parsedRowCount: preview.count,
          parsedTotalAmount: totals.totalAmount,
          parsedTotalQty: totals.totalQty,
        });
      }

      const baseline = await getLastAcceptedDump(region.region);
      const verdict = evaluateSheet({
        region: region.region,
        raw,
        headers: preview.headers,
        parsedRowCount: preview.count,
        parsedTotalAmount: totals.totalAmount,
        baseline,
      });

      if (!verdict.ok && verdict.mode === "block") {
        if (dumpId) await setDumpVerdict(dumpId, "rejected", verdict.reason, verdict.checks);
        console.error(
          `[archive] REFUSING to import ${region.region}: ${verdict.reason}. ` +
            `Live table left untouched (${baseline ? `baseline dump #${baseline.id}` : "no baseline"}).`,
        );
        throw new SheetRejectedError(region.region, verdict.reason || "failed validation", dumpId, verdict.checks);
      }

      if (!verdict.ok) {
        console.warn(
          `[archive] guard objected to ${region.region} (${verdict.reason}) but ARCHIVE_GUARD=warn — importing anyway.`,
        );
      }
      if (dumpId) {
        await setDumpVerdict(dumpId, verdict.ok ? "accepted" : "warned", verdict.reason, verdict.checks);
      }

      // Snapshot the table as it stands, unless this export is byte-identical to the one
      // that produced the current contents — in which case the snapshot we already hold
      // describes the same rows.
      const unchanged = !!(baseline && sha256(raw) === baseline.contentSha256);
      if (unchanged) {
        console.log(`[archive] ${region.region}: export unchanged since dump #${baseline!.id}; snapshot skipped.`);
      } else {
        await takePreSyncSnapshot(region, dumpId);
      }
    } catch (e: any) {
      if (e instanceof SheetRejectedError) throw e;
      console.error(`[archive] guardParsedExport(${region.region}) failed, continuing sync:`, e?.message || e);
    }
  }

  private async syncFromGoogleSheet(url: string, targetModel: any, sheetNamePreference?: string) {
    const startTime = Date.now();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
      
      const fetchTime = Date.now();
      const buffer = await response.arrayBuffer();

      // Archive the bytes BEFORE parsing — XLSX.read throws on some malformed responses,
      // and those are precisely the ones worth keeping a copy of.
      const dumpId = await this.archiveRawExport(url, targetModel, buffer);

      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(buffer, { type: "buffer" });
      } catch (e: any) {
        await this.rejectUnreadableExport(targetModel, dumpId, e);
        throw e; // unreachable; rejectUnreadableExport always throws
      }

      let sheetName = workbook.SheetNames[0];
      if (sheetNamePreference) {
        const found = workbook.SheetNames.find(n => n.toLowerCase() === sheetNamePreference.toLowerCase());
        if (found) sheetName = found;
      }
      
      if (!sheetName) throw new Error("No sheet name found in workbook.");
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error(`Sheet "${sheetName}" not found in workbook.`);
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const parseTime = Date.now();

      // ── Corruption guard + pre-wipe snapshot ───────────────────────────────
      // Everything below this point is destructive (deleteMany then insert), so this is
      // the last moment at which the current data still exists. The guard decides whether
      // the export is safe and — only if it is — snapshots the live table before the wipe.
      //
      // A rejected export throws before any delete runs, leaving the table exactly as it
      // was. Archive failures are swallowed inside the archive layer, so a broken archive
      // degrades to "no backup taken" rather than "sync broken".
      await this.guardParsedExport(targetModel, dumpId, buffer, rows);

      // Find the key of targetModel on prisma (e.g. 'googleSheetOfflineSale')
      const modelKey = Object.keys(prisma).find(key => {
        if (key.startsWith('$') || key.startsWith('_')) return false;
        try {
          return (prisma as any)[key] === targetModel;
        } catch (e) {
          return false;
        }
      });

      if (!modelKey) {
        console.log(`[SYNC] Model key not found for atomic transaction. Falling back to non-atomic sync.`);
        const preserveMap = await this.buildPreserveMap(targetModel);
        await targetModel.deleteMany({});
        const result = await this.processData(rows, targetModel, undefined, preserveMap);
        const nonAtomicTime = Date.now();
        console.log(`[SYNC PERFORMANCE] Non-atomic total time: ${((nonAtomicTime - startTime)/1000).toFixed(2)}s`);
        return result;
      }

      console.log(`[SYNC] Wiping and inserting data for ${modelKey} atomically inside transaction...`);
      let syncResult: SyncResult = { success: false, importedCount: 0, skippedCount: 0 };
      
      await prisma.$transaction(async (tx) => {
        const txModel = (tx as any)[modelKey];
        // Capture last-known-good metadata BEFORE wiping so a stale/blank sheet export
        // (e.g. the 3 AM run, formulas not recalculated) can't erase it. See SELF-HEAL
        // note in processData.
        const preserveMap = await this.buildPreserveMap(txModel);
        // Delete all rows inside transaction
        await txModel.deleteMany({});
        // Process and insert inside transaction
        syncResult = await this.processData(rows, targetModel, txModel, preserveMap);
      }, {
        maxWait: 30000, // 30 seconds to acquire a connection from the pool
        timeout: 240000, // 4 minutes timeout for large sheets
      });

      const endTime = Date.now();
      console.log(`[SYNC PERFORMANCE] ${modelKey} Sync Details:`);
      console.log(`  - Download Google Sheet: ${((fetchTime - startTime)/1000).toFixed(2)}s`);
      console.log(`  - Parse XLSX / JSON: ${((parseTime - fetchTime)/1000).toFixed(2)}s`);
      console.log(`  - Database Transaction (Delete + Batch inserts): ${((endTime - parseTime)/1000).toFixed(2)}s`);
      console.log(`  - Total Sync Time: ${((endTime - startTime)/1000).toFixed(2)}s`);
      if (dumpId) console.log(`  - Archived as dump #${dumpId}`);

      if (syncResult.success) {
        try {
          clearTotalOfflineCache();
        } catch (e) {
          console.warn("Failed to clear total offline cache:", e);
        }
      }

      return syncResult;
    } catch (error) {
      console.error("Google Sheet Sync Error:", error);
      throw error;
    }
  }

  private getVal(row: any[], map: Record<string, number>, key: string): string {
    const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const index = map[normalizedKey];
    if (index === undefined || index >= row.length) return "";
    // Collapse multiple internal spaces into one and trim
    return String(row[index] || "").trim().replace(/\s+/g, " ");
  }
}

export const offlineSyncService = new OfflineSyncService();
