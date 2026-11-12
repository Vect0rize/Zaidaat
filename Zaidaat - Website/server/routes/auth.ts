import crypto from 'node:crypto';
import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, withTransaction } from '../db/connection.js';
import { config } from '../config.js';
import {
  clearAuthCookie,
  issueSessionToken,
  optionalAuth,
  requireAuth,
  setAuthCookie,
} from '../middleware/auth.js';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimit.js';
import { cleanOptionalText, cleanText } from '../utils/sanitize.js';
import {
  forgotPasswordSchema,
  loginSchema,
  phoneOtpSendSchema,
  phoneOtpVerifySchema,
  registerSchema,
  resetPasswordSchema,
} from '../utils/validation.js';
import { z } from 'zod';

export const authRouter = Router();

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function getUserPayload(userId: number) {
  const db = getDb();
  const user = db
    .prepare(
      `SELECT id, full_name, email, phone, avatar_url, auth_provider, email_verified, phone_verified,
              default_state, default_city, default_locality, created_at
       FROM users WHERE id = ?`
    )
    .get(userId) as
    | {
        id: number;
        full_name: string;
        email: string | null;
        phone: string | null;
        avatar_url: string | null;
        auth_provider: string;
        email_verified: number;
        phone_verified: number;
        default_state: string | null;
        default_city: string | null;
        default_locality: string | null;
        created_at: string;
      }
    | undefined;

  if (!user) return null;

  const roles = (
    db.prepare(`SELECT role FROM user_roles WHERE user_id = ?`).all(userId) as Array<{ role: string }>
  ).map((r) => r.role);

  const pro = db
    .prepare(
      `SELECT id, category_id, display_name, verification_status, availability_status
       FROM professional_profiles WHERE user_id = ?`
    )
    .get(userId) as
    | {
        id: number;
        category_id: number;
        display_name: string;
        verification_status: string;
        availability_status: string;
      }
    | undefined;

  const unreadNotifications = (
    db
      .prepare(`SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0`)
      .get(userId) as { cnt: number }
  ).cnt;

  const unreadMessages = (
    db
      .prepare(`SELECT COUNT(*) as cnt FROM messages WHERE recipient_id = ? AND is_read = 0`)
      .get(userId) as { cnt: number }
  ).cnt;

  const activeSub = db
    .prepare(
      `SELECT plan_code, status, billing_cycle, expires_at
       FROM subscriptions WHERE user_id = ? AND status = 'active'
       ORDER BY id DESC LIMIT 1`
    )
    .get(userId);

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    authProvider: user.auth_provider,
    emailVerified: Boolean(user.email_verified),
    phoneVerified: Boolean(user.phone_verified),
    defaultState: user.default_state,
    defaultCity: user.default_city,
    defaultLocality: user.default_locality,
    roles,
    professionalProfile: pro || null,
    unreadNotifications,
    unreadMessages,
    subscription: activeSub || null,
  };
}

authRouter.get('/me', optionalAuth, (req, res) => {
  if (!req.user) {
    res.json({
      user: null,
      providers: {
        googleConfigured: config.google.configured,
        smsConfigured: config.sms.configured,
        devOtpEnabled: config.allowDevOtp,
      },
    });
    return;
  }
  res.json({
    user: getUserPayload(req.user.id),
    providers: {
      googleConfigured: config.google.configured,
      smsConfigured: config.sms.configured,
      devOtpEnabled: config.allowDevOtp,
    },
  });
});

