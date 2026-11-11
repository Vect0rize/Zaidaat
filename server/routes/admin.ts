import { Router } from 'express';
import { getDb, withTransaction } from '../db/connection.js';
import { requireAuth, requireRole, type UserRole } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import { cleanOptionalText, cleanText } from '../utils/sanitize.js';
import { z } from 'zod';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

function writeAuditLog(
  txOrDb: any,
  adminUserId: number,
  action: string,
  targetType: string,
  targetId: number | null,
  details?: Record<string, unknown>,
  ipAddress?: string
) {
  txOrDb
    .prepare(
      `INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, details_json, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      adminUserId,
      action,
      targetType,
      targetId,
      details ? JSON.stringify(details) : null,
      ipAddress ? cleanOptionalText(ipAddress, 64) : null
    );
}

adminRouter.get('/audit-logs', (_req, res) => {
  const db = getDb();
  const logs = db
    .prepare(
      `SELECT l.*, u.full_name as admin_name, u.email as admin_email
       FROM admin_audit_logs l
       JOIN users u ON u.id = l.admin_user_id
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 100`
    )
    .all();
  res.json({ logs });
});

adminRouter.get('/analytics', (_req, res) => {
  const db = getDb();

  const counts = {
    users: (db.prepare(`SELECT COUNT(*) as c FROM users`).get() as { c: number }).c,
    propertiesActive: (db.prepare(`SELECT COUNT(*) as c FROM properties WHERE status = 'active'`).get() as { c: number }).c,
    propertiesTotal: (db.prepare(`SELECT COUNT(*) as c FROM properties`).get() as { c: number }).c,
    professionals: (db.prepare(`SELECT COUNT(*) as c FROM professional_profiles`).get() as { c: number }).c,
    verifiedProfessionals: (db.prepare(`SELECT COUNT(*) as c FROM professional_profiles WHERE verification_status = 'verified'`).get() as { c: number }).c,
    pendingVerifications: (db.prepare(`SELECT COUNT(*) as c FROM verification_records WHERE status = 'pending'`).get() as { c: number }).c,
    openJobs: (db.prepare(`SELECT COUNT(*) as c FROM job_posts WHERE status = 'open'`).get() as { c: number }).c,
    activeProjects: (db.prepare(`SELECT COUNT(*) as c FROM projects WHERE status = 'active'`).get() as { c: number }).c,
    openComplaints: (db.prepare(`SELECT COUNT(*) as c FROM complaints_reports WHERE status IN ('open', 'investigating')`).get() as { c: number }).c,
    paidSubscriptions: (db.prepare(`SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active' AND price_inr > 0`).get() as { c: number }).c,
  };

  const propertiesByState = db
    .prepare(
      `SELECT state, COUNT(*) as count
       FROM properties
       GROUP BY state
       ORDER BY count DESC
       LIMIT 10`
    )
    .all();

  const professionalsByCategory = db
    .prepare(
      `SELECT pc.name, COUNT(pp.id) as count
       FROM professional_categories pc
       LEFT JOIN professional_profiles pp ON pp.category_id = pc.id
       GROUP BY pc.id
       ORDER BY count DESC
       LIMIT 10`
    )
    .all();

  res.json({ counts, propertiesByState, professionalsByCategory });
});

adminRouter.get('/users', (_req, res) => {
  const db = getDb();
  const users = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.phone, u.auth_provider, u.is_active, u.default_city, u.default_state, u.created_at,
              GROUP_CONCAT(ur.role) as roles_csv
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all()
    .map((u: any) => ({
      ...u,
      roles: u.roles_csv ? String(u.roles_csv).split(',') : [],
    }));
  res.json({ users });
});

