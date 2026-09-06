import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  evaluateSheet,
  evaluateRawExport,
  unreadableExportVerdict,
  guardMode,
  type GuardInput,
} from '../../features/archive/sheetGuard.js';
import type { DumpBaseline } from '../../features/archive/archiveStore.js';

// The guard is the thing standing between a corrupted Google-Sheet export and a
// deleteMany() on a live table, so its failure modes are worth pinning down. Pure unit
// tests: evaluateSheet does no I/O.

const GOOD_HEADERS = ['BookCode', 'BookName', 'Author', 'OUT', 'IN', 'OUTAmount', 'INAmount'];

const baseline = (over: Partial<DumpBaseline> = {}): DumpBaseline => ({
  id: 1,
  fetchedAt: new Date('2026-08-19T00:30:00Z'),
  parsedRowCount: 100_000,
  parsedTotalAmount: 5_000_000,
  parsedTotalQty: 120_000,
  contentSha256: 'abc',
  ...over,
});

const input = (over: Partial<GuardInput> = {}): GuardInput => ({
  region: 'delhi',
  raw: Buffer.from('BookCode,BookName\n123,Something\n'),
  headers: GOOD_HEADERS,
  parsedRowCount: 100_000,
  parsedTotalAmount: 5_000_000,
  baseline: baseline(),
  ...over,
});

const failedIds = (v: ReturnType<typeof evaluateSheet>) =>
  v.checks.filter((c) => !c.passed).map((c) => c.id);

describe('ARCHIVE: sheet corruption guard', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.ARCHIVE_GUARD;
    delete process.env.ARCHIVE_GUARD_MIN_ROW_RATIO;
    delete process.env.ARCHIVE_GUARD_MIN_AMOUNT_RATIO;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('accepts a normal export that matches the previous run', () => {
    const v = evaluateSheet(input());
    expect(v.ok).toBe(true);
    expect(v.reason).toBeNull();
    expect(v.baselineDumpId).toBe(1);
  });

  it('accepts normal day-to-day growth', () => {
    const v = evaluateSheet(input({ parsedRowCount: 100_450, parsedTotalAmount: 5_020_000 }));
    expect(v.ok).toBe(true);
  });

  it('rejects an empty response body', () => {
    const v = evaluateSheet(input({ raw: Buffer.alloc(0) }));
    expect(v.ok).toBe(false);
    expect(failedIds(v)).toContain('non_empty_response');
  });

  it('rejects the HTML sign-in page Google serves when a sheet stops being shared', () => {
    // This is the nastiest real failure mode: HTTP 200, XLSX.read() tolerates it, and
    // the sync would happily wipe the table and import nothing.
    const html = Buffer.from('<!DOCTYPE html><html><head><title>Sign in</title></head></html>');
    const v = evaluateSheet(input({ raw: html }));
    expect(v.ok).toBe(false);
    expect(failedIds(v)).toContain('not_an_html_error_page');
  });

  it('rejects an export whose core columns have gone missing', () => {
    const v = evaluateSheet(input({ headers: ['Something', 'Unrelated'] }));
    expect(v.ok).toBe(false);
    expect(failedIds(v)).toContain('has_core_columns');
  });

  it('rejects headers-only exports (sheet open mid-edit)', () => {
    const v = evaluateSheet(input({ parsedRowCount: 0, parsedTotalAmount: 0 }));
    expect(v.ok).toBe(false);
    expect(failedIds(v)).toContain('has_data_rows');
  });

  it('rejects a row-count collapse', () => {
    const v = evaluateSheet(input({ parsedRowCount: 12_000 }));
    expect(v.ok).toBe(false);
    expect(failedIds(v)).toContain('row_count_stable');
  });

  it('rejects a revenue collapse even when the row count looks fine', () => {
    // Rows intact but amounts blanked — e.g. a broken formula column.
    const v = evaluateSheet(input({ parsedTotalAmount: 40_000 }));
    expect(v.ok).toBe(false);
    expect(failedIds(v)).toContain('amount_stable');
    expect(failedIds(v)).not.toContain('row_count_stable');
  });

  it('tolerates a 25% dip — the guard is a catastrophe brake, not a quality linter', () => {
    const v = evaluateSheet(input({ parsedRowCount: 75_000, parsedTotalAmount: 3_800_000 }));
    expect(v.ok).toBe(true);
  });

  it('lets the first-ever sync for a region through, since there is nothing to compare to', () => {
    const v = evaluateSheet(input({ baseline: null, parsedRowCount: 5, parsedTotalAmount: 10 }));
    expect(v.ok).toBe(true);
    expect(v.baselineDumpId).toBeNull();
  });

  it('does not divide by a zero baseline', () => {
    const v = evaluateSheet(
      input({ baseline: baseline({ parsedRowCount: 0, parsedTotalAmount: 0 }), parsedRowCount: 10, parsedTotalAmount: 0 }),
    );
    expect(v.ok).toBe(true);
  });

  it('honours a custom row-ratio threshold', () => {
    process.env.ARCHIVE_GUARD_MIN_ROW_RATIO = '0.95';
    const v = evaluateSheet(input({ parsedRowCount: 90_000 }));
    expect(v.ok).toBe(false);
    expect(failedIds(v)).toContain('row_count_stable');
  });

  it('ignores a nonsensical threshold rather than disabling the check', () => {
    process.env.ARCHIVE_GUARD_MIN_ROW_RATIO = 'not-a-number';
    const v = evaluateSheet(input({ parsedRowCount: 1_000 }));
    expect(v.ok).toBe(false);
  });

  it('reports the first failing check as the human-facing reason', () => {
    const v = evaluateSheet(input({ raw: Buffer.alloc(0), parsedRowCount: 0 }));
    expect(v.reason).toContain('non_empty_response');
  });

  it('always returns every check, passing or not, for the audit record', () => {
    const v = evaluateSheet(input());
    expect(v.checks.map((c) => c.id).sort()).toEqual(
      ['amount_stable', 'has_core_columns', 'has_data_rows', 'has_headers', 'non_empty_response', 'not_an_html_error_page', 'row_count_stable'].sort(),
    );
  });
});

