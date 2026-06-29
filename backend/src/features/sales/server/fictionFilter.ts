import { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Fiction / Non-Fiction / Other filter for the offline transaction sheet.
//
// The source `fictionType` column is messy: "Fiction", "fiction", "Non-Fiction",
// "Other", "History", and nulls all appear. We collapse it into three buckets:
//   • Fiction      → fictionType == "fiction" (case-insensitive)
//   • Non-Fiction  → fictionType == "non-fiction" (case-insensitive, incl. variants)
//   • Other        → everything else (Other, History, null, blanks, unknowns)
//
// The filter param is a comma-separated list of bucket names, e.g. "Fiction,Other".
// ─────────────────────────────────────────────────────────────────────────────

export type FictionCat = "Fiction" | "Non-Fiction" | "Other";

const NON_FICTION_KEYS = ["non-fiction", "nonfiction", "non fiction"];

/** Parse the raw query param into a de-duplicated list of canonical buckets. */
export function parseFictionParam(raw?: string | null): FictionCat[] {
  if (!raw) return [];
  const set = new Set<FictionCat>();
  for (const piece of raw.split(",").map(s => s.trim()).filter(Boolean)) {
    const k = piece.toLowerCase();
    if (k === "fiction") set.add("Fiction");
    else if (NON_FICTION_KEYS.includes(k)) set.add("Non-Fiction");
    else set.add("Other");
  }
  return Array.from(set);
}

/**
 * Prisma `where` fragment for the list endpoint (findMany/count).
 * Returns `undefined` when no filtering is needed (none, or all three selected).
 */
export function fictionWhere(cats: FictionCat[]): any | undefined {
  if (cats.length === 0 || cats.length === 3) return undefined;
  const ors: any[] = [];
  for (const c of cats) {
    if (c === "Fiction") {
      ors.push({ fictionType: { equals: "fiction", mode: "insensitive" } });
    } else if (c === "Non-Fiction") {
      ors.push({ fictionType: { equals: "non-fiction", mode: "insensitive" } });
    } else {
      // Other = NULL, or not one of the two known buckets
      ors.push({
        OR: [
          { fictionType: null },
          {
            AND: [
              { NOT: { fictionType: { equals: "fiction", mode: "insensitive" } } },
              { NOT: { fictionType: { equals: "non-fiction", mode: "insensitive" } } },
            ],
          },
        ],
      });
    }
  }
  return ors.length === 1 ? ors[0] : { OR: ors };
}

/**
 * Canonical bucket label as a raw-SQL expression, for GROUP BY in breakdown
 * queries. Collapses the messy source column ("Fiction"/"fiction", "Other",
 * "Children Book", nulls, …) into the same three buckets used everywhere else
 * (see parseFictionParam), so case-duplicates never appear as separate slices.
 */
export const fictionBucketSql: Prisma.Sql = Prisma.sql`CASE
  WHEN lower(trim("fictionType")) = 'fiction' THEN 'Fiction'
  WHEN lower(trim("fictionType")) IN ('non-fiction','nonfiction','non fiction') THEN 'Non-Fiction'
  ELSE 'Other' END`;

/**
 * Raw-SQL fragment for the summary/counts endpoints (Prisma.sql conditions).
 * Returns `null` when no filtering is needed (none, or all three selected).
 */
export function fictionSql(cats: FictionCat[]): Prisma.Sql | null {
  if (cats.length === 0 || cats.length === 3) return null;
  const parts: Prisma.Sql[] = [];
  for (const c of cats) {
    if (c === "Fiction") {
      parts.push(Prisma.sql`lower(trim("fictionType")) = 'fiction'`);
    } else if (c === "Non-Fiction") {
      parts.push(Prisma.sql`lower(trim("fictionType")) IN ('non-fiction','nonfiction','non fiction')`);
    } else {
      parts.push(
        Prisma.sql`("fictionType" IS NULL OR lower(trim("fictionType")) NOT IN ('fiction','non-fiction','nonfiction','non fiction'))`
      );
    }
  }
  if (parts.length === 1) return parts[0]!;
  return Prisma.sql`(${Prisma.join(parts, " OR ")})`;
}
