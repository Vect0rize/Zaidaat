import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, ImagePlus, Trash2, Upload } from 'lucide-react';
import { api, uploadFiles } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import type { Property } from '../types';
import { formatINRWords } from '../lib/format';
import { LocationSelector } from '../components/common/LocationSelector';
import { usePageMeta } from '../lib/seo';

type AreaUnit =
  | 'sqft'
  | 'sqyd'
  | 'sqm'
  | 'acre'
  | 'hectare'
  | 'are'
  | 'nali'
  | 'mutthi'
  | 'bisi'
  | 'cent'
  | 'guntha'
  | 'ground'
  | 'marla'
  | 'kanal'
  | 'sarsahi'
  | 'killa'
  | 'murabba'
  | 'biswa'
  | 'biswansi'
  | 'bigha'
  | 'kachha_bigha'
  | 'vigha_guj'
  | 'katha'
  | 'decimal'
  | 'chatak'
  | 'ankanam'
  | 'lecha'
  | 'kranta'
  | 'kani';

const AREA_UNITS: Record<AreaUnit, { label: string; toSqft: number }> = {
  sqft: { label: 'sq.ft', toSqft: 1 },
  sqyd: { label: 'sq.yd / Gaj / Var', toSqft: 9 },
  sqm: { label: 'sq.m', toSqft: 10.7639104 },
  acre: { label: 'Acres', toSqft: 43560 },
  hectare: { label: 'Hectares', toSqft: 107639.104 },
  are: { label: 'Are (R)', toSqft: 1076.39104 },
  nali: { label: 'Nali (Uttarakhand)', toSqft: 2160 },
  mutthi: { label: 'Mutthi (Uttarakhand)', toSqft: 135 },
  bisi: { label: 'Bisi', toSqft: 43200 },
  cent: { label: 'Cents', toSqft: 435.6 },
  guntha: { label: 'Guntha / Gunta', toSqft: 1089 },
  ground: { label: 'Ground', toSqft: 2400 },
  marla: { label: 'Marla', toSqft: 272.25 },
  kanal: { label: 'Kanal', toSqft: 5445 },
  sarsahi: { label: 'Sarsahi', toSqft: 30.25 },
  killa: { label: 'Killa / Ghumaon', toSqft: 43560 },
  murabba: { label: 'Murabba', toSqft: 1089000 },
  biswa: { label: 'Biswa (Pucca)', toSqft: 1361.25 },
  biswansi: { label: 'Biswansi', toSqft: 68.0625 },
  bigha: { label: 'Bigha (Pucca)', toSqft: 27225 },
  kachha_bigha: { label: 'Bigha (Kachha)', toSqft: 9075 },
  vigha_guj: { label: 'Vigha (Gujarat)', toSqft: 17424 },
  katha: { label: 'Katha', toSqft: 1361.25 },
  decimal: { label: 'Decimal / Dismil', toSqft: 435.6 },
  chatak: { label: 'Chatak', toSqft: 45 },
  ankanam: { label: 'Ankanam', toSqft: 72 },
  lecha: { label: 'Lecha', toSqft: 144 },
  kranta: { label: 'Dhur / Kranta', toSqft: 68.0625 },
  kani: { label: 'Kani', toSqft: 17280 },
};

const AMENITY_OPTIONS = [
  'Covered Parking',
  'Visitor Parking',
  '24x7 Security',
  'CCTV',
  'Gated Community',
  'Lift',
  'Power Backup',
  '24x7 Water Supply',
  'Piped Gas',
  'Modular Kitchen',
  'Air Conditioning',
  'Wardrobes',
  'Swimming Pool',
  'Gymnasium',
  'Clubhouse',
  'Children Play Area',
  'Park / Garden',
  'Park Facing',
  'Jogging Track',
  'Intercom Facility',
  'Fire Safety',
  'Rainwater Harvesting',
  'Solar Water Heater',
  'Vastu Compliant',
  'Wi-Fi / Fiber Ready',
  'Servant Room',
  'Store Room',
  'Balcony / Terrace',
  'Wheelchair Friendly',
  'EV Charging',
  'Mountain / Valley View',
  'Main Road Facing',
];