adminRouter.patch('/users/:id', (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const schema = z.object({
      isActive: z.boolean().optional(),
      roles: z.array(z.enum(['customer', 'professional', 'admin'])).min(1).optional(),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const target = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (userId === req.user!.id) {
      if (parsed.isActive === false) {
        res.status(400).json({ error: 'You cannot suspend your own active admin account.' });
        return;
      }
      if (parsed.roles && !parsed.roles.includes('admin')) {
        res.status(400).json({ error: 'You cannot remove your own admin role.' });
        return;
      }
    }

    withTransaction((tx) => {
      if (parsed.isActive !== undefined) {
        tx.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(
          parsed.isActive ? 1 : 0,
          userId
        );
        if (!parsed.isActive) {
          tx.prepare(`UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?`).run(userId);
        }
      }
      if (parsed.roles) {
        tx.prepare(`DELETE FROM user_roles WHERE user_id = ?`).run(userId);
        const ins = tx.prepare(`INSERT INTO user_roles (user_id, role) VALUES (?, ?)`);
        for (const r of parsed.roles as UserRole[]) {
          ins.run(userId, r);
        }
      }
      writeAuditLog(
        tx,
        req.user!.id,
        'user_update',
        'user',
        userId,
        { isActive: parsed.isActive, roles: parsed.roles },
        req.ip
      );
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/properties', (_req, res) => {
  const db = getDb();
  const properties = db
    .prepare(
      `SELECT p.id, p.title, p.listing_purpose, p.property_type, p.price, p.city, p.state, p.status, p.is_featured, p.created_at,
              u.full_name as owner_name
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       ORDER BY p.created_at DESC`
    )
    .all();
  res.json({ properties });
});

adminRouter.patch('/properties/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      status: z.enum(['active', 'pending', 'sold', 'rented', 'archived']).optional(),
      isFeatured: z.boolean().optional(),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();
    db.prepare(
      `UPDATE properties
       SET status = COALESCE(?, status),
           is_featured = COALESCE(?, is_featured),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      parsed.status ?? null,
      parsed.isFeatured !== undefined ? (parsed.isFeatured ? 1 : 0) : null,
      id
    );
    writeAuditLog(
      db,
      req.user!.id,
      'property_moderation',
      'property',
      id,
      { status: parsed.status, isFeatured: parsed.isFeatured },
      req.ip
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/verifications', (_req, res) => {
  const db = getDb();
  const records = db
    .prepare(
      `SELECT vr.*, u.full_name, u.email, u.phone, pp.display_name, pp.city, pp.state, pc.name as category_name
       FROM verification_records vr
       JOIN users u ON u.id = vr.user_id
       LEFT JOIN professional_profiles pp ON pp.id = vr.professional_id
       LEFT JOIN professional_categories pc ON pc.id = pp.category_id
       ORDER BY CASE WHEN vr.status = 'pending' THEN 0 ELSE 1 END, vr.created_at DESC`
    )
    .all();
  res.json({ records });
});

adminRouter.patch('/verifications/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      status: z.enum(['verified', 'rejected']),
      adminNotes: z.string().trim().max(500).optional(),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const rec = db
      .prepare(`SELECT * FROM verification_records WHERE id = ?`)
      .get(id) as any;

    if (!rec) {
      res.status(404).json({ error: 'Verification record not found.' });
      return;
    }

    withTransaction((tx) => {
      tx.prepare(
        `UPDATE verification_records
         SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = datetime('now')
         WHERE id = ?`
      ).run(parsed.status, cleanOptionalText(parsed.adminNotes, 500), req.user!.id, id);

      if (rec.professional_id) {
        tx.prepare(
          `UPDATE professional_profiles SET verification_status = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(parsed.status, rec.professional_id);
      }
      writeAuditLog(
        tx,
        req.user!.id,
        `verification_${parsed.status}`,
        'verification_record',
        id,
        { professionalId: rec.professional_id, adminNotes: parsed.adminNotes || null },
        req.ip
      );
    });

    createNotification({
      userId: rec.user_id,
      type: 'verification_update',
      title: `Verification ${parsed.status === 'verified' ? 'Approved' : 'Rejected'}`,
      body: parsed.adminNotes || `Your ${rec.document_type} verification status is now ${parsed.status}.`,
      linkUrl: '/dashboard',
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/categories', (_req, res) => {
  const db = getDb();
  const categories = db
    .prepare(
      `SELECT pc.*, (SELECT COUNT(*) FROM professional_profiles pp WHERE pp.category_id = pc.id) as pro_count
       FROM professional_categories pc ORDER BY pc.sort_order ASC, pc.name ASC`
    )
    .all();
  res.json({ categories });
});

adminRouter.post('/categories', (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(2).max(80),
      groupName: z.string().trim().min(2).max(80),
      description: z.string().trim().min(5).max(300),
      iconName: z.string().trim().max(40).default('Wrench'),
    });
    const parsed = schema.parse(req.body);
    const slug = cleanText(parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), 80);
    const db = getDb();
    const ins = db
      .prepare(
        `INSERT INTO professional_categories (name, slug, group_name, description, icon_name, sort_order)
         VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM professional_categories))`
      )
      .run(
        cleanText(parsed.name, 80),
        slug,
        cleanText(parsed.groupName, 80),
        cleanText(parsed.description, 300),
        cleanText(parsed.iconName, 40)
      );
    const created = db
      .prepare(`SELECT * FROM professional_categories WHERE id = ?`)
      .get(Number(ins.lastInsertRowid)) as { id: number };
    writeAuditLog(db, req.user!.id, 'category_create', 'category', created.id, { name: parsed.name }, req.ip);
    res.status(201).json({ category: created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/categories/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({ isActive: z.boolean() });
    const parsed = schema.parse(req.body);
    const db = getDb();
    db.prepare(`UPDATE professional_categories SET is_active = ? WHERE id = ?`).run(
      parsed.isActive ? 1 : 0,
      id
    );
    writeAuditLog(db, req.user!.id, 'category_toggle', 'category', id, { isActive: parsed.isActive }, req.ip);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/complaints', (_req, res) => {
  const db = getDb();
  const complaints = db
    .prepare(
      `SELECT cr.*, u.full_name as reporter_name, u.email as reporter_email
       FROM complaints_reports cr
       JOIN users u ON u.id = cr.reporter_id
       ORDER BY CASE WHEN cr.status IN ('open', 'investigating') THEN 0 ELSE 1 END, cr.created_at DESC`
    )
    .all();
  res.json({ complaints });
});

adminRouter.patch('/complaints/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      status: z.enum(['open', 'investigating', 'resolved', 'dismissed']),
      adminResolution: z.string().trim().max(1000).optional(),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();
    db.prepare(
      `UPDATE complaints_reports
       SET status = ?, admin_resolution = COALESCE(?, admin_resolution), resolved_by = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      parsed.status,
      parsed.adminResolution ? cleanText(parsed.adminResolution, 1000) : null,
      req.user!.id,
      id
    );
    writeAuditLog(
      db,
      req.user!.id,
      'complaint_update',
      'complaint_report',
      id,
      { status: parsed.status },
      req.ip
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/professionals', (_req, res) => {
  const db = getDb();
  const professionals = db
    .prepare(
      `SELECT pp.id, pp.user_id, pp.display_name, pp.city, pp.state, pp.experience_years,
              pp.rate_min, pp.rate_max, pp.rate_unit_label, pp.availability_status,
              pp.verification_status, pp.rating_avg, pp.review_count, pp.completed_jobs_count,
              pc.name as category_name, u.email as user_email, u.phone as user_phone
       FROM professional_profiles pp
       JOIN professional_categories pc ON pc.id = pp.category_id
       JOIN users u ON u.id = pp.user_id
       ORDER BY CASE WHEN pp.verification_status = 'pending' THEN 0 ELSE 1 END, pp.created_at DESC`
    )
    .all();
  res.json({ professionals });
});

adminRouter.get('/jobs', (_req, res) => {
  const db = getDb();
  const jobs = db
    .prepare(
      `SELECT jp.*, u.full_name as customer_name, u.email as customer_email, pc.name as category_name,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.id) as applications_count,
              (SELECT COUNT(*) FROM quotations q WHERE q.job_id = jp.id) as quotations_count
       FROM job_posts jp
       JOIN users u ON u.id = jp.customer_id
       JOIN professional_categories pc ON pc.id = jp.category_id
       ORDER BY jp.created_at DESC`
    )
    .all();
  res.json({ jobs });
});

adminRouter.patch('/jobs/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      status: z.enum(['open', 'in_review', 'assigned', 'in_progress', 'completed', 'cancelled']),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();
    db.prepare(`UPDATE job_posts SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(parsed.status, id);
    writeAuditLog(db, req.user!.id, 'job_moderation', 'job_post', id, { status: parsed.status }, req.ip);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
