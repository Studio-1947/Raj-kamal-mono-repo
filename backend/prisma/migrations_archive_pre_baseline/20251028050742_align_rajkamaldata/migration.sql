/*
  Warnings:

  - You are about to drop the column `binding` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `cost` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `edition` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `isbn` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `itemCode` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `pages` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `publisher` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `sourceFile` on the `rajkamal_data` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `rajkamal_data` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "rajkamal_data_isbn_idx";

-- DropIndex
DROP INDEX "rajkamal_data_itemCode_idx";

-- AlterTable
ALTER TABLE "rajkamal_data" DROP COLUMN "binding",
DROP COLUMN "cost",
DROP COLUMN "description",
DROP COLUMN "edition",
DROP COLUMN "isbn",
DROP COLUMN "itemCode",
DROP COLUMN "language",
DROP COLUMN "pages",
DROP COLUMN "price",
DROP COLUMN "publisher",
DROP COLUMN "qty",
DROP COLUMN "sourceFile",
DROP COLUMN "year",
ADD COLUMN     "ageGroup" TEXT,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "discountCouponCode" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isbnNo" TEXT,
ADD COLUMN     "membershipId" TEXT,
ADD COLUMN     "mobileNo" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "noOfPages" INTEGER,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "orderStatus" TEXT,
ADD COLUMN     "paymentMode" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "publicationName" TEXT,
ADD COLUMN     "releaseDate" TIMESTAMP(3),
ADD COLUMN     "sellingPrice" DECIMAL(12,2),
ADD COLUMN     "slNo" INTEGER;

-- CreateIndex
CREATE INDEX "rajkamal_data_date_idx" ON "rajkamal_data"("date");

-- CreateIndex
CREATE INDEX "rajkamal_data_orderId_idx" ON "rajkamal_data"("orderId");

-- CreateIndex
CREATE INDEX "rajkamal_data_isbnNo_idx" ON "rajkamal_data"("isbnNo");
