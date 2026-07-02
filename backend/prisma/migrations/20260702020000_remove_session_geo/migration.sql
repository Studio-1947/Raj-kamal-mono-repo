-- Drop the IP-derived location columns (geo feature removed)
ALTER TABLE "sessions" DROP COLUMN "city";
ALTER TABLE "sessions" DROP COLUMN "region";
ALTER TABLE "sessions" DROP COLUMN "country";
