export function cleanText(input: string, maxLen = 4000): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function cleanOptionalText(input: string | null | undefined, maxLen = 4000): string | null {
  if (input === null || input === undefined) return null;
  const trimmed = cleanText(input, maxLen);
  return trimmed.length > 0 ? trimmed : null;
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 65);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base || 'listing'}-${rand}`;
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '******';
  return `${'*'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [name, domain] = email.split('@');
  if (!domain) return '***';
  const visible = name.slice(0, 2);
  return `${visible}***@${domain}`;
}

/**
 * Allows only relative local upload paths (`/uploads/...`) or safe `http:` / `https:` URLs,
 * rejecting `javascript:`, `data:`, `vbscript:`, protocol-relative `//`, and path traversal (`..`).
 */
export function sanitizeMediaUrl(input: string | null | undefined, maxLen = 400): string | null {
  if (input === null || input === undefined) return null;
  const trimmed = input.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
  if (!trimmed) return null;

  // Reject path traversal
  if (trimmed.includes('..') || trimmed.includes('\\')) return null;

  // Allow relative `/uploads/` or `/api/uploads/kyc/` paths
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/api/uploads/kyc/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString().slice(0, maxLen);
    }
  } catch {
    return null;
  }
  return null;
}

export function parsePagination(
  rawLimit: unknown,
  rawOffset: unknown,
  maxLimit = 60,
  defaultLimit = 24
): { limit: number; offset: number } {
  const l = Number(rawLimit);
  const o = Number(rawOffset);
  const limit = Number.isFinite(l) && l >= 1 ? Math.min(Math.floor(l), maxLimit) : defaultLimit;
  const offset = Number.isFinite(o) && o >= 0 ? Math.floor(o) : 0;
  return { limit, offset };
}

export function parsePositiveInt(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseNonNegativeNumber(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}


