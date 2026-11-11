import { useState } from 'react';

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-20 w-20 text-xl',
};

const PALETTES = [
  'bg-stone-100 text-stone-800 border-stone-200',
  'bg-slate-100 text-slate-800 border-slate-200',
  'bg-amber-50 text-amber-900 border-amber-200/80',
  'bg-emerald-50 text-emerald-900 border-emerald-200/80',
  'bg-sky-50 text-sky-900 border-sky-200/80',
];

function getInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'Z';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getPaletteClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length];
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const validSrc = src && !src.endsWith('.svg') && !imgError ? src : null;

  if (validSrc) {
    return (
      <img
        src={validSrc}
        alt={name}
        onError={() => setImgError(true)}
        className={cx(
          'shrink-0 rounded-lg border border-slate-200/80 object-cover bg-slate-100',
          SIZE_CLASSES[size],
          className
        )}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={cx(
        'shrink-0 inline-flex items-center justify-center rounded-lg border font-bold tracking-tight select-none',
        SIZE_CLASSES[size],
        getPaletteClass(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
