import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  if (err instanceof Error) {
    if (err.message.includes('Unsupported file type')) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('[server error]', err.message);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  res.status(500).json({ error: 'Unexpected error occurred' });
}
