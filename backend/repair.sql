
UPDATE "google_sheet_offline_sales" 
SET "title" = TRIM("rawJson"->>4) 
WHERE "title" = '' OR "title" IS NULL;