const PLOT_AMENITY_OPTIONS = [
  'Boundary Wall',
  'Fencing',
  'Corner Plot',
  'Gated Community',
  'Paved / Blacktop Road',
  'Wide Road Access',
  'Highway Facing',
  'Main Road Facing',
  'Freehold / Clear Title',
  'RERA Approved',
  'Dakhil Kharij / Mutation',
  'Water Connection',
  'Borewell / Natural Spring',
  'Electricity Supply',
  'Street Lights',
  'Drainage / Sewerage',
  '24x7 Security',
  'CCTV',
  'Park Facing',
  'Mountain / Valley View',
  'River / Forest View',
  'Rainwater Harvesting',
  'Fruit Trees / Plantation',
  'Flat / Terraced Land',
  'Vastu Compliant',
];

export function SellPropertyPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  usePageMeta({
    title: isEdit ? 'Edit Property Listing — ZAIDAAT' : 'List Your Property Free — Buy or Rent on ZAIDAAT',
    description: 'Post residential apartments, plots, Nali/Bigha land, or commercial spaces across India for free on ZAIDAAT.',
    canonicalPath: isEdit && id ? `/sell/${id}/edit` : '/sell',
  });
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [listingPurpose, setListingPurpose] = useState<'buy' | 'rent'>('buy');
  const [propertyCategory, setPropertyCategory] = useState<'residential' | 'commercial'>('residential');
  const [propertyType, setPropertyType] = useState('apartment');
  const [price, setPrice] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [maintenanceMonthly, setMaintenanceMonthly] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('sqft');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [balconies, setBalconies] = useState('');
  const [furnishing, setFurnishing] = useState<'' | 'unfurnished' | 'semi_furnished' | 'fully_furnished'>('');
  const [facing, setFacing] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [possessionStatus, setPossessionStatus] = useState<'' | 'ready_to_move' | 'under_construction'>('');
  const [stateVal, setStateVal] = useState('');
  const [cityVal, setCityVal] = useState('');
  const [localityVal, setLocalityVal] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [reraId, setReraId] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [mediaUrls, setMediaUrls] = useState<Array<{ url: string; mediaType: 'image' | 'video' }>>([]);
  const [status, setStatus] = useState('active');

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    api
      .get<{ property: Property }>(`/api/properties/${id}`)
      .then(({ property: p }) => {
        setTitle(p.title);
        setListingPurpose(p.listingPurpose);
        setPropertyCategory(p.propertyCategory);
        setPropertyType(p.propertyType);
        setPrice(String(p.price));
        setSecurityDeposit(String(p.securityDeposit || 0));
        setMaintenanceMonthly(String(p.maintenanceMonthly || 0));
        setAreaSqft(String(p.areaSqft));
        setBedrooms(String(p.bedrooms));
        setBathrooms(String(p.bathrooms));
        setBalconies(String(p.balconies));
        setFurnishing(p.furnishing);
        setFacing(p.facing || '');
        setFloorNumber(p.floorNumber !== null ? String(p.floorNumber) : '');
        setTotalFloors(p.totalFloors !== null ? String(p.totalFloors) : '');
        setPossessionStatus(p.possessionStatus);
        setStateVal(p.state);
        setCityVal(p.city);
        setLocalityVal(p.locality);
        setAddressLine(p.addressLine || '');
        setPincode(p.pincode || '');
        setReraId(p.reraId || '');
        setDescription(p.description);
        setAmenities(p.amenities || []);
        setMediaUrls(
          p.images.map((im) => ({ url: im.url, mediaType: im.mediaType === 'video' ? 'video' : 'image' }))
        );
        setStatus(p.status);
      })
      .catch((err) => setError(err.message));
  }, [isEdit, id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    setError('');
    try {
      const files = await uploadFiles(e.target.files);
      setMediaUrls((prev) => [
        ...prev,
        ...files
          .filter((f) => f.mediaType === 'image' || f.mediaType === 'video')
          .map((f) => ({ url: f.url, mediaType: f.mediaType as 'image' | 'video' })),
      ]);
      toast.success(`${files.length} media file(s) uploaded successfully.`);
    } catch (err: any) {
      const msg = err.message || 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleAmenity = (am: string) => {
    setAmenities((prev) => (prev.includes(am) ? prev.filter((x) => x !== am) : [...prev, am]));
  };

  const isPlotOrLand = propertyType === 'plot' || propertyType === 'land';
  const priceWords = formatINRWords(price);
  const computedAreaSqft = Math.round(Number(areaSqft || 0) * AREA_UNITS[areaUnit].toSqft);

  const handlePropertyTypeChange = (nextType: string) => {
    setPropertyType(nextType);
    if (nextType === 'plot' || nextType === 'land') {
      setBedrooms('0');
      setBathrooms('0');
      setBalconies('0');
      setFurnishing('unfurnished');
      setFloorNumber('');
      setTotalFloors('');
      setAmenities((prev) => prev.filter((am) => PLOT_AMENITY_OPTIONS.includes(am)));
    } else if (bedrooms === '0' && bathrooms === '0') {
      setBedrooms('');
      setBathrooms('');
      setBalconies('');
      setFurnishing('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const convertedAreaSqft = Math.round(Number(areaSqft || 0) * AREA_UNITS[areaUnit].toSqft);
      if (!Number.isFinite(convertedAreaSqft) || convertedAreaSqft < 50) {
        throw new Error('Converted property area must be at least 50 sq.ft.');
      }
      const payload = {
        title,
        listingPurpose,
        propertyCategory,
        propertyType,
        price: Number(price),
        securityDeposit: listingPurpose === 'rent' ? Number(securityDeposit || 0) : 0,
        maintenanceMonthly: listingPurpose === 'rent' ? Number(maintenanceMonthly || 0) : 0,
        areaSqft: convertedAreaSqft,
        bedrooms: isPlotOrLand ? 0 : Number(bedrooms || 0),
        bathrooms: isPlotOrLand ? 0 : Number(bathrooms || 0),
        balconies: isPlotOrLand ? 0 : Number(balconies || 0),
        furnishing: isPlotOrLand ? 'unfurnished' : (furnishing || 'unfurnished'),
        facing: facing || null,
        floorNumber: !isPlotOrLand && floorNumber ? Number(floorNumber) : null,
        totalFloors: !isPlotOrLand && totalFloors ? Number(totalFloors) : null,
        possessionStatus: possessionStatus || 'ready_to_move',
        state: stateVal,
        city: cityVal,
        locality: localityVal,
        addressLine,
        pincode,
        reraId,
        description,
        amenities,
        mediaUrls,
        videoUrl: mediaUrls.find((m) => m.mediaType === 'video')?.url || null,
        ...(isEdit ? { status } : {}),
      };

      const res = isEdit
        ? await api.put<{ property: Property }>(`/api/properties/${id}`, payload)
        : await api.post<{ property: Property }>('/api/properties', payload);

      toast.success(isEdit ? 'Property listing updated.' : 'Property published live on ZAIDAAT!');
      navigate(`/properties/${res.property.id}`);
    } catch (err: any) {
      const msg = err.message || 'Failed to save property';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="card p-8">
          <Building2 className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Log in to Sell or List Your Property</h1>
          <p className="mt-2 text-sm text-slate-500">
            Post residential or commercial properties across India, upload photos &amp; videos, and manage buyer enquiries directly.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/login" className="btn-primary">
              Log In
            </Link>
            <Link to="/register" className="btn-secondary">
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
          {isEdit ? 'Edit Listing' : 'Sell or Rent Out Property'}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
          {isEdit ? 'Update Property Details' : 'List Your Property on ZAIDAAT'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Reach verified buyers and tenants across all 28 states and 8 union territories.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-bold text-slate-900">1. Basic Listing Details</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Listing Purpose</label>
              <select
                value={listingPurpose}
                onChange={(e) => setListingPurpose(e.target.value as 'buy' | 'rent')}
                className="input-field"
              >
                <option value="buy">Sell (For Purchase)</option>
                <option value="rent">Rent / Lease (Monthly)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Category</label>
              <select
                value={propertyCategory}
                onChange={(e) => setPropertyCategory(e.target.value as 'residential' | 'commercial')}
                className="input-field"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Property Type</label>
              <select value={propertyType} onChange={(e) => handlePropertyTypeChange(e.target.value)} className="input-field">
                <option value="apartment">Apartment / Flat</option>
                <option value="villa">Villa</option>
                <option value="independent_house">Independent House</option>
                <option value="plot">Plot</option>
                <option value="land">Land</option>
                <option value="shop">Commercial Shop</option>
                <option value="office">Office Space</option>
                <option value="warehouse">Warehouse</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Listing Title</label>
            <input
              type="text"
              required
              minLength={5}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Spacious 3 BHK Corner Apartment near Metro Station"
              className="input-field"
            />
          </div>

          {isEdit && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Listing Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field max-w-xs">
                <option value="active">Active</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented</option>
                <option value="archived">Archived / Hidden</option>
              </select>
            </div>
          )}
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-bold text-slate-900">2. Location Across India</h2>
          <LocationSelector
            stateValue={stateVal}
            cityValue={cityVal}
            localityValue={localityVal}
            allowCustom
            onChange={({ state, city, locality }) => {
              setStateVal(state);
              setCityVal(city);
              setLocalityVal(locality);
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Street / Building / Locality Address</label>
              <input
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Building, Road, or Sector Name"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">PIN Code</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 400050"
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-bold text-slate-900">3. Price &amp; Specifications</h2>
          <div className={`grid gap-4 ${listingPurpose === 'rent' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'}`}>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-600">
                  {listingPurpose === 'rent' ? 'Monthly Rent (₹)' : 'Expected Price (₹)'}
                </label>
                {priceWords && (
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                    ₹ {priceWords}
                  </span>
                )}
              </div>
              <input
                type="number"
                required
                min={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={listingPurpose === 'rent' ? '32000' : '12500000'}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {isPlotOrLand ? 'Plot Area' : 'Built-up Area'} ({AREA_UNITS[areaUnit].label})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  step="any"
                  min={areaUnit !== 'sqft' ? 0.01 : 50}
                  value={areaSqft}
                  onChange={(e) => setAreaSqft(e.target.value)}
                  placeholder={isPlotOrLand ? '200' : '1450'}
                  className="input-field min-w-0 flex-1"
                />
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                  aria-label="Area unit"
                  className="input-field w-40 shrink-0 sm:w-44"
                >
                  {(Object.keys(AREA_UNITS) as AreaUnit[]).map((u) => (
                    <option key={u} value={u}>
                      {AREA_UNITS[u].label}
                    </option>
                  ))}
                </select>
              </div>
              {areaUnit !== 'sqft' && computedAreaSqft > 0 && (
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  = {computedAreaSqft.toLocaleString('en-IN')} sq.ft
                </p>
              )}
            </div>
            {listingPurpose === 'rent' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Security Deposit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Monthly Maintenance (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={maintenanceMonthly}
                    onChange={(e) => setMaintenanceMonthly(e.target.value)}
                    className="input-field"
                  />
                </div>
              </>
            )}
          </div>

          {!isPlotOrLand && (
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Bedrooms (BHK)</label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  placeholder="e.g. 2"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Bathrooms</label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  placeholder="e.g. 2"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Balconies</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={balconies}
                  onChange={(e) => setBalconies(e.target.value)}
                  placeholder="e.g. 1"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Furnishing</label>
                <select value={furnishing} onChange={(e) => setFurnishing(e.target.value as any)} className="input-field">
                  <option value="">Select Furnishing</option>
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi_furnished">Semi Furnished</option>
                  <option value="fully_furnished">Fully Furnished</option>
                </select>
              </div>
            </div>
          )}

          <div className={`grid gap-4 ${isPlotOrLand ? 'sm:grid-cols-2' : 'sm:grid-cols-4'}`}>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Facing</label>
              <input type="text" value={facing} onChange={(e) => setFacing(e.target.value)} placeholder="e.g. East / North-East" className="input-field" />
            </div>
            {!isPlotOrLand && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Floor No.</label>
                  <input type="number" min={0} value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} placeholder="e.g. 4" className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Total Floors</label>
                  <input type="number" min={0} value={totalFloors} onChange={(e) => setTotalFloors(e.target.value)} placeholder="e.g. 12" className="input-field" />
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Possession</label>
              <select value={possessionStatus} onChange={(e) => setPossessionStatus(e.target.value as any)} className="input-field">
                <option value="">Select Possession</option>
                <option value="ready_to_move">{isPlotOrLand ? 'Immediate / Clear Title' : 'Ready to Move'}</option>
                <option value="under_construction">{isPlotOrLand ? 'Under Development' : 'Under Construction'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">RERA Registration ID (optional)</label>
            <input
              type="text"
              value={reraId}
              onChange={(e) => setReraId(e.target.value)}
              placeholder="e.g. P51800041290"
              className="input-field max-w-md"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Property Description</label>
            <textarea
              rows={4}
              required
              minLength={20}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe ventilation, sunlight, nearby metro/schools, society norms, legal title..."
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              {isPlotOrLand ? 'Plot / Land Features' : 'Amenities'}
            </label>
            <div className="flex flex-wrap gap-2">
              {(isPlotOrLand ? PLOT_AMENITY_OPTIONS : AMENITY_OPTIONS).map((am) => {
                const active = amenities.includes(am);
                return (
                  <button
                    key={am}
                    type="button"
                    onClick={() => toggleAmenity(am)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {am}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">4. Photos &amp; Video Walkthrough</h2>
              <p className="text-xs text-slate-500">Upload high-resolution property photos and MP4/WEBM property walkthrough videos.</p>
            </div>
            {mediaUrls.length > 0 && (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                {mediaUrls.filter((m) => m.mediaType === 'image').length} Photo(s), {mediaUrls.filter((m) => m.mediaType === 'video').length} Video(s)
              </span>
            )}
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-brand-500 hover:bg-brand-50/30">
            <Upload className="h-8 w-8 text-brand-600" />
            <span className="mt-2 text-sm font-bold text-slate-800">
              {uploading ? 'Uploading media files...' : 'Click to select Property Photos or Walkthrough Videos'}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Supports JPG, PNG, WEBP, and MP4 / WEBM / MOV videos up to 10 MB each
            </span>
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm,video/quicktime,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {mediaUrls.map((m, idx) => (
                <div key={`${m.url}-${idx}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                  {m.mediaType === 'video' ? (
                    <div className="relative h-28 w-full bg-slate-950">
                      <video src={m.url} controls className="h-28 w-full object-cover" />
                      <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Video
                      </span>
                    </div>
                  ) : (
                    <div className="relative h-28 w-full">
                      <img src={m.url} alt={`Uploaded property photo ${idx + 1}`} className="h-28 w-full object-cover" />
                      <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Photo {idx + 1}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute right-1.5 top-1.5 rounded-lg bg-slate-900/80 p-1.5 text-white shadow hover:bg-rose-600"
                    aria-label="Remove media"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting || uploading} className="btn-primary px-6 py-3">
            <ImagePlus className="h-4 w-4" />
            {submitting ? 'Saving Listing...' : isEdit ? 'Save Changes' : 'Publish Property Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
