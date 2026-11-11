import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Calendar, FileText, MapPin, Users } from 'lucide-react';
import type { JobPost } from '../../types';
import { formatDate, formatINR } from '../../lib/format';
import { useAuth } from '../../lib/authContext';
import { useToast } from '../../lib/toastContext';
import { api } from '../../lib/api';

interface JobCardProps {
  job: JobPost;
  onToggleSave?: (id: number, saved: boolean) => void;
  variant?: 'row' | 'card';
}

export function JobCard({ job, onToggleSave, variant = 'row' }: JobCardProps) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info('Sign in to bookmark work tenders.');
      navigate('/login');
      return;
    }
    try {
      const res = await api.post<{ saved: boolean }>(`/api/work/jobs/${job.id}/save`);
      onToggleSave?.(job.id, res.saved);
      toast.success(res.saved ? 'Job bookmarked to your saved list.' : 'Job removed from saved list.');
    } catch (err: any) {
      toast.error(err.message || 'Could not update bookmark.');
    }
  };

  if (variant === 'row') {
    return (
      <article className="flex min-w-0 flex-col gap-4 p-4 sm:p-5 transition hover:bg-slate-50/70 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
            <span className="font-semibold text-brand-700">{job.categoryName}</span>
            <span>&middot;</span>
            <span
              className={`inline-flex items-center gap-1 capitalize ${
                job.status === 'open' ? 'text-emerald-700 font-semibold' : 'text-slate-600'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  job.status === 'open' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              {job.status.replace('_', ' ')}
            </span>
            <span>&middot;</span>
            <span>Posted {formatDate(job.createdAt)}</span>
          </div>

          <Link
            to={`/jobs/${job.id}`}
            className="mt-1 block text-[15px] font-bold text-slate-900 transition hover:text-brand-600"
          >
            {job.title}
          </Link>

          <p className="mt-1 line-clamp-2 max-w-2xl text-xs leading-relaxed text-slate-600">
            {job.description}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {job.locality}, {job.city}, {job.state}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Start by {formatDate(job.preferredStartDate)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              {job.applicationsCount} applicants
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              {job.quotationsCount} quotes
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 md:flex-col md:items-end md:justify-center md:border-t-0 md:border-l md:pl-5 md:pt-0">
          <div className="md:text-right">
            <p className="text-[11px] font-medium text-slate-500">Estimated Budget</p>
            <p className="text-sm font-extrabold text-navy-900 tabular-price sm:text-base">
              {formatINR(job.budgetMin)} – {formatINR(job.budgetMax)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className={`rounded-md border p-2 transition ${
                job.isSaved
                  ? 'border-brand-200 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title={job.isSaved ? 'Saved Job' : 'Save Job'}
              aria-label={job.isSaved ? 'Remove saved job' : 'Save job'}
            >
              <Bookmark className={`h-3.5 w-3.5 ${job.isSaved ? 'fill-current' : ''}`} />
            </button>
            <Link to={`/jobs/${job.id}`} className="btn-navy px-3.5 py-1.5 text-xs">
              Review &amp; Quote
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300">
      <div>
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-700">{job.categoryName}</span>
            <span className="text-slate-300">&middot;</span>
            <span className="capitalize text-emerald-700 font-semibold">{job.status.replace('_', ' ')}</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className={`rounded-md border p-1.5 transition ${
              job.isSaved
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            aria-label={job.isSaved ? 'Remove saved job' : 'Save job'}
          >
            <Bookmark className={`h-3.5 w-3.5 ${job.isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        <Link
          to={`/jobs/${job.id}`}
          className="mt-2.5 block text-base font-bold text-slate-900 transition hover:text-brand-600"
        >
          {job.title}
        </Link>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{job.description}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Budget</p>
          <p className="text-sm font-extrabold text-navy-900 tabular-price">
            {formatINR(job.budgetMin)} – {formatINR(job.budgetMax)}
          </p>
        </div>
        <Link to={`/jobs/${job.id}`} className="btn-navy px-3.5 py-1.5 text-xs">
          View Tender
        </Link>
      </div>
    </article>
  );
}
