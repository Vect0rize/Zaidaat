import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  Edit3,
  FileText,
  FolderKanban,
  Heart,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  PlusCircle,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { api, uploadFiles, uploadKycFiles } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import type { JobPost, ProfessionalProfile, ProjectSummary, Property } from '../types';
import { formatDate, formatINR, formatLabel, formatPropertyPrice } from '../lib/format';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';

type CustomerNavKey =
  | 'overview'
  | 'my_properties'
  | 'saved_properties'
  | 'enquiries'
  | 'hired_pros'
  | 'posted_jobs'
  | 'active_projects'
  | 'messages';

type WorkerNavKey =
  | 'profile'
  | 'work_requests'
  | 'find_work'
  | 'applications'
  | 'quotations'
  | 'active_projects'
  | 'portfolio'
  | 'availability'
  | 'reviews';

export function DashboardPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [roleMode, setRoleMode] = useState<'customer' | 'professional'>('customer');
  const [customerNav, setCustomerNav] = useState<CustomerNavKey>('overview');
  const [workerNav, setWorkerNav] = useState<WorkerNavKey>('profile');

  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [enquiries, setEnquiries] = useState<{ received: any[]; sent: any[] }>({ received: [], sent: [] });
  const [myJobs, setMyJobs] = useState<JobPost[]>([]);
  const [openJobsFeed, setOpenJobsFeed] = useState<JobPost[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [messageThreads, setMessageThreads] = useState<any[]>([]);
  const [proReviews, setProReviews] = useState<any[]>([]);
  const [workActivity, setWorkActivity] = useState<any>({
    customerHiringRequests: [],
    customerQuotations: [],
    proHiringRequests: [],
    proApplications: [],
    proQuotations: [],
  });
  const [proData, setProData] = useState<{ profile: ProfessionalProfile | null; portfolio: any[]; verifications: any[] }>({
    profile: null,
    portfolio: [],
    verifications: [],
  });
  const [loading, setLoading] = useState(true);

  // Portfolio modal
  const [portOpen, setPortOpen] = useState(false);
  const [portTitle, setPortTitle] = useState('');
  const [portDesc, setPortDesc] = useState('');
  const [portCity, setPortCity] = useState('');
  const [portBudget, setPortBudget] = useState('');
  const [portYear, setPortYear] = useState('2026');
  const [portImage, setPortImage] = useState('/uploads/seed/work-construction.jpg');

  // Verification modal
  const [verOpen, setVerOpen] = useState(false);
  const [verType, setVerType] = useState('aadhaar_masked');
  const [verNumber, setVerNumber] = useState('');
  const [verFileUrl, setVerFileUrl] = useState('');

  // Quote for direct hiring request modal
  const [hrQuoteTarget, setHrQuoteTarget] = useState<any | null>(null);
  const [hrQuoteTitle, setHrQuoteTitle] = useState('');
  const [hrQuoteSummary, setHrQuoteSummary] = useState('');
  const [hrQuoteAmount, setHrQuoteAmount] = useState('');
  const [hrQuoteDays, setHrQuoteDays] = useState('10');

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [propsRes, savedRes, enqRes, jobsRes, projRes, actRes, proRes, threadsRes, openJobsRes] = await Promise.all([
        api.get<{ properties: Property[] }>('/api/properties/mine'),
        api.get<{ properties: Property[] }>('/api/properties/saved'),
        api.get<{ received: any[]; sent: any[] }>('/api/properties/enquiries/mine'),
        api.get<{ jobs: JobPost[] }>('/api/work/jobs/mine'),
        api.get<{ projects: ProjectSummary[] }>('/api/projects'),
        api.get<any>('/api/work/my-activity'),
        api.get<{ profile: ProfessionalProfile | null; portfolio: any[]; verifications: any[] }>(
          '/api/professionals/me/profile'
        ),
        api.get<{ threads: any[] }>('/api/messages/threads').catch(() => ({ threads: [] })),
        api.get<{ jobs: JobPost[] }>('/api/work/jobs?limit=6&status=open').catch(() => ({ jobs: [] })),
      ]);

      setMyProperties(propsRes.properties);
      setSavedProperties(savedRes.properties);
      setEnquiries(enqRes);
      setMyJobs(jobsRes.jobs);
      setProjects(projRes.projects);
      setWorkActivity(actRes);
      setProData(proRes);
      setMessageThreads(threadsRes.threads);
      setOpenJobsFeed(openJobsRes.jobs);

      if (proRes.profile) {
        api
          .get<{ reviews: any[] }>(`/api/professionals/${proRes.profile.id}`)
          .then((d) => setProReviews(d.reviews || []))
          .catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      if (user.roles.includes('professional') && !user.roles.includes('customer')) {
        setRoleMode('professional');
      }
      loadDashboard();
    }
  }, [user, authLoading, navigate, loadDashboard]);

  const handleDeleteProperty = async (id: number) => {
    if (!window.confirm('Delete this property listing permanently?')) return;
    await api.delete(`/api/properties/${id}`);
    toast.success('Property listing removed.');
    loadDashboard();
  };

  const handleAvailabilityChange = async (availabilityStatus: string) => {
    await api.patch('/api/professionals/me/availability', { availabilityStatus });
    await refreshUser();
    toast.success(`Availability switched to ${availabilityStatus}.`);
    loadDashboard();
  };

  const handleHiringRespond = async (hrId: number, status: 'accepted' | 'rejected') => {
    await api.patch<{ ok: boolean; projectId: number | null }>(
      `/api/work/hiring-requests/${hrId}/respond`,
      { status }
    );
    toast.success(status === 'accepted' ? 'Work request accepted!' : 'Work request declined.');
    loadDashboard();
  };

  const handleAcceptQuote = async (quoteId: number) => {
    await api.post<{ ok: boolean; projectId: number | null }>(
      `/api/work/quotations/${quoteId}/accept`
    );
    toast.success('Quotation accepted and professional hired.');
    loadDashboard();
  };

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  const customerNavItems: Array<{ key: CustomerNavKey; label: string; badge?: number; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'my_properties', label: 'My Properties', badge: myProperties.length, icon: Building2 },
    { key: 'saved_properties', label: 'Saved Properties', badge: savedProperties.length, icon: Heart },
    { key: 'enquiries', label: 'Enquiries', badge: enquiries.received.length + enquiries.sent.length, icon: Inbox },
    {
      key: 'hired_pros',
      label: 'Hired Professionals',
      badge: workActivity.customerHiringRequests.length + workActivity.customerQuotations.length,
      icon: UserCheck,
    },
    { key: 'posted_jobs', label: 'Posted Jobs', badge: myJobs.length, icon: Briefcase },
    { key: 'active_projects', label: 'Active Projects', badge: projects.length, icon: FolderKanban },
    { key: 'messages', label: 'Messages', badge: user.unreadMessages || messageThreads.length, icon: MessageSquare },
  ];

  const workerNavItems: Array<{ key: WorkerNavKey; label: string; badge?: number; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'profile', label: 'Professional Profile', icon: Users },
    { key: 'work_requests', label: 'Work Requests', badge: workActivity.proHiringRequests.length, icon: Bell },
    { key: 'find_work', label: 'Find Work', badge: openJobsFeed.length, icon: Search },
    { key: 'applications', label: 'My Applications', badge: workActivity.proApplications.length, icon: FileText },
    { key: 'quotations', label: 'Quotations', badge: workActivity.proQuotations.length, icon: FileText },
    { key: 'active_projects', label: 'Active Projects', badge: projects.length, icon: FolderKanban },
    { key: 'portfolio', label: 'Portfolio', badge: proData.portfolio.length, icon: ImageIcon },
    { key: 'availability', label: 'Availability', icon: CalendarClock },
    { key: 'reviews', label: 'Reviews', badge: proReviews.length, icon: Star },
  ];

  const activeNavList = roleMode === 'customer' ? customerNavItems : workerNavItems;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Account Workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Welcome, {user.fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Unified control center for your property listings, contractor hires, work tenders, and messages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-subtle">
            <button
              type="button"
              onClick={() => setRoleMode('customer')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                roleMode === 'customer' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Dashboard
            </button>
            <button
              type="button"
              onClick={() => setRoleMode('professional')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                roleMode === 'professional' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Worker Dashboard
            </button>
          </div>
          {user.roles.includes('admin') && (
            <Link to="/admin" className="btn-primary px-3.5 py-2 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Console
            </Link>
          )}
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer Bar */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 lg:hidden">
        {activeNavList.map((item) => {
          const Icon = item.icon;
          const isActive =
            roleMode === 'customer' ? customerNav === item.key : workerNav === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                roleMode === 'customer'
                  ? setCustomerNav(item.key as CustomerNavKey)
                  : setWorkerNav(item.key as WorkerNavKey)
              }
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className={`ml-0.5 rounded px-1 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Persistent Desktop Sidebar + Main Content Grid */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="card sticky top-20 p-2.5">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {roleMode === 'customer' ? 'Customer Navigation' : 'Worker Navigation'}
            </p>
            <nav className="space-y-0.5" aria-label="Dashboard sidebar">
              {activeNavList.map((item) => {
                const Icon = item.icon;
                const isActive =
                  roleMode === 'customer' ? customerNav === item.key : workerNav === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      roleMode === 'customer'
                        ? setCustomerNav(item.key as CustomerNavKey)
                        : setWorkerNav(item.key as WorkerNavKey)
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-navy-900 text-white shadow-subtle'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                      {item.label}
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-price ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
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

        {/* Main Workspace Panel */}
        <div className="min-w-0 flex-1 space-y-6">
          {loading ? (
            <div className="card h-72 animate-pulse bg-slate-100" />
          ) : roleMode === 'customer' ? (
            <>
              {customerNav === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { label: 'My Properties', val: myProperties.length, action: () => setCustomerNav('my_properties') },
                      { label: 'Saved Shortlist', val: savedProperties.length, action: () => setCustomerNav('saved_properties') },
                      { label: 'Work Posts & Hires', val: myJobs.length + workActivity.customerHiringRequests.length, action: () => setCustomerNav('posted_jobs') },
                      { label: 'Active Projects', val: projects.length, action: () => setCustomerNav('active_projects') },
                    ].map((stat) => (
                      <button
                        key={stat.label}
                        type="button"
                        onClick={stat.action}
                        className="card-hover p-4 text-left"
                      >
                        <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                        <p className="mt-1 text-2xl font-extrabold text-navy-900 tabular-price">{stat.val}</p>
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Link to="/sell" className="card-hover flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <PlusCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">List a Property</p>
                        <p className="text-xs text-slate-500">Sell or rent flat, villa, shop</p>
                      </div>
                    </Link>
                    <Link to="/post-job" className="card-hover flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-navy-900">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Post Work Requirement</p>
                        <p className="text-xs text-slate-500">Collect itemized pro quotes</p>
                      </div>
                    </Link>
                    <Link to="/professionals" className="card-hover flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Find Verified Vendors</p>
                        <p className="text-xs text-slate-500">Browse contractors &amp; artisans</p>
                      </div>
                    </Link>
                  </div>

                  <section className="card p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900">Recent Property Enquiries</h2>
                      <button type="button" onClick={() => setCustomerNav('enquiries')} className="text-xs font-semibold text-brand-600 hover:underline">
                        View All &rarr;
                      </button>
                    </div>
                    {enquiries.received.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-500">No incoming property enquiries yet.</p>
                    ) : (
                      <div className="mt-3 space-y-2.5">
                        {enquiries.received.slice(0, 3).map((enq) => (
                          <div key={enq.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-xs">
                            <div>
                              <p className="font-bold text-slate-900">{enq.buyer_name} &middot; {enq.property_title}</p>
                              <p className="text-slate-500">{enq.message}</p>
                            </div>
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold uppercase text-slate-700">
                              {enq.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {customerNav === 'my_properties' && (
                <section className="card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900">My Property Listings ({myProperties.length})</h2>
                    <Link to="/sell" className="btn-primary px-3.5 py-2 text-xs">
                      <PlusCircle className="h-4 w-4" /> List New Property
                    </Link>
                  </div>
                  {myProperties.length === 0 ? (
                    <div className="mt-4">
                      <EmptyState
                        title="No properties listed yet"
                        description="Publish a residential or commercial property to start receiving direct enquiries."
                        action={<Link to="/sell" className="btn-primary text-xs">Post Property</Link>}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {myProperties.map((p) => (
                        <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={p.images[0]?.url || '/uploads/seed/prop-pune-apt.jpg'}
                              alt=""
                              className="h-16 w-24 rounded-lg object-cover border border-slate-200"
                            />
                            <div>
                              <Link to={`/properties/${p.id}`} className="font-bold text-slate-900 hover:text-brand-600">
                                {p.title}
                              </Link>
                              <p className="text-xs text-slate-500">
                                {p.locality}, {p.city} &middot; {formatPropertyPrice(p.price, p.listingPurpose)} &middot;{' '}
                                <span className="font-bold uppercase text-emerald-700">{p.status}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link to={`/properties/${p.id}/edit`} className="btn-secondary px-3 py-1.5 text-xs">
                              <Edit3 className="h-3.5 w-3.5" /> Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteProperty(p.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {customerNav === 'saved_properties' && (
                <section className="card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Saved Properties ({savedProperties.length})</h2>
                    <Link to="/buy" className="text-xs font-semibold text-brand-600 hover:underline">
                      Browse More Properties &rarr;
                    </Link>
                  </div>
                  {savedProperties.length === 0 ? (
                    <div className="mt-4">
                      <EmptyState
                        title="No saved properties"
                        description="Tap the heart icon on any Buy or Rent card to shortlist properties here."
                        action={<Link to="/buy" className="btn-primary text-xs">Explore Buy</Link>}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {savedProperties.map((sp) => (
                        <div key={sp.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5">
                          <Link to={`/properties/${sp.id}`} className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900 hover:text-brand-600">{sp.title}</p>
                            <p className="text-xs text-slate-500">
                              {sp.locality}, {sp.city} &middot; {formatPropertyPrice(sp.price, sp.listingPurpose)}
                            </p>
                          </Link>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.post(`/api/properties/${sp.id}/save`);
                              toast.info('Removed from saved properties.');
                              loadDashboard();
                            }}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {customerNav === 'enquiries' && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="card p-6">
                    <h2 className="text-base font-bold text-slate-900">Enquiries Received ({enquiries.received.length})</h2>
                    <div className="mt-4 space-y-3">
                      {enquiries.received.length === 0 ? (
                        <p className="text-sm text-slate-500">No incoming enquiries yet.</p>
                      ) : (
                        enquiries.received.map((enq) => (
                          <div key={enq.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-slate-900">{enq.buyer_name} ({enq.buyer_phone})</p>
                              <select
                                value={enq.status}
                                onChange={async (e) => {
                                  await api.patch(`/api/properties/enquiries/${enq.id}/status`, { status: e.target.value });
                                  toast.success('Enquiry status updated.');
                                  loadDashboard();
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="site_visited">Site Visited</option>
                                <option value="closed">Closed</option>
                              </select>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-brand-700">{enq.property_title}</p>
                            <p className="mt-1 text-xs text-slate-600">{enq.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="card p-6">
                    <h2 className="text-base font-bold text-slate-900">Enquiries Sent ({enquiries.sent.length})</h2>
                    <div className="mt-4 space-y-3">
                      {enquiries.sent.length === 0 ? (
                        <p className="text-sm text-slate-500">You have not enquired on any properties yet.</p>
                      ) : (
                        enquiries.sent.map((enq) => (
                          <div key={enq.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <Link to={`/properties/${enq.property_id}`} className="font-bold text-slate-900 hover:text-brand-600">
                                {enq.property_title}
                              </Link>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700">
                                {enq.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">{enq.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}

              {customerNav === 'hired_pros' && (
                <section className="card p-6 space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-slate-900">
                        Hired Professionals &amp; Quotations ({workActivity.customerQuotations.length + workActivity.customerHiringRequests.length})
                      </h2>
                      <Link to="/professionals" className="btn-secondary px-3 py-1.5 text-xs">
                        Find Professionals
                      </Link>
                    </div>

                    <div className="mt-4 space-y-3">
                      {workActivity.customerQuotations.length === 0 && workActivity.customerHiringRequests.length === 0 ? (
                        <EmptyState
                          title="No professional hires or quotes yet"
                          description="Browse verified specialists or post a work requirement to compare itemized quotes."
                          action={<Link to="/professionals" className="btn-primary text-xs">Find Professionals</Link>}
                        />
                      ) : (
                        <>
                          {workActivity.customerQuotations.map((q: any) => (
                            <div key={`q-${q.id}`} className="rounded-xl border border-slate-200 p-4">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-slate-900">{q.title}</p>
                                <span className="text-sm font-extrabold text-navy-900 tabular-price">{formatINR(q.total_amount)}</span>
                              </div>
                              <p className="text-xs text-slate-500">From {q.pro_name} &middot; Status: {q.status}</p>
                              {q.status === 'sent' && (
                                <button
                                  type="button"
                                  onClick={() => handleAcceptQuote(q.id)}
                                  className="btn-primary mt-2.5 px-3 py-1.5 text-xs"
                                >
                                  Accept &amp; Hire
                                </button>
                              )}
                            </div>
                          ))}
                          {workActivity.customerHiringRequests.map((hr: any) => (
                            <div key={`hr-${hr.id}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-slate-900">{hr.title}</p>
                                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700">
                                  {hr.status}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                To {hr.pro_name} ({hr.category_name}) &middot; Budget {formatINR(hr.budget)}
                              </p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {customerNav === 'posted_jobs' && (
                <section className="card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Posted Work Requirements ({myJobs.length})</h2>
                    <Link to="/post-job" className="btn-primary px-3.5 py-2 text-xs">
                      <PlusCircle className="h-4 w-4" /> Post New Job
                    </Link>
                  </div>
                  <div className="mt-4 space-y-3">
                    {myJobs.length === 0 ? (
                      <EmptyState
                        title="No work requirements posted"
                        description="Post your renovation or construction brief to collect competitive itemized quotes."
                        action={<Link to="/post-job" className="btn-primary text-xs">Post Work Requirement</Link>}
                      />
                    ) : (
                      myJobs.map((j) => (
                        <Link key={j.id} to={`/jobs/${j.id}`} className="block rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-brand-700">{j.categoryName}</span>
                            <span className="text-xs font-bold uppercase text-slate-500">{j.status}</span>
                          </div>
                          <p className="mt-1 font-bold text-slate-900">{j.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {j.applicationsCount} Applications &middot; {j.quotationsCount} Quotations &middot; {j.city}, {j.state}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </section>
              )}

              {customerNav === 'active_projects' && (
                <section className="card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Active Work Orders ({projects.length})</h2>
                    <Link to="/post-job" className="btn-navy px-3.5 py-2 text-xs">
                      Post Work Requirement
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {projects.length === 0 ? (
                      <div className="sm:col-span-2">
                        <EmptyState
                          title="No active work orders yet"
                          description="Active work orders appear automatically when you accept a professional quote or hire request."
                          action={<Link to="/professionals" className="btn-primary text-xs">Find Professionals</Link>}
                        />
                      </div>
                    ) : (
                      projects.map((p) => (
                        <div key={p.id} className="card p-4">
                          <div className="flex justify-between">
                            <p className="font-bold text-slate-900">{p.title}</p>
                            <span className="text-xs font-bold text-brand-700 tabular-price">{p.progress_percent}%</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full bg-brand-600" style={{ width: `${p.progress_percent}%` }} />
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {p.city} &middot; Budget {formatINR(p.total_budget)} &middot; <span className="uppercase font-semibold">{p.status}</span>
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {customerNav === 'messages' && (
                <section className="card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Messages Inbox ({messageThreads.length})</h2>
                    <Link to="/messages" className="btn-primary px-3.5 py-2 text-xs">
                      Open Full Inbox
                    </Link>
                  </div>
                  <div className="mt-4 space-y-3">
                    {messageThreads.length === 0 ? (
                      <p className="text-sm text-slate-500">No message threads yet. Enquire on a property or message a contractor to start chatting.</p>
                    ) : (
                      messageThreads.map((th) => (
                        <Link
                          key={th.threadKey}
                          to={`/messages?thread=${encodeURIComponent(th.threadKey)}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">{th.peerName}</p>
                              {th.unreadCount > 0 && (
                                <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {th.unreadCount} new
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-slate-500">{th.lastMessage}</p>
                          </div>
                          <span className="text-[11px] font-medium text-slate-400 shrink-0">
                            {formatDate(th.lastAt)}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </section>
              )}
            </>
          ) : !proData.profile ? (
            <div className="card p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-brand-600" />
              <h2 className="mt-3 text-xl font-extrabold text-slate-900">Set Up Your Professional Profile</h2>
              <p className="mt-1 text-sm text-slate-500">
                Register your trade category, service cities, pricing rates, and work photos to appear on Find Professionals.
              </p>
              <Link to="/become-professional" className="btn-primary mt-5">
                Create Professional Profile
              </Link>
            </div>
          ) : (
            <>
              {workerNav === 'profile' && (
                <div className="space-y-6">
                  <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
                    <div className="flex items-center gap-4">
                      <Avatar name={proData.profile.displayName} src={proData.profile.profilePhotoUrl} size="lg" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-extrabold text-slate-900">{proData.profile.displayName}</h2>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                              proData.profile.verificationStatus === 'verified'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {proData.profile.verificationStatus}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {proData.profile.categoryName} &middot; {proData.profile.city}, {proData.profile.state} &middot;{' '}
                          {formatINR(proData.profile.rateMin)}–{formatINR(proData.profile.rateMax)} {proData.profile.rateUnitLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link to="/become-professional" className="btn-secondary px-3.5 py-2 text-xs">
                        Edit Profile
                      </Link>
                      <button type="button" onClick={() => setVerOpen(true)} className="btn-navy px-3.5 py-2 text-xs">
                        <ShieldCheck className="h-4 w-4" /> Submit Verification KYC
                      </button>
                    </div>
                  </div>

                  <section className="card p-6">
                    <h3 className="text-base font-bold text-slate-900">Verification History</h3>
                    <div className="mt-3 space-y-2">
                      {proData.verifications.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Submit GST, PAN, Trade License, or masked Aadhaar to unlock your ZAIDAAT Verified badge.
                        </p>
                      ) : (
                        proData.verifications.map((v) => (
                          <div key={v.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                            <div>
                              <p className="font-bold text-slate-900">
                                {formatLabel(v.document_type)} — {v.document_number_masked}
                              </p>
                              {v.admin_notes && <p className="text-xs text-slate-500">{v.admin_notes}</p>}
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700">
                              {v.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}

              {workerNav === 'work_requests' && (
                <section className="card p-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    Incoming Client Work Requests ({workActivity.proHiringRequests.length})
                  </h2>
                  <div className="mt-4 space-y-3">
                    {workActivity.proHiringRequests.length === 0 ? (
                      <p className="text-sm text-slate-500">No direct hiring requests received yet.</p>
                    ) : (
                      workActivity.proHiringRequests.map((hr: any) => (
                        <div key={hr.id} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-900">{hr.title}</p>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700">
                              {hr.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{hr.description}</p>
                          <p className="mt-1.5 text-xs font-semibold text-slate-500">
                            Client: {hr.customer_name} &middot; {hr.city}, {hr.state} &middot; Est. Budget {formatINR(hr.budget)}
                          </p>
                          {hr.status === 'pending' && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleHiringRespond(hr.id, 'accepted')}
                                className="btn-primary px-3 py-1.5 text-xs"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Accept &amp; Start Project
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHrQuoteTarget(hr);
                                  setHrQuoteTitle(`Quotation: ${hr.title}`);
                                  setHrQuoteAmount(String(hr.budget || 25000));
                                }}
                                className="btn-secondary px-3 py-1.5 text-xs"
                              >
                                Send Itemized Quotation
                              </button>
                              <button
                                type="button"
                                onClick={() => handleHiringRespond(hr.id, 'rejected')}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {workerNav === 'find_work' && (
                <section className="card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Latest Open Work Tenders</h2>
                    <Link to="/find-work" className="btn-primary px-3.5 py-2 text-xs">
                      Open Full Find Work Board
                    </Link>
                  </div>
                  <div className="mt-4 space-y-3">
                    {openJobsFeed.map((job) => (
                      <Link key={job.id} to={`/jobs/${job.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                        <div>
                          <span className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{job.categoryName}</span>
                          <p className="mt-1 font-bold text-slate-900">{job.title}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" /> {job.locality}, {job.city}, {job.state}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-navy-900 tabular-price">
                            {formatINR(job.budgetMin)}–{formatINR(job.budgetMax)}
                          </p>
                          <p className="text-[11px] text-slate-500">Apply &amp; Quote &rarr;</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {workerNav === 'applications' && (
                <section className="card p-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    My Job Applications ({workActivity.proApplications.length})
                  </h2>
                  <div className="mt-4 space-y-3">
                    {workActivity.proApplications.length === 0 ? (
                      <EmptyState
                        title="No applications sent yet"
                        description="Browse active jobs in Find Work and apply to relevant customer projects."
                        action={<Link to="/find-work" className="btn-primary text-xs">Browse Open Jobs</Link>}
                      />
                    ) : (
                      workActivity.proApplications.map((app: any) => (
                        <Link
                          key={`app-${app.id}`}
                          to={`/jobs/${app.job_id}`}
                          className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                        >
                          <div className="flex justify-between">
                            <p className="font-bold text-slate-900">{app.job_title}</p>
                            <span className="text-xs font-bold uppercase text-brand-700">{app.status}</span>
                          </div>
                          <p className="text-xs text-slate-500">{app.job_city}, {app.job_state}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </section>
              )}

              {workerNav === 'quotations' && (
                <section className="card p-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    Sent Quotations ({workActivity.proQuotations.length})
                  </h2>
                  <div className="mt-4 space-y-3">
                    {workActivity.proQuotations.length === 0 ? (
                      <p className="text-sm text-slate-500">No quotations sent yet.</p>
                    ) : (
                      workActivity.proQuotations.map((q: any) => (
                        <div key={`pq-${q.id}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="flex justify-between">
                            <p className="font-bold text-slate-900">{q.title}</p>
                            <span className="font-extrabold text-navy-900 tabular-price">{formatINR(q.total_amount)}</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Client: {q.customer_name} &middot; Status: <strong className="uppercase">{q.status}</strong>
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {workerNav === 'active_projects' && (
                <section className="card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Assigned Work Orders ({projects.length})</h2>
                    <Link to="/find-work" className="btn-navy px-3.5 py-2 text-xs">
                      Browse Work Tenders
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {projects.map((p) => (
                      <div key={p.id} className="card p-4">
                        <div className="flex justify-between">
                          <p className="font-bold text-slate-900">{p.title}</p>
                          <span className="text-xs font-bold text-brand-700 tabular-price">{p.progress_percent}%</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {p.city} &middot; Budget {formatINR(p.total_budget)} &middot; <span className="uppercase font-semibold">{p.status}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {workerNav === 'portfolio' && (
                <section className="card p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Work Portfolio ({proData.portfolio.length})</h2>
                    <button type="button" onClick={() => setPortOpen(true)} className="btn-primary px-3.5 py-2 text-xs">
                      <PlusCircle className="h-4 w-4" /> Add Work Photo
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {proData.portfolio.map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-xl border border-slate-200">
                        <img src={item.image_url} alt={item.title} className="h-36 w-full object-cover" />
                        <div className="p-3">
                          <p className="text-sm font-bold text-slate-900">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                          <button
                            type="button"
                            onClick={async () => {
                              await api.delete(`/api/professionals/me/portfolio/${item.id}`);
                              toast.info('Portfolio photo removed.');
                              loadDashboard();
                            }}
                            className="mt-2 text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {workerNav === 'availability' && (
                <section className="card p-6">
                  <h2 className="text-lg font-bold text-slate-900">Availability &amp; Booking Status</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update your live readiness status shown to homeowners across Find Professionals.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { val: 'available', title: 'Available Now', desc: 'Open for immediate site visits & new projects.' },
                      { val: 'busy', title: 'Busy (Upcoming Slots)', desc: 'Accepting advance bookings for upcoming dates.' },
                      { val: 'unavailable', title: 'Unavailable', desc: 'Temporarily paused from new work requests.' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => handleAvailabilityChange(opt.val)}
                        className={`rounded-xl border p-4 text-left transition ${
                          proData.profile?.availabilityStatus === opt.val
                            ? 'border-brand-600 bg-brand-50/70'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-sm font-bold text-slate-900">{opt.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {workerNav === 'reviews' && (
                <section className="card p-6">
                  <h2 className="text-lg font-bold text-slate-900">Client Reviews ({proReviews.length})</h2>
                  {proReviews.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No client reviews published yet.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {proReviews.map((r) => (
                        <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900">{r.title}</p>
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                              {r.rating}.0
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {r.reviewer_name} &middot; {formatDate(r.created_at)}
                          </p>
                          <p className="mt-2 text-xs text-slate-700">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Portfolio Modal */}
      <Modal open={portOpen} onClose={() => setPortOpen(false)} title="Add Work Portfolio Item">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await api.post('/api/professionals/me/portfolio', {
              title: portTitle,
              description: portDesc,
              projectCity: portCity,
              completionYear: Number(portYear),
              budgetDisplay: portBudget,
              imageUrl: portImage,
            });
            setPortOpen(false);
            setPortTitle('');
            setPortDesc('');
            toast.success('Work photo added to your portfolio.');
            loadDashboard();
          }}
          className="space-y-4"
        >
          <input
            type="text"
            required
            placeholder="Project Title"
            value={portTitle}
            onChange={(e) => setPortTitle(e.target.value)}
            className="input-field"
          />
          <textarea
            rows={3}
            required
            minLength={10}
            placeholder="Work performed and materials used..."
            value={portDesc}
            onChange={(e) => setPortDesc(e.target.value)}
            className="input-field"
          />
          <div className="grid grid-cols-3 gap-2">
            <input type="text" placeholder="City" value={portCity} onChange={(e) => setPortCity(e.target.value)} className="input-field" />
            <input type="text" placeholder="Value (e.g. ₹2.4L)" value={portBudget} onChange={(e) => setPortBudget(e.target.value)} className="input-field" />
            <input type="number" placeholder="Year" value={portYear} onChange={(e) => setPortYear(e.target.value)} className="input-field" />
          </div>
          <label className="btn-secondary w-full cursor-pointer text-xs">
            <Upload className="h-4 w-4" /> Upload Project Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                if (!e.target.files?.length) return;
                const files = await uploadFiles(e.target.files);
                if (files[0]) {
                  setPortImage(files[0].url);
                  toast.success('Photo uploaded.');
                }
              }}
            />
          </label>
          <button type="submit" className="btn-primary w-full">
            Save Portfolio Item
          </button>
        </form>
      </Modal>

      {/* Verification Modal */}
      <Modal open={verOpen} onClose={() => setVerOpen(false)} title="Submit Verification Document">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await api.post('/api/professionals/me/verification', {
              documentType: verType,
              documentNumberMasked: verNumber,
              documentFileUrl: verFileUrl || null,
            });
            setVerOpen(false);
            setVerNumber('');
            setVerFileUrl('');
            toast.success('KYC document submitted for admin verification.');
            loadDashboard();
          }}
          className="space-y-4"
        >
          <div>
            <label className="label-field">Document Type</label>
            <select value={verType} onChange={(e) => setVerType(e.target.value)} className="input-field">
              <option value="aadhaar_masked">Aadhaar (Masked last 4 digits only)</option>
              <option value="pan">PAN Card</option>
              <option value="gst">GST Registration</option>
              <option value="trade_license">Municipal / Electrical Trade License</option>
              <option value="coa_license">COA Architect License</option>
            </select>
          </div>
          <div>
            <label className="label-field">Masked Document Number</label>
            <input
              type="text"
              required
              minLength={4}
              placeholder="e.g. XXXX-XXXX-4821 or 27AABCU9603R1ZM"
              value={verNumber}
              onChange={(e) => setVerNumber(e.target.value)}
              className="input-field"
            />
          </div>
          <label className="btn-secondary w-full cursor-pointer text-xs">
            <Upload className="h-4 w-4" />
            {verFileUrl ? 'Document Uploaded ✓' : 'Upload Supporting Photo / PDF (Optional)'}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={async (e) => {
                if (!e.target.files?.length) return;
                try {
                  const files = await uploadKycFiles(e.target.files);
                  if (files[0]) {
                    setVerFileUrl(files[0].url);
                    toast.success('KYC file securely uploaded.');
                  }
                } catch (err: any) {
                  toast.error(err.message || 'Could not upload KYC document.');
                }
              }}
            />
          </label>
          <button type="submit" className="btn-primary w-full">
            Submit for Admin Verification
          </button>
        </form>
      </Modal>

      {/* Send Quotation for Direct Hiring Request */}
      <Modal
        open={Boolean(hrQuoteTarget)}
        onClose={() => setHrQuoteTarget(null)}
        title={`Send Quotation for "${hrQuoteTarget?.title || ''}"`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!hrQuoteTarget) return;
            await api.post('/api/work/quotations', {
              hiringRequestId: hrQuoteTarget.id,
              title: hrQuoteTitle,
              scopeSummary: hrQuoteSummary,
              totalAmount: Number(hrQuoteAmount),
              estimatedDurationDays: Number(hrQuoteDays),
              lineItems: [{ item: hrQuoteTitle, qty: '1 Lot', amount: Number(hrQuoteAmount) }],
            });
            setHrQuoteTarget(null);
            toast.success('Itemized quotation sent to client.');
            loadDashboard();
          }}
          className="space-y-4"
        >
          <input type="text" required value={hrQuoteTitle} onChange={(e) => setHrQuoteTitle(e.target.value)} className="input-field" />
          <textarea
            rows={3}
            required
            minLength={10}
            value={hrQuoteSummary}
            onChange={(e) => setHrQuoteSummary(e.target.value)}
            placeholder="Scope, material specs, and inclusions..."
            className="input-field"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              required
              min={100}
              value={hrQuoteAmount}
              onChange={(e) => setHrQuoteAmount(e.target.value)}
              placeholder="Total Amount (INR)"
              className="input-field"
            />
            <input
              type="number"
              required
              min={1}
              value={hrQuoteDays}
              onChange={(e) => setHrQuoteDays(e.target.value)}
              placeholder="Days"
              className="input-field"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Send Quotation to Client
          </button>
        </form>
      </Modal>
    </div>
  );
}
