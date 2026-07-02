-- AlterTable: add IP-derived location columns to sessions
ALTER TABLE "sessions" ADD COLUMN "city" TEXT;
ALTER TABLE "sessions" ADD COLUMN "region" TEXT;
ALTER TABLE "sessions" ADD COLUMN "country" TEXT;
