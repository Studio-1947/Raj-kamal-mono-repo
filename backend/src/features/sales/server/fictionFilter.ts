import { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Fiction / Non-Fiction / Children Book / Other categorisation for the
// offline sales feature.
//
// The source `fictionType` column is messy: "Fiction", "fiction", "Non-Fiction",
// "Children Book", "Other", "History", and nulls all appear. We collapse it into
// four canonical buckets. Add a new raw spelling to the relevant key array below
// and every consumer (filter where-clause, raw-SQL filter, GROUP BY bucket label,
// param parser) picks it up — there is no other place that lists these strings.
//
// The filter param is a comma-separated list of bucket names, e.g. "Fiction,Other".
// ─────────────────────────────────────────────────────────────────────────────

export type FictionCat = "Fiction" | "Non-Fiction" | "Children Book" | "Other";

// Lowercased raw spellings that map to each non-"Other" bucket. "Other" is the
// catch-all (NULL/blank/anything not listed here) and so needs no key list.
// Keep every entry lowercase — all matching is done against lower(trim(value)).
const BUCKET_KEYS: Record<Exclude<FictionCat, "Other">, readonly string[]> = {
  "Fiction": ["fiction"],
  "Non-Fiction": ["non-fiction", "nonfiction", "non fiction"],
  "Children Book": ["children book", "children's book", "childrens book", "children", "kids book"],
};

// Every spelling that belongs to a known (non-"Other") bucket.
const KNOWN_KEYS: readonly string[] = Object.values(BUCKET_KEYS).flat();
const NON_OTHER_CATS = Object.keys(BUCKET_KEYS) as Exclude<FictionCat, "Other">[];
const TOTAL_BUCKETS = NON_OTHER_CATS.length + 1; // + "Other"

/** Parse the raw query param into a de-duplicated list of canonical buckets. */
export function parseFictionParam(raw?: string | null): FictionCat[] {
  if (!raw) return [];
  const set = new Set<FictionCat>();
  for (const piece of raw.split(",").map(s => s.trim()).filter(Boolean)) {
    const k = piece.toLowerCase();
    const cat = NON_OTHER_CATS.find(c => BUCKET_KEYS[c].includes(k));
    set.add(cat ?? "Other");
  }
  return Array.from(set);
}

// ── Prisma `where` helpers (list endpoint: findMany/count) ───────────────────

const prismaEqAny = (keys: readonly string[]) =>
  keys.map(k => ({ fictionType: { equals: k, mode: "insensitive" as const } }));

/**
 * Prisma `where` fragment for the list endpoint.
 * Returns `undefined` when no filtering is needed (none, or all buckets selected).
 */
export function fictionWhere(cats: FictionCat[]): any | undefined {
  if (cats.length === 0 || cats.length === TOTAL_BUCKETS) return undefined;
  const ors: any[] = [];
  for (const c of cats) {
    if (c === "Other") {
      // Other = NULL, or not equal to any known bucket spelling.
      ors.push({
        OR: [
          { fictionType: null },
          { AND: KNOWN_KEYS.map(k => ({ NOT: { fictionType: { equals: k, mode: "insensitive" as const } } })) },
        ],
      });
    } else {
      ors.push(...prismaEqAny(BUCKET_KEYS[c]));
    }
  }
  return ors.length === 1 ? ors[0] : { OR: ors };
}

// ── Raw-SQL helpers (summary/counts/breakdown endpoints) ─────────────────────

const NORM = Prisma.sql`lower(trim("fictionType"))`;
const inList = (keys: readonly string[]) => Prisma.join(keys.map(k => Prisma.sql`${k}`), ", ");

/**
 * Canonical bucket label as a raw-SQL expression, for GROUP BY in breakdown
 * queries — so case/spelling duplicates never appear as separate slices.
 */
export const fictionBucketSql: Prisma.Sql = Prisma.sql`CASE
  WHEN ${NORM} IN (${inList(BUCKET_KEYS["Fiction"])}) THEN 'Fiction'
  WHEN ${NORM} IN (${inList(BUCKET_KEYS["Non-Fiction"])}) THEN 'Non-Fiction'
  WHEN ${NORM} IN (${inList(BUCKET_KEYS["Children Book"])}) THEN 'Children Book'
  ELSE 'Other' END`;

/**
 * Raw-SQL condition for the summary/counts endpoints (Prisma.sql).
 * Returns `null` when no filtering is needed (none, or all buckets selected).
 */
export function fictionSql(cats: FictionCat[]): Prisma.Sql | null {
  if (cats.length === 0 || cats.length === TOTAL_BUCKETS) return null;
  const parts: Prisma.Sql[] = [];
  for (const c of cats) {
    if (c === "Other") {
      parts.push(Prisma.sql`("fictionType" IS NULL OR ${NORM} NOT IN (${inList(KNOWN_KEYS)}))`);
    } else {
      parts.push(Prisma.sql`${NORM} IN (${inList(BUCKET_KEYS[c])})`);
    }
  }
  if (parts.length === 1) return parts[0]!;
  return Prisma.sql`(${Prisma.join(parts, " OR ")})`;
}
