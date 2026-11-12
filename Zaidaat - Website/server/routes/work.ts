import { Router } from 'express';
import { getDb, withTransaction } from '../db/connection.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import { cleanOptionalText, cleanText, parsePagination, parsePositiveInt, safeJsonParse } from '../utils/sanitize.js';
import {
  hiringRequestSchema,
  jobApplySchema,
  jobPostCreateSchema,
  quotationSchema,
} from '../utils/validation.js';
import { z } from 'zod';

export const workRouter = Router();

function formatJobRow(row: any, savedSet?: Set<number>) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    title: row.title,
    description: row.description,
    state: row.state,
    city: row.city,
    locality: row.locality,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    budgetType: row.budget_type,
    preferredStartDate: row.preferred_start_date,
    propertyType: row.property_type,
    referenceImages: safeJsonParse<string[]>(row.reference_images_json, []),
    status: row.status,
    assignedProfessionalId: row.assigned_professional_id,
    applicationsCount: row.applications_count ?? 0,
    quotationsCount: row.quotations_count ?? 0,
    isSaved: savedSet ? savedSet.has(row.id) : Boolean(row.is_saved),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Browse available jobs across India
workRouter.get('/jobs', optionalAuth, (req, res) => {
  const db = getDb();
  const q = cleanText(String(req.query.q || ''), 120);
  const categoryId = parsePositiveInt(req.query.categoryId) || 0;
  const categorySlug = cleanText(String(req.query.category || ''), 80);
  const state = cleanText(String(req.query.state || ''), 80);
  const city = cleanText(String(req.query.city || ''), 80);
  const status = String(req.query.status || 'open');
  const { limit, offset } = parsePagination(req.query.limit, req.query.offset, 60, 24);

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (status && status !== 'all') {
    conditions.push(`jp.status = ?`);
    params.push(status);
  }
  if (categoryId > 0) {
    conditions.push(`jp.category_id = ?`);
    params.push(categoryId);
  }
  if (categorySlug) {
    conditions.push(`pc.slug = ?`);
    params.push(categorySlug);
  }
  if (state) {
    conditions.push(`LOWER(jp.state) = LOWER(?)`);
    params.push(state);
  }
  if (city) {
    conditions.push(`LOWER(jp.city) LIKE LOWER(?)`);
    params.push(`%${city}%`);
  }
  if (q) {
    const like = `%${q}%`;
    conditions.push(`(jp.title LIKE ? OR jp.description LIKE ? OR jp.locality LIKE ? OR jp.city LIKE ? OR pc.name LIKE ?)`);
    params.push(like, like, like, like, like);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM job_posts jp
       JOIN professional_categories pc ON pc.id = jp.category_id
       ${whereSql}`
    )
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT jp.*, u.full_name as customer_name, pc.name as category_name, pc.slug as category_slug,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.id) as applications_count,
              (SELECT COUNT(*) FROM quotations q WHERE q.job_id = jp.id) as quotations_count
       FROM job_posts jp
       JOIN users u ON u.id = jp.customer_id
       JOIN professional_categories pc ON pc.id = jp.category_id
       ${whereSql}
       ORDER BY jp.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as any[];

  const savedSet = new Set<number>();
  if (req.user) {
    const savedRows = db
      .prepare(`SELECT job_id FROM saved_jobs WHERE user_id = ?`)
      .all(req.user.id) as Array<{ job_id: number }>;
    for (const s of savedRows) savedSet.add(s.job_id);
  }

  res.json({ total: totalRow.total, jobs: rows.map((r) => formatJobRow(r, savedSet)) });
});

workRouter.get('/jobs/saved', requireAuth, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT jp.*, u.full_name as customer_name, pc.name as category_name, pc.slug as category_slug,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.id) as applications_count,
              (SELECT COUNT(*) FROM quotations q WHERE q.job_id = jp.id) as quotations_count,
              1 as is_saved
       FROM saved_jobs sj
       JOIN job_posts jp ON jp.id = sj.job_id
       JOIN users u ON u.id = jp.customer_id
       JOIN professional_categories pc ON pc.id = jp.category_id
       WHERE sj.user_id = ?
       ORDER BY sj.created_at DESC`
    )
    .all(req.user!.id);
  res.json({ jobs: rows.map((r) => formatJobRow(r)) });
});

