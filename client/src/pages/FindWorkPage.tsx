import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, PlusCircle, RotateCcw, Search, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import type { JobPost, ProfessionalCategory } from '../types';
import { LocationSelector } from '../components/common/LocationSelector';
import { JobCard } from '../components/work/JobCard';
import { EmptyState } from '../components/common/EmptyState';
import { JobCardSkeleton } from '../components/common/Skeleton';

export function FindWorkPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<ProfessionalCategory[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'saved'>('all');

  const [categorySlug, setCategorySlug] = useState(searchParams.get('category') || '');
  const [stateVal, setStateVal] = useState(searchParams.get('state') || '');
  const [cityVal, setCityVal] = useState(searchParams.get('city') || '');
  const [status, setStatus] = useState('open');
  const [q, setQ] = useState(searchParams.get('q') || '');

  useEffect(() => {
    api
      .get<{ categories: ProfessionalCategory[] }>('/api/professionals/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === 'saved' && user) {
        const res = await api.get<{ jobs: JobPost[] }>('/api/work/jobs/saved');
        setJobs(res.jobs);
        setTotal(res.jobs.length);
      } else {
        const params = new URLSearchParams();
        if (categorySlug) params.set('category', categorySlug);
        if (stateVal) params.set('state', stateVal);
        if (cityVal) params.set('city', cityVal);
        if (status) params.set('status', status);
        if (q.trim()) params.set('q', q.trim());
        const res = await api.get<{ total: number; jobs: JobPost[] }>(`/api/work/jobs?${params.toString()}`);
        setJobs(res.jobs);
        setTotal(res.total);
      }
    } finally {
      setLoading(false);
    }
  }, [viewMode, user, categorySlug, stateVal, cityVal, status, q]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const reset = () => {
    setCategorySlug('');
    setStateVal('');
    setCityVal('');
    setStatus('open');
    setQ('');
    setViewMode('all');
    setSearchParams({});
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Tender Board Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Open Work Tenders &amp; Project Briefs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review homeowner and commercial scopes across India, bookmark tenders, and submit itemized quotations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/post-job" className="btn-primary px-4 py-2 text-xs">
            <PlusCircle className="h-3.5 w-3.5" />
            Post Work Requirement
          </Link>
          <Link to="/become-professional" className="btn-secondary px-4 py-2 text-xs">
            <Users className="h-3.5 w-3.5" />
            Worker Setup
          </Link>
        </div>
      </div>

      {/* Mode Switcher & Result Count */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`rounded px-3.5 py-1.5 text-xs font-semibold transition ${
              viewMode === 'all' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Work Opportunities
          </button>
          {user && (
            <button
              type="button"
              onClick={() => setViewMode('saved')}
              className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-semibold transition ${
                viewMode === 'saved' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Saved Tenders
            </button>
          )}
        </div>

        <p className="tabular-price text-xs font-medium text-slate-600">
          Showing <span className="font-bold text-navy-900">{jobs.length}</span> of {total} tenders
        </p>
      </div>

      {viewMode === 'all' && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="relative md:col-span-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search modular kitchen, waterproofing..."
                className="input-field pl-9"
              />
            </div>

            <div className="md:col-span-4">
              <LocationSelector
                stateValue={stateVal}
                cityValue={cityVal}
                includeLocality={false}
                onChange={({ state, city }) => {
                  setStateVal(state);
                  setCityVal(city);
                }}
              />
            </div>

            <div className="md:col-span-2">
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="input-field text-xs"
                aria-label="Trade Category"
              >
                <option value="">All Trades</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-field flex-1 text-xs"
                aria-label="Job Status"
              >
                <option value="open">Open Only</option>
                <option value="all">All Statuses</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <button
                type="button"
                onClick={reset}
                className="btn-secondary px-2.5 py-2.5 text-xs text-slate-500"
                title="Reset Filters"
                aria-label="Reset Filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Tender Board List */}
      <div className="mt-5">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <JobCardSkeleton key={n} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            title={viewMode === 'saved' ? 'No saved tenders yet' : 'No tenders match your filters'}
            description={
              viewMode === 'saved'
                ? 'Bookmark open tenders on Find Work to compare budgets and send quotations later.'
                : 'Try selecting All States or post a new work requirement to invite local professionals.'
            }
            action={
              viewMode === 'saved' ? (
                <button type="button" onClick={() => setViewMode('all')} className="btn-primary">
                  Browse Open Work
                </button>
              ) : (
                <Link to="/post-job" className="btn-primary">
                  Post Work Requirement
                </Link>
              )
            }
          />
        ) : (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                variant="row"
                onToggleSave={(id, saved) => {
                  if (viewMode === 'saved' && !saved) {
                    setJobs((prev) => prev.filter((item) => item.id !== id));
                  } else {
                    setJobs((prev) => prev.map((item) => (item.id === id ? { ...item, isSaved: saved } : item)));
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
