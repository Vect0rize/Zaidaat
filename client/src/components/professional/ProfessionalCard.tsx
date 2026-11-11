import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, MapPin, Star } from 'lucide-react';
import type { ProfessionalProfile } from '../../types';
import { formatINR } from '../../lib/format';
import { getTradeImageUrl } from '../../lib/tradeMedia';
import { Avatar } from '../common/Avatar';
import { TradeIcon } from '../common/TradeIcon';

const AVAIL_META: Record<string, { dot: string; label: string; text: string }> = {
  available: { dot: 'bg-emerald-500', label: 'Available', text: 'text-emerald-700' },
  busy: { dot: 'bg-amber-500', label: 'Busy', text: 'text-amber-700' },
  unavailable: { dot: 'bg-slate-400', label: 'Unavailable', text: 'text-slate-500' },
};

export function ProfessionalCard({ pro }: { pro: ProfessionalProfile }) {
  const avail = AVAIL_META[pro.availabilityStatus] || AVAIL_META.available;
  const previews = (pro.portfolioPreview || []).filter((p) => p.imageUrl && !p.imageUrl.endsWith('.svg'));

  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-5 transition duration-150 hover:border-slate-300 hover:shadow-card">
      <div className="flex items-start gap-3.5">
        <Avatar name={pro.displayName} src={pro.profilePhotoUrl} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <TradeIcon slug={pro.categorySlug} iconName={pro.categoryIcon} variant="inline" />
              <span>{pro.categoryName}</span>
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${avail.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${avail.dot}`} />
              {avail.label}
            </span>
          </div>

          <Link
            to={`/professionals/${pro.id}`}
            className="mt-1 flex items-center gap-1.5 text-[15px] font-bold text-slate-900 transition hover:text-brand-600"
          >
            <span className="truncate">{pro.displayName}</span>
            {pro.verificationStatus === 'verified' && (
              <span title="Document-Verified Professional" className="shrink-0 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            )}
          </Link>

          <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{pro.headline}</p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1 font-semibold text-slate-900 tabular-price">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {pro.ratingAvg > 0 ? pro.ratingAvg.toFixed(1) : 'New'}
          <span className="font-normal text-slate-400">({pro.reviewCount})</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
          {pro.experienceYears} yrs · {pro.completedJobsCount} completed
        </span>
        <span className="inline-flex items-center gap-1 truncate">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {pro.city}, {pro.state}
        </span>
      </div>

      {pro.skills.length > 0 && (
        <p className="mt-3 line-clamp-1 text-xs text-slate-500">
          {pro.skills.slice(0, 4).join(' · ')}
        </p>
      )}

      {previews.length > 0 ? (
        <div
          className={`mt-3.5 grid gap-1.5 ${
            previews.length === 1 ? 'grid-cols-1' : previews.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}
        >
          {previews.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              to={`/professionals/${pro.id}`}
              className={`group/thumb overflow-hidden rounded border border-slate-200 bg-slate-100 ${
                previews.length === 1 ? 'aspect-[16/9]' : 'aspect-[4/3]'
              }`}
              title={item.title}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover transition duration-200 group-hover/thumb:scale-105"
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      ) : (
        <Link
          to={`/professionals/${pro.id}`}
          className="group/thumb mt-3.5 block aspect-[16/9] overflow-hidden rounded border border-slate-200 bg-slate-100"
          title={`${pro.categoryName} work sample`}
        >
          <img
            src={getTradeImageUrl(pro.categorySlug)}
            alt={`${pro.displayName} — ${pro.categoryName}`}
            className="h-full w-full object-cover transition duration-200 group-hover/thumb:scale-105"
            loading="lazy"
          />
        </Link>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 mt-4">
        <div>
          <p className="text-[11px] text-slate-500">
            <span className="font-bold text-navy-900 tabular-price">
              {formatINR(pro.rateMin)} – {formatINR(pro.rateMax)}
            </span>{' '}
            <span className="text-slate-500">{pro.rateUnitLabel}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/professionals/${pro.id}`} className="btn-secondary px-2.5 py-1.5 text-xs">
            Profile
          </Link>
          <Link to={`/professionals/${pro.id}?hire=1`} className="btn-navy px-3 py-1.5 text-xs">
            Hire
          </Link>
        </div>
      </div>
    </article>
  );
}
