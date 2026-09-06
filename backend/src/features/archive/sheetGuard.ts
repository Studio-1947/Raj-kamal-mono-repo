// ─────────────────────────────────────────────────────────────────────────────
// sheetGuard.ts
//
// Decides whether a freshly-fetched Google-Sheet export is safe to import.
//
// This exists because the sync is wipe-and-replace: `deleteMany({})` runs before the
// insert, so importing a bad export doesn't merely add bad rows, it destroys the good
// ones. Archiving alone makes that recoverable; the guard makes it not happen. By the
// time anyone notices a blank dashboard, the guard has already refused the import and
// yesterday's data is still sitting in the table.
//
// Failure modes actually seen with this pipeline, and what catches them:
//   • sheet unshared / auth redirect → Google serves an HTML login page, not a CSV
//   • sheet open in a broken edit state → export has headers but no data rows
//   • a filter or accidental delete on the tab → row count collapses
//   • a column renamed or removed upstream → core columns go missing
//
// MODES (ARCHIVE_GUARD): "block" (default) refuses the import; "warn" lets it through
// but records the finding; "off" skips checking entirely. Thresholds are deliberately
// loose — this is a catastrophe brake, not a data-quality linter. A day where sales
// genuinely halve must not page anyone.
// ─────────────────────────────────────────────────────────────────────────────

import type { DumpBaseline } from "./archiveStore.js";

export type GuardMode = "block" | "warn" | "off";

export interface GuardCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export interface GuardVerdict {
  ok: boolean;
  mode: GuardMode;
  /** First failing check, used as the human-facing reason. */
  reason: string | null;
  checks: GuardCheck[];
  baselineDumpId: number | null;
}

/** Thrown when the guard refuses an import. Caught per-region by syncAll. */
export class SheetRejectedError extends Error {
  readonly region: string;
  readonly dumpId: number | null;
  readonly checks: GuardCheck[];

  constructor(region: string, reason: string, dumpId: number | null, checks: GuardCheck[]) {
    super(
      `Sheet export for "${region}" rejected by the archive guard: ${reason}. ` +
        `The live table was left untouched. Inspect with: npm run archive:list -- --region ${region}` +
        (dumpId ? ` (dump #${dumpId})` : "") +
        `. To import it anyway: npm run archive:approve -- --dump ${dumpId ?? "<id>"}`,
    );
    this.name = "SheetRejectedError";
    this.region = region;
    this.dumpId = dumpId;
    this.checks = checks;
  }
}

export function guardMode(): GuardMode {
  const raw = String(process.env.ARCHIVE_GUARD || "block").toLowerCase();
  return raw === "off" || raw === "warn" ? raw : "block";
}

function ratio(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 && v <= 1 ? v : fallback;
}

/**
 * Header aliases the parser depends on, normalised the same way offlineSyncService
 * normalises them (lowercase, non-alphanumerics stripped). An export missing ALL of
 * a group can't produce usable rows for that concept.
 */
const CORE_HEADER_GROUPS: { label: string; aliases: string[] }[] = [
  { label: "book identity", aliases: ["bookcode", "isbn", "bookname", "itemname", "title", "name"] },
  { label: "quantity", aliases: ["out", "qty", "in"] },
  { label: "amount", aliases: ["outamount", "amount", "inamount"] },
];

