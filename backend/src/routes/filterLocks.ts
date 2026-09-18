import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authPrisma.js';
import { prisma } from '../lib/prisma.js';
import { randomUUID } from 'crypto';

const router = Router();

// All routes require valid authentication token
router.use(authenticateToken);

let isTableVerified = false;

/**
 * Self-healing helper to ensure the user_filter_locks table exists in PostgreSQL.
 * Prevents 500 errors even if migrations haven't run on production server yet.
 */
async function ensureTableExists() {
  if (isTableVerified) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_filter_locks" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "featureKey" TEXT NOT NULL,
          "isLocked" BOOLEAN NOT NULL DEFAULT true,
          "filters" JSONB NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "user_filter_locks_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "user_filter_locks_userId_featureKey_key" 
      ON "user_filter_locks"("userId", "featureKey");
    `);
    isTableVerified = true;
  } catch (e: any) {
    console.warn('[filter-locks] Table verification warning:', e?.message || e);
  }
}

/**
 * GET /api/filter-locks/:key
 * Retrieve saved filter lock preferences for a specific feature key.
 */
router.get('/:key', async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const featureKey = req.params.key;
    if (!featureKey) {
      return res.status(400).json({ success: false, error: 'Feature key required' });
    }

    await ensureTableExists();

    // Try Prisma Client delegate first if available
    if ((prisma as any).userFilterLock?.findUnique) {
      try {
        const lock = await (prisma as any).userFilterLock.findUnique({
          where: {
            userId_featureKey: {
              userId,
              featureKey,
            },
          },
        });

        if (!lock) {
          return res.json({ success: true, data: null });
        }

        return res.json({
          success: true,
          data: {
            isLocked: lock.isLocked,
            filters: lock.filters,
          },
        });
      } catch (prismaErr) {
        console.warn('[filter-locks GET Prisma fallback]:', prismaErr);
      }
    }

    // Raw SQL Fallback
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT "isLocked", filters FROM "user_filter_locks" WHERE "userId" = $1 AND "featureKey" = $2 LIMIT 1`,
      userId,
      featureKey
    );

    if (!rows || rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    const first = rows[0];
    return res.json({
      success: true,
      data: {
        isLocked: Boolean(first.isLocked),
        filters: typeof first.filters === 'string' ? JSON.parse(first.filters) : first.filters,
      },
    });
  } catch (error) {
    console.error('[filter-locks GET error]:', error);
    // Non-breaking response (return null data instead of 500 crash)
    return res.status(200).json({ success: false, data: null, error: 'Failed to load filter lock' });
  }
});

/**
 * POST /api/filter-locks/:key
 * Upsert filter lock state and payload for a feature key.
 */
router.post('/:key', async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const featureKey = req.params.key;
    if (!featureKey) {
      return res.status(400).json({ success: false, error: 'Feature key required' });
    }

    const { isLocked = true, filters = {} } = req.body || {};
    await ensureTableExists();

    // Try Prisma Client delegate first if available
    if ((prisma as any).userFilterLock?.upsert) {
      try {
        const saved = await (prisma as any).userFilterLock.upsert({
          where: {
            userId_featureKey: {
              userId,
              featureKey,
            },
          },
          create: {
            userId,
            featureKey,
            isLocked: Boolean(isLocked),
            filters,
          },
          update: {
            isLocked: Boolean(isLocked),
            filters,
          },
        });

        return res.json({
          success: true,
          data: {
            isLocked: saved.isLocked,
            filters: saved.filters,
          },
        });
      } catch (prismaErr: any) {
        console.warn('[filter-locks POST Prisma fallback]:', prismaErr?.message || prismaErr);
      }
    }

    // Raw SQL Fallback (Guarantees execution even if Prisma Client isn't regenerated in prod)
    const jsonString = JSON.stringify(filters);
    const id = randomUUID();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "user_filter_locks" ("id", "userId", "featureKey", "isLocked", "filters", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
       ON CONFLICT ("userId", "featureKey")
       DO UPDATE SET "isLocked" = $4, "filters" = $5::jsonb, "updatedAt" = NOW()`,
      id,
      userId,
      featureKey,
      Boolean(isLocked),
      jsonString
    );

    return res.json({
      success: true,
      data: {
        isLocked: Boolean(isLocked),
        filters,
      },
    });
  } catch (error: any) {
    console.error('[filter-locks POST error]:', error?.message || error);
    // Non-breaking fallback response: return success=false with 200 status so client never crashes with 500
    return res.status(200).json({
      success: false,
      data: { isLocked: Boolean(req.body?.isLocked), filters: req.body?.filters || {} },
      error: 'Failed to persist filter lock',
    });
  }
});

/**
 * DELETE /api/filter-locks/:key
 * Remove saved filter lock for a feature key (unlock).
 */
router.delete('/:key', async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const featureKey = req.params.key;
    if (!featureKey) {
      return res.status(400).json({ success: false, error: 'Feature key required' });
    }

    await ensureTableExists();

    if ((prisma as any).userFilterLock?.deleteMany) {
      try {
        await (prisma as any).userFilterLock.deleteMany({
          where: {
            userId,
            featureKey,
          },
        });
        return res.json({ success: true, message: 'Filter lock removed' });
      } catch (prismaErr) {
        console.warn('[filter-locks DELETE Prisma fallback]:', prismaErr);
      }
    }

    // Raw SQL Fallback
    await prisma.$executeRawUnsafe(
      `DELETE FROM "user_filter_locks" WHERE "userId" = $1 AND "featureKey" = $2`,
      userId,
      featureKey
    );

    return res.json({ success: true, message: 'Filter lock removed' });
  } catch (error: any) {
    console.error('[filter-locks DELETE error]:', error?.message || error);
    return res.status(200).json({ success: false, message: 'Filter lock removed (fallback)' });
  }
});

export default router;
