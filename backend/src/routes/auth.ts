import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authPrisma.js';
import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';

const router = Router();

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

    const secret = process.env.JWT_SECRET as string;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      secret,
      { expiresIn: 60 * 60 * 24 * 7 }
    );

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

    const secret = process.env.JWT_SECRET as string;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: 60 * 60 * 24 * 7 }
    );

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

// Logout endpoint (client-side token removal)
router.post('/logout', (req: Request, res: Response): any => {
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

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
