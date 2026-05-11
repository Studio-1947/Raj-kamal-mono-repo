import { prisma } from "../../../lib/prisma.js";
import crypto from "crypto";
import * as XLSX from "xlsx";

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
   */
  async processData(rows: any[][]): Promise<SyncResult> {
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

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length === 0 || row.every(cell => cell === "" || cell === null)) {
        skippedEmpty++;
        continue;
      }

      const customerName = this.getVal(row, headerMap, "CustomerName");

      const slNo = parseInt(this.getVal(row, headerMap, "sl/no") || "0");
      const docNo = this.getVal(row, headerMap, "TrnsdocNo") || this.getVal(row, headerMap, "Doc No");
      const dateStr = this.getVal(row, headerMap, "TrnsdocdateStr") || this.getVal(row, headerMap, "DateStr");
      const isbn = this.getVal(row, headerMap, "BookCode") || this.getVal(row, headerMap, "ISBN");
      const title = 
        this.getVal(row, headerMap, "BookName") || 
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
      
      // FALLBACK: If type is still null, check index 20 or 19 for common sale type keywords
      // This handles cases where the header name is unknown but data is clearly a Sale Type
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
        if (/^\d{5}(\.\d+)?$/.test(effectiveDateSource)) {
          const serial = parseFloat(effectiveDateSource);
          date = new Date((serial - 25569) * 86400 * 1000);
        } else {
          const parsedDate = new Date(effectiveDateSource);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate;
          }
        }
      }

      const rowContent = JSON.stringify(row);
      const rowHash = crypto.createHash('md5').update(rowContent).digest('hex');

      try {
        const existing = await prisma.googleSheetOfflineSale.findUnique({ where: { rowHash } });
        if (existing) {
          duplicateCount++;
          continue;
        }

        await prisma.googleSheetOfflineSale.create({
          data: {
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
            rawJson: row.map(v => (v === undefined ? null : v)) as any,
          },
        });
        importedCount++;
      } catch (err: any) {
        console.error(`[SYNC ERROR] Prisma creation failed:`, err.message);
      }
      count++;
    }

    console.log(`[SYNC LOG] Total: ${count}, Imported: ${importedCount}, Duplicates: ${duplicateCount}, Skipped Empty: ${skippedEmpty}`);
    return { success: true, importedCount, skippedCount: skippedEmpty };
  }

  /**
   * Legacy/Background Sync from Direct ERP URL
   */
  async syncOfflineSales() {
    console.log("Starting Offline Sales Sync from Direct ERP URL...");
    
    try {
      const response = await fetch(REPORT_URL);
      if (!response.ok) throw new Error(`Failed to fetch report from ERP: ${response.statusText}`);
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const filters = useMemo<OfflineSheetFilters>(() => ({
        days: s.get('days') ? Number(s.get('days')) : 365,
        startDate: s.get('startDate') || undefined,
      }));
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        console.log("No sheet found in downloaded report.");
        return { success: true, importedCount: 0, skippedCount: 0 };
      }
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.log("Sheet not found in downloaded workbook.");
        return { success: true, importedCount: 0, skippedCount: 0 };
      }

      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      return await this.processData(rows);
    } catch (error) {
      console.error("Offline Sync Error:", error);
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
