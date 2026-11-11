import { Router } from 'express';
import { getDb, withTransaction } from '../db/connection.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import { cleanOptionalText, cleanText, safeJsonParse, slugify } from '../utils/sanitize.js';
import { propertyCreateSchema, propertyEnquirySchema } from '../utils/validation.js';
import { z } from 'zod';

export const propertiesRouter = Router();

type PropImgRow = {
  id: number;
  property_id: number;
  file_url: string;
  caption: string | null;
  media_type: string;
  is_primary: number;
  sort_order: number;
};

function formatPropertyRows(rows: any[], savedSet?: Set<number>, includeOwnerContact = false) {
  if (rows.length === 0) return [];
  const db = getDb();
  const propIds = rows.map((r) => r.id);
  const placeholders = propIds.map(() => '?').join(',');
  const allImgs = db
    .prepare(
      `SELECT id, property_id, file_url, caption, media_type, is_primary, sort_order
       FROM property_images
       WHERE property_id IN (${placeholders})
       ORDER BY is_primary DESC, sort_order ASC, id ASC`
    )
    .all(...propIds) as PropImgRow[];

  const imgMap = new Map<number, PropImgRow[]>();
  for (const im of allImgs) {
    const list = imgMap.get(im.property_id) || [];
    list.push(im);
    imgMap.set(im.property_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerCity: row.owner_city,
    ...(includeOwnerContact ? { ownerPhone: row.owner_phone, ownerEmail: row.owner_email } : {}),
    title: row.title,
    slug: row.slug,
    listingPurpose: row.listing_purpose,
    propertyCategory: row.property_category,
    propertyType: row.property_type,
    price: row.price,
    priceUnit: row.price_unit,
    securityDeposit: row.security_deposit,
    maintenanceMonthly: row.maintenance_monthly,
    areaSqft: row.area_sqft,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    balconies: row.balconies,
    furnishing: row.furnishing,
    facing: row.facing,
    floorNumber: row.floor_number,
    totalFloors: row.total_floors,
    ageYears: row.age_years,
    possessionStatus: row.possession_status,
    state: row.state,
    city: row.city,
    locality: row.locality,
    addressLine: row.address_line,
    pincode: row.pincode,
    amenities: safeJsonParse<string[]>(row.amenities_json, []),
    description: row.description,
    reraId: row.rera_id,
    videoUrl: row.video_url,
    isFeatured: Boolean(row.is_featured),
    status: row.status,
    viewsCount: row.views_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isSaved: savedSet ? savedSet.has(row.id) : false,
    images: (imgMap.get(row.id) || []).map((im) => ({
      id: im.id,
      url: im.file_url,
      caption: im.caption,
      mediaType: im.media_type,
      isPrimary: Boolean(im.is_primary),
    })),
  }));
}

function formatPropertyRow(row: any, savedSet?: Set<number>, includeOwnerContact = false) {
  return formatPropertyRows([row], savedSet, includeOwnerContact)[0];
}

