export const TRADE_IMAGE_MAP: Record<string, string> = {
  carpenters: '/uploads/seed/trades/carpenters.jpg',
  'thekedars-contractors': '/uploads/seed/trades/thekedars-contractors.jpg',
  painters: '/uploads/seed/trades/painters.jpg',
  electricians: '/uploads/seed/trades/electricians.jpg',
  plumbers: '/uploads/seed/trades/plumbers.jpg',
  masons: '/uploads/seed/trades/masons.jpg',
  'civil-engineers': '/uploads/seed/trades/civil-engineers.jpg',
  architects: '/uploads/seed/trades/architects.jpg',
  'interior-designers': '/uploads/seed/trades/interior-designers.jpg',
  'tile-fitters': '/uploads/seed/trades/tile-fitters.jpg',
  welders: '/uploads/seed/trades/welders.jpg',
  'ac-technicians': '/uploads/seed/trades/ac-technicians.jpg',
  labourers: '/uploads/seed/trades/labourers.jpg',
  'waterproofing-specialists': '/uploads/seed/trades/waterproofing-specialists.jpg',
  'modular-kitchen-specialists': '/uploads/seed/trades/modular-kitchen-specialists.jpg',
  'house-cleaning': '/uploads/seed/trades/house-cleaning.jpg',
  'pest-control': '/uploads/seed/trades/pest-control.jpg',
  gardeners: '/uploads/seed/trades/gardeners.jpg',
  'movers-and-packers': '/uploads/seed/trades/movers-and-packers.jpg',
};

export function getTradeImageUrl(slug?: string | null): string {
  if (slug && TRADE_IMAGE_MAP[slug]) {
    return TRADE_IMAGE_MAP[slug];
  }
  return '/uploads/seed/work-construction.jpg';
}
