import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  MapPin,
  Plus,
  Send,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import type { JobPost } from '../types';
import { formatDate, formatINR } from '../lib/format';
import { Modal } from '../components/common/Modal';
import { DetailPageSkeleton } from '../components/common/Skeleton';

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [job, setJob] = useState<JobPost | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [linkedProject, setLinkedProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Apply modal
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [proposedTimeline, setProposedTimeline] = useState('15 working days');
  const [estStart, setEstStart] = useState('');
  const [applyBusy, setApplyBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Quotation modal
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [scopeSummary, setScopeSummary] = useState('');
  const [lineItems, setLineItems] = useState<Array<{ item: string; qty: string; amount: number }>>([
    { item: 'Material & Fixtures', qty: '1 Lot', amount: 45000 },
    { item: 'Skilled Labour & Execution', qty: '15 Days', amount: 25000 },
  ]);
  const [laborCost, setLaborCost] = useState('25000');
  const [materialCost, setMaterialCost] = useState('45000');
  const [durationDays, setDurationDays] = useState('15');
  const [paymentTerms, setPaymentTerms] = useState('30% advance, 40% mid-work, 30% on handover');
  const [quoteBusy, setQuoteBusy] = useState(false);

  const loadJob = useCallback(() => {
    setLoading(true);
    api
      .get<{
        job: JobPost;
        isOwner: boolean;
        applications: any[];
        quotations: any[];
        linkedProject: any | null;
      }>(`/api/work/jobs/${id}`)
      .then((res) => {
        setJob(res.job);
        setIsOwner(res.isOwner);
        setApplications(res.applications);
        setQuotations(res.quotations);
        setLinkedProject(res.linkedProject);
        setQuoteTitle((v) => v || `Quotation for ${res.job.title}`);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const computedTotal = lineItems.reduce((acc, row) => acc + Number(row.amount || 0), 0);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setApplyBusy(true);
    setError('');
    try {
      await api.post(`/api/work/jobs/${job.id}/apply`, {
        coverNote,
        proposedTimeline,
        estimatedStartDate: estStart || null,
      });
      setApplyOpen(false);
      setActionMsg('Application submitted! You can also send an itemized quotation.');
      toast.success('Work application submitted.');
      loadJob();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setApplyBusy(false);
    }
  };

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setQuoteBusy(true);
    setError('');
    try {
      await api.post('/api/work/quotations', {
        jobId: job.id,
        title: quoteTitle,
        scopeSummary,
        lineItems,
        laborCost: Number(laborCost || 0),
        materialCost: Number(materialCost || 0),
        totalAmount: computedTotal > 0 ? computedTotal : Number(laborCost) + Number(materialCost),
        estimatedDurationDays: Number(durationDays || 10),
        paymentTerms,
      });
      setQuoteOpen(false);
      setActionMsg('Quotation sent to the customer!');
      toast.success('Itemized quotation delivered to customer.');
      loadJob();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setQuoteBusy(false);
    }
  };

  const handleAcceptQuote = async (quoteId: number) => {
    if (!window.confirm('Accept this quotation and hire this professional?')) return;
    try {
      await api.post<{ ok: boolean; projectId: number | null }>(
        `/api/work/quotations/${quoteId}/accept`
      );
      toast.success('Quotation accepted and professional hired.');
      loadJob();
    } catch (err: any) {
      toast.error(err.message || 'Could not accept quotation.');
    }
  };

  const handleUpdateAppStatus = async (appId: number, status: 'shortlisted' | 'rejected' | 'pending') => {
    try {
      await api.patch(`/api/work/applications/${appId}`, { status });
      toast.success(`Application marked as ${status}.`);
      loadJob();
    } catch (err: any) {
      toast.error(err.message || 'Could not update application status.');
    }
  };

  const handleJobStatus = async (nextStatus: 'cancelled' | 'open') => {
    const label = nextStatus === 'cancelled' ? 'cancel this open tender' : 'reopen this tender';
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    try {
      await api.patch(`/api/work/jobs/${id}`, { status: nextStatus });
      toast.success(nextStatus === 'cancelled' ? 'Tender cancelled.' : 'Tender reopened.');
      loadJob();
    } catch (err: any) {
      toast.error(err.message || 'Could not update job status.');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="card h-80 animate-pulse bg-slate-100" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900">{error || 'Job not found'}</h2>
        <Link to="/find-work" className="btn-primary mt-4">
          Back to Work Board
        </Link>
      </div>
    );
  }

  const canWorkerAct = Boolean(user && !isOwner && user.professionalProfile);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Work Board
      </button>

      {actionMsg && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-800">
          {actionMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                {job.categoryName}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
                {job.status.replace('_', ' ')}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">{job.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4 text-brand-600" />
                {job.locality}, {job.city}, {job.state}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4 text-slate-400" />
                Target Start: {formatDate(job.preferredStartDate)}
              </span>
              {job.propertyType && <span>Property: {job.propertyType}</span>}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Work Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{job.description}</p>
            </div>

            {job.referenceImages.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Reference Photos</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {job.referenceImages.map((url, idx) => (
                    <img key={url + idx} src={url} alt="" className="h-36 w-full rounded-xl border border-slate-200 object-cover" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quotations Section (Visible to Job Owner & Author Pro) */}
          {(isOwner || quotations.length > 0) && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900">
                {isOwner ? `Compare Received Quotations (${quotations.length})` : 'Your Submitted Quotation'}
              </h2>
              {quotations.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No quotations submitted yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {quotations.map((q) => (
                    <div key={q.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link to={`/professionals/${q.professional_id}`} className="font-bold text-slate-900 hover:text-brand-600">
                              {q.display_name}
                            </Link>
                            {q.verification_status === 'verified' && (
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            )}
                            {q.rating_avg > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-700">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                {q.rating_avg}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-bold text-navy-900">{q.title}</p>
                          <p className="mt-1 text-xs text-slate-600">{q.scope_summary}</p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-2xl font-extrabold text-navy-900">{formatINR(q.total_amount)}</p>
                          <p className="text-xs font-semibold text-slate-500">
                            Duration: {q.estimated_duration_days} days • Status:{' '}
                            <span className="uppercase text-brand-700">{q.status}</span>
                          </p>
                        </div>
                      </div>

                      {q.lineItems?.length > 0 && (
                        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500">
                              <tr>
                                <th className="px-3 py-2">Item / Work Scope</th>
                                <th className="px-3 py-2">Qty</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {q.lineItems.map((li: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 font-medium text-slate-800">{li.item}</td>
                                  <td className="px-3 py-2 text-slate-500">{li.qty}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatINR(li.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {q.payment_terms && (
                        <p className="mt-3 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">Payment Terms:</span> {q.payment_terms}
                        </p>
                      )}

                      {isOwner && q.status === 'sent' && job.status === 'open' && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleAcceptQuote(q.id)}
                            className="btn-primary text-xs"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Accept Quotation &amp; Hire Professional
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applications */}
          {(isOwner || applications.length > 0) && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900">
                {isOwner ? `Applications (${applications.length})` : 'Your Application'}
              </h2>
              {applications.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No applications yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {applications.map((app) => (
                    <div key={app.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link to={`/professionals/${app.professional_id}`} className="font-bold text-slate-900 hover:text-brand-600">
                          {app.display_name}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                              app.status === 'shortlisted'
                                ? 'bg-emerald-50 text-emerald-700'
                                : app.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {app.status}
                          </span>
                          {isOwner && job.status === 'open' && (
                            <div className="flex items-center gap-1">
                              {app.status !== 'shortlisted' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAppStatus(app.id, 'shortlisted')}
                                  className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                >
                                  Shortlist
                                </button>
                              )}
                              {app.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAppStatus(app.id, 'rejected')}
                                  className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600">{app.cover_note}</p>
                      {app.proposed_timeline && (
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Proposed Timeline: {app.proposed_timeline}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <div className="card sticky top-24 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Budget</p>
            <p className="mt-1 text-2xl font-extrabold text-navy-900">
              {formatINR(job.budgetMin)} – {formatINR(job.budgetMax)}
            </p>
            <p className="text-xs text-slate-500 capitalize">Posted by {job.customerName} • {job.budgetType} basis</p>

            <div className="mt-6 space-y-3">
              {linkedProject && (
                <Link to="/dashboard" className="btn-primary w-full py-3">
                  Quotation Awarded ({linkedProject.status})
                </Link>
              )}

              {isOwner && job.status === 'open' && (
                <button
                  type="button"
                  onClick={() => handleJobStatus('cancelled')}
                  className="btn-secondary w-full border-rose-200 py-2.5 text-xs text-rose-700 hover:bg-rose-50"
                >
                  Cancel Open Tender
                </button>
              )}

              {isOwner && job.status === 'cancelled' && (
                <button
                  type="button"
                  onClick={() => handleJobStatus('open')}
                  className="btn-secondary w-full py-2.5 text-xs"
                >
                  Reopen Tender
                </button>
              )}

              {canWorkerAct && job.status === 'open' && (
                <>
                  <button type="button" onClick={() => setQuoteOpen(true)} className="btn-primary w-full py-3">
                    <FileText className="h-4 w-4" />
                    Send Itemized Quotation
                  </button>
                  <button type="button" onClick={() => setApplyOpen(true)} className="btn-secondary w-full py-3">
                    <Send className="h-4 w-4" />
                    Apply with Cover Note
                  </button>
                </>
              )}

              {user && !isOwner && !user.professionalProfile && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <p className="font-bold">Want to apply or quote on this job?</p>
                  <p className="mt-1">Create your free Professional Profile in 2 minutes.</p>
                  <Link to="/become-professional" className="btn-navy mt-3 w-full text-xs">
                    Register as Professional
                  </Link>
                </div>
              )}

              {!user && (
                <Link to="/login" className="btn-primary w-full py-3">
                  Log In to Apply or Quote
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Work">
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Cover Note / Relevant Experience</label>
            <textarea
              rows={4}
              required
              minLength={10}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Explain similar work you completed nearby and when you can visit the site..."
              className="input-field"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Proposed Timeline</label>
              <input
                type="text"
                value={proposedTimeline}
                onChange={(e) => setProposedTimeline(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Earliest Start Date</label>
              <input type="date" value={estStart} onChange={(e) => setEstStart(e.target.value)} className="input-field" />
            </div>
          </div>
          <button type="submit" disabled={applyBusy} className="btn-primary w-full">
            {applyBusy ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </Modal>

      {/* Send Quotation Modal */}
      <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} title="Send Itemized Quotation" maxWidth="2xl">
        <form onSubmit={handleSendQuote} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Quotation Title</label>
            <input type="text" required value={quoteTitle} onChange={(e) => setQuoteTitle(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Scope Summary &amp; Materials</label>
            <textarea
              rows={3}
              required
              minLength={10}
              value={scopeSummary}
              onChange={(e) => setScopeSummary(e.target.value)}
              placeholder="Mention plywood/paint/hardware brands, inclusions, exclusions..."
              className="input-field"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Line Items</label>
              <button
                type="button"
                onClick={() => setLineItems((prev) => [...prev, { item: '', qty: '1', amount: 0 }])}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600"
              >
                <Plus className="h-3.5 w-3.5" /> Add Row
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((li, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Item description"
                    value={li.item}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx].item = e.target.value;
                      setLineItems(next);
                    }}
                    className="input-field col-span-6 py-2 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Qty"
                    value={li.qty}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx].qty = e.target.value;
                      setLineItems(next);
                    }}
                    className="input-field col-span-2 py-2 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    value={li.amount}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx].amount = Number(e.target.value);
                      setLineItems(next);
                    }}
                    className="input-field col-span-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Material Cost (₹)</label>
              <input type="number" value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Labour Cost (₹)</label>
              <input type="number" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Est. Duration (Days)</label>
              <input type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="input-field" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Payment Terms</label>
            <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="input-field" />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-100 p-4">
            <span className="text-sm font-bold text-slate-700">Total Quotation Amount</span>
            <span className="text-xl font-extrabold text-navy-900">{formatINR(computedTotal)}</span>
          </div>

          <button type="submit" disabled={quoteBusy} className="btn-primary w-full py-3">
            {quoteBusy ? 'Sending...' : 'Send Quotation'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
