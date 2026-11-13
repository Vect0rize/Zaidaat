import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { config } from '../config.js';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { kycUploadMiddleware, uploadMiddleware, verifyMagicBytes } from '../middleware/upload.js';

export const uploadsRouter = Router();

function determineMediaType(mimeType: string, filename: string): 'image' | 'video' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'document';
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.mov'].includes(ext)) return 'video';
  if (['.pdf'].includes(ext)) return 'document';
  return 'image';
}

function cleanupFiles(files: Express.Multer.File[]): void {
  for (const f of files) {
    try {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch {
      // Ignore cleanup errors
    }
  }
}

uploadsRouter.post('/', requireAuth, uploadMiddleware.array('files', 8), (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  if (files.length === 0) {
    res.status(400).json({ error: 'No valid files received' });
    return;
  }

  for (const file of files) {
    if (!verifyMagicBytes(file.path)) {
      cleanupFiles(files);
      res.status(400).json({
        error: `Rejected "${file.originalname}": file header does not match declared file format.`,
      });
      return;
    }
  }

  const uploaded = files.map((file) => ({
    url: `/uploads/user/${file.filename}`,
    originalName: file.originalname,
    mimeType: file.mimetype,
    mediaType: determineMediaType(file.mimetype, file.filename),
    sizeBytes: file.size,
  }));

  res.status(201).json({ files: uploaded });
});

uploadsRouter.post('/kyc', requireAuth, kycUploadMiddleware.array('files', 4), (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  if (files.length === 0) {
    res.status(400).json({ error: 'No valid KYC files received' });
    return;
  }

  for (const file of files) {
    if (!verifyMagicBytes(file.path)) {
      cleanupFiles(files);
      res.status(400).json({
        error: `Rejected "${file.originalname}": file signature does not match image/PDF format.`,
      });
      return;
    }
  }

  const uploaded = files.map((file) => ({
    url: `/api/uploads/kyc/${file.filename}`,
    originalName: file.originalname,
    mimeType: file.mimetype,
    mediaType: determineMediaType(file.mimetype, file.filename),
    sizeBytes: file.size,
  }));

  res.status(201).json({ files: uploaded });
});

uploadsRouter.get('/kyc/:filename', requireAuth, (req, res) => {
  const rawName = String(req.params.filename || '');
  if (!/^[a-zA-Z0-9._-]+$/.test(rawName)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const isAdmin = req.user!.roles.includes('admin');
  const kycUrl = `/api/uploads/kyc/${rawName}`;
  const db = getDb();
  const ver = db
    .prepare('SELECT user_id FROM verification_records WHERE document_file_url = ? LIMIT 1')
    .get(kycUrl) as { user_id: number } | undefined;

  const isOwnerByPrefix = rawName.startsWith(`${req.user!.id}-`);
  const isOwnerByRecord = ver?.user_id === req.user!.id;

  if (!isAdmin && !isOwnerByPrefix && !isOwnerByRecord) {
    res.status(403).json({ error: 'Forbidden: KYC document belongs to another user' });
    return;
  }

  const kycDir = path.resolve(config.uploadDir, 'kyc');
  const filePath = path.resolve(kycDir, rawName);
  if (!filePath.startsWith(kycDir + path.sep) || !fs.existsSync(filePath)) {
    res.status(404).json({ error: 'KYC document not found' });
    return;
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  if (rawName.toLowerCase().endsWith('.pdf')) {
    res.setHeader('Content-Disposition', `attachment; filename="${rawName}"`);
  }
  res.sendFile(filePath);
});
