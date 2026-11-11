import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Heart, MapPin, ShieldCheck } from 'lucide-react';
import type { Property } from '../../types';
import { formatLabel, formatPropertyPrice } from '../../lib/format';
import { useCompare } from '../../lib/compareContext';
import { useAuth } from '../../lib/authContext';
import { useToast } from '../../lib/toastContext';
import { api } from '../../lib/api';

interface PropertyCardProps {
  property: Property;
  onToggleSave?: (id: number, saved: boolean) => void;
}

export function PropertyCard({ property, onToggleSave }: PropertyCardProps) {
  const { user } = useAuth();
  const { toggleCompare, isInCompare } = useCompare();
  const toast = useToast();
  const navigate = useNavigate();

  const rawUrl = property.images[0]?.url;
  const primaryImg = rawUrl && !rawUrl.endsWith('.svg') ? rawUrl : '/uploads/seed/prop-pune-apt.jpg';
  const comparing = isInCompare(property.id);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info('Please sign in to save properties to your shortlist.');
      navigate('/login');
      return;
    }
    try {
      const res = await api.post<{ saved: boolean }>(`/api/properties/${property.id}/save`);
      onToggleSave?.(property.id, res.saved);
      toast.success(res.saved ? 'Property saved to your shortlist.' : 'Removed from saved properties.');
    } catch (err: any) {
      toast.error(err.message || 'Could not update saved property.');
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(property);
    toast.info(comparing ? 'Removed from comparison tray.' : 'Added to comparison tray.');
  };

  const pricePerSqft =
    property.areaSqft > 0 && property.listingPurpose === 'buy'
      ? Math.round(property.price / property.areaSqft).toLocaleString('en-IN')
      : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition duration-150 hover:border-slate-300 hover:shadow-card">
      <Link
        to={`/properties/${property.id}`}
        className="relative block aspect-[16/10] overflow-hidden bg-slate-100"
      >
        <img
          src={primaryImg}
          alt={property.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />

        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          <button
            type="button"
            onClick={handleCompare}
            className={`rounded-md border p-1.5 transition ${
              comparing
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-200/80 bg-white/95 text-slate-700 hover:border-slate-300 hover:text-navy-900'
            }`}
            title={comparing ? 'Remove from Compare' : 'Compare Property'}
            aria-label="Compare property"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`rounded-md border p-1.5 transition ${
              property.isSaved
                ? 'border-rose-600 bg-rose-600 text-white'
                : 'border-slate-200/80 bg-white/95 text-slate-700 hover:border-slate-300 hover:text-rose-600'
            }`}
            title={property.isSaved ? 'Saved' : 'Save Property'}
            aria-label="Save property"
          >
            <Heart className={`h-3.5 w-3.5 ${property.isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
          <span>
            <span className="font-semibold text-navy-900">
              {property.listingPurpose === 'buy' ? 'For Sale' : 'For Rent'}
            </span>
            {' · '}
            {formatLabel(property.propertyType)}
            {property.isFeatured ? ' · Featured' : ''}
          </span>
          {property.reraId && (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <ShieldCheck className="h-3 w-3" />
              RERA
            </span>
          )}
        </div>

        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <p className="text-lg font-extrabold text-navy-900 tabular-price">
            {formatPropertyPrice(property.price, property.listingPurpose)}
          </p>
          {pricePerSqft && (
            <span className="text-[11px] text-slate-500 tabular-price">₹{pricePerSqft}/sq.ft</span>
          )}
        </div>

        <Link
          to={`/properties/${property.id}`}
          className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 transition group-hover:text-brand-600"
        >
          {property.title}
        </Link>

        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">
            {property.locality}, {property.city}, {property.state}
          </span>
        </p>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
            <span className="tabular-price">
              {property.bedrooms > 0 ? `${property.bedrooms} BHK · ` : ''}
              {property.bathrooms > 0 ? `${property.bathrooms} Bath · ` : ''}
              {property.areaSqft.toLocaleString('en-IN')} sq.ft
            </span>
            <span className="text-[11px] text-slate-500">{formatLabel(property.furnishing)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