describe('ARCHIVE: pre-parse checks', () => {
  // These run on the fetched bytes BEFORE XLSX touches them, because XLSX.read throws
  // outright on some malformed responses — losing both the diagnostic and the evidence.

  it('passes a plausible CSV body', () => {
    const v = evaluateRawExport(Buffer.from('BookCode,BookName\n123,Something\n'));
    expect(v.ok).toBe(true);
  });

  it('catches the HTML sign-in page before the parser sees it', () => {
    const v = evaluateRawExport(Buffer.from('<!DOCTYPE html><html><body>Sign in</body></html>'));
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('not_an_html_error_page');
  });

  it('catches a bare <html> body with leading whitespace', () => {
    const v = evaluateRawExport(Buffer.from('\n\n  <HTML><body>nope</body></HTML>'));
    expect(v.ok).toBe(false);
  });

  it('catches an empty body', () => {
    const v = evaluateRawExport(Buffer.alloc(0));
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('non_empty_response');
  });

  it('does not mistake a UTF-8 BOM CSV for HTML', () => {
    // Real Google Sheets exports lead with a BOM; treating that as suspicious would
    // block every single sync.
    const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('BookCode,BookName\n1,x\n')]);
    expect(evaluateRawExport(bom).ok).toBe(true);
  });

  it('turns a parser exception into a rejection that names the cause', () => {
    const v = unreadableExportVerdict('Invalid HTML: could not find <table>');
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('export_is_readable');
    expect(v.reason).toContain('could not find');
  });
});

describe('ARCHIVE: guard mode resolution', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('blocks by default — the safe posture for a destructive sync', () => {
    delete process.env.ARCHIVE_GUARD;
    expect(guardMode()).toBe('block');
  });

  it('accepts warn and off', () => {
    process.env.ARCHIVE_GUARD = 'warn';
    expect(guardMode()).toBe('warn');
    process.env.ARCHIVE_GUARD = 'OFF';
    expect(guardMode()).toBe('off');
  });

  it('falls back to block on an unrecognised value rather than silently disabling', () => {
    process.env.ARCHIVE_GUARD = 'yes-please';
    expect(guardMode()).toBe('block');
  });
});
