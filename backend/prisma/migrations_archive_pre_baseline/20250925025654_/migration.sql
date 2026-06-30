-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('Cash', 'UPI', 'Card', 'NetBanking', 'Wallet', 'Cheque', 'BankTransfer', 'Other');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('complete', 'pending', 'cancelled', 'refunded', 'unknown');

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
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "OnlineSale_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "OfflineCashUPICCSale_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "RajRadhaEventSale_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "LokEventSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_productId_key" ON "reviews"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineSale_rowHash_key" ON "OnlineSale"("rowHash");

-- CreateIndex
CREATE INDEX "OnlineSale_date_idx" ON "OnlineSale"("date");

-- CreateIndex
CREATE INDEX "OnlineSale_orderNo_idx" ON "OnlineSale"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineCashUPICCSale_rowHash_key" ON "OfflineCashUPICCSale"("rowHash");

-- CreateIndex
CREATE INDEX "OfflineCashUPICCSale_date_idx" ON "OfflineCashUPICCSale"("date");

-- CreateIndex
CREATE INDEX "OfflineCashUPICCSale_orderNo_idx" ON "OfflineCashUPICCSale"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "RajRadhaEventSale_rowHash_key" ON "RajRadhaEventSale"("rowHash");

-- CreateIndex
CREATE INDEX "RajRadhaEventSale_date_idx" ON "RajRadhaEventSale"("date");

-- CreateIndex
CREATE INDEX "RajRadhaEventSale_orderNo_idx" ON "RajRadhaEventSale"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "LokEventSale_rowHash_key" ON "LokEventSale"("rowHash");

-- CreateIndex
CREATE INDEX "LokEventSale_date_idx" ON "LokEventSale"("date");

-- CreateIndex
CREATE INDEX "LokEventSale_orderNo_idx" ON "LokEventSale"("orderNo");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
