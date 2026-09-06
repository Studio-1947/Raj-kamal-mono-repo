// ─────────────────────────────────────────────────────────────────────────────
// archiveDb.ts
//
// Connection + schema bootstrap for the ARCHIVE database — a physically separate
// Postgres from the application DB.
//
// WHY SEPARATE: the Google-Sheet sync is destructive (wipe-and-replace). The whole
// point of the archive is to survive events that damage the main DB — a bad sheet
// export, a mistaken migration, a dropped table, a leaked credential. Anything that
// lives in the same instance shares the same blast radius, so it lives elsewhere,
// reached through its own connection string (ARCHIVE_DATABASE_URL).
//
// NEVER FALLS BACK TO THE MAIN DATABASE. If ARCHIVE_DATABASE_URL is unset, the whole
// archive is inert: no tables, no rows, no queries, no guard. Installing this code
// changes nothing about an existing deployment until an archive DB is deliberately
// provisioned. Falling back would mean silently creating tables in the application DB —
// both an unwanted change to that database and a backup sharing the fate of the thing
// it is backing up.
//
// NO PRISMA MODELS: archive tables are created idempotently with CREATE TABLE IF NOT
// EXISTS and driven by parameterised raw SQL. Same convention as syncLogStore.ts. This
// keeps the archive out of the main migration history entirely, which matters because
// the archive must be restorable even when the main schema is the thing that broke.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";

let client: PrismaClient | null = null;
let schemaReady: Promise<void> | null = null;
let disabledWarned = false;

/**
 * Whether the archive has somewhere to write. False = every archive entry point is a
 * no-op, and the sync behaves exactly as it did before this feature existed.
 */
export function isArchiveConfigured(): boolean {
  return !!process.env.ARCHIVE_DATABASE_URL && process.env.ARCHIVE_ENABLED !== "false";
}

/** Logs the "not configured" notice once per process rather than on every sync. */
export function warnIfUnconfigured(): void {
  if (isArchiveConfigured() || disabledWarned) return;
  disabledWarned = true;
  console.log(
    process.env.ARCHIVE_ENABLED === "false"
      ? "[archive] disabled via ARCHIVE_ENABLED=false."
      : "[archive] ARCHIVE_DATABASE_URL is not set — archiving and the corruption guard are OFF. " +
          "The sync runs exactly as before. Set ARCHIVE_DATABASE_URL to a separate Postgres to enable them.",
  );
}

/**
 * Lazily-created Prisma client bound to the archive database. Separate client and
 * separate connection pool, so archive writes can never contend with the app's pool.
 *
 * Throws if no archive URL is configured — callers must check isArchiveConfigured()
 * first. That is deliberate: there is no code path from here to the main database.
 */
export function archiveDb(): PrismaClient {
  if (!client) {
    const url = process.env.ARCHIVE_DATABASE_URL;
    if (!url) {
      throw new Error(
        "ARCHIVE_DATABASE_URL is not set. The archive never falls back to the application " +
          "database — provision a separate Postgres and set ARCHIVE_DATABASE_URL.",
      );
    }
    client = new PrismaClient({
      datasources: { db: { url } },
      log: ["error"],
    });
  }
  return client;
}

/**
 * Idempotently creates the archive schema. Memoized per process; a failure clears the
 * memo so a later call can retry (same pattern as ensureSyncLogTable).
 */
export function ensureArchiveSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = archiveDb();

      // One row per sheet export we fetched, whatever we decided to do with it.
      // raw_gz holds the gzipped bytes exactly as Google served them — this is the
      // restore source of last resort, and it is never updated after insert.
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "sheet_dumps" (
          "id"                  BIGSERIAL PRIMARY KEY,
          "region"              TEXT        NOT NULL,
          "source_url"          TEXT        NOT NULL,
          "trigger"             TEXT        NOT NULL DEFAULT 'scheduled',
          "fetched_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
          "content_sha256"      TEXT        NOT NULL,
          "raw_gz"              BYTEA,
          "raw_size_bytes"      BIGINT      NOT NULL,
          "gz_size_bytes"       BIGINT,
          "duplicate_of"        BIGINT,
          "sheet_row_count"     INTEGER     NOT NULL DEFAULT 0,
          "headers"             JSONB,
          "parsed_row_count"    INTEGER     NOT NULL DEFAULT 0,
          "parsed_total_amount" NUMERIC(18,2),
          "parsed_total_qty"    BIGINT,
          "verdict"             TEXT        NOT NULL DEFAULT 'pending',
          "verdict_reason"      TEXT,
          "checks"              JSONB,
          "blob_pruned_at"      TIMESTAMPTZ
        )
      `);
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "sheet_dumps_region_fetched_idx" ON "sheet_dumps"("region","fetched_at" DESC)`,
      );
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "sheet_dumps_sha_idx" ON "sheet_dumps"("region","content_sha256")`,
      );

      // One row per pre-wipe capture of a live table. rows_gz is gzipped JSONL —
      // one JSON object per source row — so a restore is a straight replay with no
      // re-parsing and no dependency on the sheet still existing.
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "table_snapshots" (
          "id"              BIGSERIAL PRIMARY KEY,
          "region"          TEXT        NOT NULL,
          "table_name"      TEXT        NOT NULL,
          "taken_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
          "reason"          TEXT        NOT NULL DEFAULT 'pre-sync',
          "dump_id"         BIGINT,
          "row_count"       INTEGER     NOT NULL,
          "total_amount"    NUMERIC(18,2),
          "total_qty"       BIGINT,
          "distinct_isbns"  INTEGER,
          "min_date"        TIMESTAMPTZ,
          "max_date"        TIMESTAMPTZ,
          "rows_gz"         BYTEA,
          "rows_size_bytes" BIGINT,
          "gz_size_bytes"   BIGINT,
          "blob_pruned_at"  TIMESTAMPTZ
        )
      `);
      await db.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "table_snapshots_region_taken_idx" ON "table_snapshots"("region","taken_at" DESC)`,
      );

      // Append-only record of every restore performed, so an unexplained data change
      // can always be traced back to who replayed what.
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "restore_events" (
          "id"           BIGSERIAL PRIMARY KEY,
          "region"       TEXT        NOT NULL,
          "restored_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
          "source_kind"  TEXT        NOT NULL,
          "source_id"    BIGINT      NOT NULL,
          "rows_written" INTEGER     NOT NULL,
          "actor"        TEXT,
          "note"         TEXT
        )
      `);

      // Adding columns to a table an older deploy already created.
      for (const alter of [
        `ALTER TABLE "sheet_dumps" ADD COLUMN IF NOT EXISTS "blob_pruned_at" TIMESTAMPTZ`,
        `ALTER TABLE "table_snapshots" ADD COLUMN IF NOT EXISTS "blob_pruned_at" TIMESTAMPTZ`,
      ]) {
        await db.$executeRawUnsafe(alter);
      }
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

/** Closes the archive connection (CLI scripts; graceful shutdown). */
export async function closeArchiveDb(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
    schemaReady = null;
  }
}
