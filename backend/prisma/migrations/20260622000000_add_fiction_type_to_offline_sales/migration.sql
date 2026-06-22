-- Add Fiction/ Non-Fiction column to all offline sales tables.
-- Nullable additive change: existing rows are unaffected (no data loss).

ALTER TABLE "google_sheet_offline_sales" ADD COLUMN IF NOT EXISTS "fictionType" TEXT;
ALTER TABLE "mumbai_offline_sales"       ADD COLUMN IF NOT EXISTS "fictionType" TEXT;
ALTER TABLE "patna_offline_sales"        ADD COLUMN IF NOT EXISTS "fictionType" TEXT;
ALTER TABLE "online_offline_sales"       ADD COLUMN IF NOT EXISTS "fictionType" TEXT;
ALTER TABLE "bookfair_offline_sales"     ADD COLUMN IF NOT EXISTS "fictionType" TEXT;
ALTER TABLE "lokbharti_offline_sales"    ADD COLUMN IF NOT EXISTS "fictionType" TEXT;
