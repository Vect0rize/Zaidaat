import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { TradeIcon } from '../components/common/TradeIcon';
import type { ProfessionalCategory, ProfessionalProfile } from '../types';
import { LocationSelector } from '../components/common/LocationSelector';
import { ProfessionalCard } from '../components/professional/ProfessionalCard';
import { EmptyState } from '../components/common/EmptyState';
import { ProfessionalCardSkeleton } from '../components/common/Skeleton';
import { usePageMeta } from '../lib/seo';

export function ProfessionalsPage() {
  usePageMeta({
    title: 'Hire Verified Contractors, Architects & Build Traders — ZAIDAAT',
    description:
      'Compare KYC-verified construction contractors, architects, electricians, plumbers, and interior specialists across India.',
    canonicalPath: '/professionals',
  });
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<ProfessionalCategory[]>([]);
  const [pros, setPros] = useState<ProfessionalProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [categorySlug, setCategorySlug] = useState(searchParams.get('category') || '');
  const [stateVal, setStateVal] = useState(searchParams.get('state') || '');
  const [cityVal, setCityVal] = useState(searchParams.get('city') || '');
  const [localityVal, setLocalityVal] = useState(searchParams.get('locality') || '');
  const [availability, setAvailability] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState('rating');

  useEffect(() => {
    setCategorySlug(searchParams.get('category') || '');
    setStateVal(searchParams.get('state') || '');
    setCityVal(searchParams.get('city') || '');
    setLocalityVal(searchParams.get('locality') || '');
    setQ(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    api
      .get<{ categories: ProfessionalCategory[] }>('/api/professionals/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  const fetchPros = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (stateVal) params.set('state', stateVal);
    if (cityVal) params.set('city', cityVal);
    if (localityVal) params.set('locality', localityVal);
    if (availability) params.set('availability', availability);
    if (minExperience) params.set('minExperience', minExperience);
    if (minRating) params.set('minRating', minRating);
    if (maxRate) params.set('maxRate', maxRate);
    if (verifiedOnly) params.set('verifiedOnly', 'true');
    if (q.trim()) params.set('q', q.trim());
    if (sort) params.set('sort', sort);

    try {
      const res = await api.get<{ total: number; professionals: ProfessionalProfile[] }>(
        `/api/professionals?${params.toString()}`
      );
      setPros(res.professionals);
      setTotal(res.total);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load professionals directory right now.');
    } finally {
      setLoading(false);
    }
  }, [categorySlug, stateVal, cityVal, localityVal, availability, minExperience, minRating, maxRate, verifiedOnly, q, sort]);

  useEffect(() => {
    fetchPros();
  }, [fetchPros]);

  const resetFilters = () => {
    setCategorySlug('');
    setStateVal('');
    setCityVal('');
    setLocalityVal('');
    setAvailability('');
    setMinExperience('');
    setMinRating('');
    setMaxRate('');
    setVerifiedOnly(false);
    setQ('');
    setSort('rating');
    setSearchParams({});
  };

  const nearbyCity = user?.defaultCity || 'Pune';
  const isNearbyActive = cityVal.toLowerCase() === nearbyCity.toLowerCase();

  const facetControls = (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Directory Filters
        </span>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-brand-600"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Quick Toggles */}
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
            Verified Profiles Only
          </span>
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
        </label>

        <button
          type="button"
          onClick={() => setCityVal(isNearbyActive ? '' : nearbyCity)}
          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs font-semibold transition ${
            isNearbyActive
              ? 'border-brand-600 bg-brand-50 text-brand-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brand-600" />
            Near {nearbyCity}
          </span>
          <span>{isNearbyActive ? 'On' : 'Off'}</span>
        </button>

        <button
          type="button"
          onClick={() => setMinRating(minRating === '4.5' ? '' : '4.5')}
          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-xs font-semibold transition ${
            minRating === '4.5'
              ? 'border-amber-400 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Top Rated (4.5+)
          </span>
          <span>{minRating === '4.5' ? 'On' : 'Off'}</span>
        </button>
      </div>

      {/* Trade Category Select + Quick List */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Trade Category</label>
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="input-field text-xs"
          aria-label="Trade Category"
        >
          <option value="">All {categories.length || 19} Trades</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name} ({cat.pro_count || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Service Location</label>
        <LocationSelector
          stacked
          stateValue={stateVal}
          cityValue={cityVal}
          localityValue={localityVal}
          onChange={({ state, city, locality }) => {
            setStateVal(state);
            setCityVal(city);
            setLocalityVal(locality);
          }}
        />
      </div>

      {/* Availability & Experience */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Availability</label>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="input-field text-xs"
            aria-label="Availability"
          >
            <option value="">Any Availability</option>
            <option value="available">Available Now</option>
            <option value="busy">Busy (Upcoming Slots)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Minimum Experience</label>
          <select
            value={minExperience}
            onChange={(e) => setMinExperience(e.target.value)}
            className="input-field text-xs"
            aria-label="Experience"
          >
            <option value="">Any Experience</option>
            <option value="3">3+ Years</option>
            <option value="5">5+ Years</option>
            <option value="10">10+ Years</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Max Starting Rate (INR)</label>
          <input
            type="number"
            value={maxRate}
            onChange={(e) => setMaxRate(e.target.value)}
            placeholder="e.g. 2500"
            className="input-field text-xs"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Directory Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Find Trade Professionals &amp; Contractors
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Compare verified experience, service areas, transparent pricing models, and client reviews before hiring.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/post-job" className="btn-primary px-4 py-2 text-xs">
            Post Work Requirement
          </Link>
          <Link to="/become-professional" className="btn-secondary px-4 py-2 text-xs">
            Register Trade Profile
          </Link>
        </div>
      </div>

      {/* Main Facet Sidebar + Results Directory Layout */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Desktop Facet Rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-lg border border-slate-200 bg-white p-4">
            {facetControls}
          </div>
        </aside>

        {/* Directory Main Column */}
        <div className="min-w-0">
          {/* Top Search + Mobile Filter Trigger + Sort Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search specialist name or skill (e.g. modular kitchen, RCC)..."
                className="input-field pl-9"
                aria-label="Search professionals"
              />
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
              className="btn-secondary px-3 py-2.5 text-xs lg:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-field w-48 py-2.5 text-xs"
              aria-label="Sort professionals"
            >
              <option value="rating">Top Rated &amp; Verified</option>
              <option value="experience">Most Experienced</option>
              <option value="jobs">Most Completed Jobs</option>
              <option value="rate_asc">Lowest Starting Rate</option>
            </select>
          </div>

          {mobileFiltersOpen && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 lg:hidden">
              {facetControls}
            </div>
          )}

          {(() => {
            const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : null;
            if (!activeCategory) return null;
            return (
              <div className="mt-4 flex items-center gap-3.5 rounded-lg border border-slate-200 bg-white p-3.5">
                <TradeIcon slug={activeCategory.slug} iconName={activeCategory.icon_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {activeCategory.group_name}
                  </p>
                  <p className="text-sm font-bold text-navy-900">{activeCategory.name}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{activeCategory.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCategorySlug('')}
                  className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
                >
                  Clear
                </button>
              </div>
            );
          })()}

          <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
            <p className="tabular-price font-medium">
              Showing <span className="font-bold text-navy-900">{pros.length}</span> of {total} specialists
            </p>
          </div>

          {/* Results Grid */}
          <div className="mt-4">
            {loadError && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <span>{loadError}</span>
                <button type="button" onClick={fetchPros} className="btn-secondary px-3 py-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <ProfessionalCardSkeleton key={n} />
                ))}
              </div>
            ) : pros.length === 0 ? (
              <EmptyState
                title="No professionals match your filters"
                description="Try selecting a broader city or trade category, or post your work requirement so verified partners across your state can quote."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={resetFilters} className="btn-secondary">
                      Clear Filters
                    </button>
                    <Link to="/post-job" className="btn-primary">
                      Post Work Requirement
                    </Link>
                  </div>
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {pros.map((pro) => (
                  <ProfessionalCard key={pro.id} pro={pro} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
