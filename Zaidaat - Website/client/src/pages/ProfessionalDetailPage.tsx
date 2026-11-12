import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  Flag,
  Languages,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import type { ProfessionalProfile } from '../types';
import { formatDate, formatINR } from '../lib/format';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { LocationSelector } from '../components/common/LocationSelector';
import { DetailPageSkeleton } from '../components/common/Skeleton';
import { usePageMeta } from '../lib/seo';

export function ProfessionalDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [pro, setPro] = useState<ProfessionalProfile | null>(null);
  usePageMeta({
    title: pro ? `${pro.displayName} — ${pro.categoryName} in ${pro.city} | ZAIDAAT` : 'Professional Profile — ZAIDAAT',
    description: pro
      ? `${pro.headline || pro.displayName} offering ${pro.categoryName} services in ${pro.city}, ${pro.state}.`
      : 'Browse verified construction and home service professionals on ZAIDAAT.',
    canonicalPath: id ? `/professionals/${id}` : undefined,
    type: 'profile',
  });
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [verifiedDocs, setVerifiedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lightbox
  const [selectedPortfolio, setSelectedPortfolio] = useState<any | null>(null);

  // Hire Modal
  const [hireOpen, setHireOpen] = useState(false);
  const [hireTitle, setHireTitle] = useState('');
  const [hireDesc, setHireDesc] = useState('');
  const [hireState, setHireState] = useState('');
  const [hireCity, setHireCity] = useState('');
  const [hireLocality, setHireLocality] = useState('');
  const [hireBudget, setHireBudget] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [hireBusy, setHireBusy] = useState(false);
  const [hireResult, setHireResult] = useState<{ ok?: string; err?: string }>({});

  // Message Modal
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgBody, setMsgBody] = useState('');
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  // Review Modal
  const [revOpen, setRevOpen] = useState(false);
  const [revRating, setRevRating] = useState(5);
  const [revQuality, setRevQuality] = useState(5);
  const [revPunctuality, setRevPunctuality] = useState(5);
  const [revValue, setRevValue] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revBusy, setRevBusy] = useState(false);
  const [revErr, setRevErr] = useState('');

  // Report Modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Unprofessional Conduct / Fake Credentials');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const loadDetail = useCallback(() => {
    setLoading(true);
    api
      .get<{
        professional: ProfessionalProfile;
        portfolio: any[];
        reviews: any[];
        verifiedDocs: any[];
      }>(`/api/professionals/${id}`)
      .then((res) => {
        setPro(res.professional);
        setPortfolio(res.portfolio);
        setReviews(res.reviews);
        setVerifiedDocs(res.verifiedDocs);
        setHireState(res.professional.state);
        setHireCity(res.professional.city);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (searchParams.get('hire') === '1' && pro) {
      if (!user) {
        toast.info('Please sign in to send a hiring request.');
        navigate('/login');
      } else if (user.id !== pro.userId) {
        setHireOpen(true);
      }
    }
  }, [searchParams, pro, user, navigate, toast]);

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pro) return;
    setHireBusy(true);
    setHireResult({});
    try {
      await api.post('/api/work/hiring-requests', {
        professionalId: pro.id,
        title: hireTitle,
        description: hireDesc,
        state: hireState,
        city: hireCity,
        locality: hireLocality,
        budget: Number(hireBudget || 0),
        preferredDate: hireDate || null,
      });
      setHireResult({
        ok: 'Hiring request sent! Track acceptance and quotations in your Dashboard.',
      });
      toast.success(`Hiring request sent to ${pro.displayName}.`);
      setHireTitle('');
      setHireDesc('');
    } catch (err: any) {
      const msg = err.message || 'Failed to send hiring request';
      setHireResult({ err: msg });
      toast.error(msg);
    } finally {
      setHireBusy(false);
    }
  };

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pro || msgBusy) return;
    setMsgBusy(true);
    try {
      const res = await api.post<{ threadKey: string }>('/api/messages', {
        recipientId: pro.userId,
        contextType: 'direct',
        contextId: pro.id,
        body: msgBody,
      });
      setMsgSent(true);
      toast.success('Message sent!');
      setTimeout(() => {
        setMsgOpen(false);
        navigate(`/messages?thread=${encodeURIComponent(res.threadKey)}`);
      }, 500);
    } catch (err: any) {
      toast.error(err.message || 'Could not send message.');
    } finally {
      setMsgBusy(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pro || revBusy) return;
    setRevErr('');
    setRevBusy(true);
    try {
      await api.post(`/api/professionals/${pro.id}/reviews`, {
        rating: revRating,
        workQualityRating: revQuality,
        punctualityRating: revPunctuality,
        valueRating: revValue,
        title: revTitle,
        comment: revComment,
      });
      setRevOpen(false);
      setRevTitle('');
      setRevComment('');
      toast.success('Thank you! Your review has been published.');
      loadDetail();
    } catch (err: any) {
      const msg = err.message || 'Failed to submit review';
      setRevErr(msg);
      toast.error(msg);
    } finally {
      setRevBusy(false);
    }
  };

  if (loading) return <DetailPageSkeleton />;

  if (error || !pro) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900">{error || 'Professional not found'}</h2>
        <Link to="/professionals" className="btn-primary mt-4">
          Browse Professionals
        </Link>
      </div>
    );
  }

  const isOwnProfile = Boolean(user && user.id === pro.userId);
  const availBadge =
    pro.availabilityStatus === 'available'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : pro.availabilityStatus === 'busy'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Professionals
        </button>

        {user && !isOwnProfile && (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="btn-secondary px-3 py-1.5 text-xs text-slate-600"
          >
            <Flag className="h-3.5 w-3.5" />
            Report Profile
          </button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Main Content */}
        <div className="space-y-6 lg:col-span-8">
          {/* Profile Header Card */}
          <div className="card p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="shrink-0">
                <Avatar name={pro.displayName} src={pro.profilePhotoUrl} size="xl" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                    {pro.categoryName}
                  </span>
                  {pro.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      ZAIDAAT Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                      Verification: {pro.verificationStatus}
                    </span>
                  )}
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${availBadge}`}>
                    {pro.availabilityStatus}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">{pro.displayName}</h1>
                <p className="mt-1 text-sm font-medium text-slate-600 sm:text-base">{pro.headline}</p>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1 text-slate-900 tabular-price">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {pro.ratingAvg > 0 ? pro.ratingAvg.toFixed(1) : 'New'} ({pro.reviewCount} reviews)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    {pro.experienceYears} years exp &middot; {pro.completedJobsCount} completed
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4 text-slate-400" />
                    Crew size: {pro.teamSize}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4 text-slate-400" />
                    Responds in ~{pro.responseTimeHours} hrs
                  </span>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h2 className="text-base font-bold text-slate-900">About &amp; Work Approach</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{pro.bio}</p>
            </div>

            {/* Service Locations & Credentials */}
            <div className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Location &amp; Service Areas
                </h3>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  {pro.city}, {pro.state} ({pro.serviceRadiusKm} km coverage)
                </p>
                {pro.localities.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {pro.localities.map((loc) => (
                      <span
                        key={loc}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Languages &amp; Verified Credentials
                </h3>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Languages className="h-4 w-4 text-slate-400" />
                  {pro.languages.join(', ')}
                </p>
                {verifiedDocs.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {verifiedDocs.map((d, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {String(d.document_type).replace('_', ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Skills */}
            {pro.skills.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Skills &amp; Specializations
                </h3>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {pro.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Portfolio Gallery */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Work Portfolio Gallery ({portfolio.length})</h2>
                <p className="text-xs text-slate-500">Click any completed project photograph to inspect scope &amp; budget</p>
              </div>
            </div>

            {portfolio.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No portfolio photographs added yet.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {portfolio.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPortfolio(item)}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:border-slate-300 hover:shadow-card"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3.5">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span>{item.project_city || pro.city}</span>
                        <span>{item.budget_display || item.completion_year || ''}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Customer Reviews */}
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Customer Reviews ({reviews.length})</h2>
                <p className="text-xs text-slate-500">Verified client ratings for quality, punctuality &amp; value</p>
              </div>
              {user && !isOwnProfile && (
                <button type="button" onClick={() => setRevOpen(true)} className="btn-secondary px-3.5 py-2 text-xs">
                  Write a Review
                </button>
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No reviews yet. Be the first to review after hiring.</p>
            ) : (
              <div className="mt-4 space-y-3.5">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{r.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {r.reviewer_name} {r.reviewer_city ? `• ${r.reviewer_city}` : ''} &middot; {formatDate(r.created_at)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 tabular-price">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {r.rating}.0
                      </span>
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-700 sm:text-sm">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Hiring Sidebar */}
        <div className="lg:col-span-4">
          <div className="card sticky top-20 p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Services &amp; Pricing Structure
            </p>
            <p className="mt-1.5 text-2xl font-extrabold text-navy-900 tabular-price">
              {formatINR(pro.rateMin)} – {formatINR(pro.rateMax)}
            </p>
            <p className="mt-0.5 text-xs font-medium capitalize text-slate-500">
              Model: {pro.pricingModel} ({pro.rateUnitLabel})
            </p>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Current Availability</span>
                <span className="font-semibold capitalize text-slate-900">{pro.availabilityStatus}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/70 py-1">
                <span className="text-slate-500">Typical Response Time</span>
                <span className="font-semibold text-slate-900">~{pro.responseTimeHours} hours</span>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {isOwnProfile ? (
                <Link to="/become-professional" className="btn-primary w-full">
                  Edit My Professional Profile
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        toast.info('Please sign in to hire or request a quote.');
                        navigate('/login');
                      } else {
                        setHireOpen(true);
                      }
                    }}
                    className="btn-primary w-full py-2.5"
                  >
                    Hire Now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        toast.info('Please sign in to message this professional.');
                        navigate('/login');
                      } else {
                        setMsgOpen(true);
                      }
                    }}
                    className="btn-secondary w-full py-2.5"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contact Professional
                  </button>
                </>
              )}
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
              <p className="font-bold text-slate-900">Protected Hiring on ZAIDAAT</p>
              <p className="mt-1 leading-relaxed">
                Receive itemized quotes before committing and hire directly with verified records.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hire Modal */}
      <Modal
        open={hireOpen}
        onClose={() => setHireOpen(false)}
        title={`Hire / Request Quote from ${pro.displayName}`}
        subtitle="Describe your work scope, site location, and target start date"
      >
        {hireResult.ok ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm font-semibold text-emerald-700">{hireResult.ok}</p>
            <div className="flex justify-center gap-3">
              <Link to="/dashboard" className="btn-primary">
                Track in Dashboard
              </Link>
              <button type="button" onClick={() => setHireOpen(false)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleHireSubmit} className="space-y-4">
            {hireResult.err && (
              <div className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{hireResult.err}</div>
            )}
            <div>
              <label className="label-field">Work Title</label>
              <input
                type="text"
                required
                minLength={4}
                value={hireTitle}
                onChange={(e) => setHireTitle(e.target.value)}
                placeholder="e.g., 2 BHK Living Room Wardrobe & False Ceiling"
                className="input-field"
              />
            </div>
            <LocationSelector
              stateValue={hireState}
              cityValue={hireCity}
              localityValue={hireLocality}
              allowCustom
              onChange={({ state, city, locality }) => {
                setHireState(state);
                setHireCity(city);
                setHireLocality(locality);
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-field">Estimated Budget (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={hireBudget}
                  onChange={(e) => setHireBudget(e.target.value)}
                  placeholder="75000"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Preferred Start Date</label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="label-field">Work Description</label>
              <textarea
                rows={4}
                required
                minLength={15}
                value={hireDesc}
                onChange={(e) => setHireDesc(e.target.value)}
                placeholder="Dimensions, material preferences, property type..."
                className="input-field"
              />
            </div>
            <button type="submit" disabled={hireBusy} className="btn-primary w-full py-2.5">
              {hireBusy ? 'Sending Request...' : 'Send Hiring Request'}
            </button>
          </form>
        )}
      </Modal>

      {/* Message Modal */}
      <Modal open={msgOpen} onClose={() => setMsgOpen(false)} title={`Contact ${pro.displayName}`}>
        {msgSent ? (
          <p className="py-4 text-center text-sm font-semibold text-emerald-700">
            Message delivered! Opening conversation...
          </p>
        ) : (
          <form onSubmit={handleMessageSubmit} className="space-y-4">
            <textarea
              rows={4}
              required
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Ask about availability, material pricing, or site visits..."
              aria-label="Message text"
              className="input-field"
            />
            <button type="submit" disabled={msgBusy} className="btn-primary w-full">
              {msgBusy ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal open={revOpen} onClose={() => setRevOpen(false)} title={`Review ${pro.displayName}`}>
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          {revErr && <p className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{revErr}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Overall', val: revRating, set: setRevRating },
              { label: 'Quality', val: revQuality, set: setRevQuality },
              { label: 'Punctuality', val: revPunctuality, set: setRevPunctuality },
              { label: 'Value', val: revValue, set: setRevValue },
            ].map((item) => (
              <div key={item.label}>
                <label className="label-field">{item.label}</label>
                <select
                  value={item.val}
                  onChange={(e) => item.set(Number(e.target.value))}
                  className="input-field"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} Stars
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label className="label-field">Review Headline</label>
            <input
              type="text"
              required
              minLength={3}
              value={revTitle}
              onChange={(e) => setRevTitle(e.target.value)}
              placeholder="e.g. Clean finishing and on-time completion"
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Detailed Feedback</label>
            <textarea
              rows={4}
              required
              minLength={10}
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={revBusy} className="btn-primary w-full">
            {revBusy ? 'Publishing...' : 'Publish Review'}
          </button>
        </form>
      </Modal>

      {/* Portfolio Lightbox */}
      <Modal
        open={Boolean(selectedPortfolio)}
        onClose={() => setSelectedPortfolio(null)}
        title={selectedPortfolio?.title || ''}
        maxWidth="2xl"
      >
        {selectedPortfolio && (
          <div className="space-y-4">
            <img
              src={selectedPortfolio.image_url}
              alt={selectedPortfolio.title}
              className="max-h-96 w-full rounded-xl object-cover"
            />
            <p className="text-sm text-slate-700">{selectedPortfolio.description}</p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
              {selectedPortfolio.project_city && <span>City: {selectedPortfolio.project_city}</span>}
              {selectedPortfolio.completion_year && <span>Year: {selectedPortfolio.completion_year}</span>}
              {selectedPortfolio.budget_display && <span>Approx. Value: {selectedPortfolio.budget_display}</span>}
            </div>
          </div>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report Professional Profile">
        {reportDone ? (
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold text-emerald-700">Report submitted to Admin Desk.</p>
            <button type="button" onClick={() => setReportOpen(false)} className="btn-primary">
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (reportBusy) return;
              setReportBusy(true);
              try {
                await api.post('/api/plans/reports', {
                  targetType: 'professional',
                  targetId: pro.id,
                  reason: reportReason,
                  details: reportDetails,
                });
                setReportDone(true);
                toast.success('Profile report submitted.');
              } catch (err: any) {
                toast.error(err?.message || 'Unable to submit report.');
              } finally {
                setReportBusy(false);
              }
            }}
            className="space-y-4"
          >
            <input
              type="text"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              aria-label="Report reason"
              className="input-field"
              required
            />
            <textarea
              rows={4}
              required
              minLength={10}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Explain the issue..."
              aria-label="Report details"
              className="input-field"
            />
            <button type="submit" disabled={reportBusy} className="btn-primary w-full">
              {reportBusy ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