propertiesRouter.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const q = cleanText(String(req.query.q || ''), 120);
  const purpose = String(req.query.purpose || '');
  const category = String(req.query.category || '');
  const type = String(req.query.type || '');
  const state = cleanText(String(req.query.state || ''), 80);
  const city = cleanText(String(req.query.city || ''), 80);
  const locality = cleanText(String(req.query.locality || ''), 120);
  const minPrice = Number(req.query.minPrice || 0);
  const maxPrice = Number(req.query.maxPrice || 0);
  const bedrooms = Number(req.query.bedrooms || 0);
  const furnishing = String(req.query.furnishing || '');
  const possession = String(req.query.possession || '');
  const sort = String(req.query.sort || 'newest');
  const limit = Math.min(Number(req.query.limit || 24), 60);
  const offset = Math.max(Number(req.query.offset || 0), 0);

  const conditions: string[] = [`p.status = 'active'`, `u.is_active = 1`];
  const params: Array<string | number> = [];

  if (purpose === 'buy' || purpose === 'rent') {
    conditions.push(`p.listing_purpose = ?`);
    params.push(purpose);
  }
  if (category === 'residential' || category === 'commercial') {
    conditions.push(`p.property_category = ?`);
    params.push(category);
  }
  if (type) {
    conditions.push(`p.property_type = ?`);
    params.push(type);
  }
  if (state) {
    conditions.push(`LOWER(p.state) = LOWER(?)`);
    params.push(state);
  }
  if (city) {
    conditions.push(`LOWER(p.city) LIKE LOWER(?)`);
    params.push(`%${city}%`);
  }
  if (locality) {
    conditions.push(`LOWER(p.locality) LIKE LOWER(?)`);
    params.push(`%${locality}%`);
  }
  if (minPrice > 0) {
    conditions.push(`p.price >= ?`);
    params.push(minPrice);
  }
  if (maxPrice > 0) {
    conditions.push(`p.price <= ?`);
    params.push(maxPrice);
  }
  if (bedrooms > 0) {
    if (bedrooms >= 4) {
      conditions.push(`p.bedrooms >= 4`);
    } else {
      conditions.push(`p.bedrooms = ?`);
      params.push(bedrooms);
    }
  }
  if (furnishing) {
    conditions.push(`p.furnishing = ?`);
    params.push(furnishing);
  }
  if (possession) {
    conditions.push(`p.possession_status = ?`);
    params.push(possession);
  }
  if (q) {
    const like = `%${q}%`;
    conditions.push(`(p.title LIKE ? OR p.description LIKE ? OR p.locality LIKE ? OR p.city LIKE ? OR p.state LIKE ?)`);
    params.push(like, like, like, like, like);
  }

  let orderBy = `p.is_featured DESC, p.created_at DESC`;
  if (sort === 'price_asc') orderBy = `p.price ASC`;
  else if (sort === 'price_desc') orderBy = `p.price DESC`;
  else if (sort === 'views') orderBy = `p.views_count DESC`;
  else if (sort === 'area_desc') orderBy = `p.area_sqft DESC`;

  const whereSql = conditions.join(' AND ');

  const totalRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       WHERE ${whereSql}`
    )
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT p.*, u.full_name as owner_name, u.default_city as owner_city
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  let savedSet: Set<number> | undefined;
  if (req.user) {
    const savedRows = db
      .prepare(`SELECT property_id FROM saved_properties WHERE user_id = ?`)
      .all(req.user.id) as Array<{ property_id: number }>;
    savedSet = new Set(savedRows.map((s) => s.property_id));
  }

  res.json({
    total: totalRow.total,
    properties: formatPropertyRows(rows, savedSet, false),
  });
});

propertiesRouter.get('/mine', requireAuth, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, u.full_name as owner_name, u.default_city as owner_city
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       WHERE p.owner_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(req.user!.id);
  res.json({ properties: formatPropertyRows(rows, undefined, true) });
});

propertiesRouter.get('/saved', requireAuth, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, u.full_name as owner_name, u.default_city as owner_city
       FROM saved_properties sp
       JOIN properties p ON p.id = sp.property_id
       JOIN users u ON u.id = p.owner_id
       WHERE sp.user_id = ? AND p.status != 'archived' AND u.is_active = 1
       ORDER BY sp.created_at DESC`
    )
    .all(req.user!.id);
  const savedSet = new Set(rows.map((r: any) => r.id));
  res.json({ properties: formatPropertyRows(rows, savedSet, false) });
});

