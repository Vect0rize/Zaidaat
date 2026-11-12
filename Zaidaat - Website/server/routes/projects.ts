import { Router } from 'express';
import { getDb, withTransaction } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import { cleanOptionalText, cleanText, safeJsonParse } from '../utils/sanitize.js';
import { projectCreateSchema, projectUpdateCreateSchema } from '../utils/validation.js';
import { z } from 'zod';

export const projectsRouter = Router();

function canAccessProject(userId: number, roles: string[], projectId: number): { allowed: boolean; isOwner: boolean; project: any } {
  const db = getDb();
  const project = db
    .prepare(
      `SELECT p.*, u.full_name as customer_name
       FROM projects p
       JOIN users u ON u.id = p.customer_id
       WHERE p.id = ?`
    )
    .get(projectId) as any;

  if (!project) return { allowed: false, isOwner: false, project: null };

  const isOwner = project.customer_id === userId || roles.includes('admin');
  if (isOwner) return { allowed: true, isOwner: true, project };

  const assignedPro = db
    .prepare(
      `SELECT pp.id
       FROM project_professionals prp
       JOIN professional_profiles pp ON pp.id = prp.professional_id
       WHERE prp.project_id = ? AND pp.user_id = ?`
    )
    .get(projectId, userId);

  return { allowed: Boolean(assignedPro), isOwner: false, project };
}

projectsRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT p.*, u.full_name as customer_name,
              (SELECT COUNT(*) FROM project_professionals prp WHERE prp.project_id = p.id AND prp.status != 'removed') as pros_count,
              (SELECT COUNT(*) FROM project_updates pu WHERE pu.project_id = p.id) as updates_count
       FROM projects p
       JOIN users u ON u.id = p.customer_id
       LEFT JOIN project_professionals prp ON prp.project_id = p.id
       LEFT JOIN professional_profiles pp ON pp.id = prp.professional_id
       WHERE p.customer_id = ? OR pp.user_id = ?
       ORDER BY p.updated_at DESC`
    )
    .all(req.user!.id, req.user!.id);

  res.json({ projects: rows });
});

projectsRouter.post('/', requireAuth, (req, res, next) => {
  try {
    const parsed = projectCreateSchema.parse(req.body);
    const db = getDb();

    if (parsed.propertyId !== undefined && parsed.propertyId !== null) {
      const prop = db.prepare(`SELECT id, owner_id FROM properties WHERE id = ?`).get(parsed.propertyId) as
        | { id: number; owner_id: number }
        | undefined;
      if (!prop) {
        res.status(400).json({ error: 'Selected linked property does not exist.' });
        return;
      }
      if (prop.owner_id !== req.user!.id && !req.user!.roles.includes('admin')) {
        res.status(403).json({ error: 'You can only link your own property to a project.' });
        return;
      }
    }

    const ins = db
      .prepare(
        `INSERT INTO projects (
          customer_id, property_id, title, description, project_type,
          state, city, locality, total_budget, start_date, target_end_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planning')`
      )
      .run(
        req.user!.id,
        parsed.propertyId ?? null,
        cleanText(parsed.title, 180),
        cleanText(parsed.description, 3000),
        parsed.projectType,
        cleanText(parsed.state, 80),
        cleanText(parsed.city, 80),
        cleanOptionalText(parsed.locality, 120),
        parsed.totalBudget,
        cleanOptionalText(parsed.startDate, 40),
        cleanOptionalText(parsed.targetEndDate, 40)
      );

    const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(Number(ins.lastInsertRowid));
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