authRouter.post('/register', authRateLimiter, (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const db = getDb();
    const email = cleanText(parsed.email.toLowerCase(), 160);
    const phone = cleanText(parsed.phone, 20);

    const existing = db
      .prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR phone = ?`)
      .get(email, phone) as { id: number } | undefined;

    if (existing) {
      res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
      return;
    }

    const passwordHash = bcrypt.hashSync(parsed.password, 10);

    const userId = withTransaction((tx) => {
      const result = tx
        .prepare(
          `INSERT INTO users (full_name, email, phone, password_hash, auth_provider, default_state, default_city, default_locality)
           VALUES (?, ?, ?, ?, 'local', ?, ?, ?)`
        )
        .run(
          cleanText(parsed.fullName, 120),
          email,
          phone,
          passwordHash,
          cleanOptionalText(parsed.defaultState, 80),
          cleanOptionalText(parsed.defaultCity, 80),
          cleanOptionalText(parsed.defaultLocality, 120)
        );
      const uid = Number(result.lastInsertRowid);
      // Security: always grant customer; allow professional only if requested; NEVER allow admin self-registration
      tx.prepare(`INSERT INTO user_roles (user_id, role) VALUES (?, 'customer')`).run(uid);
      if (parsed.role === 'professional') {
        tx.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'professional')`).run(uid);
      }
      tx.prepare(
        `INSERT INTO subscriptions (user_id, plan_code, role_scope, status, price_inr, billing_cycle, features_json)
         VALUES (?, 'free_customer', ?, 'active', 0, 'monthly', ?)`
      ).run(uid, parsed.role, JSON.stringify(['Browse All India Properties', 'Enquire & Save Favourites', 'Post Work Requirements']));
      return uid;
    });

    const { token } = issueSessionToken(userId);
    setAuthCookie(res, token);
    res.status(201).json({ user: getUserPayload(userId) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', authRateLimiter, (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const identifier = cleanText(parsed.identifier, 160);
    const db = getDb();

    const user = db
      .prepare(
        `SELECT id, password_hash, is_active FROM users
         WHERE LOWER(email) = LOWER(?) OR phone = ?`
      )
      .get(identifier, identifier) as
      | { id: number; password_hash: string | null; is_active: number }
      | undefined;

    if (!user || !user.password_hash || !bcrypt.compareSync(parsed.password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email/mobile number or password.' });
      return;
    }

    if (user.is_active !== 1) {
      res.status(403).json({ error: 'This account has been suspended. Contact support.' });
      return;
    }

    const { token } = issueSessionToken(user.id);
    setAuthCookie(res, token);
    res.json({ user: getUserPayload(user.id) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', optionalAuth, (req, res) => {
  if (req.user?.sessionId) {
    const db = getDb();
    db.prepare(`UPDATE auth_sessions SET revoked = 1 WHERE id = ?`).run(req.user.sessionId);
  }
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.patch('/me', requireAuth, (req, res, next) => {
  try {
    const schema = z.object({
      fullName: z.string().trim().min(2).max(120).optional(),
      avatarUrl: z.string().trim().max(300).optional().nullable(),
      defaultState: z.string().trim().max(80).optional().nullable(),
      defaultCity: z.string().trim().max(80).optional().nullable(),
      defaultLocality: z.string().trim().max(120).optional().nullable(),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();
    db.prepare(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           avatar_url = COALESCE(?, avatar_url),
           default_state = ?,
           default_city = ?,
           default_locality = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      parsed.fullName ? cleanText(parsed.fullName, 120) : null,
      parsed.avatarUrl !== undefined ? cleanOptionalText(parsed.avatarUrl, 300) : null,
      parsed.defaultState !== undefined ? cleanOptionalText(parsed.defaultState, 80) : req.user!.defaultState,
      parsed.defaultCity !== undefined ? cleanOptionalText(parsed.defaultCity, 80) : req.user!.defaultCity,
      parsed.defaultLocality !== undefined
        ? cleanOptionalText(parsed.defaultLocality, 120)
        : req.user!.defaultLocality,
      req.user!.id
    );
    res.json({ user: getUserPayload(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/enable-professional', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'professional')`).run(req.user!.id);
  res.json({ user: getUserPayload(req.user!.id) });
});

authRouter.post('/forgot-password', authRateLimiter, (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const db = getDb();
    const user = db
      .prepare(`SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)`)
      .get(email) as { id: number; email: string } | undefined;

    if (!user) {
      // Do not leak user existence in response
      res.json({
        ok: true,
        message: 'If an account matches this email, password reset instructions have been generated.',
      });
      return;
    }

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    db.prepare(`INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`).run(
      user.id,
      tokenHash,
      expiresAt
    );

    if (config.allowDevResetPreview) {
      console.log(`[auth:dev] Password reset link for ${user.email}: ${config.appUrl}/reset-password?token=${rawToken}`);
    }

    res.json({
      ok: true,
      message: 'If an account matches this email, password reset instructions have been generated.',
      ...(config.allowDevResetPreview ? { devResetToken: rawToken } : {}),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', authRateLimiter, (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(token);
    const db = getDb();

    const row = db
      .prepare(
        `SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?`
      )
      .get(tokenHash) as
      | { id: number; user_id: number; expires_at: string; used_at: string | null }
      | undefined;

    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Reset token is invalid or expired.' });
      return;
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    withTransaction((tx) => {
      tx.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(
        newHash,
        row.user_id
      );
      tx.prepare(`UPDATE password_resets SET used_at = datetime('now') WHERE id = ?`).run(row.id);
      tx.prepare(`UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?`).run(row.user_id);
    });

    res.json({ ok: true, message: 'Password updated successfully. You may now log in.' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/send', otpRateLimiter, (req, res, next) => {
  try {
    const { phone } = phoneOtpSendSchema.parse(req.body);

    if (!config.sms.configured && !config.allowDevOtp) {
      res.status(501).json({
        error: 'Phone OTP SMS provider is not configured on this server.',
      });
      return;
    }

    const code = String(crypto.randomInt(100000, 999999));
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const db = getDb();

    db.prepare(`INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES (?, ?, ?)`).run(
      phone,
      codeHash,
      expiresAt
    );

    if (config.allowDevOtp) {
      console.log(`[auth:dev] Phone OTP for +91-${phone}: ${code}`);
    }

    res.json({
      ok: true,
      mode: config.sms.configured ? config.sms.provider : 'development_fallback',
      message: config.sms.configured
        ? `OTP sent to +91-${phone}`
        : `Development OTP generated for +91-${phone} (configure Twilio/MSG91 in .env for live SMS).`,
      ...(config.allowDevOtp ? { devOtpCode: code } : {}),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/verify', otpRateLimiter, (req, res, next) => {
  try {
    const { phone, code, fullName, role } = phoneOtpVerifySchema.parse(req.body);
    const db = getDb();

    const otpRow = db
      .prepare(
        `SELECT id, code_hash, attempts, expires_at, consumed_at
         FROM otp_codes
         WHERE phone = ?
         ORDER BY id DESC LIMIT 1`
      )
      .get(phone) as
      | { id: number; code_hash: string; attempts: number; expires_at: string; consumed_at: string | null }
      | undefined;

    if (!otpRow || otpRow.consumed_at || new Date(otpRow.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'OTP is missing or expired. Request a new code.' });
      return;
    }

    if (otpRow.attempts >= 5) {
      res.status(429).json({ error: 'Too many invalid OTP attempts. Request a new OTP.' });
      return;
    }

    if (hashToken(code) !== otpRow.code_hash) {
      db.prepare(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`).run(otpRow.id);
      res.status(400).json({ error: 'Incorrect OTP code.' });
      return;
    }

    db.prepare(`UPDATE otp_codes SET consumed_at = datetime('now') WHERE id = ?`).run(otpRow.id);

    let existingUser = db
      .prepare(`SELECT id, is_active FROM users WHERE phone = ?`)
      .get(phone) as { id: number; is_active: number } | undefined;

    if (existingUser && existingUser.is_active !== 1) {
      res.status(403).json({ error: 'This account has been suspended.' });
      return;
    }

    const userId =
      existingUser?.id ??
      withTransaction((tx) => {
        const displayName = cleanText(fullName || `User ${phone.slice(-4)}`, 120);
        const resInsert = tx
          .prepare(
            `INSERT INTO users (full_name, phone, auth_provider, phone_verified)
             VALUES (?, ?, 'phone', 1)`
          )
          .run(displayName, phone);
        const uid = Number(resInsert.lastInsertRowid);
        tx.prepare(`INSERT INTO user_roles (user_id, role) VALUES (?, 'customer')`).run(uid);
        if (role === 'professional') {
          tx.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'professional')`).run(uid);
        }
        return uid;
      });

    db.prepare(`UPDATE users SET phone_verified = 1 WHERE id = ?`).run(userId);
    const { token } = issueSessionToken(userId);
    setAuthCookie(res, token);
    res.json({ user: getUserPayload(userId) });
  } catch (err) {
    next(err);
  }
});

function resolveGoogleOAuthContext(req: Request): {
  appUrl: string;
  redirectUri: string;
  isHttps: boolean;
} {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol || (config.isProd ? 'https' : 'http');
  const rawHost = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  const safeHost = /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(rawHost) ? rawHost : '';
  const requestOrigin = safeHost ? `${proto}://${safeHost}` : config.appUrl;

  const appUrl = config.google.hasExplicitAppUrl ? config.appUrl.replace(/\/+$/, '') : requestOrigin;
  const redirectUri = config.google.hasExplicitRedirectUri
    ? config.google.redirectUri
    : safeHost
      ? `${requestOrigin}/api/auth/google/callback`
      : config.google.redirectUri;

  return {
    appUrl,
    redirectUri,
    isHttps: proto === 'https' || appUrl.startsWith('https://'),
  };
}

authRouter.get('/google', (req, res) => {
  if (!config.google.configured) {
    res.status(501).json({
      error:
        'Google OAuth is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google sign-in.',
    });
    return;
  }
  const { redirectUri, isHttps } = resolveGoogleOAuthContext(req);
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie('zaidaat_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure || isHttps,
    maxAge: 10 * 60 * 1000,
    path: '/api/auth/google',
  });
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get('/google/callback', async (req, res, next) => {
  try {
    const { appUrl, redirectUri, isHttps } = resolveGoogleOAuthContext(req);
    if (!config.google.configured) {
      res.redirect(`${appUrl}/login?error=google_not_configured`);
      return;
    }
    const cookieOpts = {
      path: '/api/auth/google',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: config.cookieSecure || isHttps,
    };
    const oauthError = String(req.query.error || '');
    if (oauthError) {
      res.clearCookie('zaidaat_oauth_state', cookieOpts);
      res.redirect(`${appUrl}/login?error=google_cancelled`);
      return;
    }
    const queryState = String(req.query.state || '');
    const cookieState = String((req.cookies?.zaidaat_oauth_state as string | undefined) || '');
    res.clearCookie('zaidaat_oauth_state', cookieOpts);
    if (
      !queryState ||
      !cookieState ||
      queryState.length !== cookieState.length ||
      !crypto.timingSafeEqual(Buffer.from(queryState), Buffer.from(cookieState))
    ) {
      res.redirect(`${appUrl}/login?error=google_invalid_state`);
      return;
    }
    const code = String(req.query.code || '');
    if (!code) {
      res.redirect(`${appUrl}/login?error=google_missing_code`);
      return;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      res.redirect(`${appUrl}/login?error=google_token_exchange_failed`);
      return;
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      id?: string;
      email?: string;
      verified_email?: boolean;
      name?: string;
      picture?: string;
    };

    if (!profile.email || !profile.id || profile.verified_email === false) {
      res.redirect(`${appUrl}/login?error=google_profile_incomplete`);
      return;
    }

    const db = getDb();
    const user = db
      .prepare(`SELECT id, is_active, google_id FROM users WHERE google_id = ? OR LOWER(email) = LOWER(?)`)
      .get(profile.id, profile.email) as { id: number; is_active: number; google_id: string | null } | undefined;

    if (user && user.is_active !== 1) {
      res.redirect(`${appUrl}/login?error=account_suspended`);
      return;
    }

    if (user && !user.google_id) {
      db.prepare(`UPDATE users SET google_id = ?, email_verified = 1, updated_at = datetime('now') WHERE id = ?`).run(
        profile.id,
        user.id
      );
    }

    const userId =
      user?.id ??
      withTransaction((tx) => {
        const ins = tx
          .prepare(
            `INSERT INTO users (full_name, email, avatar_url, auth_provider, google_id, email_verified)
             VALUES (?, ?, ?, 'google', ?, 1)`
          )
          .run(
            cleanText(profile.name || 'Google User', 120),
            cleanText(profile.email!.toLowerCase(), 160),
            cleanOptionalText(profile.picture, 300),
            profile.id!
          );
        const uid = Number(ins.lastInsertRowid);
        tx.prepare(`INSERT INTO user_roles (user_id, role) VALUES (?, 'customer')`).run(uid);
        return uid;
      });

    const { token } = issueSessionToken(userId);
    setAuthCookie(res, token);
    res.redirect(`${appUrl}/dashboard`);
  } catch (err) {
    next(err);
  }
});
