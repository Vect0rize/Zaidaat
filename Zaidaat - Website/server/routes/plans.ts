import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, withTransaction } from '../db/connection.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { cleanText } from '../utils/sanitize.js';
import { reportCreateSchema } from '../utils/validation.js';

export const plansRouter = Router();

const PLAN_CATALOG = [
  {
    code: 'free_customer',
    name: 'Citizen Free',
    roleScope: 'customer',
    monthlyInr: 0,
    yearlyInr: 0,
    tagline: 'Buy, rent, list properties directly & collect itemized work quotations.',
    features: [
      'Browse All-India residential, commercial & plot listings',
      'Publish up to 3 active property listings',
      'Post renovation & turnkey job requirements',
      'Compare itemized work quotations side by side',
    ],
  },
  {
    code: 'pro_starter',
    name: 'Karigar Starter',
    roleScope: 'professional',
    monthlyInr: 499,
    yearlyInr: 4990,
    tagline: 'For independent carpenters, electricians, plumbers, painters & technicians.',
    features: [
      'Public Professional Profile & Work Portfolio',
      'Apply to open work posts across selected cities',
      'Send itemized digital quotations',
      'Direct homeowner & builder hiring requests',
    ],
  },
  {
    code: 'pro_verified_plus',
    name: 'Verified Pro Plus',
    roleScope: 'professional',
    monthlyInr: 999,
    yearlyInr: 9990,
    tagline: 'Priority KYC review & enhanced portfolio tools for contractors and design studios.',
    features: [
      'Priority KYC & credential review queue',
      'Unlimited job applications & quotations',
      'Expanded portfolio project showcase',
      'Direct multi-site work coordination',
    ],
  },
  {
    code: 'builder_enterprise',
    name: 'Builder & Agency Suite',
    roleScope: 'customer',
    monthlyInr: 2499,
    yearlyInr: 24990,
    tagline: 'For property developers, real estate agencies & turnkey contracting firms.',
    features: [
      'Higher active property listing capacity',
      'Multi-site vendor & team oversight',
      'Priority document verification turnaround',
      'Enquiry management & structured exports',
    ],
  },
] as const;

plansRouter.get('/', (_req, res) => {
  res.json({
    plans: PLAN_CATALOG,
    paymentGatewayConfigured: config.razorpay.configured,
  });
});

plansRouter.post('/subscribe', requireAuth, (req, res, next) => {
  try {
    const schema = z.object({
      planCode: z.enum(['free_customer', 'pro_starter', 'pro_verified_plus', 'builder_enterprise']),
      billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
      razorpayOrderId: z.string().trim().max(120).optional(),
      razorpayPaymentId: z.string().trim().max(120).optional(),
      razorpaySignature: z.string().trim().max(256).optional(),
    });
    const parsed = schema.parse(req.body);
    const plan = PLAN_CATALOG.find((p) => p.code === parsed.planCode)!;
    const priceInr = parsed.billingCycle === 'yearly' ? plan.yearlyInr : plan.monthlyInr;

    if (priceInr > 0) {
      if (config.razorpay.configured) {
        if (!parsed.razorpayOrderId || !parsed.razorpayPaymentId || !parsed.razorpaySignature) {
          res.status(402).json({
            error: 'Payment confirmation required: provide razorpayOrderId, razorpayPaymentId, and razorpaySignature.',
          });
          return;
        }
        const expected = crypto
          .createHmac('sha256', config.razorpay.keySecret)
          .update(`${parsed.razorpayOrderId}|${parsed.razorpayPaymentId}`)
          .digest('hex');
        const sigBuf = Buffer.from(parsed.razorpaySignature, 'utf8');
        const expBuf = Buffer.from(expected, 'utf8');
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          res.status(402).json({ error: 'Invalid payment signature. Subscription not activated.' });
          return;
        }
      } else if (config.isProd) {
        res.status(501).json({
          error: 'Paid subscriptions cannot be activated in production without configured Razorpay credentials.',
        });
        return;
      }
    }

    const sub = withTransaction((tx) => {
      tx.prepare(`UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'`).run(
        req.user!.id
      );
      const ins = tx
        .prepare(
          `INSERT INTO subscriptions (user_id, plan_code, role_scope, status, price_inr, billing_cycle, features_json, expires_at)
           VALUES (?, ?, ?, 'active', ?, ?, ?, datetime('now', ?))`
        )
        .run(
          req.user!.id,
          plan.code,
          plan.roleScope,
          priceInr,
          parsed.billingCycle,
          JSON.stringify(plan.features),
          parsed.billingCycle === 'yearly' ? '+365 days' : '+30 days'
        );
      return tx.prepare(`SELECT * FROM subscriptions WHERE id = ?`).get(Number(ins.lastInsertRowid));
    });

    res.status(201).json({
      subscription: sub,
      mode: config.razorpay.configured ? 'razorpay' : 'development_sandbox',
    });
  } catch (err) {
    next(err);
  }
});

const REPORT_TARGET_TABLES: Record<string, string> = {
  property: 'properties',
  professional: 'professional_profiles',
  user: 'users',
  job: 'job_posts',
  review: 'reviews',
};

plansRouter.post('/reports', requireAuth, (req, res, next) => {
  try {
    const parsed = reportCreateSchema.parse(req.body);
    const db = getDb();

    const table = REPORT_TARGET_TABLES[parsed.targetType];
    if (!table) {
      res.status(400).json({ error: 'Invalid report target type.' });
      return;
    }

    const targetExists = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(parsed.targetId);
    if (!targetExists) {
      res.status(404).json({ error: 'Reported entity not found.' });
      return;
    }

    const existing = db
      .prepare(
        `SELECT id FROM complaints_reports
         WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status IN ('open', 'investigating')
         LIMIT 1`
      )
      .get(req.user!.id, parsed.targetType, parsed.targetId);
    if (existing) {
      res.status(409).json({ error: 'You already have an active report under review for this item.' });
      return;
    }

    const ins = db
      .prepare(
        `INSERT INTO complaints_reports (reporter_id, target_type, target_id, reason, details)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        req.user!.id,
        parsed.targetType,
        parsed.targetId,
        cleanText(parsed.reason, 160),
        cleanText(parsed.details, 2000)
      );
    res.status(201).json({ ok: true, reportId: Number(ins.lastInsertRowid) });
  } catch (err) {
    next(err);
  }
});
