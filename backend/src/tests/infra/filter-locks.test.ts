import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma.js';

describe('FILTER LOCKS: Database CRUD & Concurrency Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create a temporary test user
    const testUser = await prisma.user.create({
      data: {
        email: `smoke-test-user-${Date.now()}@example.com`,
        password: 'hashedpassword123',
        name: 'Smoke Test User',
        role: 'USER',
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup test user (cascades to filter locks)
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
  });

  it('creates and reads a user filter lock entry', async () => {
    const featureKey = 'website-orders-test';
    const sampleFilters = {
      search: 'TEST-1001',
      status: ['PENDING', 'COMPLETED'],
      paymentStatus: ['CAPTURED'],
      dateFrom: '2026-09-01',
      dateTo: '2026-09-18',
    };

    const created = await prisma.userFilterLock.upsert({
      where: {
        userId_featureKey: {
          userId: testUserId,
          featureKey,
        },
      },
      create: {
        userId: testUserId,
        featureKey,
        isLocked: true,
        filters: sampleFilters,
      },
      update: {
        isLocked: true,
        filters: sampleFilters,
      },
    });

    expect(created).toBeDefined();
    expect(created.userId).toBe(testUserId);
    expect(created.featureKey).toBe(featureKey);
    expect(created.isLocked).toBe(true);
    expect(created.filters).toEqual(sampleFilters);

    const fetched = await prisma.userFilterLock.findUnique({
      where: {
        userId_featureKey: {
          userId: testUserId,
          featureKey,
        },
      },
    });

    expect(fetched).toBeDefined();
    expect(fetched?.isLocked).toBe(true);
    expect(fetched?.filters).toEqual(sampleFilters);
  });

  it('handles rapid concurrent upserts without deadlock or error (Stress Test)', async () => {
    const featureKey = 'concurrency-test';

    // Simulate 20 rapid parallel updates from debounced user actions / multiple tabs
    const updates = Array.from({ length: 20 }, (_, i) => ({
      search: `query-${i}`,
      status: i % 2 === 0 ? ['COMPLETED'] : ['PENDING'],
      dateFrom: '2026-09-01',
      dateTo: '2026-09-18',
    }));

    const results = await Promise.all(
      updates.map((filterPayload) =>
        prisma.userFilterLock.upsert({
          where: {
            userId_featureKey: {
              userId: testUserId,
              featureKey,
            },
          },
          create: {
            userId: testUserId,
            featureKey,
            isLocked: true,
            filters: filterPayload,
          },
          update: {
            isLocked: true,
            filters: filterPayload,
          },
        })
      )
    );

    expect(results.length).toBe(20);

    const finalState = await prisma.userFilterLock.findUnique({
      where: {
        userId_featureKey: {
          userId: testUserId,
          featureKey,
        },
      },
    });

    expect(finalState).toBeDefined();
    expect(finalState?.isLocked).toBe(true);
  });

  it('deletes lock entry on unlock', async () => {
    const featureKey = 'unlock-test';

    await prisma.userFilterLock.create({
      data: {
        userId: testUserId,
        featureKey,
        isLocked: true,
        filters: { search: 'test' },
      },
    });

    await prisma.userFilterLock.deleteMany({
      where: {
        userId: testUserId,
        featureKey,
      },
    });

    const check = await prisma.userFilterLock.findUnique({
      where: {
        userId_featureKey: {
          userId: testUserId,
          featureKey,
        },
      },
    });

    expect(check).toBeNull();
  });
});
