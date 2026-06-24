import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import cron from 'node-cron';
import { prisma } from '../../lib/prisma.js';
import { offlineSyncService } from '../../features/sales/server/offlineSyncService.js';
import {
  startSyncScheduler,
  stopSyncScheduler,
  runScheduledSync,
  getLastSyncStatus,
} from '../../features/sales/server/syncScheduler.js';

// All sync work AND all DB writes are mocked — these tests never hit the DB,
// Google Sheets, or write a real sync_logs row.
describe('SYNC-SCHEDULER: scheduling, overlap guard, status & resilience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.ENABLE_SCHEDULED_SYNC;
    delete process.env.SYNC_CRON;
    delete process.env.SYNC_TZ;
    // Never touch the real DB from the persistence path.
    vi.spyOn(prisma, '$executeRawUnsafe').mockResolvedValue(0 as never);
    vi.spyOn(prisma.syncLog, 'create').mockResolvedValue({} as never);
  });

  afterEach(() => {
    stopSyncScheduler();
  });

  describe('startSyncScheduler', () => {
    it('does NOT schedule when ENABLE_SCHEDULED_SYNC is unset', () => {
      const spy = vi.spyOn(cron, 'schedule');
      startSyncScheduler();
      expect(spy).not.toHaveBeenCalled();
    });

    it('schedules 03:00 Asia/Kolkata by default when enabled', () => {
      process.env.ENABLE_SCHEDULED_SYNC = 'true';
      const spy = vi.spyOn(cron, 'schedule').mockReturnValue({ stop: vi.fn() } as any);
      startSyncScheduler();
      expect(spy).toHaveBeenCalledTimes(1);
      const [expr, fn, opts] = spy.mock.calls[0]!;
      expect(expr).toBe('0 3 * * *');
      expect(typeof fn).toBe('function');
      expect(opts).toMatchObject({ timezone: 'Asia/Kolkata' });
    });

    it('honours SYNC_CRON / SYNC_TZ overrides', () => {
      process.env.ENABLE_SCHEDULED_SYNC = 'true';
      process.env.SYNC_CRON = '*/5 * * * *';
      process.env.SYNC_TZ = 'UTC';
      const spy = vi.spyOn(cron, 'schedule').mockReturnValue({ stop: vi.fn() } as any);
      startSyncScheduler();
      const [expr, , opts] = spy.mock.calls[0]!;
      expect(expr).toBe('*/5 * * * *');
      expect(opts).toMatchObject({ timezone: 'UTC' });
    });

    it('refuses to schedule an invalid cron expression', () => {
      process.env.ENABLE_SCHEDULED_SYNC = 'true';
      process.env.SYNC_CRON = 'not a cron';
      const spy = vi.spyOn(cron, 'schedule');
      startSyncScheduler();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('runScheduledSync', () => {
    it('skips overlapping runs (only one runs at a time)', async () => {
      let release!: () => void;
      const gate = new Promise<void>((r) => { release = r; });
      const spy = vi
        .spyOn(offlineSyncService, 'syncAll')
        .mockImplementation(async () => { await gate; return []; });

      const first = runScheduledSync();   // acquires the lock, awaits gate
      const second = runScheduledSync();  // should bail out immediately
      release();
      await Promise.all([first, second]);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('records last-sync status (ok=true when every region succeeds)', async () => {
      vi.spyOn(offlineSyncService, 'syncAll').mockResolvedValue([
        { region: 'delhi', result: { success: true, importedCount: 5, skippedCount: 1 } },
        { region: 'mumbai', result: { success: true, importedCount: 3, skippedCount: 0 } },
      ]);
      await runScheduledSync();
      const s = getLastSyncStatus();
      expect(s.ok).toBe(true);
      expect(s.okCount).toBe(2);
      expect(s.totalRegions).toBe(2);
      expect(s.totalImported).toBe(8);
      expect(typeof s.finishedAt).toBe('string');
    });

    it('marks ok=false when a region fails', async () => {
      vi.spyOn(offlineSyncService, 'syncAll').mockResolvedValue([
        { region: 'delhi', result: { success: true, importedCount: 1, skippedCount: 0 } },
        { region: 'mumbai', result: { success: false, importedCount: 0, skippedCount: 0, error: 'boom' } },
      ]);
      await runScheduledSync();
      const s = getLastSyncStatus();
      expect(s.ok).toBe(false);
      expect(s.okCount).toBe(1);
      expect(s.totalRegions).toBe(2);
    });
  });

  describe('offlineSyncService.syncAll resilience', () => {
    it('continues with remaining regions when one throws', async () => {
      const ok = { success: true, importedCount: 1, skippedCount: 0 };
      vi.spyOn(offlineSyncService, 'syncOfflineSales').mockResolvedValue(ok);
      vi.spyOn(offlineSyncService, 'syncMumbaiSales').mockRejectedValue(new Error('boom'));
      vi.spyOn(offlineSyncService, 'syncPatnaSales').mockResolvedValue(ok);
      vi.spyOn(offlineSyncService, 'syncOnlineOfflineSales').mockResolvedValue(ok);
      vi.spyOn(offlineSyncService, 'syncBookFairSales').mockResolvedValue(ok);
      vi.spyOn(offlineSyncService, 'syncLokbhartiSales').mockResolvedValue(ok);

      const results = await offlineSyncService.syncAll();

      expect(results).toHaveLength(6);
      const mumbai = results.find((r) => r.region === 'mumbai')!;
      expect(mumbai.result.success).toBe(false);
      expect(mumbai.result.error).toContain('boom');
      expect(results.filter((r) => r.result.success)).toHaveLength(5);
    });
  });
});
