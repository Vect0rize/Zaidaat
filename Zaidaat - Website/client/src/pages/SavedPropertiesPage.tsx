import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Heart, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import type { JobPost, Property } from '../types';
import { PropertyCard } from '../components/property/PropertyCard';
import { JobCard } from '../components/work/JobCard';
import { EmptyState } from '../components/common/EmptyState';
import { JobCardSkeleton, PropertyCardSkeleton } from '../components/common/Skeleton';
import { usePageMeta } from '../lib/seo';

export function SavedPropertiesPage() {
  usePageMeta({
    title: 'Saved Properties & Bookmarked Tenders — ZAIDAAT',
    description: 'Revisit shortlisted homes, plots, and project tenders in your ZAIDAAT account.',
    canonicalPath: '/saved',
  });
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'properties' | 'jobs'>('properties');
  const [properties, setProperties] = useState<Property[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadSaved = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const [pRes, jRes] = await Promise.all([
        api.get<{ properties: Property[] }>('/api/properties/saved'),
        api.get<{ jobs: JobPost[] }>('/api/work/jobs/saved'),
      ]);
      setProperties(pRes.properties);
      setJobs(jRes.jobs);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load your saved shortlist.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="Sign in to view your shortlist"
          description="Save properties to compare options and bookmark work tenders in your ZAIDAAT account."
          action={
            <Link to="/login" className="btn-primary">
              Sign in to ZAIDAAT
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Personal Shortlist</span>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Saved Properties &amp; Bookmarked Work
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Revisit your shortlisted homes, plots, and project tenders anytime.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-subtle">
          <button
            type="button"
            onClick={() => setTab('properties')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === 'properties' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            Properties ({properties.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('jobs')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === 'jobs' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Saved Jobs ({jobs.length})
          </button>
        </div>
      </div>

      <div className="mt-8">
        {loadError && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <span>{loadError}</span>
            <button type="button" onClick={loadSaved} className="btn-secondary px-3 py-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              tab === 'properties' ? <PropertyCardSkeleton key={n} /> : <JobCardSkeleton key={n} />
            ))}
          </div>
        ) : tab === 'properties' ? (
          properties.length === 0 ? (
            <EmptyState
              title="No saved properties yet"
              description="Tap the heart icon on any listing to save it here for side-by-side comparison."
              action={
                <Link to="/buy" className="btn-primary">
                  Browse Properties
                </Link>
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onToggleSave={(id, saved) => {
                    if (!saved) setProperties((prev) => prev.filter((item) => item.id !== id));
                  }}
                />
              ))}
            </div>
          )
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No bookmarked work tenders"
            description="Bookmark open construction and service jobs on Find Work to quote on them later."
            action={
              <Link to="/find-work" className="btn-primary">
                Browse Open Work
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onToggleSave={(id, saved) => {
                  if (!saved) setJobs((prev) => prev.filter((item) => item.id !== id));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
