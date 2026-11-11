import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import type { Request } from 'express';

const userUploadDir = path.join(config.uploadDir, 'user');
const kycUploadDir = path.join(config.uploadDir, 'kyc');
fs.mkdirSync(userUploadDir, { recursive: true });
fs.mkdirSync(kycUploadDir, { recursive: true });

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_DOC_MIMES = new Set(['application/pdf']);
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const DOC_EXTS = new Set(['.pdf']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov']);

function createStorage(targetDir: string, prefixUserId = false) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(targetDir, { recursive: true });
      cb(null, targetDir);
    },
    filename: (req: Request, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = IMAGE_EXTS.has(ext) || DOC_EXTS.has(ext) || VIDEO_EXTS.has(ext) ? ext : '.bin';
      const uid = prefixUserId && req.user?.id ? `${req.user.id}-` : '';
      const unique = `${uid}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      cb(null, `${unique}${safeExt}`);
    },
  });
}

function makeFileFilter(allowVideos: boolean) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = ALLOWED_IMAGE_MIMES.has(file.mimetype) && IMAGE_EXTS.has(ext);
    const isDoc = ALLOWED_DOC_MIMES.has(file.mimetype) && DOC_EXTS.has(ext);
    const isVideo = allowVideos && ALLOWED_VIDEO_MIMES.has(file.mimetype) && VIDEO_EXTS.has(ext);

    if (isImage || isDoc || isVideo) {
      cb(null, true);
    } else {
      cb(
        new Error(
          allowVideos
            ? 'Unsupported file type. Allowed: JPG, PNG, WEBP, GIF, PDF, MP4, WEBM.'
            : 'Unsupported document type. Allowed: JPG, PNG, WEBP, PDF.'
        )
      );
    }
  };
}

/**
 * Inspects file header magic bytes on disk to catch MIME/extension spoofing (e.g. HTML disguised as .png).
 */
export function verifyMagicBytes(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const buf = Buffer.alloc(16);
  let bytesRead = 0;
  const fd = fs.openSync(filePath, 'r');
  try {
    bytesRead = fs.readSync(fd, buf, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (bytesRead < 4) return false;

  if (ext === '.jpg' || ext === '.jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (ext === '.png') {
    return (
      bytesRead >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }
  if (ext === '.gif') {
    const hdr = buf.subarray(0, 6).toString('ascii');
    return hdr === 'GIF87a' || hdr === 'GIF89a';
  }
  if (ext === '.webp') {
    return (
      bytesRead >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (ext === '.pdf') {
    return bytesRead >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  if (ext === '.mp4' || ext === '.mov') {
    return bytesRead >= 8 && buf.subarray(4, 8).toString('ascii') === 'ftyp';
  }
  if (ext === '.webm') {
    return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  }
  return false;
}

export const uploadMiddleware = multer({
  storage: createStorage(userUploadDir, false),
  limits: { fileSize: config.maxUploadBytes, files: 8 },
  fileFilter: makeFileFilter(true),
});

export const kycUploadMiddleware = multer({
  storage: createStorage(kycUploadDir, true),
  limits: { fileSize: config.maxUploadBytes, files: 4 },
  fileFilter: makeFileFilter(false),
});
