import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  FileCheck2,
  Lock,
  MapPin,
  Search,
} from 'lucide-react';
import { api } from '../lib/api';
import { TradeIcon } from '../components/common/TradeIcon';
import type { JobPost, ProfessionalCategory, ProfessionalProfile, Property } from '../types';
import { PropertyCard } from '../components/property/PropertyCard';
import { ProfessionalCard } from '../components/professional/ProfessionalCard';
import { JobCard } from '../components/work/JobCard';
import {
  JobCardSkeleton,
  ProfessionalCardSkeleton,
  PropertyCardSkeleton,
} from '../components/common/Skeleton';

export function HomePage() {
  const navigate = useNavigate();
  const [heroTab, setHeroTab] = useState<'buy' | 'rent' | 'professionals' | 'work'>('buy');
  const [propertyFilterTab, setPropertyFilterTab] = useState<'all' | 'buy' | 'rent'>('all');
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ state: string; city: string; locality: string }>>([]);

  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [categories, setCategories] = useState<ProfessionalCategory[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ properties: Property[] }>('/api/properties?limit=9&sort=newest'),
      api.get<{ professionals: ProfessionalProfile[] }>('/api/professionals?limit=6'),
      api.get<{ categories: ProfessionalCategory[] }>('/api/professionals/categories'),
      api.get<{ jobs: JobPost[] }>('/api/work/jobs?limit=4&status=open'),
    ])
      .then(([pRes, proRes, catRes, jobRes]) => {
        setAllProperties(pRes.properties);
        setProfessionals(proRes.professionals);
        setCategories(catRes.categories);
        setJobs(jobRes.jobs);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchCity.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get<{ suggestions: Array<{ state: string; city: string; locality: string }> }>(
          `/api/locations/suggest?q=${encodeURIComponent(searchCity.trim())}`
        )
        .then((res) => setSuggestions(res.suggestions))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [searchCity]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCity.trim()) params.set('city', searchCity.trim());
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    const qs = params.toString() ? `?${params.toString()}` : '';

    if (heroTab === 'buy') navigate(`/buy${qs}`);
    else if (heroTab === 'rent') navigate(`/rent${qs}`);
    else if (heroTab === 'professionals') navigate(`/professionals${qs}`);
    else navigate(`/find-work${qs}`);
  };

  const handleTogglePropertySave = (id: number, saved: boolean) => {
    setAllProperties((prev) => prev.map((p) => (p.id === id ? { ...p, isSaved: saved } : p)));
  };

  const handleToggleJobSave = (id: number, saved: boolean) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, isSaved: saved } : j)));
  };

  const visibleProperties = (
    propertyFilterTab === 'all'
      ? allProperties
      : allProperties.filter((p) => p.listingPurpose === propertyFilterTab)
  ).slice(0, 6);

  const popularCities = ['Mumbai', 'Bengaluru', 'New Delhi', 'Pune', 'Hyderabad', 'Jaipur', 'Chennai'];

  return (
    <div>
      {/* 1. Architectural Split Hero + Unified Discovery */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="min-w-0 lg:col-span-7">
              <p className="section-kicker">All-India Property &amp; Trade Network</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-[40px] sm:leading-[1.12]">
                Sell, buy or rent property, and hire verified build traders across India.
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                Buy, sell, or rent flats, houses, residential plots, and commercial real estate across India with
                free property listings, or hire verified contractors, architects, and skilled trades with direct
                quotes.
              </p>

              {/* Unified Search Panel */}
              <div className="mt-7 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex flex-wrap gap-1" role="tablist" aria-label="Marketplace search mode">
                    {[
                      { key: 'buy', label: 'Buy' },
                      { key: 'rent', label: 'Rent' },
                      { key: 'professionals', label: 'Find Professionals' },
                      { key: 'work', label: 'Find Work' },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={heroTab === t.key}
                        onClick={() => setHeroTab(t.key as any)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                          heroTab === t.key
                            ? 'bg-navy-900 text-white'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <Link
                      to="/sell"
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-white shadow-sm ring-2 ring-brand-200 transition hover:bg-brand-700"
                    >
                      <span>List Property</span>
                      <span className="rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-navy-950">
                        FREE
                      </span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                    <Link to="/post-job" className="text-navy-900 hover:text-brand-600 hover:underline">
                      Post Work &rarr;
                    </Link>
                  </div>
                </div>

                <form onSubmit={handleHeroSearch} className="mt-3 grid gap-2.5 sm:grid-cols-12">
                  <div className="relative min-w-0 sm:col-span-5">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      placeholder="City or Locality (e.g. Pune)"
                      className="input-field bg-white pl-9"
                      aria-label="City or locality"
                    />
                    {suggestions.length > 0 && (
                      <div className="animate-dropdown-in shadow-elevated absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
                        {suggestions.map((s, idx) => (
                          <button
                            key={`${s.state}-${s.city}-${s.locality}-${idx}`}
                            type="button"
                            onClick={() => {
                              setSearchCity(s.city);
                              setSuggestions([]);
                            }}
                            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs hover:bg-slate-50"
                          >
                            <span className="font-semibold text-slate-900">
                              {s.locality}, {s.city}
                            </span>
                            <span className="text-slate-400">{s.state}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative min-w-0 sm:col-span-5">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        heroTab === 'professionals'
                          ? 'Carpenter, Architect, Thekedar...'
                          : heroTab === 'work'
                          ? 'Modular kitchen, civil work...'
                          : '3 BHK flat, villa, commercial shop...'
                      }
                      className="input-field bg-white pl-9"
                      aria-label="Search query"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button type="submit" className="btn-primary h-full w-full py-2.5">
                      Search
                    </button>
                  </div>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Cities:</span>
                  {popularCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        const targetRoute =
                          heroTab === 'professionals'
                            ? '/professionals'
                            : heroTab === 'work'
                            ? '/find-work'
                            : heroTab === 'rent'
                            ? '/rent'
                            : '/buy';
                        navigate(`${targetRoute}?city=${encodeURIComponent(city)}`);
                      }}
                      className="font-medium text-slate-600 transition hover:text-brand-600 hover:underline"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Architectural Visual Anchor */}
            <div className="min-w-0 lg:col-span-5">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img
                  src="/uploads/seed/prop-mumbai-apt.jpg"
                  alt="Residential apartment residence in Mumbai"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <Link
                  to="/buy?type=villa"
                  className="group overflow-hidden rounded-lg border border-slate-200 bg-white"
                >
                  <img
                    src="/uploads/seed/prop-bengaluru-villa.jpg"
                    alt="Courtyard residential villa in Bengaluru"
                    className="h-24 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-800">Residential Villas</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-600" />
                  </div>
                </Link>
                <Link
                  to="/professionals"
                  className="group overflow-hidden rounded-lg border border-slate-200 bg-white"
                >
                  <img
                    src="/uploads/seed/prop-interior-gallery.jpg"
                    alt="Interior woodworking and modular renovation"
                    className="h-24 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-800">Interiors &amp; Fitout</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-600" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Skilled Trade Directory (Visual Service Catalog) */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Skilled Trade Directory</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              Explore Building, Interior &amp; Maintenance Vendors
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            {categories.length > 12 && (
              <button
                type="button"
                onClick={() => setShowAllTrades((v) => !v)}
                className="text-slate-600 transition hover:text-navy-900 hover:underline"
              >
                {showAllTrades ? 'Show Top 12 Trades' : `Show All ${categories.length} Trades`}
              </button>
            )}
            <Link to="/professionals" className="text-brand-600 hover:underline">
              Browse Directory &rarr;
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {(showAllTrades ? categories : categories.slice(0, 12)).map((cat) => (
            <Link
              key={cat.id}
              to={`/professionals?category=${cat.slug}`}
              className="group flex flex-col rounded-lg border border-slate-200 bg-white p-3.5 transition duration-150 hover:border-slate-300 hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <TradeIcon
                  slug={cat.slug}
                  iconName={cat.icon_name}
                  size="md"
                  className="group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-600"
                />
                <span className="text-[11px] font-medium text-slate-500">
                  {cat.pro_count || 0} listed
                </span>
              </div>
              <h3 className="mt-3 line-clamp-1 text-xs font-semibold text-navy-900 group-hover:text-brand-600">
                {cat.name}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                {cat.group_name}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Property Marketplace Showcase */}
      <section className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Real Estate Catalog</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Properties for Sale &amp; Lease
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                {[
                  { key: 'all', label: 'All Highlighted' },
                  { key: 'buy', label: 'For Sale' },
                  { key: 'rent', label: 'For Rent' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setPropertyFilterTab(tab.key as any)}
                    className={`rounded px-3 py-1 text-xs font-semibold transition ${
                      propertyFilterTab === tab.key
                        ? 'bg-white text-navy-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <Link to="/properties" className="text-xs font-semibold text-brand-600 hover:underline">
                Full Catalog &rarr;
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? [1, 2, 3, 4, 5, 6].map((n) => <PropertyCardSkeleton key={n} />)
              : visibleProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onToggleSave={handleTogglePropertySave}
                  />
                ))}
          </div>
        </div>
      </section>

      {/* 4. Find Professionals Section */}
      <section className="border-t border-slate-200 bg-canvas py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified Specialists
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Contractors, Architects &amp; Skilled Trades
              </h2>
            </div>
            <Link to="/professionals" className="btn-navy px-4 py-2 text-xs">
              Browse Directory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? [1, 2, 3].map((n) => <ProfessionalCardSkeleton key={n} />)
              : professionals.slice(0, 6).map((pro) => <ProfessionalCard key={pro.id} pro={pro} />)}
          </div>
        </div>
      </section>

      {/* 5. Work Marketplace: Tender Board & Client Post Banner */}
      <section className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-slate-200 bg-navy-900 px-6 py-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-400">
                <Briefcase className="h-3.5 w-3.5" />
                Customer Work Desk
              </p>
              <h2 className="mt-1.5 text-xl font-bold text-white">
                Planning renovation, interiors, or civil construction?
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Publish a structured scope of work with budget and site photos to receive itemized quotations.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5 sm:mt-0 sm:shrink-0">
              <Link to="/post-job" className="btn-primary px-4 py-2.5 text-xs">
                Post Work Requirement
              </Link>
              <Link
                to="/become-professional"
                className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                Register Trade Profile
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Work Marketplace</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Open Project Tenders
              </h2>
            </div>
            <Link to="/find-work" className="text-xs font-semibold text-brand-600 hover:underline">
              Browse All Open Tenders &rarr;
            </Link>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((n) => (
                  <JobCardSkeleton key={n} />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    variant="row"
                    onToggleSave={handleToggleJobSave}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. Workflow & Platform Governance */}
      <section className="border-t border-slate-200 bg-canvas py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-5">
              <p className="section-kicker">End-to-End Accountability</p>
              <h2 className="mt-1.5 text-xl font-bold text-slate-900 sm:text-2xl">
                How ZAIDAAT connects property decisions and site execution
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                Every property inquiry, KYC review, itemized work quotation, and post-hire project update
                runs through verified, role-checked platform workflows.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link to="/find-work" className="btn-navy px-4 py-2 text-xs">
                  <Briefcase className="h-3.5 w-3.5" />
                  Browse Work Tenders
                </Link>
                <Link to="/plans" className="btn-secondary px-4 py-2 text-xs">
                  Membership Plans
                </Link>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-7">
              <div className="grid divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y">
                {[
                  {
                    icon: FileCheck2,
                    title: '01 · KYC & Credential Review',
                    desc: 'Trade identity and registration documents stored privately and audited by admins.',
                  },
                  {
                    icon: Building2,
                    title: '02 · Structured Real Estate',
                    desc: 'Clear price per sq.ft, RERA identifiers, and direct owner inquiry routing.',
                  },
                  {
                    icon: CheckCircle2,
                    title: '03 · Itemized Line-Item Quotes',
                    desc: 'Transparent rate and material breakdowns before hiring or initiating work.',
                  },
                  {
                    icon: Lock,
                    title: '04 · Direct Enquiries & Moderation',
                    desc: 'Accept transparent itemized quotes directly with verified account controls and moderation.',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="p-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-navy-900">
                        <Icon className="h-4 w-4 text-emerald-600" />
                        {item.title}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