propertiesRouter.get('/compare', optionalAuth, (req, res) => {
  const idsRaw = String(req.query.ids || '')
    .split(',')
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 4);

  if (idsRaw.length === 0) {
    res.json({ properties: [] });
    return;
  }

  const db = getDb();
  const placeholders = idsRaw.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT p.*, u.full_name as owner_name, u.default_city as owner_city
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       WHERE p.id IN (${placeholders}) AND p.status = 'active' AND u.is_active = 1`
    )
    .all(...idsRaw);
  res.json({ properties: formatPropertyRows(rows, undefined, false) });
});

propertiesRouter.get('/enquiries/mine', requireAuth, (req, res) => {
  const db = getDb();
  const received = db
    .prepare(
      `SELECT pe.*, p.title as property_title, p.city as property_city, p.listing_purpose
       FROM property_enquiries pe
       JOIN properties p ON p.id = pe.property_id
       WHERE pe.owner_id = ?
       ORDER BY pe.created_at DESC`
    )
    .all(req.user!.id);

  const sent = db
    .prepare(
      `SELECT pe.*, p.title as property_title, p.city as property_city, p.listing_purpose,
              u.full_name as owner_name
       FROM property_enquiries pe
       JOIN properties p ON p.id = pe.property_id
       JOIN users u ON u.id = pe.owner_id
       WHERE pe.buyer_id = ?
       ORDER BY pe.created_at DESC`
    )
    .all(req.user!.id);

  res.json({ received, sent });
});

propertiesRouter.patch('/enquiries/:enquiryId/status', requireAuth, (req, res, next) => {
  try {
    const enquiryId = Number(req.params.enquiryId);
    const schema = z.object({
      status: z.enum(['new', 'contacted', 'site_visited', 'closed']),
      ownerNotes: z.string().trim().max(1000).optional(),
    });
    const parsed = schema.parse(req.body);
    const db = getDb();

    const row = db
      .prepare(`SELECT id, owner_id FROM property_enquiries WHERE id = ?`)
      .get(enquiryId) as { id: number; owner_id: number } | undefined;

    if (!row) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }
    if (row.owner_id !== req.user!.id && !req.user!.roles.includes('admin')) {
      res.status(403).json({ error: 'Not authorized to update this enquiry.' });
      return;
    }

    db.prepare(
      `UPDATE property_enquiries SET status = ?, owner_notes = COALESCE(?, owner_notes), updated_at = datetime('now') WHERE id = ?`
    ).run(parsed.status, parsed.ownerNotes ? cleanText(parsed.ownerNotes, 1000) : null, enquiryId);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

propertiesRouter.get('/:id', optionalAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.*, u.full_name as owner_name, u.default_city as owner_city, u.phone as owner_phone, u.email as owner_email, u.is_active as owner_active
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       WHERE p.id = ?`
    )
    .get(id) as any;

  if (!row) {
    res.status(404).json({ error: 'Property not found.' });
    return;
  }

  const isOwnerOrAdmin =
    Boolean(req.user) && (req.user!.id === row.owner_id || req.user!.roles.includes('admin'));

  if ((row.status === 'archived' || row.owner_active !== 1) && !isOwnerOrAdmin) {
    res.status(404).json({ error: 'Property listing is unavailable.' });
    return;
  }

  db.prepare(`UPDATE properties SET views_count = views_count + 1 WHERE id = ?`).run(id);

  let savedSet: Set<number> | undefined;
  if (req.user) {
    const saved = db
      .prepare(`SELECT property_id FROM saved_properties WHERE user_id = ? AND property_id = ?`)
      .get(req.user.id, id) as { property_id: number } | undefined;
    if (saved) savedSet = new Set([id]);
  }

  // Only reveal raw owner contact if owner/admin or if authenticated user has an accepted/active enquiry
  res.json({ property: formatPropertyRow(row, savedSet, isOwnerOrAdmin) });
});

