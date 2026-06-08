import { prisma } from "../../../lib/prisma.js";
import crypto from "crypto";
import * as XLSX from "xlsx";
import fetch from "node-fetch";
import { clearTotalOfflineCache } from "./total-offline.routes.js";

const REPORT_URL = "https://rajkamal.cloudpub.in/Reports/rpttitlecustomerwisegriddataExport?FromDate=2026-01-01&ToDate=2026-12-31&iCompanyID=1&iBranchID=1,&cmbISBN=&CustomerName=&Documenttype=ALLS&TrnsDocID=&ManageEdition=false&CountryName=&StateName=&CityName=&SalesmanName=&SalesmanMgnrName=&chkshowclbal=N&BookCategoryID=&languageID=&PublisherID=&SelectDiscount=&TxtDiscount=0&AccountID=BookSeller&IncludeExcludeBranchSale=Exclude";

// SKIP_CUSTOMERS filter removed — all rows are now imported

export interface SyncResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  error?: string;
}
export class OfflineSyncService {
  /**
   * Main entry point to process an array of rows from any source (Sheets, ERP, etc.)
   * @param rows The data rows (including headers)
   * @param targetModel The Prisma model delegate to use (default: prisma.googleSheetOfflineSale)
   */
  async processData(rows: any[][], targetModel: any = prisma.googleSheetOfflineSale, txClient?: any): Promise<SyncResult> {
    if (!rows || rows.length < 2) {
      return { success: true, importedCount: 0, skippedCount: 0 };
    }

    const headers = rows[0] as string[];
    if (!headers) {
      return { success: true, importedCount: 0, skippedCount: 0 };
    }
    
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

    // DEBUG: Write headers to a file to see what's actually coming through
    try {
      const fs = await import('fs');
      fs.appendFileSync('headers_debug.log', `HEADERS: ${JSON.stringify(headers)}\n`);
    } catch (e) {}

    let importedCount = 0;
    let count = 0;
    let skippedEmpty = 0;
    let duplicateCount = 0;

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
      const author = this.getVal(row, headerMap, "Author") || this.getVal(row, headerMap, "DisplayAuthorName");
      const binding = this.getVal(row, headerMap, "Binding");
      const pubYear = parseInt(this.getVal(row, headerMap, "Pub-Year") || this.getVal(row, headerMap, "Pub-year") || "0");
      const publisher = this.getVal(row, headerMap, "Publisher");
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

      toInsert.push({
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
        rowHash,
        rawJson: Array.from({ length: headers.length }, (_, i) => (row[i] === undefined ? null : row[i])) as any,
      });
      count++;
    }

    if (toInsert.length > 0) {
      try {
        // Chunk toInsert to avoid potential database limit issues with massive arrays
        const chunkSize = 1000;
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

    console.log(`[SYNC LOG] Total Rows: ${count}, Newly Imported: ${importedCount}, Duplicates Skipped: ${duplicateCount}, Empty Skipped: ${skippedEmpty}`);
    return { success: true, importedCount, skippedCount: skippedEmpty };
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

  private async syncFromGoogleSheet(url: string, targetModel: any, sheetNamePreference?: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "buffer" });
      
      let sheetName = workbook.SheetNames[0];
      if (sheetNamePreference) {
        const found = workbook.SheetNames.find(n => n.toLowerCase() === sheetNamePreference.toLowerCase());
        if (found) sheetName = found;
      }
      
      if (!sheetName) throw new Error("No sheet name found in workbook.");
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error(`Sheet "${sheetName}" not found in workbook.`);
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
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
        await targetModel.deleteMany({});
        return await this.processData(rows, targetModel);
      }

      console.log(`[SYNC] Wiping and inserting data for ${modelKey} atomically inside transaction...`);
      let syncResult: SyncResult = { success: false, importedCount: 0, skippedCount: 0 };
      
      await prisma.$transaction(async (tx) => {
        const txModel = (tx as any)[modelKey];
        // Delete all rows inside transaction
        await txModel.deleteMany({});
        // Process and insert inside transaction
        syncResult = await this.processData(rows, targetModel, txModel);
      }, {
        maxWait: 15000, // 15 seconds to acquire a connection from the pool
        timeout: 90000, // 90 seconds timeout for large sheets
      });

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
