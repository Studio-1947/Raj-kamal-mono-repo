import { prisma } from "../../../lib/prisma.js";
import crypto from "crypto";
import * as XLSX from "xlsx";

const REPORT_URL = "https://rajkamal.cloudpub.in/Reports/rpttitlecustomerwisegriddataExport?FromDate=2026-01-01&ToDate=2026-12-31&iCompanyID=1&iBranchID=1,&cmbISBN=&CustomerName=&Documenttype=ALLS&TrnsDocID=&ManageEdition=false&CountryName=&StateName=&CityName=&SalesmanName=&SalesmanMgnrName=&chkshowclbal=N&BookCategoryID=&languageID=&PublisherID=&SelectDiscount=&TxtDiscount=0&AccountID=BookSeller&IncludeExcludeBranchSale=Exclude";

const SKIP_CUSTOMERS = [
  "Flipkart.Com",
  "CREDIT CARD PAYMENT",
  "SHIP ROCKET COD",
  "ZOMBOZONE",
  "LOV DEV & SONS-DELHI",
  "Book chor literary solutions Pvt Ltd (ONLINE)",
  "WHATSAPP SALE",
  "MEESHO.COM",
  "BIDCURIOS",
  "SR ECOMMERCE FACTORY PVT LTD - NEW DELHI",
  "GEM PORTAL , DELHI",
  "REPRO BOOKS LIMITED - DHARUHERA (PSM)",
  "GOVIND BOOK SHOP, AGRA",
  "Rachnaye Private Limited , BANGALORE",
  "Book chor literary solutions Pvt Ltd (OFFLINE)",
  "REPRO BOOKS LIMITED (POD)",
  "REKHTA FOUNDATION, (SALE)",
  "SCHOLAR BOOKS DIST,  , LUCKNOW",
  "VDK PUBLICATIONS PRIVATE LIMITED"
];

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
      if (h) headerMap[String(h).trim()] = i;
    });

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length === 0) continue;

      const customerName = this.getVal(row, headerMap, "CustomerName");
      
      // Skip specific customers as per user requirement
      if (customerName && SKIP_CUSTOMERS.includes(customerName)) {
        skippedCount++;
        continue;
      }

      // Prepare data for Prisma
      const orderNo = this.getVal(row, headerMap, "OrderNo") || this.getVal(row, headerMap, "Doc No") || this.getVal(row, headerMap, "Vch No");
      const title = this.getVal(row, headerMap, "Title") || this.getVal(row, headerMap, "ItemName");
      
      const valQty = parseInt(this.getVal(row, headerMap, "Qty") || this.getVal(row, headerMap, "OUT") || "0");
      const qty = isNaN(valQty) ? 0 : valQty;
      
      const valAmount = parseFloat(this.getVal(row, headerMap, "Amount") || "0");
      const amount = isNaN(valAmount) ? 0 : valAmount;
      
      const valRate = parseFloat(this.getVal(row, headerMap, "Rate") || this.getVal(row, headerMap, "BOOKRATE") || "0");
      const rate = isNaN(valRate) ? 0 : valRate;

      let date: Date | null = null;
      const rawDate = this.getVal(row, headerMap, "Date") || this.getVal(row, headerMap, "Trnsdocdate");
      
      if (rawDate) {
        // Handle Excel Serial Date (e.g. 46097)
        if (/^\d{5}(\.\d+)?$/.test(rawDate)) {
          const serial = parseFloat(rawDate);
          date = new Date((serial - 25569) * 86400 * 1000);
        } else {
          const parsedDate = new Date(rawDate);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate;
          }
        }
      }

      const rowContent = JSON.stringify(row);
      const rowHash = crypto.createHash('md5').update(rowContent).digest('hex');

      try {
        await prisma.googleSheetOfflineSale.upsert({
          where: { rowHash },
          update: {
            orderNo,
            customerName,
            title,
            qty,
            amount,
            rate,
            date,
            rawJson: row as any,
          },
          create: {
            orderNo,
            customerName,
            title,
            qty,
            amount,
            rate,
            date,
            rowHash,
            rawJson: row as any,
          },
        });
        importedCount++;
      } catch (err: any) {
        console.error(`[SYNC ERROR] Prisma upsert failed for row: ${rowContent.slice(0, 100)}...`, err.message);
      }
    }

    return { success: true, importedCount, skippedCount };
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
    const index = map[key];
    if (index === undefined || index >= row.length) return "";
    return String(row[index] || "").trim();
  }
}

export const offlineSyncService = new OfflineSyncService();