propertiesRouter.post('/', requireAuth, (req, res, next) => {
  try {
    const parsed = propertyCreateSchema.parse(req.body);
    const priceUnit = parsed.listingPurpose === 'rent' ? 'monthly' : 'total';
    const slug = slugify(`${parsed.title}-${parsed.city}`);

    const propId = withTransaction((tx) => {
      const ins = tx
        .prepare(
          `INSERT INTO properties (
            owner_id, title, slug, listing_purpose, property_category, property_type,
            price, price_unit, security_deposit, maintenance_monthly, area_sqft,
            bedrooms, bathrooms, balconies, furnishing, facing, floor_number, total_floors,
            age_years, possession_status, state, city, locality, address_line, pincode,
            amenities_json, description, rera_id, video_url, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
        )
        .run(
          req.user!.id,
          cleanText(parsed.title, 180),
          slug,
          parsed.listingPurpose,
          parsed.propertyCategory,
          parsed.propertyType,
          parsed.price,
          priceUnit,
          parsed.securityDeposit,
          parsed.maintenanceMonthly,
          parsed.areaSqft,
          parsed.bedrooms,
          parsed.bathrooms,
          parsed.balconies,
          parsed.furnishing,
          cleanOptionalText(parsed.facing, 40),
          parsed.floorNumber ?? null,
          parsed.totalFloors ?? null,
          parsed.ageYears,
          parsed.possessionStatus,
          cleanText(parsed.state, 80),
          cleanText(parsed.city, 80),
          cleanText(parsed.locality, 120),
          cleanOptionalText(parsed.addressLine, 240),
          cleanOptionalText(parsed.pincode, 12),
          JSON.stringify(parsed.amenities.map((a) => cleanText(a, 60))),
          cleanText(parsed.description, 4000),
          cleanOptionalText(parsed.reraId, 80),
          cleanOptionalText(parsed.videoUrl, 300)
        );
      const pid = Number(ins.lastInsertRowid);

      const media =
        parsed.mediaUrls.length > 0
          ? parsed.mediaUrls
          : [{ url: '/uploads/seed/prop-pune-apt.jpg', mediaType: 'image' as const, caption: parsed.title }];

      const insImg = tx.prepare(
        `INSERT INTO property_images (property_id, file_url, caption, media_type, is_primary, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      media.forEach((m, idx) => {
        insImg.run(
          pid,
          cleanText(m.url, 300),
          cleanOptionalText(m.caption, 160),
          m.mediaType,
          idx === 0 ? 1 : 0,
          idx
        );
      });

      // Ensure location exists for All-India directory autocomplete
      tx.prepare(
        `INSERT OR IGNORE INTO india_locations (state, city, locality, pincode, region_zone)
         VALUES (?, ?, ?, ?, 'India')`
      ).run(
        cleanText(parsed.state, 80),
        cleanText(parsed.city, 80),
        cleanText(parsed.locality, 120),
        cleanOptionalText(parsed.pincode, 12)
      );

      return pid;
    });

    const db = getDb();
    const created = db
      .prepare(
        `SELECT p.*, u.full_name as owner_name, u.default_city as owner_city
         FROM properties p JOIN users u ON u.id = p.owner_id WHERE p.id = ?`
      )
      .get(propId);
    res.status(201).json({ property: formatPropertyRow(created, undefined, true) });
  } catch (err) {
    next(err);
  }
});

propertiesRouter.put('/:id', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const existing = db
      .prepare(`SELECT id, owner_id FROM properties WHERE id = ?`)
      .get(id) as { id: number; owner_id: number } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }
    if (existing.owner_id !== req.user!.id && !req.user!.roles.includes('admin')) {
      res.status(403).json({ error: 'You can only edit your own property listings.' });
      return;
    }

    const parsed = propertyCreateSchema.parse(req.body);
    const priceUnit = parsed.listingPurpose === 'rent' ? 'monthly' : 'total';
    const status = req.body.status && ['active', 'pending', 'sold', 'rented', 'archived'].includes(req.body.status)
      ? req.body.status
      : undefined;

    withTransaction((tx) => {
      tx.prepare(
        `UPDATE properties SET
          title = ?, listing_purpose = ?, property_category = ?, property_type = ?,
          price = ?, price_unit = ?, security_deposit = ?, maintenance_monthly = ?, area_sqft = ?,
          bedrooms = ?, bathrooms = ?, balconies = ?, furnishing = ?, facing = ?,
          floor_number = ?, total_floors = ?, age_years = ?, possession_status = ?,
          state = ?, city = ?, locality = ?, address_line = ?, pincode = ?,
          amenities_json = ?, description = ?, rera_id = ?, video_url = ?,
          status = COALESCE(?, status), updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        cleanText(parsed.title, 180),
        parsed.listingPurpose,
        parsed.propertyCategory,
        parsed.propertyType,
        parsed.price,
        priceUnit,
        parsed.securityDeposit,
        parsed.maintenanceMonthly,
        parsed.areaSqft,
        parsed.bedrooms,
        parsed.bathrooms,
        parsed.balconies,
        parsed.furnishing,
        cleanOptionalText(parsed.facing, 40),
        parsed.floorNumber ?? null,
        parsed.totalFloors ?? null,
        parsed.ageYears,
        parsed.possessionStatus,
        cleanText(parsed.state, 80),
        cleanText(parsed.city, 80),
        cleanText(parsed.locality, 120),
        cleanOptionalText(parsed.addressLine, 240),
        cleanOptionalText(parsed.pincode, 12),
        JSON.stringify(parsed.amenities.map((a) => cleanText(a, 60))),
        cleanText(parsed.description, 4000),
        cleanOptionalText(parsed.reraId, 80),
        cleanOptionalText(parsed.videoUrl, 300),
        status ?? null,
        id
      );

      if (parsed.mediaUrls.length > 0) {
        tx.prepare(`DELETE FROM property_images WHERE property_id = ?`).run(id);
        const insImg = tx.prepare(
          `INSERT INTO property_images (property_id, file_url, caption, media_type, is_primary, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`
        );
        parsed.mediaUrls.forEach((m, idx) => {
          insImg.run(
            id,
            cleanText(m.url, 300),
            cleanOptionalText(m.caption, 160),
            m.mediaType,
            idx === 0 ? 1 : 0,
            idx
          );
        });
      }
    });

    const updated = db
      .prepare(
        `SELECT p.*, u.full_name as owner_name, u.default_city as owner_city
         FROM properties p JOIN users u ON u.id = p.owner_id WHERE p.id = ?`
      )
      .get(id);
    res.json({ property: formatPropertyRow(updated, undefined, true) });
  } catch (err) {
    next(err);
  }
});

propertiesRouter.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const existing = db
    .prepare(`SELECT id, owner_id FROM properties WHERE id = ?`)
    .get(id) as { id: number; owner_id: number } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Property not found.' });
    return;
  }
  if (existing.owner_id !== req.user!.id && !req.user!.roles.includes('admin')) {
    res.status(403).json({ error: 'You can only delete your own property listings.' });
    return;
  }

  db.prepare(`DELETE FROM properties WHERE id = ?`).run(id);
  res.json({ ok: true });
});

propertiesRouter.post('/:id/save', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const exists = db.prepare(`SELECT id FROM properties WHERE id = ?`).get(id);
  if (!exists) {
    res.status(404).json({ error: 'Property not found.' });
    return;
  }
  const already = db
    .prepare(`SELECT id FROM saved_properties WHERE user_id = ? AND property_id = ?`)
    .get(req.user!.id, id);

  if (already) {
    db.prepare(`DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?`).run(req.user!.id, id);
    res.json({ saved: false });
  } else {
    db.prepare(`INSERT INTO saved_properties (user_id, property_id) VALUES (?, ?)`).run(req.user!.id, id);
    res.json({ saved: true });
  }
});

propertiesRouter.post('/:id/enquire', requireAuth, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = propertyEnquirySchema.parse(req.body);
    const db = getDb();

    const prop = db
      .prepare(`SELECT id, owner_id, title, status FROM properties WHERE id = ?`)
      .get(id) as { id: number; owner_id: number; title: string; status: string } | undefined;

    if (!prop) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }
    if (prop.status !== 'active') {
      res.status(400).json({ error: 'This listing is no longer active for enquiries.' });
      return;
    }
    if (prop.owner_id === req.user!.id) {
      res.status(400).json({ error: 'You cannot send an enquiry to your own property listing.' });
      return;
    }

    const enquiryId = withTransaction((tx) => {
      const ins = tx
        .prepare(
          `INSERT INTO property_enquiries (property_id, buyer_id, owner_id, buyer_name, buyer_email, buyer_phone, message, preferred_visit_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          req.user!.id,
          prop.owner_id,
          cleanText(parsed.buyerName, 120),
          cleanOptionalText(parsed.buyerEmail, 160),
          cleanText(parsed.buyerPhone, 20),
          cleanText(parsed.message, 2000),
          cleanOptionalText(parsed.preferredVisitDate, 40)
        );

      // Also start/append a direct message thread so owner & buyer can chat in Messages
      if (prop.owner_id !== req.user!.id) {
        const minId = Math.min(req.user!.id, prop.owner_id);
        const maxId = Math.max(req.user!.id, prop.owner_id);
        tx.prepare(
          `INSERT INTO messages (thread_key, sender_id, recipient_id, context_type, context_id, body)
           VALUES (?, ?, ?, 'property', ?, ?)`
        ).run(
          `property:${id}:${minId}-${maxId}`,
          req.user!.id,
          prop.owner_id,
          id,
          `Enquiry for "${prop.title}": ${cleanText(parsed.message, 1500)}`
        );
      }

      return Number(ins.lastInsertRowid);
    });

    if (prop.owner_id !== req.user!.id) {
      createNotification({
        userId: prop.owner_id,
        type: 'property_enquiry',
        title: `New Enquiry on ${prop.title}`,
        body: `${cleanText(parsed.buyerName, 80)} sent a message regarding your property.`,
        linkUrl: '/dashboard',
      });
    }

    res.status(201).json({ ok: true, enquiryId });
  } catch (err) {
    next(err);
  }
});
