import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  FileWarning,
  History,
  LayoutDashboard,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Tags,
  Users,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { formatDate, formatINR } from '../lib/format';
import { usePageMeta } from '../lib/seo';

type AdminSection =
  | 'overview'
  | 'users'
  | 'properties'
  | 'professionals'
  | 'jobs'
  | 'verifications'
  | 'complaints'
  | 'reports'
  | 'analytics'
  | 'audit';

export function AdminPage() {
  usePageMeta({
    title: 'Admin Operations Desk — ZAIDAAT',
    description: 'Platform moderation, KYC verification queue, analytics, and audit console.',
    canonicalPath: '/admin',
  });
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [section, setSection] = useState<AdminSection>('overview');

  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState('Home Services');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user?.roles.includes('admin')) return;
    try {
      const [aRes, uRes, pRes, proRes, jobRes, vRes, cRes, compRes, auditRes] = await Promise.all([
        api.get('/api/admin/analytics'),
        api.get<{ users: any[] }>('/api/admin/users'),
        api.get<{ properties: any[] }>('/api/admin/properties'),
        api.get<{ professionals: any[] }>('/api/admin/professionals'),
        api.get<{ jobs: any[] }>('/api/admin/jobs'),
        api.get<{ records: any[] }>('/api/admin/verifications'),
        api.get<{ categories: any[] }>('/api/admin/categories'),
        api.get<{ complaints: any[] }>('/api/admin/complaints'),
        api.get<{ logs: any[] }>('/api/admin/audit-logs').catch(() => ({ logs: [] })),
      ]);
      setAnalytics(aRes);
      setUsers(uRes.users);
      setProperties(pRes.properties);
      setProfessionals(proRes.professionals);
      setJobs(jobRes.jobs);
      setVerifications(vRes.records);
      setCategories(cRes.categories);
      setComplaints(compRes.complaints);
      setAuditLogs(auditRes.logs);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to load admin operations data.');
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) loadAll();
  }, [authLoading, loadAll]);

  if (!authLoading && (!user || !user.roles.includes('admin'))) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="card p-8">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Administrator Access Required</h1>
          <p className="mt-2 text-sm text-slate-500">
            This governance console is restricted to authorized platform administrators.
          </p>
          <Link to="/dashboard" className="btn-primary mt-6">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const sidebarItems: Array<{
    key: AdminSection;
    label: string;
    badge?: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'overview', label: 'Platform Overview', icon: LayoutDashboard },
    { key: 'users', label: 'Users', badge: users.length, icon: Users },
    { key: 'properties', label: 'Property Listings', badge: properties.length, icon: Building2 },
    { key: 'professionals', label: 'Professionals', badge: professionals.length, icon: Users },
    { key: 'jobs', label: 'Job Posts', badge: jobs.length, icon: Briefcase },
    {
      key: 'verifications',
      label: 'Verification',
      badge: analytics?.counts?.pendingVerifications || 0,
      icon: ShieldCheck,
    },
    {
      key: 'complaints',
      label: 'Complaints',
      badge: complaints.filter((c) => ['open', 'investigating'].includes(c.status)).length,
      icon: AlertTriangle,
    },
    {
      key: 'reports',
      label: 'Reports',
      badge: complaints.length,
      icon: FileWarning,
    },
    { key: 'analytics', label: 'Analytics & Trades', icon: BarChart3 },
    { key: 'audit', label: 'Audit Trail', badge: auditLogs.length, icon: History },
  ];

  const maxStateCount = Math.max(1, ...(analytics?.propertiesByState || []).map((x: any) => x.count));
  const maxCatCount = Math.max(1, ...(analytics?.professionalsByCategory || []).map((x: any) => x.count));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-5">
        <p className="section-kicker">Administration Console</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
          ZAIDAAT Platform Governance, KYC Verification &amp; Operations
        </h1>
      </div>

      {/* Responsive Mobile Tabs */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 lg:hidden">
        {sidebarItems.map((t) => {
          const Icon = t.icon;
          const active = section === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSection(t.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                active ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span className={`rounded px-1 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Persistent Admin Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="card sticky top-20 p-2.5">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Governance Sections
            </p>
            <nav className="space-y-0.5" aria-label="Admin sidebar navigation">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSection(item.key)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? 'bg-navy-900 text-white shadow-subtle'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${active ? 'text-brand-400' : 'text-slate-400'}`} />
                      {item.label}
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-price ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-w-0 flex-1 space-y-6">
          {section === 'overview' && analytics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: 'Total Users', val: analytics.counts.users, target: 'users' as AdminSection },
                  { label: 'Active Properties', val: analytics.counts.propertiesActive, target: 'properties' as AdminSection },
                  { label: 'Professionals', val: analytics.counts.professionals, target: 'professionals' as AdminSection },
                  { label: 'Pending KYC', val: analytics.counts.pendingVerifications, target: 'verifications' as AdminSection },
                  { label: 'Open Work Posts', val: analytics.counts.openJobs, target: 'jobs' as AdminSection },
                ].map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setSection(m.target)}
                    className="card-hover p-4 text-left"
                  >
                    <p className="text-xs font-medium text-slate-500">{m.label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-navy-900 tabular-price">{m.val}</p>
                  </button>
                ))}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="card p-6">
                  <h2 className="text-sm font-bold text-slate-900">Pending KYC Verification Queue</h2>
                  <div className="mt-3 space-y-2.5">
                    {verifications.filter((v) => v.status === 'pending').length === 0 ? (
                      <p className="text-xs text-slate-500">All verification submissions have been reviewed.</p>
                    ) : (
                      verifications
                        .filter((v) => v.status === 'pending')
                        .slice(0, 4)
                        .map((v) => (
                          <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs">
                            <div>
                              <p className="font-bold text-slate-900">{v.display_name || v.full_name}</p>
                              <p className="text-slate-500">{v.document_type} &middot; {v.city}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSection('verifications')}
                              className="font-semibold text-brand-600 hover:underline"
                            >
                              Review &rarr;
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="text-sm font-bold text-slate-900">Platform Activity Snapshot</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500">Verified Pros</p>
                      <p className="mt-1 text-lg font-extrabold text-emerald-700 tabular-price">
                        {analytics.counts.verifiedProfessionals}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500">Active Projects</p>
                      <p className="mt-1 text-lg font-extrabold text-navy-900 tabular-price">
                        {analytics.counts.activeProjects}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500">Open Complaints</p>
                      <p className="mt-1 text-lg font-extrabold text-rose-600 tabular-price">
                        {analytics.counts.openComplaints}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500">Paid Plans</p>
                      <p className="mt-1 text-lg font-extrabold text-brand-600 tabular-price">
                        {analytics.counts.paidSubscriptions}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'users' && (
            <div className="card overflow-x-auto p-6">
              <h2 className="mb-4 text-base font-bold text-slate-900">Registered Users ({users.length})</h2>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-3 pr-4">User</th>
                    <th className="py-3 pr-4">Contact</th>
                    <th className="py-3 pr-4">Roles</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 pr-4 font-bold text-slate-900">{u.full_name}</td>
                      <td className="py-3 pr-4 text-xs text-slate-600">
                        {u.email || '-'} <br /> {u.phone || '-'}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r: string) => (
                            <span key={r} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold uppercase text-slate-700">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-bold ${u.is_active ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await api.patch(`/api/admin/users/${u.id}`, { isActive: !u.is_active });
                              toast.success(`User ${u.is_active ? 'suspended' : 'activated'}.`);
                              loadAll();
                            } catch (err: any) {
                              toast.error(err?.message || 'Unable to update user status.');
                            }
                          }}
                          className="btn-secondary px-3 py-1 text-xs"
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {section === 'properties' && (
            <div className="card space-y-3 p-6">
              <h2 className="text-base font-bold text-slate-900">Property Listings Moderation ({properties.length})</h2>
              {properties.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <Link to={`/properties/${p.id}`} className="font-bold text-slate-900 hover:text-brand-600">
                      {p.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      Owner: {p.owner_name} &middot; {p.city}, {p.state} &middot; {formatINR(p.price, true)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.patch(`/api/admin/properties/${p.id}`, { isFeatured: !p.is_featured });
                          toast.success(p.is_featured ? 'Removed featured badge.' : 'Marked as Featured!');
                          loadAll();
                        } catch (err: any) {
                          toast.error(err?.message || 'Unable to update property feature state.');
                        }
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        p.is_featured ? 'bg-amber-100 text-amber-800' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p.is_featured ? 'Featured ★' : 'Feature'}
                    </button>
                    <select
                      aria-label={`Status for ${p.title}`}
                      value={p.status}
                      onChange={async (e) => {
                        try {
                          await api.patch(`/api/admin/properties/${p.id}`, { status: e.target.value });
                          toast.success(`Listing marked ${e.target.value}.`);
                          loadAll();
                        } catch (err: any) {
                          toast.error(err?.message || 'Unable to update property status.');
                        }
                      }}
                      className="input-field w-32 py-1.5 text-xs font-semibold"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                      <option value="rented">Rented</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === 'professionals' && (
            <div className="card overflow-x-auto p-6">
              <h2 className="mb-4 text-base font-bold text-slate-900">Registered Professionals ({professionals.length})</h2>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-3 pr-4">Professional</th>
                    <th className="py-3 pr-4">Trade &amp; City</th>
                    <th className="py-3 pr-4">Rating &amp; Jobs</th>
                    <th className="py-3 pr-4">Verification</th>
                    <th className="py-3 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {professionals.map((pro) => (
                    <tr key={pro.id}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-slate-900">{pro.display_name}</p>
                        <p className="text-xs text-slate-500">{pro.user_email || pro.user_phone}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-700">
                        <span className="font-semibold">{pro.category_name}</span>
                        <br />
                        {pro.city}, {pro.state}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-700 tabular-price">
                        {Number(pro.rating_avg || 0).toFixed(1)}★ ({pro.review_count}) &middot; {pro.completed_jobs_count} jobs
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                            pro.verification_status === 'verified'
                              ? 'bg-emerald-50 text-emerald-700'
                              : pro.verification_status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {pro.verification_status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link to={`/professionals/${pro.id}`} className="btn-secondary px-3 py-1 text-xs">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {section === 'jobs' && (
            <div className="card space-y-3 p-6">
              <h2 className="text-base font-bold text-slate-900">Work Requirements &amp; Tenders ({jobs.length})</h2>
              {jobs.map((j) => (
                <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <Link to={`/jobs/${j.id}`} className="font-bold text-slate-900 hover:text-brand-600">
                      {j.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {j.category_name} &middot; Client: {j.customer_name} &middot; {j.city}, {j.state} &middot;{' '}
                      {j.applications_count} apps, {j.quotations_count} quotes
                    </p>
                  </div>
                  <select
                    aria-label={`Status for job ${j.title}`}
                    value={j.status}
                    onChange={async (e) => {
                      try {
                        await api.patch(`/api/admin/jobs/${j.id}`, { status: e.target.value });
                        toast.success(`Job status updated to ${e.target.value}.`);
                        loadAll();
                      } catch (err: any) {
                        toast.error(err?.message || 'Unable to update job status.');
                      }
                    }}
                    className="input-field w-36 py-1.5 text-xs font-semibold"
                  >
                    <option value="open">Open</option>
                    <option value="in_review">In Review</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {section === 'verifications' && (
            <div className="card space-y-3 p-6">
              <h2 className="text-base font-bold text-slate-900">KYC Verification Queue ({verifications.length})</h2>
              {verifications.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      {v.display_name || v.full_name} &middot; {v.category_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Document: <strong>{v.document_type}</strong> ({v.document_number_masked}) &middot; {v.city}, {v.state}
                    </p>
                    {v.document_file_url && (
                      <a href={v.document_file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-600 underline">
                        Inspect Uploaded File
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-700">
                      {v.status}
                    </span>
                    {v.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await api.patch(`/api/admin/verifications/${v.id}`, {
                                status: 'verified',
                                adminNotes: 'Verified by Admin desk',
                              });
                              toast.success('Professional KYC approved.');
                              loadAll();
                            } catch (err: any) {
                              toast.error(err?.message || 'Unable to approve verification.');
                            }
                          }}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await api.patch(`/api/admin/verifications/${v.id}`, {
                                status: 'rejected',
                                adminNotes: 'Document unclear; please re-upload.',
                              });
                              toast.info('Verification marked rejected.');
                              loadAll();
                            } catch (err: any) {
                              toast.error(err?.message || 'Unable to reject verification.');
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(section === 'complaints' || section === 'reports') && (
            <div className="card space-y-3 p-6">
              <h2 className="text-base font-bold text-slate-900">
                {section === 'complaints' ? 'Open Complaints & Disputes' : 'All Submitted Reports & Abuse Logs'}
              </h2>
              {(section === 'complaints'
                ? complaints.filter((c) => ['open', 'investigating'].includes(c.status))
                : complaints
              ).length === 0 ? (
                <p className="text-sm text-slate-500">No items in this queue right now.</p>
              ) : (
                (section === 'complaints'
                  ? complaints.filter((c) => ['open', 'investigating'].includes(c.status))
                  : complaints
                ).map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold uppercase text-rose-700">
                          {c.target_type} #{c.target_id}
                        </span>
                        <p className="mt-1 font-bold text-slate-900">{c.reason}</p>
                        <p className="text-xs text-slate-600">{c.details}</p>
                        <p className="mt-1 text-xs text-slate-500">Reported by: {c.reporter_name}</p>
                      </div>
                      <select
                        aria-label={`Status for report ${c.id}`}
                        value={c.status}
                        onChange={async (e) => {
                          try {
                            await api.patch(`/api/admin/complaints/${c.id}`, {
                              status: e.target.value,
                              adminResolution: `Marked ${e.target.value} by admin.`,
                            });
                            toast.success(`Report marked ${e.target.value}.`);
                            loadAll();
                          } catch (err: any) {
                            toast.error(err?.message || 'Unable to update report status.');
                          }
                        }}
                        className="input-field w-40 py-1.5 text-xs font-semibold"
                      >
                        <option value="open">Open</option>
                        <option value="investigating">Investigating</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {section === 'analytics' && analytics && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="card p-6">
                  <h2 className="text-base font-bold text-slate-900">Properties by State</h2>
                  <div className="mt-4 space-y-3">
                    {analytics.propertiesByState.map((s: any) => (
                      <div key={s.state}>
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{s.state}</span>
                          <span className="tabular-price">{s.count}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-navy-900"
                            style={{ width: `${Math.max(8, Math.round((s.count / maxStateCount) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="text-base font-bold text-slate-900">Professionals by Trade Category</h2>
                  <div className="mt-4 space-y-3">
                    {analytics.professionalsByCategory.map((c: any) => (
                      <div key={c.name}>
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{c.name}</span>
                          <span className="tabular-price">{c.count}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{ width: `${Math.max(8, Math.round((c.count / maxCatCount) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trade Category Management */}
              <div className="grid gap-6 lg:grid-cols-12">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (creatingCat) return;
                    setCreatingCat(true);
                    try {
                      await api.post('/api/admin/categories', {
                        name: newCatName,
                        groupName: newCatGroup,
                        description: newCatDesc,
                      });
                      setNewCatName('');
                      setNewCatDesc('');
                      toast.success('New trade category added.');
                      loadAll();
                    } catch (err: any) {
                      toast.error(err?.message || 'Unable to create trade category.');
                    } finally {
                      setCreatingCat(false);
                    }
                  }}
                  className="card space-y-3 p-6 lg:col-span-4"
                >
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Tags className="h-4 w-4 text-brand-600" /> Add Trade Category
                  </h3>
                  <input
                    type="text"
                    required
                    placeholder="Category Name (e.g. Solar Installers)"
                    aria-label="Category Name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="input-field"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Group (e.g. Electrical & Smart Home)"
                    aria-label="Category Group"
                    value={newCatGroup}
                    onChange={(e) => setNewCatGroup(e.target.value)}
                    className="input-field"
                  />
                  <textarea
                    rows={3}
                    required
                    placeholder="Description"
                    aria-label="Category Description"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="input-field"
                  />
                  <button type="submit" disabled={creatingCat} className="btn-primary w-full text-xs">
                    <PlusCircle className="h-4 w-4" /> {creatingCat ? 'Creating...' : 'Create Category'}
                  </button>
                </form>

                <div className="card space-y-2 p-6 lg:col-span-8">
                  <h3 className="text-sm font-bold text-slate-900">All Categories ({categories.length})</h3>
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.group_name} &middot; {c.pro_count} professionals</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await api.patch(`/api/admin/categories/${c.id}`, { isActive: !c.is_active });
                              toast.info(`Category ${c.is_active ? 'disabled' : 'enabled'}.`);
                              loadAll();
                            } catch (err: any) {
                              toast.error(err?.message || 'Unable to update category status.');
                            }
                          }}
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${
                            c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {c.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {section === 'audit' && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Administrative Audit Trail</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Immutable log of user role changes, KYC reviews, listing moderation, and complaint resolutions.
                  </p>
                </div>
                <span className="tabular-price text-xs font-semibold text-slate-500">
                  {auditLogs.length} events
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No administrative write actions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{log.admin_name || 'Admin'}</p>
                            <p className="text-[11px] text-slate-500">{log.admin_email}</p>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-navy-900">
                            {log.action}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {log.target_type} #{log.target_id}
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-slate-500" title={log.details_json || ''}>
                            {log.details_json || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