function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Checks that need only the fetched bytes. Split out because they must run BEFORE the
 * workbook is parsed: XLSX.read throws outright on some malformed responses ("Invalid
 * HTML: could not find <table>"), and a raw parser exception is both a worse diagnostic
 * than "the sheet is no longer shared" and a lost opportunity to archive the evidence.
 */
export function rawChecks(raw: Buffer): GuardCheck[] {
  const checks: GuardCheck[] = [];
  checks.push({
    id: "non_empty_response",
    passed: raw.length > 0,
    detail: `${raw.length} bytes fetched`,
  });

  // Google serves an HTML sign-in/error page (200 OK) when a sheet stops being publicly
  // readable. Check the bytes rather than trusting the parser to notice.
  const head = raw.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  const looksHtml = head.startsWith("<!doctype html") || head.startsWith("<html");
  checks.push({
    id: "not_an_html_error_page",
    passed: !looksHtml,
    detail: looksHtml
      ? "response body is an HTML page — the sheet is probably no longer shared"
      : "binary/CSV body",
  });
  return checks;
}

function verdictFrom(checks: GuardCheck[], baseline: DumpBaseline | null): GuardVerdict {
  const failed = checks.filter((c) => !c.passed);
  const first = failed[0];
  return {
    ok: failed.length === 0,
    mode: guardMode(),
    reason: first ? `${first.id} — ${first.detail}` : null,
    checks,
    baselineDumpId: baseline?.id ?? null,
  };
}

/** Byte-level verdict, available before the workbook is parsed. */
export function evaluateRawExport(raw: Buffer): GuardVerdict {
  return verdictFrom(rawChecks(raw), null);
}

/** Verdict for an export the parser refused outright. */
export function unreadableExportVerdict(message: string): GuardVerdict {
  return verdictFrom(
    [{ id: "export_is_readable", passed: false, detail: `the parser could not read this export — ${message}` }],
    null,
  );
}

export interface GuardInput {
  region: string;
  /** Raw bytes exactly as fetched. */
  raw: Buffer;
  /** Header row from the parsed workbook. */
  headers: string[];
  /** Rows the parser actually produced from this export. */
  parsedRowCount: number;
  parsedTotalAmount: number;
  /** Previous accepted export for this region, or null on a first run. */
  baseline: DumpBaseline | null;
}

/**
 * Runs every check and returns the combined verdict. Pure — no I/O, no throwing — so
 * it is trivially testable and cannot itself become a reason a sync fails.
 */
export function evaluateSheet(input: GuardInput): GuardVerdict {
  const { raw, headers, parsedRowCount, parsedTotalAmount, baseline } = input;

  // 1-2. The byte-level checks, re-run so the stored record lists every check.
  const checks: GuardCheck[] = rawChecks(raw);

  const add = (id: string, passed: boolean, detail: string) => checks.push({ id, passed, detail });

  // 3. Header row present.
  const normalized = headers.map(normalizeHeader).filter(Boolean);
  add("has_headers", normalized.length > 0, `${normalized.length} named columns`);

  // 4. The columns the parser actually reads.
  const missingGroups = CORE_HEADER_GROUPS.filter(
    (g) => !g.aliases.some((a) => normalized.includes(a)),
  ).map((g) => g.label);
  add(
    "has_core_columns",
    missingGroups.length === 0,
    missingGroups.length ? `missing columns for: ${missingGroups.join(", ")}` : "all core columns present",
  );

  // 5. Headers but no data — the classic "sheet was open mid-edit" export.
  add("has_data_rows", parsedRowCount > 0, `${parsedRowCount} parseable rows`);

  // 6/7. Volume checks, only meaningful once there's something to compare against.
  //      A first-ever sync for a region has no baseline and is always allowed through.
  if (!baseline) {
    add("row_count_stable", true, "no previous accepted export — baseline check skipped");
    add("amount_stable", true, "no previous accepted export — baseline check skipped");
  } else {
    const minRowRatio = ratio("ARCHIVE_GUARD_MIN_ROW_RATIO", 0.7);
    const minAmountRatio = ratio("ARCHIVE_GUARD_MIN_AMOUNT_RATIO", 0.7);

    const rowFloor = Math.floor(baseline.parsedRowCount * minRowRatio);
    const rowOk = baseline.parsedRowCount === 0 || parsedRowCount >= rowFloor;
    add(
      "row_count_stable",
      rowOk,
      `${parsedRowCount} rows vs ${baseline.parsedRowCount} previously ` +
        `(floor ${rowFloor}, ${Math.round(minRowRatio * 100)}% of baseline)`,
    );

    const amountFloor = baseline.parsedTotalAmount * minAmountRatio;
    const amountOk = baseline.parsedTotalAmount <= 0 || parsedTotalAmount >= amountFloor;
    add(
      "amount_stable",
      amountOk,
      `total ${Math.round(parsedTotalAmount)} vs ${Math.round(baseline.parsedTotalAmount)} previously ` +
        `(floor ${Math.round(amountFloor)})`,
    );
  }

  return verdictFrom(checks, baseline);
}
