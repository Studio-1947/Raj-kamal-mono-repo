-- CreateTable
CREATE TABLE "google_sheet_offline_sales" (
    "id" BIGSERIAL NOT NULL,
    "slNo" INTEGER,
    "docNo" TEXT,
    "date" TIMESTAMP(3),
    "dateStr" TEXT,
    "isbn" TEXT,
    "title" TEXT,
    "author" TEXT,
    "binding" TEXT,
    "pubYear" INTEGER,
    "publisher" TEXT,
    "qty" INTEGER,
    "inQty" INTEGER,
    "currency" TEXT,
    "rate" DECIMAL(12,2),
    "discount" DECIMAL(12,2),
    "addDiscount" DECIMAL(12,2),
    "amount" DECIMAL(12,2),
    "inAmount" DECIMAL(12,2),
    "customerName" TEXT,
    "state" TEXT,
    "city" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_sheet_offline_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "google_sheet_offline_sales_rowHash_key" ON "google_sheet_offline_sales"("rowHash");

-- CreateIndex
CREATE INDEX "google_sheet_offline_sales_date_idx" ON "google_sheet_offline_sales"("date");

-- CreateIndex
CREATE INDEX "google_sheet_offline_sales_date_amount_qty_title_idx" ON "google_sheet_offline_sales"("date", "amount", "qty", "title");

-- CreateIndex
CREATE INDEX "google_sheet_offline_sales_customerName_idx" ON "google_sheet_offline_sales"("customerName");

-- CreateIndex
CREATE INDEX "google_sheet_offline_sales_docNo_idx" ON "google_sheet_offline_sales"("docNo");
