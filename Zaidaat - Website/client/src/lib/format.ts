export function formatINR(amount: number | null | undefined, compact = false): string {
  const val = Number(amount || 0);
  if (compact) {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')} L`;
    }
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

export function formatPropertyPrice(price: number, purpose: 'buy' | 'rent'): string {
  if (purpose === 'rent') {
    return `${formatINR(price)}/mo`;
  }
  return formatINR(price, true);
}

export function formatINRWords(amount: number | string | null | undefined): string {
  const val = Number(amount);
  if (!Number.isFinite(val) || val <= 0) return '';
  if (val >= 10000000) {
    const cr = Number((val / 10000000).toFixed(2));
    return `${cr} Crore`;
  }
  if (val >= 100000) {
    const l = Number((val / 100000).toFixed(2));
    return `${l} Lakh`;
  }
  if (val >= 1000) {
    const k = Number((val / 1000).toFixed(2));
    return `${k} Thousand`;
  }
  return val.toLocaleString('en-IN');
}

export function formatLabel(slug: string | null | undefined): string {
  if (!slug) return '';
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Flexible';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
