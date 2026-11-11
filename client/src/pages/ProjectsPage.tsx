import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, MapPin, PlusCircle, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import type { ProjectSummary } from '../types';
import { formatINR, formatLabel } from '../lib/format';
import { Modal } from '../components/common/Modal';
import { LocationSelector } from '../components/common/LocationSelector';
import { EmptyState } from '../components/common/EmptyState';

export function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<'construction' | 'renovation' | 'interior' | 'repair' | 'other'>('renovation');
  const [stateVal, setStateVal] = useState('Maharashtra');
  const [cityVal, setCityVal] = useState('Mumbai');
  const [localityVal, setLocalityVal] = useState('');
  const [totalBudget, setTotalBudget] = useState('350000');
  const [startDate, setStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [busy, setBusy] = useState(false);

  const loadProjects = () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<{ projects: ProjectSummary[] }>('/api/projects')
      .then((res) => setProjects(res.projects))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading) loadProjects();
  }, [user, authLoading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/projects', {
        title,
        description,
        projectType,
        state: stateVal,
        city: cityVal,
        locality: localityVal,
        totalBudget: Number(totalBudget || 0),
        startDate: startDate || null,
        targetEndDate: targetEndDate || null,
      });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      toast.success('Project created in Project Hub.');
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Could not create project.');
    } finally {
      setBusy(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="card p-8">
          <FolderKanban className="mx-auto h-12 w-12 text-brand-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Project Hub</h1>
          <p className="mt-2 text-sm text-slate-500">
            Log in to manage your active home construction and renovation projects, budgets, hired professionals, site photos, and progress updates.
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600">
            <FolderKanban className="h-4 w-4" />
            PROJECT HUB
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Construction &amp; Renovation Workspace
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track budgets, hired contractors, daily site photos, quotations, and messages in one organized workspace.
          </p>
        </div>

        <div className="flex gap-2">
          <Link to="/post-job" className="btn-secondary text-xs">
            Post Work &amp; Get Quotes
          </Link>
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary text-xs">
            <PlusCircle className="h-4 w-4" />
            New Project
          </button>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2].map((n) => (
              <div key={n} className="card h-56 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects in your hub yet"
            description="Create a project directly or accept a quotation from a professional in Find Work to launch a tracked workspace automatically."
            action={
              <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary">
                Create Your First Project
              </button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="card flex flex-col justify-between p-6 transition hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-700">
                      {formatLabel(p.project_type)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        p.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : p.status === 'active'
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-extrabold text-slate-900">{p.title}</h2>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{p.description}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-brand-600" />
                    {p.locality ? `${p.locality}, ` : ''}
                    {p.city}, {p.state}
                  </p>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Overall Progress</span>
                      <span className="text-navy-900">{p.progress_percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-600 transition-all"
                        style={{ width: `${p.progress_percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>
                      Budget: <strong className="text-slate-900">{formatINR(p.total_budget)}</strong> • Spent:{' '}
                      <strong className="text-brand-700">{formatINR(p.spent_amount)}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {p.pros_count || 0} Pros
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Project in Project Hub" maxWidth="2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Project Title</label>
              <input
                type="text"
                required
                minLength={4}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Indiranagar Duplex Ground Floor Remodel"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Project Type</label>
              <select value={projectType} onChange={(e) => setProjectType(e.target.value as any)} className="input-field">
                <option value="renovation">Home Renovation</option>
                <option value="construction">New Construction</option>
                <option value="interior">Interiors &amp; Woodwork</option>
                <option value="repair">Repair &amp; Waterproofing</option>
                <option value="other">Other</option>
              </select>
            </div>
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Total Planned Budget (₹)</label>
              <input
                type="number"
                min={0}
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Target Completion</label>
              <input type="date" value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} className="input-field" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Scope &amp; Goals</label>
            <textarea
              rows={3}
              required
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
            />
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full py-3">
            {busy ? 'Creating...' : 'Create Project Workspace'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
