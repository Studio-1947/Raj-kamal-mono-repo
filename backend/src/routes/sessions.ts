import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authPrisma.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// All routes here require a valid session token.
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: Active login session management
 */

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: List the current user's active login sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions (current one flagged)
 *       401:
 *         description: Unauthorized
 */
// List active (non-revoked, non-expired) sessions for the authenticated user.
router.get('/', async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        browser: true,
        os: true,
        device: true,
        createdAt: true,
        lastActiveAt: true,
        expiresAt: true,
      },
    });

    const data = sessions.map((s) => ({
      ...s,
      current: s.id === req.user?.sessionId,
    }));

    return res.json({ success: true, data: { sessions: data } });
  } catch (error) {
    console.error('List sessions error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/sessions:
 *   delete:
 *     summary: Revoke all sessions except the current one ("log out everywhere else")
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of sessions revoked
 *       401:
 *         description: Unauthorized
 */
// Revoke every other active session for this user, keeping the current one.
router.delete('/', async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const where = {
      userId: req.user.id,
      revokedAt: null,
      ...(req.user.sessionId ? { id: { not: req.user.sessionId } } : {}),
    };

    const result = await prisma.session.updateMany({
      where,
      data: { revokedAt: new Date() },
    });

    return res.json({ success: true, data: { revoked: result.count } });
  } catch (error) {
    console.error('Revoke other sessions error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
// Revoke a single session. Scoped to the caller's own userId so one user can never
// revoke another user's session (defence in depth even though this is a single-admin app).
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const sessionId = req.params.id;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session id required' });
    }

    const result = await prisma.session.updateMany({
      where: {
        id: sessionId,
        userId: req.user.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    return res.json({ success: true, data: { revoked: result.count } });
  } catch (error) {
    console.error('Revoke session error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
