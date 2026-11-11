import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { cleanText } from '../utils/sanitize.js';

export const locationsRouter = Router();

locationsRouter.get('/states', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT state, region_zone
       FROM india_locations
       ORDER BY state ASC`
    )
    .all() as Array<{ state: string; region_zone: string }>;
  res.json({ states: rows });
});

locationsRouter.get('/cities', (req, res) => {
  const db = getDb();
  const state = cleanText(String(req.query.state || ''), 80);
  const rows = state
    ? (db
        .prepare(
          `SELECT DISTINCT city, state FROM india_locations WHERE LOWER(state) = LOWER(?) ORDER BY city ASC`
        )
        .all(state) as Array<{ city: string; state: string }>)
    : (db
        .prepare(`SELECT DISTINCT city, state FROM india_locations ORDER BY city ASC`)
        .all() as Array<{ city: string; state: string }>);
  res.json({ cities: rows });
});

locationsRouter.get('/localities', (req, res) => {
  const db = getDb();
  const state = cleanText(String(req.query.state || ''), 80);
  const city = cleanText(String(req.query.city || ''), 80);
  if (!city) {
    res.json({ localities: [] });
    return;
  }
  const rows = state
    ? (db
        .prepare(
          `SELECT id, state, city, locality, pincode
           FROM india_locations
           WHERE LOWER(state) = LOWER(?) AND LOWER(city) = LOWER(?)
           ORDER BY locality ASC`
        )
        .all(state, city) as Array<{ id: number; state: string; city: string; locality: string; pincode: string | null }>)
    : (db
        .prepare(
          `SELECT id, state, city, locality, pincode
           FROM india_locations
           WHERE LOWER(city) = LOWER(?)
           ORDER BY locality ASC`
        )
        .all(city) as Array<{ id: number; state: string; city: string; locality: string; pincode: string | null }>);
  res.json({ localities: rows });
});

locationsRouter.get('/suggest', (req, res) => {
  const db = getDb();
  const q = cleanText(String(req.query.q || ''), 80);
  if (q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }
  const like = `%${q}%`;
  const rows = db
    .prepare(
      `SELECT DISTINCT state, city, locality, pincode
       FROM india_locations
       WHERE locality LIKE ? OR city LIKE ? OR state LIKE ? OR pincode LIKE ?
       ORDER BY
         CASE WHEN city LIKE ? THEN 0 WHEN locality LIKE ? THEN 1 ELSE 2 END,
         city ASC, locality ASC
       LIMIT 15`
    )
    .all(like, like, like, like, `${q}%`, `${q}%`);
  res.json({ suggestions: rows });
});
