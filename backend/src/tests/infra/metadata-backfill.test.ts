import { describe, it, expect } from 'vitest';
import { OfflineSyncService, type SyncResult } from '../../features/sales/server/offlineSyncService.js';

// Verifies the SELF-HEAL backfill: when the sheet export returns blank metadata
// (author/binding/pubYear/publisher) — as happens on the 3 AM run when lookup
// formulas aren't recalculated — a wipe-and-replace must NOT erase good data.
// Pure unit test: a fake model captures createMany() input; no DB, no network.

const HEADERS = [
  'BookCode', 'BookName', 'Author', 'Binding', 'Pub-Year', 'Publisher', 'OUT', 'IN',
];

function makeFakeModel() {
  const inserted: any[] = [];
  return {
    inserted,
    createMany: async ({ data }: { data: any[] }) => {
      inserted.push(...data);
      return { count: data.length };
    },
  };
}

describe('SYNC: metadata backfill (self-heal blank lookup columns)', () => {
  it('backfills blank export values from the pre-wipe snapshot, but never overrides present ones', async () => {
    const svc = new OfflineSyncService();
    const fake = makeFakeModel();

    // Row 111 has full metadata in the export; row 222 came back BLANK (stale formulas).
    const rows: any[][] = [
      HEADERS,
      ['111', 'Book One', 'Real Author', 'Paperback', '2020', 'Pub A', '3', '0'],
      ['222', 'Book Two', '',           '',          '',     '',      '5', '0'],
    ];

    const preserveMap = new Map([
      // Would override 111 — must be IGNORED because the export already has values.
      ['111', { author: 'STALE WRONG', binding: 'STALE', pubYear: 1900, publisher: 'STALE' }],
      // 222 is blank in the export — must be restored from this snapshot.
      ['222', { author: 'Backfilled Author', binding: 'Hardcover', pubYear: 1999, publisher: 'Pub B' }],
    ]);

    const result: SyncResult = await svc.processData(rows, fake as any, fake as any, preserveMap);
    expect(result.success).toBe(true);

    const row111 = fake.inserted.find((r) => r.isbn === '111');
    const row222 = fake.inserted.find((r) => r.isbn === '222');

    // Present export values win — snapshot does NOT clobber them.
    expect(row111.author).toBe('Real Author');
    expect(row111.binding).toBe('Paperback');
    expect(row111.pubYear).toBe(2020);
    expect(row111.publisher).toBe('Pub A');

    // Blank export values are healed from the snapshot.
    expect(row222.author).toBe('Backfilled Author');
    expect(row222.binding).toBe('Hardcover');
    expect(row222.pubYear).toBe(1999);
    expect(row222.publisher).toBe('Pub B');
  });

  it('leaves blanks as-is when no snapshot entry exists (new ISBN)', async () => {
    const svc = new OfflineSyncService();
    const fake = makeFakeModel();
    const rows: any[][] = [
      HEADERS,
      ['999', 'New Book', '', '', '', '', '1', '0'],
    ];

    await svc.processData(rows, fake as any, fake as any, new Map());
    const row = fake.inserted.find((r) => r.isbn === '999');
    expect(row.author).toBe('');
    expect(row.binding).toBe('');
    expect(row.pubYear).toBe(0);
    expect(row.publisher).toBe('');
  });

  it('behaves exactly as before when no preserveMap is passed (back-compat)', async () => {
    const svc = new OfflineSyncService();
    const fake = makeFakeModel();
    const rows: any[][] = [
      HEADERS,
      ['111', 'Book One', 'Real Author', 'Paperback', '2020', 'Pub A', '3', '0'],
    ];

    await svc.processData(rows, fake as any, fake as any);
    const row = fake.inserted.find((r) => r.isbn === '111');
    expect(row.author).toBe('Real Author');
    expect(row.pubYear).toBe(2020);
  });
});
