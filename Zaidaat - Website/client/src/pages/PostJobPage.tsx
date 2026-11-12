import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Trash2, Upload } from 'lucide-react';
import { api, uploadFiles } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import type { JobPost, ProfessionalCategory } from '../types';
import { LocationSelector } from '../components/common/LocationSelector';

export function PostJobPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState<ProfessionalCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stateVal, setStateVal] = useState('Maharashtra');
  const [cityVal, setCityVal] = useState('Mumbai');
  const [localityVal, setLocalityVal] = useState('');
  const [budgetMin, setBudgetMin] = useState('25000');
  const [budgetMax, setBudgetMax] = useState('60000');
  const [budgetType, setBudgetType] = useState<'fixed' | 'daily' | 'hourly' | 'estimate'>('fixed');
  const [preferredStartDate, setPreferredStartDate] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [refImages, setRefImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ categories: ProfessionalCategory[] }>('/api/professionals/categories')
      .then((res) => {
        setCategories(res.categories);
        if (res.categories[0]) setCategoryId(String(res.categories[0].id));
      })
      .catch(() => {});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const files = await uploadFiles(e.target.files);
      setRefImages((prev) => [...prev, ...files.filter((f) => f.mediaType === 'image').map((f) => f.url)]);
      toast.success('Reference photo(s) uploaded.');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<{ job: JobPost }>('/api/work/jobs', {
        categoryId: Number(categoryId),
        title,
        description,
        state: stateVal,
        city: cityVal,
        locality: localityVal || cityVal,
        budgetMin: Number(budgetMin),
        budgetMax: Number(budgetMax),
        budgetType,
        preferredStartDate: preferredStartDate || null,
        propertyType,
        referenceImages: refImages,
      });
      toast.success('Work requirement published to Find Work!');
      navigate(`/jobs/${res.job.id}`);
    } catch (err: any) {
      const msg = err.message || 'Could not post work requirement';
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
          <Briefcase className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Log in to Post a Work Requirement</h1>
          <p className="mt-2 text-sm text-slate-500">
            Describe your construction, repair, or interior job, receive multiple quotations, compare pros, and hire directly.
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Customer Work Post</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">Post a Work Requirement</h1>
        <p className="mt-1 text-sm text-slate-500">
          Invite applications and itemized quotations from verified workers and contractors in your city.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        {error && <div className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Required Trade / Specialist</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field" required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Property Type</label>
            <input
              type="text"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              placeholder="3 BHK Apartment / Villa / Commercial Shop"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Work Title</label>
          <input
            type="text"
            required
            minLength={5}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Full 2 BHK Interior Painting & Damp Proofing in Indiranagar"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Scope &amp; Requirements</label>
          <textarea
            rows={4}
            required
            minLength={20}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe room sizes, material expectations, timeline constraints, site access..."
            className="input-field"
          />
        </div>

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

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Min Budget (₹)</label>
            <input type="number" min={0} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Max Budget (₹)</label>
            <input type="number" min={0} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Budget Basis</label>
            <select value={budgetType} onChange={(e) => setBudgetType(e.target.value as any)} className="input-field">
              <option value="fixed">Fixed Project</option>
              <option value="estimate">Open for Estimates</option>
              <option value="daily">Daily Basis</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Preferred Start Date</label>
            <input type="date" value={preferredStartDate} onChange={(e) => setPreferredStartDate(e.target.value)} className="input-field" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-600">Reference Photographs (Optional)</label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <Upload className="h-4 w-4 text-brand-600" />
            {uploading ? 'Uploading...' : 'Upload Site / Reference Photos'}
            <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
          {refImages.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {refImages.map((url, i) => (
                <div key={url + i} className="relative overflow-hidden rounded-xl border border-slate-200">
                  <img src={url} alt="" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setRefImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-md bg-slate-900/80 p-1 text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting || uploading} className="btn-primary px-6 py-3">
            {submitting ? 'Publishing...' : 'Publish Work Requirement'}
          </button>
        </div>
      </form>
    </div>
  );
}
