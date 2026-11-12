import { Router } from 'express';
import { getDb, withTransaction } from '../db/connection.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import {
  cleanOptionalText,
  cleanText,
  parseNonNegativeNumber,
  parsePagination,
  parsePositiveInt,
  safeJsonParse,
  sanitizeMediaUrl,
} from '../utils/sanitize.js';
import {
  portfolioCreateSchema,
  professionalProfileSchema,
  reviewCreateSchema,
} from '../utils/validation.js';
import { z } from 'zod';

export const professionalsRouter = Router();

function formatProRow(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    categoryIcon: row.category_icon,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    profilePhotoUrl: row.profile_photo_url,
    state: row.state,
    city: row.city,
    localities: safeJsonParse<string[]>(row.localities_json, []),
    serviceRadiusKm: row.service_radius_km,
    experienceYears: row.experience_years,
    skills: safeJsonParse<string[]>(row.skills_json, []),
    languages: safeJsonParse<string[]>(row.languages_json, []),
    pricingModel: row.pricing_model,
    rateMin: row.rate_min,
    rateMax: row.rate_max,
    rateUnitLabel: row.rate_unit_label,
    availabilityStatus: row.availability_status,
    verificationStatus: row.verification_status,
    ratingAvg: Number(row.rating_avg || 0),
    reviewCount: row.review_count,
    completedJobsCount: row.completed_jobs_count,
    responseTimeHours: row.response_time_hours,
    teamSize: row.team_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

professionalsRouter.get('/categories', (_req, res) => {
  const db = getDb();
  const categories = db
    .prepare(
      `SELECT pc.*,
              (SELECT COUNT(*) FROM professional_profiles pp WHERE pp.category_id = pc.id) as pro_count
       FROM professional_categories pc
       WHERE pc.is_active = 1
       ORDER BY pc.sort_order ASC, pc.name ASC`
    )
    .all();
  res.json({ categories });
});

professionalsRouter.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const q = cleanText(String(req.query.q || ''), 120);
  const categorySlug = cleanText(String(req.query.category || ''), 80);
  const categoryId = parsePositiveInt(req.query.categoryId) || 0;
  const state = cleanText(String(req.query.state || ''), 80);
  const city = cleanText(String(req.query.city || ''), 80);
  const locality = cleanText(String(req.query.locality || ''), 100);
  const availability = String(req.query.availability || '');
  const minExperience = Math.floor(parseNonNegativeNumber(req.query.minExperience));
  const minRating = parseNonNegativeNumber(req.query.minRating);
  const maxRate = parseNonNegativeNumber(req.query.maxRate);
  const verifiedOnly = req.query.verifiedOnly === 'true';
  const sort = String(req.query.sort || 'rating');
  const { limit, offset } = parsePagination(req.query.limit, req.query.offset, 60, 24);

  const conditions: string[] = [`u.is_active = 1`];
  const params: Array<string | number> = [];

  if (categorySlug) {
    conditions.push(`pc.slug = ?`);
    params.push(categorySlug);
  }
  if (categoryId > 0) {
    conditions.push(`pp.category_id = ?`);
    params.push(categoryId);
  }
  if (state) {
    conditions.push(`LOWER(pp.state) = LOWER(?)`);
    params.push(state);
  }
  if (city) {
    conditions.push(`LOWER(pp.city) LIKE LOWER(?)`);
    params.push(`%${city}%`);
  }
  if (locality) {
    conditions.push(`(LOWER(pp.localities_json) LIKE LOWER(?) OR LOWER(pp.city) LIKE LOWER(?))`);
    params.push(`%${locality}%`, `%${locality}%`);
  }
  if (availability && ['available', 'busy', 'unavailable'].includes(availability)) {
    conditions.push(`pp.availability_status = ?`);
    params.push(availability);
  }
  if (minExperience > 0) {
    conditions.push(`pp.experience_years >= ?`);
    params.push(minExperience);
  }
  if (minRating > 0) {
    conditions.push(`pp.rating_avg >= ?`);
    params.push(minRating);
  }
  if (maxRate > 0) {
    conditions.push(`pp.rate_min <= ?`);
    params.push(maxRate);
  }
  if (verifiedOnly) {
    conditions.push(`pp.verification_status = 'verified'`);
  }
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      `(pp.display_name LIKE ? OR pp.headline LIKE ? OR pp.bio LIKE ? OR pp.skills_json LIKE ? OR pc.name LIKE ? OR pp.city LIKE ?)`
    );
    params.push(like, like, like, like, like, like);
  }

  let orderBy = `CASE WHEN pp.verification_status = 'verified' THEN 0 ELSE 1 END, pp.rating_avg DESC, pp.completed_jobs_count DESC`;
  if (sort === 'experience') orderBy = `pp.experience_years DESC, pp.rating_avg DESC`;
  else if (sort === 'rate_asc') orderBy = `pp.rate_min ASC`;
  else if (sort === 'jobs') orderBy = `pp.completed_jobs_count DESC`;

  const whereSql = conditions.join(' AND ');
  const totalRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM professional_profiles pp
       JOIN professional_categories pc ON pc.id = pp.category_id
       JOIN users u ON u.id = pp.user_id
       WHERE ${whereSql}`
    )
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT pp.*, pc.name as category_name, pc.slug as category_slug, pc.icon_name as category_icon
       FROM professional_profiles pp
       JOIN professional_categories pc ON pc.id = pp.category_id
       JOIN users u ON u.id = pp.user_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as any[];

  const proIds = rows.map((r) => r.id);
  const previewMap = new Map<number, Array<{ id: number; title: string; imageUrl: string }>>();
  if (proIds.length > 0) {
    const placeholders = proIds.map(() => '?').join(',');
    const portfolioRows = db
      .prepare(
        `SELECT id, professional_id, title, image_url
         FROM professional_portfolios
         WHERE professional_id IN (${placeholders})
         ORDER BY created_at DESC`
      )
      .all(...proIds) as any[];
    for (const p of portfolioRows) {
      const arr = previewMap.get(p.professional_id) || [];
      if (arr.length < 3) {
        arr.push({ id: p.id, title: p.title, imageUrl: p.image_url });
        previewMap.set(p.professional_id, arr);
      }
    }
  }

  res.json({
    total: totalRow.total,
    professionals: rows.map((r) => ({
      ...formatProRow(r),
      portfolioPreview: previewMap.get(r.id) || [],
    })),
  });
});

professionalsRouter.get('/me/profile', requireAuth, (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT pp.*, pc.name as category_name, pc.slug as category_slug, pc.icon_name as category_icon
       FROM professional_profiles pp
       JOIN professional_categories pc ON pc.id = pp.category_id
       WHERE pp.user_id = ?`
    )
    .get(req.user!.id);

  if (!row) {
    res.json({ profile: null, portfolio: [], verifications: [] });
    return;
  }

  const portfolio = db
    .prepare(`SELECT * FROM professional_portfolios WHERE professional_id = ? ORDER BY created_at DESC`)
    .all((row as any).id);

  const verifications = db
    .prepare(`SELECT * FROM verification_records WHERE user_id = ? ORDER BY created_at DESC`)
    .all(req.user!.id);

  res.json({
    profile: formatProRow(row),
    portfolio,
    verifications,
  });
});

