-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('Cash', 'UPI', 'Card', 'NetBanking', 'Wallet', 'Cheque', 'BankTransfer', 'Other');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('complete', 'pending', 'cancelled', 'refunded', 'unknown');

-- CreateTable
CREATE TABLE "LokEventSale" (
    "id" BIGSERIAL NOT NULL,
    "orderNo" TEXT,
    "orderStatus" "SalesOrderStatus",
    "month" TEXT,
    "year" INTEGER,
    "isbn" TEXT,
    "itemCode" TEXT,
    "title" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "category" TEXT,
    "description" TEXT,
    "qty" INTEGER,
    "rate" DECIMAL(12,2),
    "amount" DECIMAL(12,2),
    "discount" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "shipping" DECIMAL(12,2),
    "paymentMode" "PaymentMode",
    "customerName" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "date" TIMESTAMP(3),
    "publisherCode" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT,

    CONSTRAINT "LokEventSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineCashUPICCSale" (
    "id" BIGSERIAL NOT NULL,
    "orderNo" TEXT,
    "orderStatus" "SalesOrderStatus",
    "month" TEXT,
    "year" INTEGER,
    "isbn" TEXT,
    "itemCode" TEXT,
    "title" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "category" TEXT,
    "description" TEXT,
    "qty" INTEGER,
    "rate" DECIMAL(12,2),
    "amount" DECIMAL(12,2),
    "discount" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "shipping" DECIMAL(12,2),
    "paymentMode" "PaymentMode",
    "customerName" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "date" TIMESTAMP(3),
    "publisherCode" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT,

    CONSTRAINT "OfflineCashUPICCSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineSale" (
    "id" BIGSERIAL NOT NULL,
    "orderNo" TEXT,
    "orderStatus" "SalesOrderStatus",
    "month" TEXT,
    "year" INTEGER,
    "isbn" TEXT,
    "itemCode" TEXT,
    "title" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "category" TEXT,
    "description" TEXT,
    "qty" INTEGER,
    "rate" DECIMAL(12,2),
    "amount" DECIMAL(12,2),
    "discount" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "shipping" DECIMAL(12,2),
    "paymentMode" "PaymentMode",
    "customerName" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "date" TIMESTAMP(3),
    "publisherCode" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT,

    CONSTRAINT "OnlineSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RajRadhaEventSale" (
    "id" BIGSERIAL NOT NULL,
    "orderNo" TEXT,
    "orderStatus" "SalesOrderStatus",
    "month" TEXT,
    "year" INTEGER,
    "isbn" TEXT,
    "itemCode" TEXT,
    "title" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "category" TEXT,
    "description" TEXT,
    "qty" INTEGER,
    "rate" DECIMAL(12,2),
    "amount" DECIMAL(12,2),
    "discount" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "shipping" DECIMAL(12,2),
    "paymentMode" "PaymentMode",
    "customerName" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "date" TIMESTAMP(3),
    "publisherCode" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT,

    CONSTRAINT "RajRadhaEventSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookfair_offline_sales" (
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
    "type" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fictionType" TEXT,

    CONSTRAINT "bookfair_offline_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

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
    "type" TEXT,
    "fictionType" TEXT,

    CONSTRAINT "google_sheet_offline_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lokbharti_offline_sales" (
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
    "type" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fictionType" TEXT,

    CONSTRAINT "lokbharti_offline_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mumbai_offline_sales" (
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
    "type" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fictionType" TEXT,

    CONSTRAINT "mumbai_offline_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_sales_history" (
    "id" BIGSERIAL NOT NULL,
    "channel" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
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
    "type" TEXT,
    "fictionType" TEXT,
    "rowHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offline_sales_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_offline_sales" (
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
    "type" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fictionType" TEXT,

    CONSTRAINT "online_offline_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "shippingAddress" JSONB,
    "billingAddress" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patna_offline_sales" (
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
    "type" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fictionType" TEXT,

    CONSTRAINT "patna_offline_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'IN_STOCK',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rajkamal_data" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT,
    "author" TEXT,
    "category" TEXT,
    "mrp" DECIMAL(12,2),
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ageGroup" TEXT,
    "date" TIMESTAMP(3),
    "discountCouponCode" TEXT,
    "email" TEXT,
    "gender" TEXT,
    "isbnNo" TEXT,
    "membershipId" TEXT,
    "mobileNo" TEXT,
    "name" TEXT,
    "noOfPages" INTEGER,
    "orderId" TEXT,
    "orderStatus" TEXT,
    "paymentMode" TEXT,
    "pincode" TEXT,
    "publicationName" TEXT,
    "releaseDate" TIMESTAMP(3),
    "sellingPrice" DECIMAL(12,2),
    "slNo" INTEGER,

    CONSTRAINT "rajkamal_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'scheduled',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "okCount" INTEGER NOT NULL,
    "totalRegions" INTEGER NOT NULL,
    "totalImported" INTEGER NOT NULL,
    "regions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LokEventSale_date_idx" ON "LokEventSale"("date" ASC);

-- CreateIndex
CREATE INDEX "LokEventSale_orderNo_idx" ON "LokEventSale"("orderNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LokEventSale_rowHash_key" ON "LokEventSale"("rowHash" ASC);

-- CreateIndex
CREATE INDEX "OfflineCashUPICCSale_date_idx" ON "OfflineCashUPICCSale"("date" ASC);

-- CreateIndex
CREATE INDEX "OfflineCashUPICCSale_orderNo_idx" ON "OfflineCashUPICCSale"("orderNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineCashUPICCSale_rowHash_key" ON "OfflineCashUPICCSale"("rowHash" ASC);

-- CreateIndex
CREATE INDEX "OnlineSale_date_idx" ON "OnlineSale"("date" ASC);

-- CreateIndex
CREATE INDEX "OnlineSale_orderNo_idx" ON "OnlineSale"("orderNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "OnlineSale_rowHash_key" ON "OnlineSale"("rowHash" ASC);

-- CreateIndex
CREATE INDEX "RajRadhaEventSale_date_idx" ON "RajRadhaEventSale"("date" ASC);

-- CreateIndex
CREATE INDEX "RajRadhaEventSale_orderNo_idx" ON "RajRadhaEventSale"("orderNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RajRadhaEventSale_rowHash_key" ON "RajRadhaEventSale"("rowHash" ASC);

-- CreateIndex
CREATE INDEX "bfos_geo_city" ON "bookfair_offline_sales"("city" ASC, "state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "bfos_geo_state" ON "bookfair_offline_sales"("state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "bookfair_offline_sales_customerName_idx" ON "bookfair_offline_sales"("customerName" ASC);

-- CreateIndex
CREATE INDEX "bookfair_offline_sales_date_amount_qty_title_idx" ON "bookfair_offline_sales"("date" ASC, "amount" ASC, "qty" ASC, "title" ASC);

-- CreateIndex
CREATE INDEX "bookfair_offline_sales_date_idx" ON "bookfair_offline_sales"("date" ASC);

-- CreateIndex
CREATE INDEX "bookfair_offline_sales_docNo_idx" ON "bookfair_offline_sales"("docNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name" ASC);

-- CreateIndex
CREATE INDEX "google_sheet_offline_sales_customerName_idx" ON "google_sheet_offline_sales"("customerName" ASC);

-- CreateIndex
CREATE INDEX "google_sheet_offline_sales_date_amount_qty_title_idx" ON "google_sheet_offline_sales"("date" ASC, "amount" ASC, "qty" ASC, "title" ASC);

-- CreateIndex
CREATE INDEX "google_sheet_offline_sales_date_idx" ON "google_sheet_offline_sales"("date" ASC);

-- CreateIndex
CREATE INDEX "google_sheet_offline_sales_docNo_idx" ON "google_sheet_offline_sales"("docNo" ASC);

-- CreateIndex
CREATE INDEX "gsos_geo_city" ON "google_sheet_offline_sales"("city" ASC, "state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "gsos_geo_state" ON "google_sheet_offline_sales"("state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "lbos_geo_city" ON "lokbharti_offline_sales"("city" ASC, "state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "lbos_geo_state" ON "lokbharti_offline_sales"("state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "lokbharti_offline_sales_customerName_idx" ON "lokbharti_offline_sales"("customerName" ASC);

-- CreateIndex
CREATE INDEX "lokbharti_offline_sales_date_amount_qty_title_idx" ON "lokbharti_offline_sales"("date" ASC, "amount" ASC, "qty" ASC, "title" ASC);

-- CreateIndex
CREATE INDEX "lokbharti_offline_sales_date_idx" ON "lokbharti_offline_sales"("date" ASC);

-- CreateIndex
CREATE INDEX "lokbharti_offline_sales_docNo_idx" ON "lokbharti_offline_sales"("docNo" ASC);

-- CreateIndex
CREATE INDEX "mos_geo_city" ON "mumbai_offline_sales"("city" ASC, "state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "mos_geo_state" ON "mumbai_offline_sales"("state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "mumbai_offline_sales_customerName_idx" ON "mumbai_offline_sales"("customerName" ASC);

-- CreateIndex
CREATE INDEX "mumbai_offline_sales_date_amount_qty_title_idx" ON "mumbai_offline_sales"("date" ASC, "amount" ASC, "qty" ASC, "title" ASC);

-- CreateIndex
CREATE INDEX "mumbai_offline_sales_date_idx" ON "mumbai_offline_sales"("date" ASC);

-- CreateIndex
CREATE INDEX "mumbai_offline_sales_docNo_idx" ON "mumbai_offline_sales"("docNo" ASC);

-- CreateIndex
CREATE INDEX "osh_channel_fy_date" ON "offline_sales_history"("channel" ASC, "financialYear" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "osh_channel_fy_title" ON "offline_sales_history"("channel" ASC, "financialYear" ASC, "title" ASC);

-- CreateIndex
CREATE INDEX "online_offline_sales_customerName_idx" ON "online_offline_sales"("customerName" ASC);

-- CreateIndex
CREATE INDEX "online_offline_sales_date_amount_qty_title_idx" ON "online_offline_sales"("date" ASC, "amount" ASC, "qty" ASC, "title" ASC);

-- CreateIndex
CREATE INDEX "online_offline_sales_date_idx" ON "online_offline_sales"("date" ASC);

-- CreateIndex
CREATE INDEX "online_offline_sales_docNo_idx" ON "online_offline_sales"("docNo" ASC);

-- CreateIndex
CREATE INDEX "oos_geo_city" ON "online_offline_sales"("city" ASC, "state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "oos_geo_state" ON "online_offline_sales"("state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber" ASC);

-- CreateIndex
CREATE INDEX "patna_offline_sales_customerName_idx" ON "patna_offline_sales"("customerName" ASC);

-- CreateIndex
CREATE INDEX "patna_offline_sales_date_amount_qty_title_idx" ON "patna_offline_sales"("date" ASC, "amount" ASC, "qty" ASC, "title" ASC);

-- CreateIndex
CREATE INDEX "patna_offline_sales_date_idx" ON "patna_offline_sales"("date" ASC);

-- CreateIndex
CREATE INDEX "patna_offline_sales_docNo_idx" ON "patna_offline_sales"("docNo" ASC);

-- CreateIndex
CREATE INDEX "pos_geo_city" ON "patna_offline_sales"("city" ASC, "state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE INDEX "pos_geo_state" ON "patna_offline_sales"("state" ASC, "amount" ASC, "inAmount" ASC, "qty" ASC, "inQty" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku" ASC);

-- CreateIndex
CREATE INDEX "rajkamal_data_date_idx" ON "rajkamal_data"("date" ASC);

-- CreateIndex
CREATE INDEX "rajkamal_data_isbnNo_idx" ON "rajkamal_data"("isbnNo" ASC);

-- CreateIndex
CREATE INDEX "rajkamal_data_orderId_idx" ON "rajkamal_data"("orderId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rajkamal_data_rowHash_key" ON "rajkamal_data"("rowHash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_productId_key" ON "reviews"("userId" ASC, "productId" ASC);

-- CreateIndex
CREATE INDEX "sync_logs_startedAt_idx" ON "sync_logs"("startedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