workRouter.post('/jobs/:id/save', requireAuth, (req, res) => {
  const jobId = Number(req.params.id);
  const db = getDb();
  const exists = db.prepare(`SELECT id FROM job_posts WHERE id = ?`).get(jobId);
  if (!exists) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  const saved = db
    .prepare(`SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?`)
    .get(req.user!.id, jobId);
  if (saved) {
    db.prepare(`DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?`).run(req.user!.id, jobId);
    res.json({ saved: false });
  } else {
    db.prepare(`INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)`).run(req.user!.id, jobId);
    res.json({ saved: true });
  }
});

workRouter.get('/jobs/mine', requireAuth, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT jp.*, u.full_name as customer_name, pc.name as category_name, pc.slug as category_slug,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.id) as applications_count,
              (SELECT COUNT(*) FROM quotations q WHERE q.job_id = jp.id) as quotations_count
       FROM job_posts jp
       JOIN users u ON u.id = jp.customer_id
       JOIN professional_categories pc ON pc.id = jp.category_id
       WHERE jp.customer_id = ?
       ORDER BY jp.created_at DESC`
    )
    .all(req.user!.id);
  res.json({ jobs: rows.map((r) => formatJobRow(r)) });
});

workRouter.get('/jobs/:id', optionalAuth, (req, res) => {
  const jobId = Number(req.params.id);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT jp.*, u.full_name as customer_name, pc.name as category_name, pc.slug as category_slug,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.id) as applications_count,
              (SELECT COUNT(*) FROM quotations q WHERE q.job_id = jp.id) as quotations_count
       FROM job_posts jp
       JOIN users u ON u.id = jp.customer_id
       JOIN professional_categories pc ON pc.id = jp.category_id
       WHERE jp.id = ?`
    )
    .get(jobId) as any;

  if (!row) {
    res.status(404).json({ error: 'Job post not found.' });
    return;
  }

  const isOwnerOrAdmin =
    Boolean(req.user) && (req.user!.id === row.customer_id || req.user!.roles.includes('admin'));

  // Owner sees all applications & quotations; logged-in professional sees their own application & quotation
  let applications: any[] = [];
  let quotations: any[] = [];

  if (isOwnerOrAdmin) {
    applications = db
      .prepare(
        `SELECT ja.*, pp.display_name, pp.profile_photo_url, pp.rating_avg, pp.review_count,
                pp.experience_years, pp.verification_status, pp.city as pro_city, pc.name as category_name
         FROM job_applications ja
         JOIN professional_profiles pp ON pp.id = ja.professional_id
         JOIN professional_categories pc ON pc.id = pp.category_id
         WHERE ja.job_id = ?
         ORDER BY ja.created_at DESC`
      )
      .all(jobId);

    quotations = db
      .prepare(
        `SELECT q.*, pp.display_name, pp.profile_photo_url, pp.rating_avg, pp.verification_status, pp.experience_years
         FROM quotations q
         JOIN professional_profiles pp ON pp.id = q.professional_id
         WHERE q.job_id = ?
         ORDER BY q.total_amount ASC`
      )
      .all(jobId)
      .map((q: any) => ({ ...q, lineItems: safeJsonParse(q.line_items_json, []) }));
  } else if (req.user?.professionalId) {
    applications = db
      .prepare(
        `SELECT ja.*, pp.display_name, pp.profile_photo_url, pp.rating_avg, pp.verification_status
         FROM job_applications ja
         JOIN professional_profiles pp ON pp.id = ja.professional_id
         WHERE ja.job_id = ? AND ja.professional_id = ?`
      )
      .all(jobId, req.user.professionalId);

    quotations = db
      .prepare(
        `SELECT q.*, pp.display_name, pp.profile_photo_url
         FROM quotations q
         JOIN professional_profiles pp ON pp.id = q.professional_id
         WHERE q.job_id = ? AND q.professional_id = ?`
      )
      .all(jobId, req.user.professionalId)
      .map((q: any) => ({ ...q, lineItems: safeJsonParse(q.line_items_json, []) }));
  }

  const linkedProject = db
    .prepare(`SELECT id, title, status, progress_percent FROM projects WHERE job_id = ? LIMIT 1`)
    .get(jobId);

  const isSaved = req.user
    ? Boolean(db.prepare(`SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?`).get(req.user.id, jobId))
    : false;

  res.json({
    job: { ...formatJobRow(row), isSaved },
    isOwner: isOwnerOrAdmin,
    applications,
    quotations,
    linkedProject: linkedProject || null,
  });
});

