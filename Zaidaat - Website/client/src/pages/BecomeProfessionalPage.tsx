import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Save, ShieldCheck, Upload } from 'lucide-react';
import { api, uploadFiles } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import type { ProfessionalCategory, ProfessionalProfile } from '../types';
import { Avatar } from '../components/common/Avatar';
import { LocationSelector } from '../components/common/LocationSelector';
import { usePageMeta } from '../lib/seo';

export function BecomeProfessionalPage() {
  usePageMeta({
    title: 'Register as a Verified Professional or Contractor — ZAIDAAT',
    description: 'Create your ZAIDAAT contractor or trade specialist profile and receive direct client leads across India.',
    canonicalPath: '/become-professional',
  });
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState<ProfessionalCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [cityVal, setCityVal] = useState('');
  const [localitiesText, setLocalitiesText] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState('25');
  const [experienceYears, setExperienceYears] = useState('5');
  const [skillsText, setSkillsText] = useState('');
  const [languagesText, setLanguagesText] = useState('Hindi, English');
  const [pricingModel, setPricingModel] = useState<'hourly' | 'daily' | 'project' | 'sqft'>('daily');
  const [rateMin, setRateMin] = useState('800');
  const [rateMax, setRateMax] = useState('1500');
  const [rateUnitLabel, setRateUnitLabel] = useState('per day');
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'busy' | 'unavailable'>('available');
  const [teamSize, setTeamSize] = useState('1');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ categories: ProfessionalCategory[] }>('/api/professionals/categories')
      .then((res) => {
        setCategories(res.categories);
        if (res.categories[0]) setCategoryId((prev) => prev || String(res.categories[0].id));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setDisplayName((v) => v || user.fullName);
    api
      .get<{ profile: ProfessionalProfile | null }>('/api/professionals/me/profile')
      .then(({ profile }) => {
        if (!profile) return;
        setCategoryId(String(profile.categoryId));
        setDisplayName(profile.displayName);
        setHeadline(profile.headline);
        setBio(profile.bio);
        setPhotoUrl(profile.profilePhotoUrl || '');
        setStateVal(profile.state);
        setCityVal(profile.city);
        setLocalitiesText(profile.localities.join(', '));
        setServiceRadiusKm(String(profile.serviceRadiusKm));
        setExperienceYears(String(profile.experienceYears));
        setSkillsText(profile.skills.join(', '));
        setLanguagesText(profile.languages.join(', '));
        setPricingModel(profile.pricingModel);
        setRateMin(String(profile.rateMin));
        setRateMax(String(profile.rateMax));
        setRateUnitLabel(profile.rateUnitLabel);
        setAvailabilityStatus(profile.availabilityStatus);
        setTeamSize(String(profile.teamSize));
      })
      .catch(() => {});
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const files = await uploadFiles(e.target.files);
      if (files[0]) setPhotoUrl(files[0].url);
    } catch (err: any) {
      toast.error(err?.message || 'Could not upload profile photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const splitList = (raw: string) =>
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      const res = await api.post<{ profile: ProfessionalProfile }>('/api/professionals/me/profile', {
        categoryId: Number(categoryId),
        displayName,
        headline,
        bio,
        profilePhotoUrl: photoUrl || null,
        state: stateVal,
        city: cityVal,
        localities: splitList(localitiesText),
        serviceRadiusKm: Number(serviceRadiusKm),
        experienceYears: Number(experienceYears),
        skills: splitList(skillsText),
        languages: splitList(languagesText),
        pricingModel,
        rateMin: Number(rateMin),
        rateMax: Number(rateMax),
        rateUnitLabel,
        availabilityStatus,
        teamSize: Number(teamSize),
      });
      await refreshUser();
      toast.success('Professional profile saved!');
      navigate(`/professionals/${res.profile.id}`);
    } catch (err: any) {
      const msg = err.message || 'Could not save profile';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="card p-8">
          <ShieldCheck className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Register as a Skilled Professional</h1>
          <p className="mt-2 text-sm text-slate-500">
            Create your account or log in to showcase your trade, upload portfolio photos, receive hiring requests, and quote on work across India.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/register" className="btn-primary">
              Create Account
            </Link>
            <Link to="/login" className="btn-secondary">
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Professional Onboarding</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Create or Update Your Professional Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Set your trade, service areas, pricing structure, and availability to win work requests.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-bold text-slate-900">1. Trade &amp; Profile Details</h2>

          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={displayName || user?.fullName || 'Pro'} src={photoUrl} size="lg" />
            <label className="btn-secondary cursor-pointer text-xs">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Profile Photo'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Primary Profession / Trade</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field" required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Display / Business Name</label>
              <input
                type="text"
                required
                minLength={2}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Profile Headline</label>
            <input
              type="text"
              required
              minLength={8}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Licensed Electrician • Concealed Wiring & Smart Home Panels"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Bio &amp; Work Experience</label>
            <textarea
              rows={4}
              required
              minLength={20}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe projects completed, tools/brands you work with, warranty practices..."
              className="input-field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Skills (comma separated)</label>
              <input
                type="text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="Modular Kitchen, Teak Doors, Wardrobes"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Languages Spoken (comma separated)</label>
              <input
                type="text"
                value={languagesText}
                onChange={(e) => setLanguagesText(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-bold text-slate-900">2. Service Areas &amp; Radius</h2>
          <LocationSelector
            stateValue={stateVal}
            cityValue={cityVal}
            includeLocality={false}
            allowCustom
            onChange={({ state, city }) => {
              setStateVal(state);
              setCityVal(city);
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Served Localities (comma separated)</label>
              <input
                type="text"
                value={localitiesText}
                onChange={(e) => setLocalitiesText(e.target.value)}
                placeholder="Bandra West, Andheri, Powai"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Service Radius (km)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={serviceRadiusKm}
                onChange={(e) => setServiceRadiusKm(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-bold text-slate-900">3. Pricing, Experience &amp; Availability</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Pricing Model</label>
              <select
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value as any)}
                className="input-field"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily Rate</option>
                <option value="sqft">Per Sq.Ft</option>
                <option value="project">Per Project</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Min Rate (₹)</label>
              <input type="number" required min={50} value={rateMin} onChange={(e) => setRateMin(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Max Rate (₹)</label>
              <input type="number" required min={50} value={rateMax} onChange={(e) => setRateMax(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Unit Label</label>
              <input
                type="text"
                required
                value={rateUnitLabel}
                onChange={(e) => setRateUnitLabel(e.target.value)}
                placeholder="per day / per sq.ft"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Experience (Years)</label>
              <input type="number" min={0} max={60} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Team Size</label>
              <input type="number" min={1} max={500} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Availability</label>
              <select
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value as any)}
                className="input-field"
              >
                <option value="available">Available Now</option>
                <option value="busy">Busy (Limited Slots)</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving || uploading} className="btn-primary px-6 py-3">
            <Save className="h-4 w-4" />
            {saving ? 'Saving Profile...' : 'Save Professional Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
