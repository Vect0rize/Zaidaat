import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlusCircle, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api';
import type { Property } from '../types';
import { LocationSelector } from '../components/common/LocationSelector';
import { PropertyCard } from '../components/property/PropertyCard';
import { EmptyState } from '../components/common/EmptyState';
import { PropertyCardSkeleton } from '../components/common/Skeleton';
import { usePageMeta } from '../lib/seo';

interface PropertiesPageProps {
  fixedPurpose?: 'buy' | 'rent';
}

export function PropertiesPage({ fixedPurpose }: PropertiesPageProps) {
  usePageMeta({
    title:
      fixedPurpose === 'buy'
        ? 'Buy Residential & Commercial Properties in India — ZAIDAAT'
        : fixedPurpose === 'rent'
        ? 'Rent Flats, Houses & Office Spaces in India — ZAIDAAT'
        : 'All-India Property Catalog — Buy & Rent on ZAIDAAT',
    description:
      'Filter residential flats, plots, Nali/Bigha land, villas, and commercial listings across all 28 States and 8 Union Territories.',
    canonicalPath: fixedPurpose === 'buy' ? '/buy' : fixedPurpose === 'rent' ? '/rent' : '/properties',
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [purpose, setPurpose] = useState<string>(fixedPurpose || searchParams.get('purpose') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [stateVal, setStateVal] = useState(searchParams.get('state') || '');
  const [cityVal, setCityVal] = useState(searchParams.get('city') || '');
  const [localityVal, setLocalityVal] = useState(searchParams.get('locality') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');
  const [furnishing, setFurnishing] = useState(searchParams.get('furnishing') || '');
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  useEffect(() => {
    setPurpose(fixedPurpose || searchParams.get('purpose') || '');
    setCategory(searchParams.get('category') || '');
    setType(searchParams.get('type') || '');
    setStateVal(searchParams.get('state') || '');
    setCityVal(searchParams.get('city') || '');
    setLocalityVal(searchParams.get('locality') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setBedrooms(searchParams.get('bedrooms') || '');
    setFurnishing(searchParams.get('furnishing') || '');
    setQ(searchParams.get('q') || '');
    setSort(searchParams.get('sort') || 'newest');
  }, [fixedPurpose, searchParams]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const params = new URLSearchParams();
    if (purpose) params.set('purpose', purpose);
    if (category) params.set('category', category);
    if (type) params.set('type', type);
    if (stateVal) params.set('state', stateVal);
    if (cityVal) params.set('city', cityVal);
    if (localityVal) params.set('locality', localityVal);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (bedrooms) params.set('bedrooms', bedrooms);
    if (furnishing) params.set('furnishing', furnishing);
    if (q.trim()) params.set('q', q.trim());
    if (sort) params.set('sort', sort);

    try {
      const res = await api.get<{ total: number; properties: Property[] }>(
        `/api/properties?${params.toString()}`
      );
      setProperties(res.properties);
      setTotal(res.total);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load properties right now.');
    } finally {
      setLoading(false);
    }
  }, [purpose, category, type, stateVal, cityVal, localityVal, minPrice, maxPrice, bedrooms, furnishing, q, sort]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const resetFilters = () => {
    if (!fixedPurpose) setPurpose('');
    setCategory('');
    setType('');
    setStateVal('');
    setCityVal('');
    setLocalityVal('');
    setMinPrice('');
    setMaxPrice('');
    setBedrooms('');
    setFurnishing('');
    setQ('');
    setSort('newest');
    setSearchParams({});
  };

  const pageHeading =
    purpose === 'buy'
      ? 'Properties for Sale'
      : purpose === 'rent'
      ? 'Homes & Spaces for Rent'
      : 'All-India Property Catalog';

  const typeTabs = [
    { val: '', label: 'All Types' },
    { val: 'apartment', label: 'Apartments' },
    { val: 'villa', label: 'Villas' },
    { val: 'independent_house', label: 'Independent Houses' },
    { val: 'plot', label: 'Plots & Land' },
    { val: 'shop', label: 'Commercial Shops' },
    { val: 'office', label: 'Offices' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Real Estate Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{pageHeading}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Filter verified residential, plot, and commercial listings across India by city, locality, and RERA details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
            <Link
              to="/properties"
              className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                !purpose ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </Link>
            <Link
              to="/buy"
              className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                purpose === 'buy' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Buy
            </Link>
            <Link
              to="/rent"
              className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                purpose === 'rent' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rent
            </Link>
          </div>
          <Link to="/sell" className="btn-primary px-4 py-2 text-xs">
            <PlusCircle className="h-3.5 w-3.5" />
            Post Property
          </Link>
        </div>
      </div>

      {/* Type Segmented Bar */}
      <div className="mt-6 flex gap-6 overflow-x-auto border-b border-slate-200 text-xs font-semibold">
        {typeTabs.map((tab) => (
          <button
            key={tab.val}
            type="button"
            onClick={() => setType(tab.val)}
            className={`shrink-0 border-b-2 pb-2.5 transition ${
              type === tab.val
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Real Estate Specification Search Toolbar */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search project, locality, landmark..."
              className="input-field pl-9"
              aria-label="Search properties"
            />
          </div>

          <div className="md:col-span-5">
            <LocationSelector
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

          <div className="flex items-center gap-2 md:col-span-3">
            <button
              type="button"
              onClick={() => setShowMoreFilters((v) => !v)}
              aria-expanded={showMoreFilters}
              className="btn-secondary flex-1 py-2.5 text-xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showMoreFilters ? 'Fewer Filters' : 'More Filters'}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="btn-secondary px-3 py-2.5 text-xs text-slate-500"
              title="Reset all filters"
              aria-label="Reset filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {showMoreFilters && (
          <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3 lg:grid-cols-6">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" aria-label="Property Category">
              <option value="">All Categories</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>

            <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="input-field" aria-label="Bedrooms">
              <option value="">Any BHK</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4+ BHK</option>
            </select>

            <select value={furnishing} onChange={(e) => setFurnishing(e.target.value)} className="input-field" aria-label="Furnishing">
              <option value="">Any Furnishing</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi_furnished">Semi Furnished</option>
              <option value="fully_furnished">Fully Furnished</option>
            </select>

            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={purpose === 'rent' ? 'Min Rent (INR/mo)' : 'Min Budget (INR)'}
              aria-label={purpose === 'rent' ? 'Minimum monthly rent INR' : 'Minimum budget INR'}
              className="input-field"
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={purpose === 'rent' ? 'Max Rent (INR/mo)' : 'Max Budget (INR)'}
              aria-label={purpose === 'rent' ? 'Maximum monthly rent INR' : 'Maximum budget INR'}
              className="input-field"
            />
            <select value={type} onChange={(e) => setType(e.target.value)} className="input-field" aria-label="Property Type">
              <option value="">All Property Types</option>
              <option value="apartment">Apartment / Flat</option>
              <option value="villa">Villa</option>
              <option value="independent_house">Independent House</option>
              <option value="plot">Residential Plot</option>
              <option value="land">Land / Agricultural</option>
              <option value="shop">Commercial Shop</option>
              <option value="office">Office Space</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>
        )}
      </div>

      {/* Result Count & Sort Strip */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="tabular-price text-xs font-medium text-slate-600">
          Showing <span className="font-bold text-navy-900">{properties.length}</span> of {total} properties
        </p>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input-field w-48 py-1.5 text-xs"
          aria-label="Sort results"
        >
          <option value="newest">Sort: Featured &amp; Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="area_desc">Largest Area First</option>
          <option value="views">Most Viewed</option>
        </select>
      </div>

      {/* Results Grid */}
      <div className="mt-5">
        {loadError && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <span>{loadError}</span>
            <button type="button" onClick={fetchProperties} className="btn-secondary px-3 py-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <PropertyCardSkeleton key={n} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <EmptyState
            title="No properties match your current filters"
            description="Try expanding your city, locality, or budget range, or post a new property directly."
            action={
              <button type="button" onClick={resetFilters} className="btn-primary">
                Reset All Filters
              </button>
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                onToggleSave={(id, saved) =>
                  setProperties((prev) => prev.map((item) => (item.id === id ? { ...item, isSaved: saved } : item)))
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
