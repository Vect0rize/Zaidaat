import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT 1 as ok').get() as { ok: number };
  res.json({
    status: 'ok',
    service: 'zaidaat-api',
    dbOk: row.ok === 1,
    integrations: {
      googleOAuth: config.google.configured,
      smsOtp: config.sms.configured,
      razorpay: config.razorpay.configured,
      devOtpFallback: config.allowDevOtp,
    },
  });
});
