import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { ensureSeedMedia } from './db/seedMedia.js';
import { seedDatabase } from './db/seed.js';
import { closeDb, getDb } from './db/connection.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { locationsRouter } from './routes/locations.js';
import { uploadsRouter } from './routes/uploads.js';
import { propertiesRouter } from './routes/properties.js';
import { professionalsRouter } from './routes/professionals.js';
import { workRouter } from './routes/work.js';
import { projectsRouter } from './routes/projects.js';
import { messagesRouter } from './routes/messages.js';
import { notificationsRouter } from './routes/notifications.js';
import { plansRouter } from './routes/plans.js';
import { adminRouter } from './routes/admin.js';

export function createApp() {
  runMigrations(false);
  ensureSeedMedia();
  seedDatabase();

  const app = express();

  if (config.isProd || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  const allowedOrigins = new Set([
    config.appUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
  ]);

  const isAllowedOrigin = (origin: string | undefined, req: express.Request): boolean => {
    if (!origin) return true;
    if (allowedOrigins.has(origin)) return true;
    try {
      const originHost = new URL(origin).host.toLowerCase();
      const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
        .split(',')[0]
        .trim()
        .toLowerCase();
      return Boolean(rawHost && originHost === rawHost);
    } catch {
      return false;
    }
  };

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: config.isProd ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          mediaSrc: ["'self'", 'blob:', 'https:'],
          connectSrc: ["'self'", 'https://oauth2.googleapis.com', 'https://accounts.google.com'],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
    })
  );
  app.use((req, res, next) =>
    cors({
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin, req)),
      credentials: true,
    })(req, res, next)
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CSRF origin/fetch-metadata protection on state-changing API requests
  app.use('/api', (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      const origin = req.headers.origin;
      const fetchSite = req.headers['sec-fetch-site'];
      if (origin && !isAllowedOrigin(origin, req)) {
        res.status(403).json({ error: 'Cross-origin request blocked by CSRF policy' });
        return;
      }
      if (fetchSite === 'cross-site') {
        res.status(403).json({ error: 'Cross-site mutation blocked' });
        return;
      }
    }
    next();
  });

  app.use('/api', apiRateLimiter);

  // Never serve sensitive/private endpoints from browser caches
  app.use(['/api/auth', '/api/admin', '/api/messages', '/api/uploads/kyc'], (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Block public access to private KYC documents directory
  app.use('/uploads/kyc', (_req, res) => {
    res.status(403).json({ error: 'KYC documents cannot be accessed publicly' });
  });

  // Safe static media serving with nosniff and safe download disposition for PDFs
  fs.mkdirSync(config.uploadDir, { recursive: true });
  app.use(
    '/uploads',
    express.static(config.uploadDir, {
      setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (filePath.toLowerCase().endsWith('.pdf')) {
          res.setHeader('Content-Disposition', 'attachment');
        }
      },
    })
  );

  // API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/locations', locationsRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/properties', propertiesRouter);
  app.use('/api/professionals', professionalsRouter);
  app.use('/api/work', workRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // SEO: robots.txt & dynamic XML sitemap
  app.get('/robots.txt', (req, res) => {
    const baseUrl = (config.google.hasExplicitAppUrl ? config.appUrl : `${req.protocol}://${req.get('host') || 'localhost:3000'}`).replace(/\/+$/, '');
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Allow: /buy',
        'Allow: /rent',
        'Allow: /properties/',
        'Allow: /professionals',
        'Allow: /find-work',
        'Allow: /plans',
        'Disallow: /admin',
        'Disallow: /dashboard',
        'Disallow: /messages',
        'Disallow: /notifications',
        'Disallow: /api/',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n')
    );
  });

  // Serve static client public assets (favicons, manifest, etc.)
  const clientPublicDir = path.resolve(process.cwd(), 'client', 'public');
  if (fs.existsSync(clientPublicDir)) {
    app.use(express.static(clientPublicDir));
  }

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = (config.google.hasExplicitAppUrl ? config.appUrl : `${req.protocol}://${req.get('host') || 'localhost:3000'}`).replace(/\/+$/, '');
    const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const staticPaths = ['/', '/buy', '/rent', '/sell', '/professionals', '/find-work', '/plans'];
    const urls: Array<{ loc: string; priority: string; changefreq: string }> = staticPaths.map((p) => ({
      loc: `${baseUrl}${p}`,
      priority: p === '/' ? '1.0' : '0.8',
      changefreq: 'daily',
    }));

    try {
      const db = getDb();
      const props = db.prepare(`SELECT id FROM properties WHERE status = 'active' ORDER BY id DESC LIMIT 200`).all() as Array<{ id: number }>;
      for (const p of props) {
        urls.push({ loc: `${baseUrl}/properties/${p.id}`, priority: '0.7', changefreq: 'weekly' });
      }
      const pros = db
        .prepare(`SELECT id FROM professional_profiles WHERE verification_status = 'verified' ORDER BY id DESC LIMIT 200`)
        .all() as Array<{ id: number }>;
      for (const pr of pros) {
        urls.push({ loc: `${baseUrl}/professionals/${pr.id}`, priority: '0.7', changefreq: 'weekly' });
      }
      const jobs = db.prepare(`SELECT id FROM job_posts WHERE status = 'open' ORDER BY id DESC LIMIT 100`).all() as Array<{ id: number }>;
      for (const j of jobs) {
        urls.push({ loc: `${baseUrl}/jobs/${j.id}`, priority: '0.6', changefreq: 'daily' });
      }
    } catch {
      // ignore db read errors during early boot
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        (u) =>
          `  <url><loc>${escapeXml(u.loc)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
      ),
      '</urlset>',
    ].join('\n');
    res.type('application/xml').send(xml);
  });

  // In production or single-server mode, serve built client static files from client/dist
  const clientDistDir = path.resolve(process.cwd(), 'client', 'dist');
  const shouldServeClient = config.isProd || process.env.SERVE_CLIENT === 'true';
  if (shouldServeClient && fs.existsSync(clientDistDir)) {
    app.use(express.static(clientDistDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

export function startServer() {
  const app = createApp();
  const singleProcessMode = config.isProd || process.env.SERVE_CLIENT === 'true';
  const rawEnvPort = process.env.PORT;
  const listenTarget: string | number = rawEnvPort
    ? /^\d+$/.test(rawEnvPort)
      ? Number(rawEnvPort)
      : rawEnvPort
    : singleProcessMode
      ? config.clientPort || 3000
      : config.port;

  const explicitHost = process.env.HOST || (!singleProcessMode ? '127.0.0.1' : undefined);
  const onListening = () => {
    const label = typeof listenTarget === 'number' ? `port ${listenTarget}` : `socket ${listenTarget}`;
    console.log(`[ZAIDAAT API] Listening on ${explicitHost ? `${explicitHost} ` : ''}${label} (${config.nodeEnv})`);
  };

  // On managed hosts (Hostinger lsnode/Passenger), omit host binding so the proxy socket hook succeeds.
  const server = explicitHost
    ? app.listen(listenTarget as number, explicitHost, onListening)
    : app.listen(listenTarget as any, onListening);

  const shutdown = () => {
    server.closeAllConnections?.();
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return server;
}

const resolveReal = (p: string) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};

const isEntry =
  Boolean(process.argv[1]) &&
  (resolveReal(process.argv[1]).toLowerCase().endsWith(path.join('server', 'index.ts').toLowerCase()) ||
    resolveReal(process.argv[1]).toLowerCase().endsWith(path.join('server', 'index.js').toLowerCase()));

if (isEntry) {
  startServer();
}
