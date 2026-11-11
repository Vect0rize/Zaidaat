import { getDb } from '../db/connection.js';
import { cleanText } from './sanitize.js';

export function createNotification(opts: {
  userId: number;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO notifications (user_id, type, title, body, link_url, is_read) VALUES (?, ?, ?, ?, ?, 0)`
  ).run(
    opts.userId,
    cleanText(opts.type, 64),
    cleanText(opts.title, 180),
    cleanText(opts.body, 500),
    opts.linkUrl ? cleanText(opts.linkUrl, 255) : null
  );
}
