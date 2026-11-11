import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getDb } from '../db/connection.js';

export type UserRole = 'customer' | 'professional' | 'admin';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  roles: UserRole[];
  professionalId: number | null;
  defaultState: string | null;
  defaultCity: string | null;
  defaultLocality: string | null;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const AUTH_COOKIE_NAME = 'zaidaat_token';

interface TokenPayload {
  sub: number;
  sid: string;
  iat?: number;
  exp?: number;
}

export function issueSessionToken(userId: number): { token: string; sessionId: string; expiresAt: string } {
  const db = getDb();
  const sessionId = crypto.randomUUID();
  const expiresAtDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiresAt = expiresAtDate.toISOString();

  db.prepare(`INSERT INTO auth_sessions (id, user_id, revoked, expires_at) VALUES (?, ?, 0, ?)`).run(
    sessionId,
    userId,
    expiresAt
  );

  const token = jwt.sign({ sub: userId, sid: sessionId } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: '7d',
  });

  return { token, sessionId, expiresAt };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
  });
}

function loadUserFromToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as unknown as TokenPayload;
    if (!decoded || typeof decoded.sub !== 'number' || !decoded.sid) return null;

    const db = getDb();
    const session = db
      .prepare(`SELECT id, revoked, expires_at FROM auth_sessions WHERE id = ? AND user_id = ?`)
      .get(decoded.sid, decoded.sub) as { id: string; revoked: number; expires_at: string } | undefined;

    if (!session || session.revoked === 1 || new Date(session.expires_at).getTime() < Date.now()) {
      return null;
    }

    const userRow = db
      .prepare(
        `SELECT id, full_name, email, phone, avatar_url, is_active, default_state, default_city, default_locality
         FROM users WHERE id = ?`
      )
      .get(decoded.sub) as
      | {
          id: number;
          full_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: number;
          default_state: string | null;
          default_city: string | null;
          default_locality: string | null;
        }
      | undefined;

    if (!userRow || userRow.is_active !== 1) return null;

    const roleRows = db
      .prepare(`SELECT role FROM user_roles WHERE user_id = ?`)
      .all(userRow.id) as Array<{ role: UserRole }>;
    const roles = roleRows.map((r) => r.role);

    const proRow = db
      .prepare(`SELECT id FROM professional_profiles WHERE user_id = ?`)
      .get(userRow.id) as { id: number } | undefined;

    return {
      id: userRow.id,
      fullName: userRow.full_name,
      email: userRow.email,
      phone: userRow.phone,
      avatarUrl: userRow.avatar_url,
      roles,
      professionalId: proRow?.id ?? null,
      defaultState: userRow.default_state,
      defaultCity: userRow.default_city,
      defaultLocality: userRow.default_locality,
      sessionId: session.id,
    };
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const user = loadUserFromToken(token);
    if (user) req.user = user;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }
  const user = loadUserFromToken(token);
  if (!user) {
    clearAuthCookie(res);
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    return;
  }
  req.user = user;
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const hasRole = allowedRoles.some((r) => req.user!.roles.includes(r));
    if (!hasRole) {
      res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}
