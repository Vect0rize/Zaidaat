import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  IndianRupee,
  MapPin,
  MessageSquare,
  PlusCircle,
  Send,
  ShieldCheck,
  Star,
  UserPlus,
} from 'lucide-react';
import { api, uploadFiles } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import type { ProfessionalProfile, ProjectSummary } from '../types';
import { formatDate, formatINR, formatLabel } from '../lib/format';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { DetailPageSkeleton } from '../components/common/Skeleton';

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Progress Update Form
  const [updTitle, setUpdTitle] = useState('');
  const [updDesc, setUpdDesc] = useState('');
  const [updType, setUpdType] = useState<'milestone' | 'progress' | 'photo' | 'budget' | 'note'>('progress');
  const [updProgress, setUpdProgress] = useState('');
  const [updExpense, setUpdExpense] = useState('0');
  const [updPhotos, setUpdPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Project Message
  const [msgText, setMsgText] = useState('');

  // Assign Pro Modal
  const [addProOpen, setAddProOpen] = useState(false);
  const [allPros, setAllPros] = useState<ProfessionalProfile[]>([]);
  const [selectedProId, setSelectedProId] = useState('');
  const [proRole, setProRole] = useState('');
  const [agreedAmount, setAgreedAmount] = useState('0');

  // Review Modal after completion
  const [reviewPro, setReviewPro] = useState<any | null>(null);
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');

  const loadWorkspace = useCallback(() => {
    setLoading(true);
    api
      .get<{
        project: ProjectSummary;
        isOwner: boolean;
        professionals: any[];
        updates: any[];
        quotations: any[];
        messages: any[];
      }>(`/api/projects/${id}`)
      .then((res) => {
        setProject(res.project);
        setIsOwner(res.isOwner);
        setProfessionals(res.professionals);
        setUpdates(res.updates);
        setQuotations(res.quotations);
        setMessages(res.messages);
        setUpdProgress(String(res.project.progress_percent));
      })
      .catch((err) => setError(err.message || 'Could not load project'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const files = await uploadFiles(e.target.files);
      setUpdPhotos((prev) => [...prev, ...files.filter((f) => f.mediaType === 'image').map((f) => f.url)]);
    } finally {
      setUploading(false);
    }
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    await api.post(`/api/projects/${project.id}/updates`, {
      updateType: updType,
      title: updTitle,
      description: updDesc,
      progressPercent: updProgress !== '' ? Number(updProgress) : null,
      expenseAmount: Number(updExpense || 0),
      photos: updPhotos,
      milestoneStatus: 'done',
    });
    setUpdTitle('');
    setUpdDesc('');
    setUpdExpense('0');
    setUpdPhotos([]);
    toast.success('Site progress update logged.');
    loadWorkspace();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !msgText.trim()) return;
    await api.post(`/api/projects/${project.id}/messages`, { body: msgText.trim() });
    setMsgText('');
    toast.success('Message posted to project feed.');
    loadWorkspace();
  };

  const handleStatusChange = async (nextStatus: ProjectSummary['status']) => {
    if (!project) return;
    await api.patch(`/api/projects/${project.id}`, { status: nextStatus });
    toast.success(`Project status updated to ${nextStatus.replace('_', ' ')}.`);
    loadWorkspace();
  };

  const openAddPro = () => {
    api.get<{ professionals: ProfessionalProfile[] }>('/api/professionals?limit=50').then((res) => {
      setAllPros(res.professionals);
      if (res.professionals[0]) {
        setSelectedProId(String(res.professionals[0].id));
        setProRole(res.professionals[0].categoryName);
      }
      setAddProOpen(true);
    });
  };

  const handleAddProSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    await api.post(`/api/projects/${project.id}/professionals`, {
      professionalId: Number(selectedProId),
      roleInProject: proRole,
      agreedAmount: Number(agreedAmount || 0),
    });
    setAddProOpen(false);
    loadWorkspace();
  };

  if (loading) return <DetailPageSkeleton />;

  if (error || !project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900">{error || 'Project unavailable'}</h2>
        <Link to="/projects" className="btn-primary mt-4">
          Back to Project Hub
        </Link>
      </div>
    );
  }

  const allSitePhotos = updates.flatMap((u) => (u.photos || []).map((url: string) => ({ url, title: u.title, at: u.created_at })));
  const remainingBudget = Math.max(0, project.total_budget - project.spent_amount);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project Hub
        </button>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            {project.status !== 'completed' && (
              <button
                type="button"
                onClick={() => handleStatusChange('completed')}
                className="btn-primary px-3.5 py-2 text-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Project Completed
              </button>
            )}
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value as ProjectSummary['status'])}
              className="input-field w-40 py-2 text-xs font-bold"
              aria-label="Project Status"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* Summary Banner */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase text-brand-700">
                {formatLabel(project.project_type)}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700">
                {project.status}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">{project.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{project.description}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <MapPin className="h-4 w-4 text-brand-600" />
              {project.locality ? `${project.locality}, ` : ''}
              {project.city}, {project.state} • Owner: {project.customer_name}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-center">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Budget</p>
              <p className="mt-0.5 text-base font-extrabold text-navy-900">{formatINR(project.total_budget)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Spent</p>
              <p className="mt-0.5 text-base font-extrabold text-brand-600">{formatINR(project.spent_amount)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Remaining</p>
              <p className="mt-0.5 text-base font-extrabold text-emerald-700">{formatINR(remainingBudget)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs font-bold">
            <span className="text-slate-500">Completion Progress</span>
            <span className="text-navy-900">{project.progress_percent}% Complete</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${project.progress_percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left: Updates, Photos, Quotations */}
        <div className="space-y-6 lg:col-span-8">
          {/* Post Update / Photo / Expense */}
          <form onSubmit={handlePostUpdate} className="card space-y-4 p-6">
            <h2 className="text-lg font-bold text-slate-900">Post Progress, Milestone, Site Photo or Expense</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <select value={updType} onChange={(e) => setUpdType(e.target.value as any)} className="input-field">
                <option value="progress">Progress Update</option>
                <option value="milestone">Milestone</option>
                <option value="photo">Site Photos</option>
                <option value="budget">Expense / Payment</option>
                <option value="note">Note</option>
              </select>
              <input
                type="text"
                required
                minLength={3}
                value={updTitle}
                onChange={(e) => setUpdTitle(e.target.value)}
                placeholder="Update title (e.g. Tiling 80% done)"
                className="input-field sm:col-span-3"
              />
            </div>

            <textarea
              rows={2}
              required
              minLength={5}
              value={updDesc}
              onChange={(e) => setUpdDesc(e.target.value)}
              placeholder="Describe work completed, materials received, or next step..."
              className="input-field"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Updated Progress (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={updProgress}
                  onChange={(e) => setUpdProgress(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Add Expense (₹)</label>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min={0}
                    value={updExpense}
                    onChange={(e) => setUpdExpense(e.target.value)}
                    className="input-field pl-9"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <label className="btn-secondary w-full cursor-pointer text-xs">
                  <Camera className="h-4 w-4 text-brand-600" />
                  {uploading ? 'Uploading...' : `Add Site Photos (${updPhotos.length})`}
                  <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={uploading} className="btn-primary text-xs">
                <PlusCircle className="h-4 w-4" />
                Publish Update
              </button>
            </div>
          </form>

          {/* Updates Timeline */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-900">Work Progress &amp; Milestones ({updates.length})</h2>
            <div className="mt-4 space-y-4">
              {updates.length === 0 ? (
                <p className="text-sm text-slate-500">No updates posted yet.</p>
              ) : (
                updates.map((u) => (
                  <div key={u.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-brand-700 border border-slate-200">
                        {u.update_type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {u.author_name} • {formatDate(u.created_at)}
                      </span>
                    </div>
                    <h3 className="mt-2 font-bold text-slate-900">{u.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{u.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                      {u.progress_percent !== null && (
                        <span className="text-emerald-700">Progress set to {u.progress_percent}%</span>
                      )}
                      {u.expense_amount > 0 && (
                        <span className="text-brand-700">Expense logged: {formatINR(u.expense_amount)}</span>
                      )}
                    </div>
                    {u.photos?.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {u.photos.map((photo: string, i: number) => (
                          <img key={photo + i} src={photo} alt="" className="h-28 w-full rounded-xl object-cover border border-slate-200" />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Site Photographs Gallery */}
          {allSitePhotos.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900">Project Photographs ({allSitePhotos.length})</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {allSitePhotos.map((p, idx) => (
                  <div key={p.url + idx} className="overflow-hidden rounded-xl border border-slate-200">
                    <img src={p.url} alt={p.title} className="h-32 w-full object-cover" />
                    <p className="truncate bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600">
                      {p.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Quotations */}
          {quotations.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900">Quotations ({quotations.length})</h2>
              <div className="mt-3 space-y-3">
                {quotations.map((q) => (
                  <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="font-bold text-slate-900">{q.title}</p>
                      <p className="text-xs text-slate-500">
                        {q.pro_name} • Status: <strong className="uppercase">{q.status}</strong>
                      </p>
                    </div>
                    <p className="text-lg font-extrabold text-navy-900">{formatINR(q.total_amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Hired Professionals & Project Messages */}
        <div className="space-y-6 lg:col-span-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Hired Professionals ({professionals.length})</h2>
              {isOwner && (
                <button type="button" onClick={openAddPro} className="text-xs font-bold text-brand-600 hover:underline inline-flex items-center gap-1">
                  <UserPlus className="h-3.5 w-3.5" /> Assign Pro
                </button>
              )}
            </div>
            <div className="mt-4 space-y-3">
              {professionals.length === 0 ? (
                <p className="text-xs text-slate-500">No professionals assigned yet.</p>
              ) : (
                professionals.map((pro) => (
                  <div key={pro.id} className="rounded-xl border border-slate-200 p-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={pro.display_name} src={pro.profile_photo_url} size="md" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/professionals/${pro.professional_id}`}
                          className="flex items-center gap-1 truncate text-sm font-bold text-slate-900 hover:text-brand-600"
                        >
                          <span className="truncate">{pro.display_name}</span>
                          {pro.verification_status === 'verified' && (
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          )}
                        </Link>
                        <p className="text-xs text-slate-500">{pro.role_in_project}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <span className="font-bold text-navy-900">Agreed: {formatINR(pro.agreed_amount)}</span>
                      {isOwner && project.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => setReviewPro(pro)}
                          className="inline-flex items-center gap-1 font-bold text-brand-600 hover:underline"
                        >
                          <Star className="h-3.5 w-3.5" /> Review Work
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Project Messages */}
          <div className="card flex flex-col p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <MessageSquare className="h-4 w-4 text-brand-600" />
              Project Messages
            </h2>
            <div className="mt-3 max-h-80 space-y-2.5 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-500">No messages in this project room yet.</p>
              ) : (
                messages.map((m) => {
                  const mine = user && m.sender_id === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl p-3 text-xs ${
                        mine ? 'ml-6 bg-navy-900 text-white' : 'mr-6 bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p className={`font-bold ${mine ? 'text-brand-300' : 'text-slate-600'}`}>{m.sender_name}</p>
                      <p className="mt-0.5 leading-relaxed">{m.body}</p>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <input
                type="text"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Write a project update or message..."
                className="input-field py-2 text-xs"
              />
              <button type="submit" className="btn-primary px-3 py-2" aria-label="Send project message">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Assign Pro Modal */}
      <Modal open={addProOpen} onClose={() => setAddProOpen(false)} title="Assign Professional to Project">
        <form onSubmit={handleAddProSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Select Professional</label>
            <select
              value={selectedProId}
              onChange={(e) => {
                setSelectedProId(e.target.value);
                const found = allPros.find((p) => String(p.id) === e.target.value);
                if (found) setProRole(found.categoryName);
              }}
              className="input-field"
            >
              {allPros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} ({p.categoryName} • {p.city})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Role in Project</label>
            <input type="text" required value={proRole} onChange={(e) => setProRole(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Agreed Contract Amount (₹)</label>
            <input type="number" min={0} value={agreedAmount} onChange={(e) => setAgreedAmount(e.target.value)} className="input-field" />
          </div>
          <button type="submit" className="btn-primary w-full">
            Assign to Project
          </button>
        </form>
      </Modal>

      {/* Review Pro Modal */}
      <Modal
        open={Boolean(reviewPro)}
        onClose={() => setReviewPro(null)}
        title={`Review ${reviewPro?.display_name || ''}`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!reviewPro) return;
            await api.post(`/api/professionals/${reviewPro.professional_id}/reviews`, {
              projectId: project.id,
              rating: revRating,
              workQualityRating: revRating,
              punctualityRating: revRating,
              valueRating: revRating,
              title: revTitle,
              comment: revComment,
            });
            setReviewPro(null);
            setRevTitle('');
            setRevComment('');
            loadWorkspace();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Overall Rating</label>
            <select value={revRating} onChange={(e) => setRevRating(Number(e.target.value))} className="input-field">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} Stars
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            required
            value={revTitle}
            onChange={(e) => setRevTitle(e.target.value)}
            placeholder="Summary headline"
            className="input-field"
          />
          <textarea
            rows={3}
            required
            minLength={10}
            value={revComment}
            onChange={(e) => setRevComment(e.target.value)}
            placeholder="Share how the work quality and schedule went..."
            className="input-field"
          />
          <button type="submit" className="btn-primary w-full">
            Submit Project Review
          </button>
        </form>
      </Modal>
    </div>
  );
}
