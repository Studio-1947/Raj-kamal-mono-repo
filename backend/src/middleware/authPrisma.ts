import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    sessionId?: string;
  };
}

// Only bump lastActiveAt when it's this stale, to avoid a DB write on every request.
const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required'
    });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as { id?: string; sessionId?: string };

    // Newer tokens carry a sessionId — load the session (with its user) in a single
    // round-trip and enforce that it's still valid. This is what makes remote logout /
    // revocation work despite JWTs being stateless. Older tokens (issued before this
    // feature) have no sessionId; those fall back to a plain user lookup and stay valid
    // until they expire on their own, so deploying this doesn't kick anyone out.
    if (decoded.sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: decoded.sessionId },
        select: {
          revokedAt: true,
          expiresAt: true,
          lastActiveAt: true,
          user: { select: { id: true, email: true, role: true } },
        },
      });

      if (!session || !session.user || session.user.id !== decoded.id) {
        res.status(401).json({ success: false, error: 'Session not found' });
        return;
      }

      if (session.revokedAt) {
        res.status(401).json({ success: false, error: 'Session revoked' });
        return;
      }

      if (session.expiresAt.getTime() <= Date.now()) {
        res.status(401).json({ success: false, error: 'Session expired' });
        return;
      }

      req.user = {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        sessionId: decoded.sessionId,
      };

      // Throttled activity heartbeat — await so it commits before the serverless
      // function can freeze, but only when actually stale.
      if (Date.now() - session.lastActiveAt.getTime() > LAST_ACTIVE_THROTTLE_MS) {
        try {
          await prisma.session.update({
            where: { id: decoded.sessionId },
            data: { lastActiveAt: new Date() },
          });
        } catch {
          // Non-fatal: activity timestamp is best-effort.
        }
      }

      next();
      return;
    }

    // Legacy path: no sessionId claim.
    if (!decoded.id) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
    return;
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
      return;
    }

    next();
  };
};
