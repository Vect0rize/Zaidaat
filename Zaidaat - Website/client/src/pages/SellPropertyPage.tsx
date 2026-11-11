import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, ImagePlus, Trash2, Upload } from 'lucide-react';
import { api, uploadFiles } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import type { Property } from '../types';
import { LocationSelector } from '../components/common/LocationSelector';

const AMENITY_OPTIONS = [
  'Covered Parking',
  '24x7 Security',
  'Lift',
  'Power Backup',
  'Gymnasium',
  'Clubhouse',
  'Modular Kitchen',
  'Solar Water Heater',
  'Park Facing',
  'CCTV',
  'Rainwater Harvesting',
  'EV Charging',
];

export function SellPropertyPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [listingPurpose, setListingPurpose] = useState<'buy' | 'rent'>('buy');
  const [propertyCategory, setPropertyCategory] = useState<'residential' | 'commercial'>('residential');
  const [propertyType, setPropertyType] = useState('apartment');
  const [price, setPrice] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('0');
  const [maintenanceMonthly, setMaintenanceMonthly] = useState('0');
  const [areaSqft, setAreaSqft] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('2');
  const [balconies, setBalconies] = useState('1');
  const [furnishing, setFurnishing] = useState<'unfurnished' | 'semi_furnished' | 'fully_furnished'>('semi_furnished');
  const [facing, setFacing] = useState('East');
  const [floorNumber, setFloorNumber] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [possessionStatus, setPossessionStatus] = useState<'ready_to_move' | 'under_construction'>('ready_to_move');
  const [stateVal, setStateVal] = useState('Maharashtra');
  const [cityVal, setCityVal] = useState('Mumbai');
  const [localityVal, setLocalityVal] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [reraId, setReraId] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>(['Covered Parking', '24x7 Security']);
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
      toast.success(`${files.length} media file(s) uploaded.`);
    } catch (err: any) {
      const msg = err.message || 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const toggleAmenity = (am: string) => {
    setAmenities((prev) => (prev.includes(am) ? prev.filter((x) => x !== am) : [...prev, am]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        title,
        listingPurpose,
        propertyCategory,
        propertyType,
        price: Number(price),
        securityDeposit: Number(securityDeposit || 0),
        maintenanceMonthly: Number(maintenanceMonthly || 0),
        areaSqft: Number(areaSqft),
        bedrooms: Number(bedrooms || 0),
        bathrooms: Number(bathrooms || 0),
        balconies: Number(balconies || 0),
        furnishing,
        facing,
        floorNumber: floorNumber ? Number(floorNumber) : null,
        totalFloors: totalFloors ? Number(totalFloors) : null,
        possessionStatus,
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
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="input-field">
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
              <label className="mb-1 block text-xs font-semibold text-slate-600">Street / Project Name</label>
              <input
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Building, Phase, or Road Name"
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {listingPurpose === 'rent' ? 'Monthly Rent (₹)' : 'Expected Price (₹)'}
              </label>
              <input
                type="number"
                required
                min={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={listingPurpose === 'rent' ? '32000' : '8500000'}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Built-up / Plot Area (sq.ft)</label>
              <input
                type="number"
                required
                min={50}
                value={areaSqft}
                onChange={(e) => setAreaSqft(e.target.value)}
                placeholder="1450"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {listingPurpose === 'rent' ? 'Security Deposit (₹)' : 'Monthly Maintenance (₹)'}
              </label>
              {listingPurpose === 'rent' ? (
                <input
                  type="number"
                  min={0}
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  className="input-field"
                />
              ) : (
                <input
                  type="number"
                  min={0}
                  value={maintenanceMonthly}
                  onChange={(e) => setMaintenanceMonthly(e.target.value)}
                  className="input-field"
                />
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Bedrooms (BHK)</label>
              <input type="number" min={0} max={25} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Bathrooms</label>
              <input type="number" min={0} max={25} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Balconies</label>
              <input type="number" min={0} max={20} value={balconies} onChange={(e) => setBalconies(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Furnishing</label>
              <select value={furnishing} onChange={(e) => setFurnishing(e.target.value as any)} className="input-field">
                <option value="unfurnished">Unfurnished</option>
                <option value="semi_furnished">Semi Furnished</option>
                <option value="fully_furnished">Fully Furnished</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Facing</label>
              <input type="text" value={facing} onChange={(e) => setFacing(e.target.value)} placeholder="East / North-East" className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Floor No.</label>
              <input type="number" min={0} value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Total Floors</label>
              <input type="number" min={0} value={totalFloors} onChange={(e) => setTotalFloors(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Possession</label>
              <select value={possessionStatus} onChange={(e) => setPossessionStatus(e.target.value as any)} className="input-field">
                <option value="ready_to_move">Ready to Move</option>
                <option value="under_construction">Under Construction</option>
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
            <label className="mb-2 block text-xs font-semibold text-slate-600">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((am) => {
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
          <h2 className="text-lg font-bold text-slate-900">4. Photos &amp; Video Walkthrough</h2>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-brand-500 hover:bg-brand-50/30">
            <Upload className="h-8 w-8 text-brand-600" />
            <span className="mt-2 text-sm font-bold text-slate-800">
              {uploading ? 'Uploading files...' : 'Click to upload Property Images or MP4/WEBM Video'}
            </span>
            <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, MP4 up to 10 MB per file</span>
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {mediaUrls.map((m, idx) => (
                <div key={`${m.url}-${idx}`} className="group relative overflow-hidden rounded-xl border border-slate-200">
                  {m.mediaType === 'video' ? (
                    <video src={m.url} className="h-28 w-full object-cover" />
                  ) : (
                    <img src={m.url} alt="" className="h-28 w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute right-1.5 top-1.5 rounded-lg bg-slate-900/80 p-1.5 text-white hover:bg-rose-600"
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
