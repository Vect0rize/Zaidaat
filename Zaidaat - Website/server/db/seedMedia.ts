import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export const SEED_MEDIA_FILES = [
  'prop-mumbai-apt.jpg',
  'prop-bengaluru-villa.jpg',
  'prop-delhi-house.jpg',
  'prop-pune-apt.jpg',
  'prop-jaipur-plot.jpg',
  'prop-hyderabad-shop.jpg',
  'prop-interior-gallery.jpg',
  'prop-kochi-villa.jpg',
  'prop-ahmedabad-office.jpg',
  'prop-chennai-apt.jpg',
  'work-kitchen.jpg',
  'work-construction.jpg',
] as const;

export function ensureSeedMedia(): void {
  const seedDir = path.join(config.uploadDir, 'seed');
  const userDir = path.join(config.uploadDir, 'user');
  const kycDir = path.join(config.uploadDir, 'kyc');
  fs.mkdirSync(seedDir, { recursive: true });
  fs.mkdirSync(userDir, { recursive: true });
  fs.mkdirSync(kycDir, { recursive: true });

  // Clean up legacy vector placeholders if present
  for (const entry of fs.readdirSync(seedDir)) {
    if (entry.endsWith('.svg')) {
      try {
        fs.unlinkSync(path.join(seedDir, entry));
      } catch {
        // Ignore cleanup errors on locked handles
      }
    }
  }

  for (const file of SEED_MEDIA_FILES) {
    const filePath = path.join(seedDir, file);
    if (!fs.existsSync(filePath)) {
      // In isolated test runs with a temporary UPLOAD_DIR, copy real JPEG assets from workspace uploads/seed if available.
      const fallbackSrc = path.resolve(process.cwd(), 'uploads', 'seed', file);
      if (fallbackSrc !== filePath && fs.existsSync(fallbackSrc)) {
        fs.copyFileSync(fallbackSrc, filePath);
      }
    }
  }

  // Ensure trade category JPEGs are available even when running with a temporary UPLOAD_DIR
  const tradesTargetDir = path.join(seedDir, 'trades');
  const tradesSrcDir = path.resolve(process.cwd(), 'uploads', 'seed', 'trades');
  if (fs.existsSync(tradesSrcDir)) {
    fs.mkdirSync(tradesTargetDir, { recursive: true });
    for (const entry of fs.readdirSync(tradesSrcDir)) {
      if (!entry.endsWith('.jpg')) continue;
      const dst = path.join(tradesTargetDir, entry);
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(path.join(tradesSrcDir, entry), dst);
      }
    }
  }
}