professionalsRouter.post('/me/profile', requireAuth, (req, res, next) => {
  try {
    const parsed = professionalProfileSchema.parse(req.body);
    const db = getDb();

    const category = db
      .prepare(`SELECT id FROM professional_categories WHERE id = ? AND is_active = 1`)
      .get(parsed.categoryId);
    if (!category) {
      res.status(400).json({ error: 'Invalid professional category selected.' });
      return;
    }

    const rateMax = Math.max(parsed.rateMin, parsed.rateMax);

    const proId = withTransaction((tx) => {
      tx.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'professional')`).run(req.user!.id);

      const existing = tx
        .prepare(`SELECT id FROM professional_profiles WHERE user_id = ?`)
        .get(req.user!.id) as { id: number } | undefined;

      if (existing) {
        tx.prepare(
          `UPDATE professional_profiles SET
            category_id = ?, display_name = ?, headline = ?, bio = ?,
            profile_photo_url = COALESCE(?, profile_photo_url),
            state = ?, city = ?, localities_json = ?, service_radius_km = ?,
            experience_years = ?, skills_json = ?, languages_json = ?,
            pricing_model = ?, rate_min = ?, rate_max = ?, rate_unit_label = ?,
            availability_status = ?, team_size = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).run(
          parsed.categoryId,
          cleanText(parsed.displayName, 120),
          cleanText(parsed.headline, 180),
          cleanText(parsed.bio, 3000),
          cleanOptionalText(parsed.profilePhotoUrl, 300),
          cleanText(parsed.state, 80),
          cleanText(parsed.city, 80),
          JSON.stringify(parsed.localities.map((l) => cleanText(l, 100))),
          parsed.serviceRadiusKm,
          parsed.experienceYears,
          JSON.stringify(parsed.skills.map((s) => cleanText(s, 60))),
          JSON.stringify(parsed.languages.map((l) => cleanText(l, 40))),
          parsed.pricingModel,
          parsed.rateMin,
          rateMax,
          cleanText(parsed.rateUnitLabel, 60),
          parsed.availabilityStatus,
          parsed.teamSize,
          existing.id
        );
        return existing.id;
      } else {
        const ins = tx
          .prepare(
            `INSERT INTO professional_profiles (
              user_id, category_id, display_name, headline, bio, profile_photo_url,
              state, city, localities_json, service_radius_km, experience_years,
              skills_json, languages_json, pricing_model, rate_min, rate_max, rate_unit_label,
              availability_status, team_size
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            req.user!.id,
            parsed.categoryId,
            cleanText(parsed.displayName, 120),
            cleanText(parsed.headline, 180),
            cleanText(parsed.bio, 3000),
            cleanOptionalText(parsed.profilePhotoUrl, 300),
            cleanText(parsed.state, 80),
            cleanText(parsed.city, 80),
            JSON.stringify(parsed.localities.map((l) => cleanText(l, 100))),
            parsed.serviceRadiusKm,
            parsed.experienceYears,
            JSON.stringify(parsed.skills.map((s) => cleanText(s, 60))),
            JSON.stringify(parsed.languages.map((l) => cleanText(l, 40))),
            parsed.pricingModel,
            parsed.rateMin,
            rateMax,
            cleanText(parsed.rateUnitLabel, 60),
            parsed.availabilityStatus,
            parsed.teamSize
          );
        return Number(ins.lastInsertRowid);
      }
    });

    const row = db
      .prepare(
        `SELECT pp.*, pc.name as category_name, pc.slug as category_slug, pc.icon_name as category_icon
         FROM professional_profiles pp
         JOIN professional_categories pc ON pc.id = pp.category_id
         WHERE pp.id = ?`
      )
      .get(proId);
    res.json({ profile: formatProRow(row) });
  } catch (err) {
    next(err);
  }
});

professionalsRouter.patch('/me/availability', requireAuth, (req, res, next) => {
  try {
    const schema = z.object({ availabilityStatus: z.enum(['available', 'busy', 'unavailable']) });
    const parsed = schema.parse(req.body);
    const db = getDb();
    const resUpd = db
      .prepare(
        `UPDATE professional_profiles SET availability_status = ?, updated_at = datetime('now') WHERE user_id = ?`
      )
      .run(parsed.availabilityStatus, req.user!.id);
    if (resUpd.changes === 0) {
      res.status(404).json({ error: 'Create your professional profile first.' });
      return;
    }
    res.json({ ok: true, availabilityStatus: parsed.availabilityStatus });
  } catch (err) {
    next(err);
  }
});

professionalsRouter.post('/me/portfolio', requireAuth, (req, res, next) => {
  try {
    const parsed = portfolioCreateSchema.parse(req.body);
    const db = getDb();
    const pro = db
      .prepare(`SELECT id FROM professional_profiles WHERE user_id = ?`)
      .get(req.user!.id) as { id: number } | undefined;

    if (!pro) {
      res.status(400).json({ error: 'Create your professional profile before adding portfolio items.' });
      return;
    }

    const ins = db
      .prepare(
        `INSERT INTO professional_portfolios (professional_id, title, description, project_city, completion_year, budget_display, image_url, category_tag)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        pro.id,
        cleanText(parsed.title, 160),
        cleanText(parsed.description, 1500),
        cleanOptionalText(parsed.projectCity, 80),
        parsed.completionYear ?? null,
        cleanOptionalText(parsed.budgetDisplay, 60),
        cleanText(parsed.imageUrl, 300),
        cleanOptionalText(parsed.categoryTag, 60)
      );

    const item = db
      .prepare(`SELECT * FROM professional_portfolios WHERE id = ?`)
      .get(Number(ins.lastInsertRowid));
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

professionalsRouter.delete('/me/portfolio/:itemId', requireAuth, (req, res) => {
  const itemId = Number(req.params.itemId);
  const db = getDb();
  const pro = db
    .prepare(`SELECT id FROM professional_profiles WHERE user_id = ?`)
    .get(req.user!.id) as { id: number } | undefined;
  if (!pro) {
    res.status(404).json({ error: 'Profile not found.' });
    return;
  }
  const del = db
    .prepare(`DELETE FROM professional_portfolios WHERE id = ? AND professional_id = ?`)
    .run(itemId, pro.id);
  if (del.changes === 0) {
    res.status(404).json({ error: 'Portfolio item not found.' });
    return;
  }
  res.json({ ok: true });
});

professionalsRouter.post('/me/verification', requireAuth, (req, res, next) => {
  try {
    const schema = z.object({
      documentType: z.enum(['aadhaar_masked', 'pan', 'gst', 'trade_license', 'coa_license', 'portfolio_check']),
      documentNumberMasked: z.string().trim().min(4).max(60),
      documentFileUrl: z
        .string()
        .trim()
        .max(300)
        .optional()
        .nullable()
        .refine((v) => !v || sanitizeMediaUrl(v) !== null, {
          message: 'Document URL must be a valid local upload path or https URL',
        }),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const pro = db
      .prepare(`SELECT id FROM professional_profiles WHERE user_id = ?`)
      .get(req.user!.id) as { id: number } | undefined;

    if (!pro) {
      res.status(400).json({ error: 'Create your professional profile before submitting verification.' });
      return;
    }

    const verId = withTransaction((tx) => {
      const ins = tx
        .prepare(
          `INSERT INTO verification_records (user_id, professional_id, document_type, document_number_masked, document_file_url, status)
           VALUES (?, ?, ?, ?, ?, 'pending')`
        )
        .run(
          req.user!.id,
          pro.id,
          parsed.documentType,
          cleanText(parsed.documentNumberMasked, 60),
          cleanOptionalText(parsed.documentFileUrl, 300)
        );
      tx.prepare(
        `UPDATE professional_profiles SET verification_status = 'pending', updated_at = datetime('now')
         WHERE id = ? AND verification_status != 'verified'`
      ).run(pro.id);
      return Number(ins.lastInsertRowid);
    });

    const record = db.prepare(`SELECT * FROM verification_records WHERE id = ?`).get(verId);
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
});

professionalsRouter.get('/:id', optionalAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT pp.*, pc.name as category_name, pc.slug as category_slug, pc.icon_name as category_icon
       FROM professional_profiles pp
       JOIN professional_categories pc ON pc.id = pp.category_id
       JOIN users u ON u.id = pp.user_id
       WHERE pp.id = ? AND u.is_active = 1`
    )
    .get(id);

  if (!row) {
    res.status(404).json({ error: 'Professional profile not found.' });
    return;
  }

  const portfolio = db
    .prepare(`SELECT * FROM professional_portfolios WHERE professional_id = ? ORDER BY created_at DESC`)
    .all(id);

  const reviews = db
    .prepare(
      `SELECT r.*, u.full_name as reviewer_name, u.default_city as reviewer_city
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.professional_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(id);

  const verifications = db
    .prepare(
      `SELECT document_type, status, reviewed_at
       FROM verification_records
       WHERE professional_id = ? AND status = 'verified'`
    )
    .all(id);

  res.json({
    professional: formatProRow(row),
    portfolio,
    reviews,
    verifiedDocs: verifications,
  });
});

professionalsRouter.post('/:id/reviews', requireAuth, (req, res, next) => {
  try {
    const proId = Number(req.params.id);
    const parsed = reviewCreateSchema.parse({ ...req.body, professionalId: proId });
    const db = getDb();

    const pro = db
      .prepare(`SELECT id, user_id, display_name FROM professional_profiles WHERE id = ?`)
      .get(proId) as { id: number; user_id: number; display_name: string } | undefined;

    if (!pro) {
      res.status(404).json({ error: 'Professional not found.' });
      return;
    }
    if (pro.user_id === req.user!.id) {
      res.status(400).json({ error: 'You cannot review your own profile.' });
      return;
    }

    // Verify customer eligibility: must have a genuine engagement via Project Hub, accepted Hiring Request, or assigned Job
    let eligible = false;
    if (parsed.projectId) {
      const projMatch = db
        .prepare(
          `SELECT p.id FROM projects p
           JOIN project_professionals pp ON pp.project_id = p.id
           WHERE p.id = ? AND p.customer_id = ? AND pp.professional_id = ? AND pp.status IN ('active', 'completed')
           LIMIT 1`
        )
        .get(parsed.projectId, req.user!.id, proId);
      eligible = Boolean(projMatch);
    } else if (parsed.jobId) {
      const jobMatch = db
        .prepare(
          `SELECT id FROM job_posts
           WHERE id = ? AND customer_id = ? AND assigned_professional_id = ? AND status IN ('assigned', 'in_progress', 'completed')
           LIMIT 1`
        )
        .get(parsed.jobId, req.user!.id, proId);
      eligible = Boolean(jobMatch);
    } else {
      const anyEngagement = db
        .prepare(
          `SELECT 1 FROM projects p
           JOIN project_professionals pp ON pp.project_id = p.id
           WHERE p.customer_id = ? AND pp.professional_id = ? AND pp.status IN ('active', 'completed')
           UNION ALL
           SELECT 1 FROM hiring_requests hr
           WHERE hr.customer_id = ? AND hr.professional_id = ? AND hr.status IN ('accepted', 'completed')
           UNION ALL
           SELECT 1 FROM job_posts jp
           WHERE jp.customer_id = ? AND jp.assigned_professional_id = ? AND jp.status IN ('assigned', 'in_progress', 'completed')
           LIMIT 1`
        )
        .get(req.user!.id, proId, req.user!.id, proId, req.user!.id, proId);
      eligible = Boolean(anyEngagement);
    }

    if (!eligible) {
      res.status(403).json({
        error: 'Verified reviews can only be posted by clients who hired or worked with this professional on ZAIDAAT.',
      });
      return;
    }

    const dup = db
      .prepare(
        `SELECT id FROM reviews
         WHERE reviewer_id = ? AND professional_id = ? AND COALESCE(project_id, -1) = ? AND COALESCE(job_id, -1) = ?
         LIMIT 1`
      )
      .get(req.user!.id, proId, parsed.projectId ?? -1, parsed.jobId ?? -1);
    if (dup) {
      res.status(409).json({ error: 'You have already reviewed this professional for this engagement.' });
      return;
    }

    const reviewId = withTransaction((tx) => {
      const ins = tx
        .prepare(
          `INSERT INTO reviews (reviewer_id, professional_id, project_id, job_id, rating, work_quality_rating, punctuality_rating, value_rating, title, comment)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          req.user!.id,
          proId,
          parsed.projectId ?? null,
          parsed.jobId ?? null,
          parsed.rating,
          parsed.workQualityRating,
          parsed.punctualityRating,
          parsed.valueRating,
          cleanText(parsed.title, 160),
          cleanText(parsed.comment, 2000)
        );

      const agg = tx
        .prepare(
          `SELECT COUNT(*) as cnt, ROUND(AVG(rating), 1) as avg_rating
           FROM reviews WHERE professional_id = ?`
        )
        .get(proId) as { cnt: number; avg_rating: number };

      tx.prepare(
        `UPDATE professional_profiles SET rating_avg = ?, review_count = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(agg.avg_rating || parsed.rating, agg.cnt, proId);

      return Number(ins.lastInsertRowid);
    });

    createNotification({
      userId: pro.user_id,
      type: 'review_received',
      title: `New ${parsed.rating}-Star Review Received`,
      body: `${req.user!.fullName} reviewed ${pro.display_name}: "${cleanText(parsed.title, 80)}"`,
      linkUrl: `/professionals/${proId}`,
    });

    const created = db
      .prepare(
        `SELECT r.*, u.full_name as reviewer_name, u.default_city as reviewer_city
         FROM reviews r JOIN users u ON u.id = r.reviewer_id WHERE r.id = ?`
      )
      .get(reviewId);
    res.status(201).json({ review: created });
  } catch (err) {
    next(err);
  }
});