projectsRouter.get('/:id', requireAuth, (req, res) => {
  const projectId = Number(req.params.id);
  const access = canAccessProject(req.user!.id, req.user!.roles, projectId);

  if (!access.project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  if (!access.allowed) {
    res.status(403).json({ error: 'You do not have access to this project.' });
    return;
  }

  const db = getDb();
  const professionals = db
    .prepare(
      `SELECT prp.*, pp.user_id as pro_user_id, pp.display_name, pp.profile_photo_url,
              pp.rating_avg, pp.verification_status, pp.city as pro_city, pc.name as category_name
       FROM project_professionals prp
       JOIN professional_profiles pp ON pp.id = prp.professional_id
       JOIN professional_categories pc ON pc.id = pp.category_id
       WHERE prp.project_id = ? AND prp.status != 'removed'
       ORDER BY prp.hired_at ASC`
    )
    .all(projectId);

  const updates = db
    .prepare(
      `SELECT pu.*, u.full_name as author_name
       FROM project_updates pu
       JOIN users u ON u.id = pu.author_id
       WHERE pu.project_id = ?
       ORDER BY pu.created_at DESC, pu.id DESC`
    )
    .all(projectId)
    .map((u: any) => ({ ...u, photos: safeJsonParse<string[]>(u.photos_json, []) }));

  let quotations: any[] = [];
  if (access.project.job_id) {
    quotations = db
      .prepare(
        `SELECT q.*, pp.display_name as pro_name
         FROM quotations q
         JOIN professional_profiles pp ON pp.id = q.professional_id
         WHERE q.job_id = ?
         ORDER BY q.created_at DESC`
      )
      .all(access.project.job_id)
      .map((q: any) => ({ ...q, lineItems: safeJsonParse(q.line_items_json, []) }));
  }

  const messages = db
    .prepare(
      `SELECT m.*, su.full_name as sender_name
       FROM messages m
       JOIN users su ON su.id = m.sender_id
       WHERE m.context_type = 'project' AND m.context_id = ?
       ORDER BY m.created_at ASC`
    )
    .all(projectId);

  res.json({
    project: access.project,
    isOwner: access.isOwner,
    professionals,
    updates,
    quotations,
    messages,
  });
});

projectsRouter.patch('/:id', requireAuth, (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const access = canAccessProject(req.user!.id, req.user!.roles, projectId);
    if (!access.project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    if (!access.isOwner) {
      res.status(403).json({ error: 'Only the project owner can edit project settings.' });
      return;
    }

    const schema = z.object({
      status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
      progressPercent: z.coerce.number().int().min(0).max(100).optional(),
      totalBudget: z.coerce.number().int().min(0).max(1000000000).optional(),
      spentAmount: z.coerce.number().int().min(0).max(1000000000).optional(),
      targetEndDate: z.string().trim().max(40).optional().nullable(),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const finalProgress = parsed.status === 'completed' ? 100 : parsed.progressPercent;
    const wasCompleted = access.project.status === 'completed';

    withTransaction((tx) => {
      tx.prepare(
        `UPDATE projects SET
          status = COALESCE(?, status),
          progress_percent = COALESCE(?, progress_percent),
          total_budget = COALESCE(?, total_budget),
          spent_amount = COALESCE(?, spent_amount),
          target_end_date = COALESCE(?, target_end_date),
          updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        parsed.status ?? null,
        finalProgress ?? null,
        parsed.totalBudget ?? null,
        parsed.spentAmount ?? null,
        parsed.targetEndDate !== undefined ? cleanOptionalText(parsed.targetEndDate, 40) : null,
        projectId
      );

      if (parsed.status === 'completed' && !wasCompleted) {
        tx.prepare(
          `UPDATE professional_profiles
           SET completed_jobs_count = completed_jobs_count + 1
           WHERE id IN (SELECT professional_id FROM project_professionals WHERE project_id = ? AND status = 'active')`
        ).run(projectId);
        tx.prepare(
          `UPDATE project_professionals SET status = 'completed' WHERE project_id = ? AND status = 'active'`
        ).run(projectId);
      }
    });

    const updated = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(projectId);
    res.json({ project: updated });
  } catch (err) {
    next(err);
  }
});

projectsRouter.post('/:id/professionals', requireAuth, (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const access = canAccessProject(req.user!.id, req.user!.roles, projectId);
    if (!access.project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    if (!access.isOwner) {
      res.status(403).json({ error: 'Only the project owner can add professionals.' });
      return;
    }

    const schema = z.object({
      professionalId: z.coerce.number().int().positive(),
      roleInProject: z.string().trim().min(2).max(120),
      agreedAmount: z.coerce.number().int().min(0).max(500000000).default(0),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const pro = db
      .prepare(`SELECT id, user_id, display_name FROM professional_profiles WHERE id = ?`)
      .get(parsed.professionalId) as { id: number; user_id: number; display_name: string } | undefined;

    if (!pro) {
      res.status(404).json({ error: 'Professional not found.' });
      return;
    }

    db.prepare(
      `INSERT INTO project_professionals (project_id, professional_id, role_in_project, agreed_amount, status)
       VALUES (?, ?, ?, ?, 'active')
       ON CONFLICT(project_id, professional_id) DO UPDATE SET
         role_in_project = excluded.role_in_project,
         agreed_amount = excluded.agreed_amount,
         status = 'active'`
    ).run(projectId, parsed.professionalId, cleanText(parsed.roleInProject, 120), parsed.agreedAmount);

    createNotification({
      userId: pro.user_id,
      type: 'project_assigned',
      title: `Added to Project: ${access.project.title}`,
      body: `Role: ${cleanText(parsed.roleInProject, 80)}`,
      linkUrl: `/dashboard`,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

projectsRouter.post('/:id/updates', requireAuth, (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const access = canAccessProject(req.user!.id, req.user!.roles, projectId);
    if (!access.project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    if (!access.allowed) {
      res.status(403).json({ error: 'Not authorized to post updates on this project.' });
      return;
    }

    const parsed = projectUpdateCreateSchema.parse(req.body);

    const updateId = withTransaction((tx) => {
      const ins = tx
        .prepare(
          `INSERT INTO project_updates (
            project_id, author_id, update_type, title, description, progress_percent, expense_amount, photos_json, milestone_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          projectId,
          req.user!.id,
          parsed.updateType,
          cleanText(parsed.title, 180),
          cleanText(parsed.description, 2000),
          parsed.progressPercent ?? null,
          parsed.expenseAmount,
          JSON.stringify(parsed.photos.map((p) => cleanText(p, 300))),
          parsed.milestoneStatus
        );

      if (parsed.progressPercent !== undefined && parsed.progressPercent !== null) {
        tx.prepare(
          `UPDATE projects SET progress_percent = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(parsed.progressPercent, projectId);
      }
      if (parsed.expenseAmount > 0) {
        tx.prepare(
          `UPDATE projects SET spent_amount = spent_amount + ?, updated_at = datetime('now') WHERE id = ?`
        ).run(parsed.expenseAmount, projectId);
      }
      return Number(ins.lastInsertRowid);
    });

    const db = getDb();
    const created = db
      .prepare(
        `SELECT pu.*, u.full_name as author_name
         FROM project_updates pu JOIN users u ON u.id = pu.author_id WHERE pu.id = ?`
      )
      .get(updateId) as any;

    res.status(201).json({
      update: { ...created, photos: safeJsonParse<string[]>(created.photos_json, []) },
    });
  } catch (err) {
    next(err);
  }
});

projectsRouter.post('/:id/messages', requireAuth, (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const access = canAccessProject(req.user!.id, req.user!.roles, projectId);
    if (!access.project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    if (!access.allowed) {
      res.status(403).json({ error: 'Not authorized to message in this project.' });
      return;
    }

    const schema = z.object({ body: z.string().trim().min(1).max(3000) });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const activeProUsers = db
      .prepare(
        `SELECT pp.user_id FROM project_professionals prp
         JOIN professional_profiles pp ON pp.id = prp.professional_id
         WHERE prp.project_id = ? AND prp.status != 'removed'`
      )
      .all(projectId) as Array<{ user_id: number }>;

    const recipientId =
      req.user!.id === access.project.customer_id
        ? (activeProUsers[0]?.user_id ?? access.project.customer_id)
        : access.project.customer_id;

    const ins = db
      .prepare(
        `INSERT INTO messages (thread_key, sender_id, recipient_id, context_type, context_id, body)
         VALUES (?, ?, ?, 'project', ?, ?)`
      )
      .run(`project:${projectId}`, req.user!.id, recipientId, projectId, cleanText(parsed.body, 3000));

    const notifyTargets = new Set<number>([access.project.customer_id, ...activeProUsers.map((p) => p.user_id)]);
    notifyTargets.delete(req.user!.id);
    for (const targetUid of notifyTargets) {
      createNotification({
        userId: targetUid,
        type: 'project_message',
        title: `Project Message in ${access.project.title}`,
        body: `${req.user!.fullName}: ${cleanText(parsed.body, 120)}`,
        linkUrl: `/dashboard`,
      });
    }

    const msg = db
      .prepare(
        `SELECT m.*, su.full_name as sender_name
         FROM messages m JOIN users su ON su.id = m.sender_id WHERE m.id = ?`
      )
      .get(Number(ins.lastInsertRowid));
    res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
});
