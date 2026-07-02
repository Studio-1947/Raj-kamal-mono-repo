import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authPrisma.js';
import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';
import { getClientIp, parseUserAgent } from '../lib/requestContext.js';

const router = Router();

// JWT / session lifetime — keep these two in lockstep so the token's `exp` and the
// Session row's `expiresAt` always agree.
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Create a server-side Session row for this login and sign a JWT that carries the
 * session's id (`sessionId`). The middleware later checks that this session still
 * exists and isn't revoked/expired — that's what lets us revoke a login remotely.
 */
async function issueSession(
  user: { id: string; email: string; role: Role },
  req: Request
): Promise<string> {
  const secret = process.env.JWT_SECRET as string;
  if (!secret) throw new Error('JWT_SECRET not configured');

  const ua = parseUserAgent(req.headers['user-agent']);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']?.slice(0, 1024) ?? null,
      browser: ua.browser,
      os: ua.os,
      device: ua.device,
      expiresAt,
    },
    select: { id: true },
  });

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, sessionId: session.id },
    secret,
    { expiresIn: SESSION_TTL_SECONDS }
  );
}

// Validation schemas
const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').transform((v) => v.trim()),
});

const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new admin user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 *       403:
 *         description: Registration disabled (admin already exists)
 *       500:
 *         description: Internal server error
 */

// Register admin (only once)
router.post('/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    // Enforce single admin account: allow register only if no ADMIN exists
    const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Registration disabled: admin already exists'
      });
    }

    // Also prevent duplicate email just in case
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: Role.ADMIN,
      },
      select: { id: true, email: true, name: true, role: true }
    });

    const token = await issueSession(newUser, req);

    return res.status(201).json({
      success: true,
      data: { user: newUser, token }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login as an admin
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Not an admin
 *       500:
 *         description: Internal server error
 */
// Login endpoint (admin only)
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user in database
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Only allow admin login
    if (user.role !== Role.ADMIN) {
      return res.status(403).json({
        success: false,
        error: 'Only admin login is permitted'
      });
    }

    const token = await issueSession(user, req);

    return res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
// Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout (client-side)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
// Logout endpoint. The client discards the token, and we also revoke this login's
// server-side session so the token can't be replayed before it expires. Best-effort:
// a missing/invalid token still returns success (nothing to revoke).
router.post('/logout', async (req: Request, res: Response): Promise<any> => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (token && secret) {
      const decoded = jwt.verify(token, secret) as { sessionId?: string };
      if (decoded.sessionId) {
        await prisma.session.updateMany({
          where: { id: decoded.sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }
  } catch {
    // Invalid/expired token — nothing to revoke, fall through to success.
  }

  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @swagger
 * /api/auth/admin-status:
 *   get:
 *     summary: Check if an admin exists
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Admin status
 *       500:
 *         description: Internal server error
 */
// Admin existence status
router.get('/admin-status', async (_req: Request, res: Response): Promise<any> => {
  try {
    const count = await prisma.user.count({ where: { role: Role.ADMIN } });
    return res.json({ success: true, data: { hasAdmin: count > 0, count } });
  } catch (error) {
    console.error('Admin status error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
