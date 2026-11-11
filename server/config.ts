import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('replace-with'))) {
  throw new Error('FATAL: JWT_SECRET must be set to a strong secret in production.');
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT || 4000),
  clientPort: Number(process.env.CLIENT_PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/zaidaat.db'),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024,
  jwtSecret: process.env.JWT_SECRET || 'zaidaat-dev-only-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  allowDevOtp: !isProd && process.env.ALLOW_DEV_OTP !== 'false',
  allowDevResetPreview: !isProd && process.env.ALLOW_DEV_RESET_PREVIEW !== 'false',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'dev',
    configured: Boolean(
      (process.env.SMS_PROVIDER === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
        (process.env.SMS_PROVIDER === 'msg91' && process.env.MSG91_AUTH_KEY)
    ),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  },
};
