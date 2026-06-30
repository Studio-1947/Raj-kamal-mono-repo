-- CreateTable
CREATE TABLE "rajkamal_data" (
    "id" BIGSERIAL NOT NULL,
    "isbn" TEXT,
    "itemCode" TEXT,
    "title" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "category" TEXT,
    "description" TEXT,
    "language" TEXT,
    "edition" TEXT,
    "year" INTEGER,
    "pages" INTEGER,
    "binding" TEXT,
    "mrp" DECIMAL(12,2),
    "price" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "qty" INTEGER,
    "sourceFile" TEXT,
    "rowHash" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rajkamal_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rajkamal_data_rowHash_key" ON "rajkamal_data"("rowHash");

-- CreateIndex
CREATE INDEX "rajkamal_data_isbn_idx" ON "rajkamal_data"("isbn");

-- CreateIndex
CREATE INDEX "rajkamal_data_itemCode_idx" ON "rajkamal_data"("itemCode");
