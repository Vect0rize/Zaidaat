import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import { cleanText } from '../utils/sanitize.js';
import { messageCreateSchema } from '../utils/validation.js';

export const messagesRouter = Router();

messagesRouter.get('/threads', requireAuth, (req, res) => {
  const db = getDb();
  const uid = req.user!.id;

  const rows = db
    .prepare(
      `SELECT m.thread_key, m.context_type, m.context_id, m.body as last_message, m.created_at as last_at,
              m.sender_id, m.recipient_id,
              su.full_name as sender_name, ru.full_name as recipient_name,
              (SELECT COUNT(*) FROM messages um WHERE um.thread_key = m.thread_key AND um.recipient_id = ? AND um.is_read = 0) as unread_count
       FROM messages m
       JOIN users su ON su.id = m.sender_id
       JOIN users ru ON ru.id = m.recipient_id
       WHERE m.id IN (
         SELECT MAX(id) FROM messages
         WHERE sender_id = ? OR recipient_id = ?
         GROUP BY thread_key
       )
       ORDER BY m.created_at DESC`
    )
    .all(uid, uid, uid) as any[];

  const threads = rows.map((r) => {
    const peerId = r.sender_id === uid ? r.recipient_id : r.sender_id;
    const peerName = r.sender_id === uid ? r.recipient_name : r.sender_name;
    return {
      threadKey: r.thread_key,
      contextType: r.context_type,
      contextId: r.context_id,
      peerId,
      peerName,
      lastMessage: r.last_message,
      lastAt: r.last_at,
      unreadCount: r.unread_count,
    };
  });

  res.json({ threads });
});

messagesRouter.get('/thread/:threadKey', requireAuth, (req, res) => {
  const threadKey = cleanText(decodeURIComponent(req.params.threadKey), 140);
  const db = getDb();
  const uid = req.user!.id;

  const messages = db
    .prepare(
      `SELECT m.*, su.full_name as sender_name, ru.full_name as recipient_name
       FROM messages m
       JOIN users su ON su.id = m.sender_id
       JOIN users ru ON ru.id = m.recipient_id
       WHERE m.thread_key = ?
         AND (m.sender_id = ? OR m.recipient_id = ?)
       ORDER BY m.created_at ASC, m.id ASC`
    )
    .all(threadKey, uid, uid);

  db.prepare(`UPDATE messages SET is_read = 1 WHERE thread_key = ? AND recipient_id = ? AND is_read = 0`).run(
    threadKey,
    uid
  );

  res.json({ messages });
});

messagesRouter.post('/', requireAuth, (req, res, next) => {
  try {
    const parsed = messageCreateSchema.parse(req.body);
    const db = getDb();
    const uid = req.user!.id;

    if (parsed.recipientId === uid) {
      res.status(400).json({ error: 'Cannot send a direct message to yourself.' });
      return;
    }

    const recipient = db
      .prepare(`SELECT id, full_name, is_active FROM users WHERE id = ?`)
      .get(parsed.recipientId) as { id: number; full_name: string; is_active: number } | undefined;

    if (!recipient || recipient.is_active !== 1) {
      res.status(404).json({ error: 'Recipient not found.' });
      return;
    }

    if (parsed.contextType === 'project' && parsed.contextId) {
      const proj = db
        .prepare(`SELECT id, customer_id FROM projects WHERE id = ?`)
        .get(parsed.contextId) as { id: number; customer_id: number } | undefined;
      if (!proj) {
        res.status(404).json({ error: 'Project not found.' });
        return;
      }
      const isProjectPro = db
        .prepare(
          `SELECT prp.id FROM project_professionals prp
           JOIN professional_profiles pp ON pp.id = prp.professional_id
           WHERE prp.project_id = ? AND pp.user_id = ? AND prp.status != 'removed'`
        )
        .get(parsed.contextId, uid);
      if (proj.customer_id !== uid && !isProjectPro && !req.user!.roles.includes('admin')) {
        res.status(403).json({ error: 'Not authorized to message in this project context.' });
        return;
      }
    }

    const minId = Math.min(uid, parsed.recipientId);
    const maxId = Math.max(uid, parsed.recipientId);
    const threadKey =
      parsed.contextType === 'project' && parsed.contextId
        ? `project:${parsed.contextId}`
        : `${parsed.contextType}:${parsed.contextId || 0}:${minId}-${maxId}`;

    const ins = db
      .prepare(
        `INSERT INTO messages (thread_key, sender_id, recipient_id, context_type, context_id, body)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        threadKey,
        uid,
        parsed.recipientId,
        parsed.contextType,
        parsed.contextId ?? null,
        cleanText(parsed.body, 3000)
      );

    createNotification({
      userId: parsed.recipientId,
      type: 'new_message',
      title: `Message from ${req.user!.fullName}`,
      body: cleanText(parsed.body, 140),
      linkUrl: `/messages?thread=${encodeURIComponent(threadKey)}`,
    });

    const message = db
      .prepare(
        `SELECT m.*, su.full_name as sender_name
         FROM messages m JOIN users su ON su.id = m.sender_id WHERE m.id = ?`
      )
      .get(Number(ins.lastInsertRowid));

    res.status(201).json({ message, threadKey });
  } catch (err) {
    next(err);
  }
});
