import { useId } from 'react';

interface TradeIconProps {
  slug?: string;
  iconName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'inline';
}

const ICON_NAME_TO_SLUG: Record<string, string> = {
  Hammer: 'carpenters',
  HardHat: 'thekedars-contractors',
  PaintRoller: 'painters',
  Zap: 'electricians',
  Wrench: 'plumbers',
  BrickWall: 'masons',
  Compass: 'civil-engineers',
  Ruler: 'architects',
  Sofa: 'interior-designers',
  Grid: 'tile-fitters',
  Flame: 'welders',
  Wind: 'ac-technicians',
  Pickaxe: 'labourers',
  Droplets: 'waterproofing-specialists',
  ChefHat: 'modular-kitchen-specialists',
  Sparkles: 'house-cleaning',
  ShieldAlert: 'pest-control',
  Trees: 'gardeners',
  Truck: 'movers-and-packers',
};

function resolveTradeKey(slug?: string, iconName?: string): string {
  if (slug) return slug;
  if (iconName && ICON_NAME_TO_SLUG[iconName]) return ICON_NAME_TO_SLUG[iconName];
  return 'thekedars-contractors';
}

function renderTrade3DSvg(key: string, uid: string, svgClass: string) {
  const g = (name: string) => `${uid}-${name}`;
  const u = (name: string) => `url(#${uid}-${name})`;

  switch (key) {
    case 'thekedars-contractors':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('hatTop')} x1="8" y1="10" x2="38" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="55%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#9A3412" />
            </linearGradient>
            <linearGradient id={g('hatRidge')} x1="20" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FED7AA" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id={g('hatBrim')} x1="6" y1="30" x2="42" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C2410C" />
              <stop offset="100%" stopColor="#7C2D12" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="39.5" rx="15" ry="3" fill="#0F172A" fillOpacity="0.12" />
          {/* Safety helmet shell */}
          <path d="M9 30C9 19.5 15.7 12 24 12C32.3 12 39 19.5 39 30H9Z" fill={u('hatTop')} />
          {/* Raised center crest */}
          <path d="M21 10.5C21 9.4 22.3 8.5 24 8.5C25.7 8.5 27 9.4 27 10.5L28 29H20L21 10.5Z" fill={u('hatRidge')} />
          {/* Specular gloss highlight */}
          <path d="M13 24C14 18.5 17 15.5 19.5 14.5" stroke="#FFEDD5" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
          {/* Extruded 3D visor brim */}
          <path d="M6 31.5C6 29.8 7.5 28.8 10 28.8H38C40.5 28.8 42 29.8 42 31.5C42 33.4 39.2 35.2 24 35.2C8.8 35.2 6 33.4 6 31.5Z" fill={u('hatBrim')} />
          <path d="M8 30.2H40" stroke="#FDBA74" strokeWidth="1" strokeOpacity="0.6" />
          {/* Navy chin tag */}
          <rect x="19" y="25" width="10" height="4" rx="1.5" fill="#0F172A" fillOpacity="0.22" />
        </svg>
      );

    case 'carpenters':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('woodTop')} x1="8" y1="22" x2="36" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id={g('steel')} x1="18" y1="8" x2="36" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="60%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40" rx="15" ry="3" fill="#0F172A" fillOpacity="0.12" />
          {/* 3D Isometric Timber Block */}
          <polygon points="8,29 26,22 40,28 22,35" fill="#FBBF24" />
          <polygon points="8,29 22,35 22,40 8,34" fill="#92400E" />
          <polygon points="22,35 40,28 40,33 22,40" fill="#B45309" />
          {/* Hammer handle */}
          <path d="M24 27L35.5 14.5C36.4 13.5 38 13.5 39 14.4C40 15.3 40 16.9 39.1 17.8L27.5 30.2L24 27Z" fill={u('woodTop')} />
          {/* Steel hammer head */}
          <path d="M16.5 11.5L23.5 8.5L29.5 14L24.5 19.5L18.5 14C17.2 14.6 15.8 14.2 15.2 13.2C14.7 12.4 15.3 11.9 16.5 11.5Z" fill={u('steel')} />
          <path d="M22.5 9.5L28 14.3" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
        </svg>
      );

    case 'painters':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('roller')} x1="10" y1="8" x2="36" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="50%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#9F1239" />
            </linearGradient>
            <linearGradient id={g('handle')} x1="20" y1="28" x2="26" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>
          <ellipse cx="23" cy="41.5" rx="11" ry="2.5" fill="#0F172A" fillOpacity="0.12" />
          {/* Wet paint stroke behind */}
          <rect x="11" y="18" width="22" height="10" rx="3" fill="#FFE4E6" />
          {/* Chrome wire frame */}
          <path d="M36 14H39C40.1 14 41 14.9 41 16V21.5C41 22.8 40 23.8 38.7 24L25 25.8V29" stroke="#64748B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          {/* 3D Cylindrical Roller */}
          <rect x="9" y="9" width="27" height="11" rx="5.5" fill={u('roller')} />
          <path d="M13 12H32" stroke="#FECDD3" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.75" />
          <ellipse cx="11.5" cy="14.5" rx="2.5" ry="5.5" fill="#BE123C" />
          {/* Ergonomic Grip */}
          <rect x="21.5" y="28.5" width="7" height="12.5" rx="3.5" fill={u('handle')} />
          <rect x="23" y="30.5" width="1.5" height="8" rx="0.75" fill="#64748B" fillOpacity="0.5" />
        </svg>
      );

    case 'electricians':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('bolt')} x1="16" y1="7" x2="33" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id={g('shield')} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40.5" rx="13" ry="2.8" fill="#0F172A" fillOpacity="0.14" />
          {/* 3D Navy Insulator Badge */}
          <rect x="8" y="8" width="32" height="31" rx="9" fill={u('shield')} />
          <rect x="9" y="9" width="30" height="29" rx="8" stroke="#475569" strokeWidth="1.2" />
          {/* Raised 3D Lightning Bolt */}
          <path d="M27.5 10.5L16.5 24.5H23.5L20.5 36.5L32.5 21.5H25L27.5 10.5Z" fill="#78350F" transform="translate(1.2, 1.5)" />
          <path d="M27.5 10.5L16.5 24.5H23.5L20.5 36.5L32.5 21.5H25L27.5 10.5Z" fill={u('bolt')} />
          <path d="M26 13L18.5 23.2" stroke="#FEF9C3" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'plumbers':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('drop')} x1="27" y1="10" x2="40" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="55%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>
            <linearGradient id={g('wrench')} x1="8" y1="12" x2="30" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="60%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40" rx="14" ry="2.8" fill="#0F172A" fillOpacity="0.12" />
          {/* 3D Chrome Pipe Wrench */}
          <path d="M12.5 12C9.8 14.7 9.8 19 12.2 21.8L25.8 35.4C27.2 36.8 29.4 36.8 30.8 35.4C32.2 34 32.2 31.8 30.8 30.4L17.2 16.8C19.5 15 19.6 11.2 17 9.2L15 11.8L12.5 12Z" fill={u('wrench')} />
          <circle cx="28.2" cy="32.8" r="1.6" fill="#0F172A" fillOpacity="0.35" />
          {/* Copper pipe collar */}
          <rect x="8" y="29" width="12" height="7" rx="2" fill="#D97706" />
          <rect x="8" y="29" width="12" height="2.5" rx="1" fill="#FCD34D" fillOpacity="0.7" />
          {/* 3D Glossy Water Drop */}
          <path d="M33.5 9C33.5 9 40.5 17.8 40.5 22.8C40.5 26.7 37.4 29.8 33.5 29.8C29.6 29.8 26.5 26.7 26.5 22.8C26.5 17.8 33.5 9 33.5 9Z" fill={u('drop')} />
          <path d="M30.5 20.5C30 22.5 30.5 25 32.5 26.2" stroke="#E0F2FE" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    case 'masons':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('brick')} x1="8" y1="16" x2="36" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#9A3412" />
            </linearGradient>
            <linearGradient id={g('trowel')} x1="22" y1="8" x2="40" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
          </defs>
          <ellipse cx="22" cy="40.5" rx="15" ry="2.8" fill="#0F172A" fillOpacity="0.12" />
          {/* 3D Stacked Bricks */}
          <rect x="7" y="29" width="15" height="8" rx="1.8" fill={u('brick')} stroke="#E2E8F0" strokeWidth="1" />
          <rect x="23" y="29" width="15" height="8" rx="1.8" fill="#C2410C" stroke="#E2E8F0" strokeWidth="1" />
          <rect x="13" y="20" width="17" height="8.5" rx="1.8" fill="#F97316" stroke="#E2E8F0" strokeWidth="1" />
          <path d="M14.5 21.5H28.5" stroke="#FED7AA" strokeWidth="1.2" strokeLinecap="round" />
          {/* 3D Pointed Masonry Trowel */}
          <path d="M29 10L41 13L33 24L25 18L29 10Z" fill={u('trowel')} />
          <path d="M35 19L39 23.5" stroke="#92400E" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );

    case 'civil-engineers':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('bp')} x1="7" y1="10" x2="41" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <linearGradient id={g('gold')} x1="16" y1="9" x2="32" y2="35" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40" rx="15" ry="2.8" fill="#0F172A" fillOpacity="0.12" />
          {/* 3D Blueprint Slab */}
          <rect x="7" y="13" width="34" height="24" rx="4" fill={u('bp')} />
          <path d="M11 20H37M11 26H37M17 16V34M25 16V34" stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.35" />
          {/* 3D Golden Engineering Compass */}
          <path d="M24 11L15 34M24 11L33 34" stroke={u('gold')} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M18.5 25.5H29.5" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="24" cy="11.5" r="3" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.2" />
        </svg>
      );

    case 'architects':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('roof')} x1="10" y1="10" x2="38" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <linearGradient id={g('glass')} x1="24" y1="18" x2="38" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40" rx="16" ry="2.8" fill="#0F172A" fillOpacity="0.12" />
          {/* 3D Modern Stepped Architectural Pavilion */}
          <polygon points="8,24 23,13 38,21 23,31" fill={u('roof')} />
          <polygon points="8,24 23,31 23,38 8,31" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="0.8" />
          <polygon points="23,31 38,21 38,31 23,38" fill={u('glass')} />
          {/* Warm architectural accent */}
          <polygon points="12,27 19,30.5 19,35 12,31.5" fill="#F59E0B" />
          {/* Drafting scale corner */}
          <path d="M9 14L19 9L21 12L11 17Z" fill="#EA580C" />
        </svg>
      );

    case 'interior-designers':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('sofa')} x1="10" y1="14" x2="38" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="55%" stopColor="#C2410C" />
              <stop offset="100%" stopColor="#7C2D12" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40" rx="14" ry="2.6" fill="#0F172A" fillOpacity="0.12" />
          {/* Warm pendant glow */}
          <circle cx="34" cy="12" r="4.5" fill="#FDE047" fillOpacity="0.35" />
          <path d="M34 6V9M30.5 12H37.5L36 9H32L30.5 12Z" fill="#0F172A" />
          {/* 3D Sculpted Accent Armchair */}
          <rect x="12" y="13" width="24" height="14" rx="5" fill={u('sofa')} />
          <rect x="9" y="21" width="6.5" height="12" rx="3.2" fill="#9A3412" />
          <rect x="32.5" y="21" width="6.5" height="12" rx="3.2" fill="#9A3412" />
          <rect x="14" y="24" width="20" height="8" rx="3" fill="#FDBA74" />
          <rect x="14" y="28" width="20" height="5" rx="2" fill="#7C2D12" />
          {/* Walnut legs */}
          <path d="M13 33L11.5 38.5M35 33L36.5 38.5" stroke="#451A03" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );

    case 'tile-fitters':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('tileA')} x1="8" y1="12" x2="36" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id={g('tileB')} x1="14" y1="20" x2="40" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40.5" rx="15" ry="2.6" fill="#0F172A" fillOpacity="0.12" />
          {/* Lower Isometric Tile */}
          <polygon points="9,28 24,20 39,28 24,36" fill={u('tileB')} stroke="#64748B" strokeWidth="0.8" />
          <polygon points="9,28 24,36 24,39.5 9,31.5" fill="#94A3B8" />
          <polygon points="24,36 39,28 39,31.5 24,39.5" fill="#64748B" />
          {/* Upper Gloss Ceramic Tile */}
          <polygon points="10,17 24,9.5 38,17 24,24.5" fill={u('tileA')} />
          <polygon points="10,17 24,24.5 24,28 10,20.5" fill="#075985" />
          <polygon points="24,24.5 38,17 38,20.5 24,28" fill="#0284C7" />
          {/* Gloss reflection streak */}
          <path d="M16 16.5L26 11.8" stroke="#E0F2FE" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
        </svg>
      );

    case 'welders':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('mask')} x1="10" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="55%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40" rx="13" ry="2.8" fill="#0F172A" fillOpacity="0.14" />
          {/* 3D Gunmetal Welding Helmet */}
          <path d="M11 15C11 10.6 16.8 8 24 8C31.2 8 37 10.6 37 15V29C37 34.5 31.2 38 24 38C16.8 38 11 34.5 11 29V15Z" fill={u('mask')} />
          {/* Emerald/Cobalt Tinted Visor Lens */}
          <rect x="14.5" y="16" width="19" height="8" rx="2.5" fill="#064E3B" stroke="#94A3B8" strokeWidth="1.2" />
          <path d="M17 18.5H27" stroke="#34D399" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.65" />
          {/* Electric Arc Spark */}
          <circle cx="35.5" cy="31.5" r="5" fill="#FDE047" fillOpacity="0.35" />
          <path d="M35.5 25V38M29 31.5H42M31 27L40 36M40 27L31 36" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="35.5" cy="31.5" r="2.2" fill="#FEF08A" />
        </svg>
      );

    case 'ac-technicians':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('ac')} x1="7" y1="11" x2="41" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40" rx="14" ry="2.5" fill="#0284C7" fillOpacity="0.12" />
          {/* 3D Split AC Unit */}
          <rect x="6" y="10" width="36" height="15" rx="4" fill={u('ac')} stroke="#94A3B8" strokeWidth="1" />
          <rect x="9" y="19.5" width="30" height="3.2" rx="1.5" fill="#0F172A" />
          <circle cx="36.5" cy="14.5" r="1.5" fill="#10B981" />
          <rect x="10" y="14" width="14" height="1.5" rx="0.75" fill="#94A3B8" />
          {/* 3D Cool Breeze Ribbons */}
          <path d="M13 28C13 31.5 16 33.5 14 37.5" stroke="#0EA5E9" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 28C24 31.5 27 33.5 25 37.5" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M35 28C35 31.5 38 33.5 36 37.5" stroke="#0284C7" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );

    case 'labourers':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('tray')} x1="12" y1="12" x2="36" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
          </defs>
          <ellipse cx="25" cy="40.5" rx="14" ry="2.5" fill="#0F172A" fillOpacity="0.12" />
          {/* 3D Heavy Construction Wheelbarrow */}
          <path d="M12 16H36L31.5 28H16.5L12 16Z" fill={u('tray')} />
          <path d="M10 15.5H37.5" stroke="#7C2D12" strokeWidth="2.2" strokeLinecap="round" />
          {/* Steel Frame */}
          <path d="M7 15.5H12.5M18 28L16 36M29 28L33.5 33" stroke="#334155" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* 3D Rubber Wheel */}
          <circle cx="35.5" cy="34.5" r="5.5" fill="#0F172A" />
          <circle cx="35.5" cy="34.5" r="2.2" fill="#CBD5E1" />
        </svg>
      );

    case 'waterproofing-specialists':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('shield')} x1="10" y1="8" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="41" rx="12" ry="2.4" fill="#0F172A" fillOpacity="0.12" />
          {/* 3D Waterproof Shield */}
          <path d="M24 7L39 13V24C39 32.5 32.2 38.2 24 41C15.8 38.2 9 32.5 9 24V13L24 7Z" fill={u('shield')} />
          <path d="M24 9.5L36.5 14.5V24C36.5 31 30.8 35.8 24 38.2V9.5Z" fill="#FFFFFF" fillOpacity="0.12" />
          {/* Crisp Water Droplet Emblem */}
          <path d="M24 15.5C24 15.5 29.5 22.2 29.5 25.8C29.5 28.9 27 31.2 24 31.2C21 31.2 18.5 28.9 18.5 25.8C18.5 22.2 24 15.5 24 15.5Z" fill="#E0F2FE" />
          <path d="M21.8 24.5C21.5 26 22 27.6 23.3 28.4" stroke="#0284C7" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'modular-kitchen-specialists':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('cab')} x1="9" y1="18" x2="39" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40.5" rx="15" ry="2.5" fill="#0F172A" fillOpacity="0.12" />
          {/* Faucet */}
          <path d="M24 17V12.5C24 11.1 25.1 10 26.5 10C27.9 10 29 11.1 29 12.5" stroke="#64748B" strokeWidth="2.4" strokeLinecap="round" />
          {/* Marble Countertop */}
          <rect x="7" y="17" width="34" height="4.5" rx="1.5" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="0.9" />
          {/* 3D Modular Base Cabinets */}
          <rect x="9" y="21.5" width="30" height="16" rx="2.5" fill={u('cab')} />
          <path d="M24 21.5V37.5M9 28.5H24" stroke="#A7F3D0" strokeWidth="1.2" strokeOpacity="0.6" />
          {/* Chrome handles */}
          <rect x="14" y="24.5" width="5" height="1.5" rx="0.75" fill="#FFFFFF" />
          <rect x="14" y="32" width="5" height="1.5" rx="0.75" fill="#FFFFFF" />
          <rect x="27" y="26.5" width="1.6" height="5.5" rx="0.8" fill="#FFFFFF" />
        </svg>
      );

    case 'house-cleaning':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('bottle')} x1="12" y1="16" x2="30" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <ellipse cx="22" cy="40.5" rx="12" ry="2.5" fill="#0F172A" fillOpacity="0.12" />
          {/* Trigger & nozzle */}
          <path d="M18 10H28L30 14H25V17H18V10Z" fill="#0F172A" />
          <path d="M14 13.5H18" stroke="#EA580C" strokeWidth="3" strokeLinecap="round" />
          {/* 3D Translucent Bottle */}
          <path d="M15 21C15 18.8 16.8 17 19 17H24C26.2 17 28 18.8 28 21L30 35.5C30.2 37.3 28.8 39 27 39H16C14.2 39 12.8 37.3 13 35.5L15 21Z" fill={u('bottle')} />
          <path d="M16.5 23L15.5 34" stroke="#E0F2FE" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.75" />
          {/* 3D Sparkle Stars */}
          <path d="M36 14L37.4 17.6L41 19L37.4 20.4L36 24L34.6 20.4L31 19L34.6 17.6L36 14Z" fill="#F59E0B" />
          <path d="M35 28L35.9 30.1L38 31L35.9 31.9L35 34L34.1 31.9L32 31L34.1 30.1L35 28Z" fill="#38BDF8" />
        </svg>
      );

    case 'pest-control':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('ecoShield')} x1="9" y1="8" x2="39" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#065F46" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40.5" rx="12" ry="2.4" fill="#0F172A" fillOpacity="0.12" />
          {/* 3D Emerald Hexagon Shield */}
          <path d="M24 7L39 14.5V27.5C39 34 32 38.5 24 41C16 38.5 9 34 9 27.5V14.5L24 7Z" fill={u('ecoShield')} />
          <path d="M16.5 24.5L21.5 29.5L32 18.5" stroke="#ECFDF5" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'gardeners':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('pot')} x1="14" y1="24" x2="34" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#9A3412" />
            </linearGradient>
            <linearGradient id={g('leaf')} x1="16" y1="8" x2="34" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40.5" rx="11" ry="2.3" fill="#0F172A" fillOpacity="0.12" />
          {/* 3D Botanical Leaves */}
          <path d="M24 25V15" stroke="#047857" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 20C24 13 30 9 36 10C36 16 31 20 24 20Z" fill={u('leaf')} />
          <path d="M24 21C24 14.5 18 11 12 12C12 18 17 21 24 21Z" fill="#10B981" />
          {/* 3D Terracotta Clay Pot */}
          <polygon points="14.5,27 33.5,27 30.5,39 17.5,39" fill={u('pot')} />
          <rect x="13" y="23.5" width="22" height="4.5" rx="1.8" fill="#F97316" />
        </svg>
      );

    case 'movers-and-packers':
    default:
      return (
        <svg viewBox="0 0 48 48" fill="none" className={svgClass} aria-hidden="true">
          <defs>
            <linearGradient id={g('boxTop')} x1="10" y1="8" x2="38" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id={g('boxLeft')} x1="9" y1="18" x2="24" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
            <linearGradient id={g('boxRight')} x1="24" y1="18" x2="39" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="40.5" rx="15" ry="2.6" fill="#0F172A" fillOpacity="0.13" />
          {/* 3D Isometric Packing Carton */}
          <polygon points="24,8.5 39,16.5 24,24.5 9,16.5" fill={u('boxTop')} />
          <polygon points="9,16.5 24,24.5 24,39 9,31" fill={u('boxLeft')} />
          <polygon points="24,24.5 39,16.5 39,31 24,39" fill={u('boxRight')} />
          {/* Packaging tape ribbon */}
          <polygon points="20.5,10.3 27.5,14 23.5,16.2 16.5,12.5" fill="#FFFBEB" fillOpacity="0.8" />
          <polygon points="29,21.8 34,19.1 34,26 29,28.7" fill="#0F172A" fillOpacity="0.2" />
        </svg>
      );
  }
}

export function TradeIcon({
  slug,
  iconName,
  className = '',
  size = 'md',
  variant = 'badge',
}: TradeIconProps) {
  const uid = useId().replace(/:/g, '');
  const key = resolveTradeKey(slug, iconName);

  if (variant === 'inline') {
    const inlineDims = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
    return renderTrade3DSvg(key, uid, `shrink-0 ${inlineDims} ${className}`);
  }

  const boxDims =
    size === 'sm'
      ? 'h-9 w-9 rounded-lg p-1'
      : size === 'lg'
        ? 'h-12 w-12 rounded-xl p-1.5'
        : 'h-11 w-11 rounded-xl p-1';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100/70 shadow-sm ${boxDims} ${className}`}
      aria-hidden="true"
    >
      {renderTrade3DSvg(key, uid, 'h-full w-full drop-shadow-sm')}
    </span>
  );
}
