import type { LucideIcon } from 'lucide-react';
import {
  BrickWall,
  Bug,
  ChefHat,
  Compass,
  DraftingCompass,
  Droplets,
  Flame,
  Grid2x2,
  Hammer,
  HardHat,
  PaintRoller,
  ShieldCheck,
  Sofa,
  Sparkles,
  Trees,
  Truck,
  Users,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';

const SLUG_ICON_MAP: Record<string, LucideIcon> = {
  carpenters: Hammer,
  'thekedars-contractors': HardHat,
  painters: PaintRoller,
  electricians: Zap,
  plumbers: Droplets,
  masons: BrickWall,
  'civil-engineers': Compass,
  architects: DraftingCompass,
  'interior-designers': Sofa,
  'tile-fitters': Grid2x2,
  welders: Flame,
  'ac-technicians': Wind,
  labourers: Users,
  'waterproofing-specialists': ShieldCheck,
  'modular-kitchen-specialists': ChefHat,
  'house-cleaning': Sparkles,
  'pest-control': Bug,
  gardeners: Trees,
  'movers-and-packers': Truck,
};

const NAME_ICON_MAP: Record<string, LucideIcon> = {
  Hammer,
  HardHat,
  PaintRoller,
  Zap,
  Droplets,
  BrickWall,
  Compass,
  DraftingCompass,
  Sofa,
  Grid2x2,
  Flame,
  Wind,
  Users,
  ShieldCheck,
  ChefHat,
  Sparkles,
  Bug,
  Trees,
  Truck,
  Wrench,
};

export function getTradeLucideIcon(slug?: string | null, iconName?: string | null): LucideIcon {
  if (slug && SLUG_ICON_MAP[slug]) return SLUG_ICON_MAP[slug];
  if (iconName && NAME_ICON_MAP[iconName]) return NAME_ICON_MAP[iconName];
  return Wrench;
}

interface TradeIconProps {
  slug?: string | null;
  iconName?: string | null;
  variant?: 'badge' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', { box: string; icon: string }> = {
  sm: { box: 'h-8 w-8 rounded-md', icon: 'h-4 w-4' },
  md: { box: 'h-9 w-9 rounded-md', icon: 'h-[18px] w-[18px]' },
  lg: { box: 'h-12 w-12 rounded-lg', icon: 'h-6 w-6' },
};

export function TradeIcon({
  slug,
  iconName,
  variant = 'badge',
  size = 'md',
  className = '',
}: TradeIconProps) {
  const Icon = getTradeLucideIcon(slug, iconName);

  if (variant === 'inline') {
    return <Icon className={`h-3.5 w-3.5 shrink-0 text-slate-500 ${className}`.trim()} strokeWidth={1.9} />;
  }

  const dims = SIZE_CLASSES[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-slate-200/90 bg-slate-50 text-navy-900 transition-colors ${dims.box} ${className}`.trim()}
      aria-hidden="true"
    >
      <Icon className={dims.icon} strokeWidth={1.75} />
    </span>
  );
}
