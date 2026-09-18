import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authPrisma.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// All routes require valid authentication token
router.use(authenticateToken);

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

    const lock = await prisma.userFilterLock.findUnique({
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
  } catch (error) {
    console.error('[filter-locks GET error]:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve filter lock' });
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

    const saved = await prisma.userFilterLock.upsert({
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
  } catch (error) {
    console.error('[filter-locks POST error]:', error);
    return res.status(500).json({ success: false, error: 'Failed to save filter lock' });
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

    await prisma.userFilterLock.deleteMany({
      where: {
        userId,
        featureKey,
      },
    });

    return res.json({ success: true, message: 'Filter lock removed' });
  } catch (error) {
    console.error('[filter-locks DELETE error]:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete filter lock' });
  }
});

export default router;