workRouter.post('/jobs', requireAuth, (req, res, next) => {
  try {
    const parsed = jobPostCreateSchema.parse(req.body);
    const db = getDb();
    const cat = db
      .prepare(`SELECT id FROM professional_categories WHERE id = ? AND is_active = 1`)
      .get(parsed.categoryId);
    if (!cat) {
      res.status(400).json({ error: 'Invalid category selected.' });
      return;
    }

    const budgetMax = Math.max(parsed.budgetMin, parsed.budgetMax);
    const ins = db
      .prepare(
        `INSERT INTO job_posts (
          customer_id, category_id, title, description, state, city, locality,
          budget_min, budget_max, budget_type, preferred_start_date, property_type, reference_images_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user!.id,
        parsed.categoryId,
        cleanText(parsed.title, 180),
        cleanText(parsed.description, 4000),
        cleanText(parsed.state, 80),
        cleanText(parsed.city, 80),
        cleanText(parsed.locality, 120),
        parsed.budgetMin,
        budgetMax,
        parsed.budgetType,
        cleanOptionalText(parsed.preferredStartDate, 40),
        cleanOptionalText(parsed.propertyType, 80),
        JSON.stringify(parsed.referenceImages.map((u) => cleanText(u, 300)))
      );

    const jobId = Number(ins.lastInsertRowid);
    const created = db
      .prepare(
        `SELECT jp.*, u.full_name as customer_name, pc.name as category_name, pc.slug as category_slug
         FROM job_posts jp
         JOIN users u ON u.id = jp.customer_id
         JOIN professional_categories pc ON pc.id = jp.category_id
         WHERE jp.id = ?`
      )
      .get(jobId);
    res.status(201).json({ job: formatJobRow(created) });
  } catch (err) {
    next(err);
  }
});

workRouter.post('/jobs/:id/apply', requireAuth, (req, res, next) => {
  try {
    const jobId = Number(req.params.id);
    const parsed = jobApplySchema.parse(req.body);
    const db = getDb();

    const pro = db
      .prepare(`SELECT id, display_name FROM professional_profiles WHERE user_id = ?`)
      .get(req.user!.id) as { id: number; display_name: string } | undefined;

    if (!pro) {
      res.status(400).json({ error: 'Please create your Professional Profile first to apply for jobs.' });
      return;
    }

    const job = db
      .prepare(`SELECT id, customer_id, title, status FROM job_posts WHERE id = ?`)
      .get(jobId) as { id: number; customer_id: number; title: string; status: string } | undefined;

    if (!job || !['open', 'in_review'].includes(job.status)) {
      res.status(400).json({ error: 'This job is no longer accepting applications.' });
      return;
    }
    if (job.customer_id === req.user!.id) {
      res.status(400).json({ error: 'You cannot apply to your own job post.' });
      return;
    }

    db.prepare(
      `INSERT INTO job_applications (job_id, professional_id, cover_note, proposed_timeline, estimated_start_date)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(job_id, professional_id) DO UPDATE SET
         cover_note = excluded.cover_note,
         proposed_timeline = excluded.proposed_timeline,
         estimated_start_date = excluded.estimated_start_date,
         updated_at = datetime('now')`
    ).run(
      jobId,
      pro.id,
      cleanText(parsed.coverNote, 2000),
      cleanOptionalText(parsed.proposedTimeline, 120),
      cleanOptionalText(parsed.estimatedStartDate, 40)
    );

    createNotification({
      userId: job.customer_id,
      type: 'job_application',
      title: `New Application for "${job.title}"`,
      body: `${pro.display_name} applied to your work post.`,
      linkUrl: `/jobs/${jobId}`,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Send quotation (on a job post or hiring request)
workRouter.post('/quotations', requireAuth, (req, res, next) => {
  try {
    const parsed = quotationSchema.parse(req.body);
    const db = getDb();

    const pro = db
      .prepare(`SELECT id, display_name FROM professional_profiles WHERE user_id = ?`)
      .get(req.user!.id) as { id: number; display_name: string } | undefined;

    if (!pro) {
      res.status(400).json({ error: 'Create a Professional Profile before sending quotations.' });
      return;
    }

    if (!parsed.jobId && !parsed.hiringRequestId) {
      res.status(400).json({ error: 'Quotation must reference either a jobId or hiringRequestId.' });
      return;
    }

    let customerId = 0;
    let contextLink = '/dashboard';
    let contextTitle = parsed.title;

    if (parsed.jobId) {
      const job = db
        .prepare(`SELECT id, customer_id, title FROM job_posts WHERE id = ?`)
        .get(parsed.jobId) as { id: number; customer_id: number; title: string } | undefined;
      if (!job) {
        res.status(404).json({ error: 'Job not found.' });
        return;
      }
      if (job.customer_id === req.user!.id) {
        res.status(400).json({ error: 'You cannot send a quotation to your own job.' });
        return;
      }
      customerId = job.customer_id;
      contextLink = `/jobs/${job.id}`;
      contextTitle = job.title;
    } else if (parsed.hiringRequestId) {
      const hr = db
        .prepare(`SELECT id, customer_id, professional_id, title FROM hiring_requests WHERE id = ?`)
        .get(parsed.hiringRequestId) as
        | { id: number; customer_id: number; professional_id: number; title: string }
        | undefined;
      if (!hr || hr.professional_id !== pro.id) {
        res.status(403).json({ error: 'Hiring request not found or not assigned to you.' });
        return;
      }
      customerId = hr.customer_id;
      contextTitle = hr.title;
    }

    const ins = db
      .prepare(
        `INSERT INTO quotations (
          job_id, hiring_request_id, professional_id, customer_id, title, scope_summary,
          line_items_json, labor_cost, material_cost, total_amount, validity_days, estimated_duration_days, payment_terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        parsed.jobId ?? null,
        parsed.hiringRequestId ?? null,
        pro.id,
        customerId,
        cleanText(parsed.title, 180),
        cleanText(parsed.scopeSummary, 2500),
        JSON.stringify(
          parsed.lineItems.map((li) => ({
            item: cleanText(li.item, 180),
            qty: cleanText(li.qty, 60),
            amount: li.amount,
          }))
        ),
        parsed.laborCost,
        parsed.materialCost,
        parsed.totalAmount,
        parsed.validityDays,
        parsed.estimatedDurationDays,
        cleanOptionalText(parsed.paymentTerms, 500)
      );

    createNotification({
      userId: customerId,
      type: 'quotation_received',
      title: `New Quotation from ${pro.display_name}`,
      body: `₹${parsed.totalAmount.toLocaleString('en-IN')} quotation for "${contextTitle}"`,
      linkUrl: contextLink,
    });

    const created = db.prepare(`SELECT * FROM quotations WHERE id = ?`).get(Number(ins.lastInsertRowid));
    res.status(201).json({ quotation: created });
  } catch (err) {
    next(err);
  }
});

// Accept quotation -> hires pro, updates job, creates or links Project Hub project!
workRouter.post('/quotations/:id/accept', requireAuth, (req, res) => {
  const quoteId = Number(req.params.id);
  const db = getDb();

  const quote = db
    .prepare(
      `SELECT q.*, pp.user_id as pro_user_id, pp.display_name as pro_name, pc.name as pro_category
       FROM quotations q
       JOIN professional_profiles pp ON pp.id = q.professional_id
       JOIN professional_categories pc ON pc.id = pp.category_id
       WHERE q.id = ?`
    )
    .get(quoteId) as any;

  if (!quote) {
    res.status(404).json({ error: 'Quotation not found.' });
    return;
  }
  if (quote.customer_id !== req.user!.id && !req.user!.roles.includes('admin')) {
    res.status(403).json({ error: 'Only the customer can accept this quotation.' });
    return;
  }
  if (!['sent', 'revised'].includes(quote.status)) {
    res.status(409).json({ error: `Quotation is already ${quote.status} and cannot be accepted again.` });
    return;
  }

  let projectId: number | null = null;
  try {
    projectId = withTransaction((tx) => {
      const upd = tx
        .prepare(
          `UPDATE quotations SET status = 'accepted', updated_at = datetime('now') WHERE id = ? AND status IN ('sent', 'revised')`
        )
        .run(quoteId);
      if (upd.changes !== 1) {
        throw Object.assign(new Error('Quotation already processed'), { statusCode: 409 });
      }

    let targetProjectId: number | null = null;

    if (quote.job_id) {
      tx.prepare(
        `UPDATE quotations SET status = 'rejected', updated_at = datetime('now') WHERE job_id = ? AND id != ? AND status = 'sent'`
      ).run(quote.job_id, quoteId);

      tx.prepare(
        `UPDATE job_posts SET status = 'assigned', assigned_professional_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(quote.professional_id, quote.job_id);

      tx.prepare(
        `UPDATE job_applications SET status = CASE WHEN professional_id = ? THEN 'accepted' ELSE 'rejected' END, updated_at = datetime('now')
         WHERE job_id = ?`
      ).run(quote.professional_id, quote.job_id);

      const jobRow = tx.prepare(`SELECT * FROM job_posts WHERE id = ?`).get(quote.job_id) as any;
      const existingProj = tx
        .prepare(`SELECT id FROM projects WHERE job_id = ? LIMIT 1`)
        .get(quote.job_id) as { id: number } | undefined;

      if (existingProj) {
        targetProjectId = existingProj.id;
      } else {
        const projIns = tx
          .prepare(
            `INSERT INTO projects (
              customer_id, job_id, title, description, project_type,
              state, city, locality, total_budget, status
            ) VALUES (?, ?, ?, ?, 'renovation', ?, ?, ?, ?, 'active')`
          )
          .run(
            quote.customer_id,
            quote.job_id,
            jobRow.title,
            jobRow.description,
            jobRow.state,
            jobRow.city,
            jobRow.locality,
            quote.total_amount
          );
        targetProjectId = Number(projIns.lastInsertRowid);
      }
    } else if (quote.hiring_request_id) {
      tx.prepare(
        `UPDATE hiring_requests SET status = 'accepted', updated_at = datetime('now') WHERE id = ?`
      ).run(quote.hiring_request_id);
      const hr = tx
        .prepare(`SELECT * FROM hiring_requests WHERE id = ?`)
        .get(quote.hiring_request_id) as any;

      if (hr.project_id) {
        targetProjectId = hr.project_id;
      } else {
        const projIns = tx
          .prepare(
            `INSERT INTO projects (
              customer_id, title, description, project_type, state, city, locality, total_budget, status
            ) VALUES (?, ?, ?, 'renovation', ?, ?, ?, ?, 'active')`
          )
          .run(quote.customer_id, hr.title, hr.description, hr.state, hr.city, hr.locality, quote.total_amount);
        targetProjectId = Number(projIns.lastInsertRowid);
        tx.prepare(`UPDATE hiring_requests SET project_id = ? WHERE id = ?`).run(targetProjectId, hr.id);
      }
    }

    if (targetProjectId) {
      tx.prepare(
        `INSERT INTO project_professionals (project_id, professional_id, role_in_project, agreed_amount, status)
         VALUES (?, ?, ?, ?, 'active')
         ON CONFLICT(project_id, professional_id) DO UPDATE SET agreed_amount = excluded.agreed_amount, status = 'active'`
      ).run(targetProjectId, quote.professional_id, quote.pro_category, quote.total_amount);

      tx.prepare(
        `INSERT INTO project_updates (project_id, author_id, update_type, title, description, progress_percent, milestone_status)
         VALUES (?, ?, 'milestone', ?, ?, 10, 'done')`
      ).run(
        targetProjectId,
        quote.customer_id,
        `Hired ${quote.pro_name}`,
        `Accepted quotation "${quote.title}" for ₹${Number(quote.total_amount).toLocaleString('en-IN')}.`
      );
    }

    return targetProjectId;
  });
  } catch (err: any) {
    if (err?.statusCode === 409) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }

  createNotification({
    userId: quote.pro_user_id,
    type: 'quotation_accepted',
    title: 'Your Quotation Was Accepted!',
    body: `You have been hired for "${quote.title}" (₹${Number(quote.total_amount).toLocaleString('en-IN')}).`,
    linkUrl: '/dashboard',
  });

  res.json({ ok: true, projectId });
});

// Direct Hiring Requests
workRouter.post('/hiring-requests', requireAuth, (req, res, next) => {
  try {
    const parsed = hiringRequestSchema.parse(req.body);
    const db = getDb();

    const pro = db
      .prepare(`SELECT id, user_id, display_name FROM professional_profiles WHERE id = ?`)
      .get(parsed.professionalId) as { id: number; user_id: number; display_name: string } | undefined;

    if (!pro) {
      res.status(404).json({ error: 'Professional not found.' });
      return;
    }
    if (pro.user_id === req.user!.id) {
      res.status(400).json({ error: 'You cannot send a hiring request to yourself.' });
      return;
    }

    const requestId = withTransaction((tx) => {
      const ins = tx
        .prepare(
          `INSERT INTO hiring_requests (
            customer_id, professional_id, project_id, title, description, state, city, locality, budget, preferred_date, reference_images_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          req.user!.id,
          parsed.professionalId,
          parsed.projectId ?? null,
          cleanText(parsed.title, 180),
          cleanText(parsed.description, 3000),
          cleanText(parsed.state, 80),
          cleanText(parsed.city, 80),
          cleanOptionalText(parsed.locality, 120),
          parsed.budget,
          cleanOptionalText(parsed.preferredDate, 40),
          JSON.stringify(parsed.referenceImages.map((u) => cleanText(u, 300)))
        );
      const hrId = Number(ins.lastInsertRowid);

      // Start messaging thread
      const minId = Math.min(req.user!.id, pro.user_id);
      const maxId = Math.max(req.user!.id, pro.user_id);
      tx.prepare(
        `INSERT INTO messages (thread_key, sender_id, recipient_id, context_type, context_id, body)
         VALUES (?, ?, ?, 'hiring', ?, ?)`
      ).run(
        `hiring:${hrId}:${minId}-${maxId}`,
        req.user!.id,
        pro.user_id,
        hrId,
        `Work Request: ${cleanText(parsed.title, 150)} — ${cleanText(parsed.description, 1000)}`
      );

      return hrId;
    });

    createNotification({
      userId: pro.user_id,
      type: 'hiring_request',
      title: `New Work Request: ${cleanText(parsed.title, 100)}`,
      body: `${req.user!.fullName} in ${parsed.city} wants to hire you.`,
      linkUrl: '/dashboard',
    });

    res.status(201).json({ ok: true, hiringRequestId: requestId });
  } catch (err) {
    next(err);
  }
});

workRouter.get('/my-activity', requireAuth, (req, res) => {
  const db = getDb();
  const pro = db
    .prepare(`SELECT id FROM professional_profiles WHERE user_id = ?`)
    .get(req.user!.id) as { id: number } | undefined;

  const customerHiringRequests = db
    .prepare(
      `SELECT hr.*, pp.display_name as pro_name, pp.profile_photo_url as pro_photo, pc.name as category_name
       FROM hiring_requests hr
       JOIN professional_profiles pp ON pp.id = hr.professional_id
       JOIN professional_categories pc ON pc.id = pp.category_id
       WHERE hr.customer_id = ?
       ORDER BY hr.created_at DESC`
    )
    .all(req.user!.id);

  const customerQuotations = db
    .prepare(
      `SELECT q.*, pp.display_name as pro_name, pp.rating_avg
       FROM quotations q
       JOIN professional_profiles pp ON pp.id = q.professional_id
       WHERE q.customer_id = ?
       ORDER BY q.created_at DESC`
    )
    .all(req.user!.id)
    .map((q: any) => ({ ...q, lineItems: safeJsonParse(q.line_items_json, []) }));

  let proHiringRequests: any[] = [];
  let proApplications: any[] = [];
  let proQuotations: any[] = [];

  if (pro) {
    proHiringRequests = db
      .prepare(
        `SELECT hr.*, u.full_name as customer_name, u.default_city as customer_city
         FROM hiring_requests hr
         JOIN users u ON u.id = hr.customer_id
         WHERE hr.professional_id = ?
         ORDER BY hr.created_at DESC`
      )
      .all(pro.id);

    proApplications = db
      .prepare(
        `SELECT ja.*, jp.title as job_title, jp.city as job_city, jp.state as job_state, jp.status as job_status,
                jp.budget_min, jp.budget_max, u.full_name as customer_name
         FROM job_applications ja
         JOIN job_posts jp ON jp.id = ja.job_id
         JOIN users u ON u.id = jp.customer_id
         WHERE ja.professional_id = ?
         ORDER BY ja.created_at DESC`
      )
      .all(pro.id);

    proQuotations = db
      .prepare(
        `SELECT q.*, u.full_name as customer_name, jp.title as job_title
         FROM quotations q
         JOIN users u ON u.id = q.customer_id
         LEFT JOIN job_posts jp ON jp.id = q.job_id
         WHERE q.professional_id = ?
         ORDER BY q.created_at DESC`
      )
      .all(pro.id)
      .map((q: any) => ({ ...q, lineItems: safeJsonParse(q.line_items_json, []) }));
  }

  res.json({
    customerHiringRequests,
    customerQuotations,
    proHiringRequests,
    proApplications,
    proQuotations,
  });
});

workRouter.patch('/hiring-requests/:id/respond', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      status: z.enum(['accepted', 'rejected', 'completed', 'cancelled']),
      note: z.string().trim().max(1000).optional(),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const hr = db
      .prepare(
        `SELECT hr.*, pp.user_id as pro_user_id, pp.display_name as pro_name, pc.name as pro_category
         FROM hiring_requests hr
         JOIN professional_profiles pp ON pp.id = hr.professional_id
         JOIN professional_categories pc ON pc.id = pp.category_id
         WHERE hr.id = ?`
      )
      .get(id) as any;

    if (!hr) {
      res.status(404).json({ error: 'Hiring request not found.' });
      return;
    }

    const isProOwner = hr.pro_user_id === req.user!.id;
    const isCustomerOwner = hr.customer_id === req.user!.id;

    if (['accepted', 'rejected', 'completed'].includes(parsed.status) && !isProOwner && !req.user!.roles.includes('admin')) {
      res.status(403).json({ error: 'Only the requested professional can accept or reject this request.' });
      return;
    }
    if (parsed.status === 'cancelled' && !isCustomerOwner && !req.user!.roles.includes('admin')) {
      res.status(403).json({ error: 'Only the customer can cancel this request.' });
      return;
    }

    // Strict hiring-request state transition guard
    if (['accepted', 'rejected', 'cancelled'].includes(parsed.status) && hr.status !== 'pending') {
      res.status(409).json({ error: `Cannot change hiring request from "${hr.status}" to "${parsed.status}".` });
      return;
    }
    if (parsed.status === 'completed' && hr.status !== 'accepted') {
      res.status(409).json({ error: 'Only an accepted hiring request can be marked completed.' });
      return;
    }

    let createdProjectId: number | null = hr.project_id ?? null;

    withTransaction((tx) => {
      const upd = tx
        .prepare(
          `UPDATE hiring_requests SET status = ?, pro_response_note = COALESCE(?, pro_response_note), updated_at = datetime('now')
           WHERE id = ? AND status = ?`
        )
        .run(parsed.status, parsed.note ? cleanText(parsed.note, 1000) : null, id, hr.status);

      if (upd.changes !== 1) {
        throw Object.assign(new Error('Hiring request status changed concurrently.'), { statusCode: 409 });
      }

      if (parsed.status === 'accepted') {
        if (!createdProjectId) {
          const insProj = tx
            .prepare(
              `INSERT INTO projects (
                customer_id, title, description, project_type, state, city, locality, total_budget, status
              ) VALUES (?, ?, ?, 'renovation', ?, ?, ?, ?, 'active')`
            )
            .run(hr.customer_id, hr.title, hr.description, hr.state, hr.city, hr.locality, hr.budget || 0);
          createdProjectId = Number(insProj.lastInsertRowid);
          tx.prepare(`UPDATE hiring_requests SET project_id = ? WHERE id = ?`).run(createdProjectId, id);
        }

        tx.prepare(
          `INSERT OR IGNORE INTO project_professionals (project_id, professional_id, role_in_project, agreed_amount, status)
           VALUES (?, ?, ?, ?, 'active')`
        ).run(createdProjectId, hr.professional_id, hr.pro_category, hr.budget || 0);
      }

      if (parsed.status === 'completed') {
        tx.prepare(
          `UPDATE professional_profiles SET completed_jobs_count = completed_jobs_count + 1 WHERE id = ?`
        ).run(hr.professional_id);
      }
    });

    const targetNotifyUser = isProOwner ? hr.customer_id : hr.pro_user_id;
    createNotification({
      userId: targetNotifyUser,
      type: 'hiring_update',
      title: `Work Request ${parsed.status.toUpperCase()}`,
      body: `${hr.pro_name} updated "${hr.title}" to ${parsed.status}.`,
      linkUrl: '/dashboard',
    });

    res.json({ ok: true, projectId: createdProjectId });
  } catch (err: any) {
    if (err?.statusCode === 409) {
      res.status(409).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// Job owner actions: update own job status (open/cancelled)
workRouter.patch('/jobs/:id', requireAuth, (req, res, next) => {
  try {
    const jobId = Number(req.params.id);
    const schema = z.object({ status: z.enum(['open', 'cancelled']) });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const job = db
      .prepare(`SELECT id, customer_id, status FROM job_posts WHERE id = ?`)
      .get(jobId) as { id: number; customer_id: number; status: string } | undefined;

    if (!job) {
      res.status(404).json({ error: 'Job post not found.' });
      return;
    }
    if (job.customer_id !== req.user!.id && !req.user!.roles.includes('admin')) {
      res.status(403).json({ error: 'Only the job owner can update this post.' });
      return;
    }
    if (['assigned', 'in_progress', 'completed'].includes(job.status)) {
      res.status(409).json({ error: `Cannot change job status once "${job.status}".` });
      return;
    }

    db.prepare(`UPDATE job_posts SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
      parsed.status,
      jobId
    );
    res.json({ ok: true, status: parsed.status });
  } catch (err) {
    next(err);
  }
});

// Job owner actions: shortlist or reject an application
workRouter.patch('/applications/:id', requireAuth, (req, res, next) => {
  try {
    const appId = Number(req.params.id);
    const schema = z.object({ status: z.enum(['pending', 'shortlisted', 'rejected']) });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const appRow = db
      .prepare(
        `SELECT ja.id, ja.job_id, ja.status, jp.customer_id, jp.title as job_title, pp.user_id as pro_user_id
         FROM job_applications ja
         JOIN job_posts jp ON jp.id = ja.job_id
         JOIN professional_profiles pp ON pp.id = ja.professional_id
         WHERE ja.id = ?`
      )
      .get(appId) as
      | { id: number; job_id: number; status: string; customer_id: number; job_title: string; pro_user_id: number }
      | undefined;

    if (!appRow) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (appRow.customer_id !== req.user!.id && !req.user!.roles.includes('admin')) {
      res.status(403).json({ error: 'Only the job owner can review applications.' });
      return;
    }
    if (appRow.status === 'accepted') {
      res.status(409).json({ error: 'Accepted application cannot be reverted.' });
      return;
    }

    db.prepare(`UPDATE job_applications SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
      parsed.status,
      appId
    );

    if (parsed.status === 'shortlisted') {
      createNotification({
        userId: appRow.pro_user_id,
        type: 'job_application',
        title: `Shortlisted for "${appRow.job_title}"`,
        body: 'The homeowner shortlisted your application.',
        linkUrl: `/jobs/${appRow.job_id}`,
      });
    }
    res.json({ ok: true, status: parsed.status });
  } catch (err) {
    next(err);
  }
});
