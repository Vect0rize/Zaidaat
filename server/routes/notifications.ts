import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const notifications = db
    .prepare(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 40`
    )
    .all(req.user!.id);
  res.json({ notifications });
});

notificationsRouter.patch('/:id/read', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(id, req.user!.id);
  res.json({ ok: true });
});

notificationsRouter.post('/read-all', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(req.user!.id);
  res.json({ ok: true });
});
