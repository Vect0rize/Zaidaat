import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  Bath,
  BedDouble,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Edit3,
  Eye,
  Flag,
  Heart,
  Layers,
  MapPin,
  Maximize2,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Property } from '../types';
import { formatDate, formatINR, formatLabel, formatPropertyPrice } from '../lib/format';
import { useAuth } from '../lib/authContext';
import { useCompare } from '../lib/compareContext';
import { useToast } from '../lib/toastContext';
import { Modal } from '../components/common/Modal';
import { DetailPageSkeleton } from '../components/common/Skeleton';
import { usePageMeta } from '../lib/seo';

export function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleCompare, isInCompare } = useCompare();
  const toast = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  usePageMeta({
    title: property ? `${property.title} — ${property.city} | ZAIDAAT` : 'Property Details — ZAIDAAT',
    description: property
      ? `${property.title} in ${property.locality}, ${property.city}, ${property.state}. View specs, pricing, and enquire directly.`
      : 'View residential and commercial property listings across India on ZAIDAAT.',
    canonicalPath: id ? `/properties/${id}` : undefined,
    type: 'article',
  });
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Enquiry Form
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [message, setMessage] = useState(
    'Hello, I am interested in this property and would like to schedule a site visit.'
  );
  const [enqStatus, setEnqStatus] = useState<{ ok?: string; err?: string }>({});
  const [sending, setSending] = useState(false);

  // Report Modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Incorrect Price or Details');
  const [reportDetails, setReportDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    if (user) {
      setBuyerName((v) => v || user.fullName);
      setBuyerEmail((v) => v || user.email || '');
      setBuyerPhone((v) => v || user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ property: Property }>(`/api/properties/${id}`)
      .then((res) => setProperty(res.property))
      .catch((err) => setError(err.message || 'Property not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!user) {
      toast.info('Please sign in to save properties.');
      navigate('/login');
      return;
    }
    if (!property) return;
    try {
      const res = await api.post<{ saved: boolean }>(`/api/properties/${property.id}/save`);
      setProperty({ ...property, isSaved: res.saved });
      toast.success(res.saved ? 'Property saved to your shortlist.' : 'Removed from saved shortlist.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update saved state.');
    }
  };

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info('Please sign in to contact the property owner.');
      navigate('/login');
      return;
    }
    if (!property) return;
    setSending(true);
    setEnqStatus({});
    try {
      await api.post(`/api/properties/${property.id}/enquire`, {
        buyerName,
        buyerEmail,
        buyerPhone,
        preferredVisitDate: visitDate || null,
        message,
      });
      setEnqStatus({ ok: 'Enquiry sent to the owner! You can continue chatting in Messages.' });
      toast.success('Enquiry delivered to property owner.');
    } catch (err: any) {
      const msg = err.message || 'Could not submit enquiry';
      setEnqStatus({ err: msg });
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!property || !window.confirm('Permanently delete this property listing?')) return;
    try {
      await api.delete(`/api/properties/${property.id}`);
      toast.success('Property listing deleted.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Could not delete property.');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || reportBusy) return;
    setReportBusy(true);
    try {
      await api.post('/api/plans/reports', {
        targetType: 'property',
        targetId: property.id,
        reason: reportReason,
        details: reportDetails,
      });
      setReportDone(true);
      toast.success('Report submitted to ZAIDAAT Trust & Safety.');
    } catch (err: any) {
      toast.error(err.message || 'Could not submit report.');
    } finally {
      setReportBusy(false);
    }
  };

  if (loading) return <DetailPageSkeleton />;

  if (error || !property) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900">{error || 'Property unavailable'}</h2>
        <Link to="/buy" className="btn-primary mt-4">
          Browse Properties
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(user && (user.id === property.ownerId || user.roles.includes('admin')));
  const activeMedia = property.images[activeMediaIdx] || {
    url: '/uploads/seed/prop-pune-apt.jpg',
    mediaType: 'image',
  };
  const perSqft = property.areaSqft > 0 ? Math.round(property.price / property.areaSqft) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Action Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listings
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              toggleCompare(property);
              toast.info(
                isInCompare(property.id) ? 'Removed from comparison.' : 'Added to property comparison.'
              );
            }}
            className={`btn-secondary px-3 py-1.5 text-xs ${
              isInCompare(property.id) ? 'border-brand-600 bg-brand-50 text-brand-700' : ''
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {isInCompare(property.id) ? 'Comparing' : 'Compare'}
          </button>
          <button type="button" onClick={handleSave} className="btn-secondary px-3 py-1.5 text-xs">
            <Heart className={`h-3.5 w-3.5 ${property.isSaved ? 'fill-rose-600 text-rose-600' : ''}`} />
            {property.isSaved ? 'Saved' : 'Save'}
          </button>
          {user && !isOwner && (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="btn-secondary px-3 py-1.5 text-xs text-slate-600"
            >
              <Flag className="h-3.5 w-3.5" />
              Report
            </button>
          )}
          {isOwner && (
            <>
              <Link to={`/properties/${property.id}/edit`} className="btn-navy px-3 py-1.5 text-xs">
                <Edit3 className="h-3.5 w-3.5" />
                Edit Listing
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Gallery */}
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/9] bg-slate-900">
              {activeMedia.mediaType === 'video' ? (
                <video src={activeMedia.url} controls className="h-full w-full object-contain" />
              ) : (
                <img
                  src={activeMedia.url}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <span className="rounded-md bg-navy-900/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  For {property.listingPurpose === 'buy' ? 'Sale' : 'Rent'}
                </span>
                <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900">
                  {formatLabel(property.propertyCategory)} &middot; {formatLabel(property.propertyType)}
                </span>
                {property.reraId && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/90 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    RERA
                  </span>
                )}
              </div>
            </div>

            {property.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50 p-3">
                {property.images.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveMediaIdx(idx)}
                    aria-label={`View media ${idx + 1} for ${property.title}`}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      idx === activeMediaIdx ? 'border-brand-600' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {m.mediaType === 'video' ? (
                      <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xs font-bold text-white">
                        Video
                      </div>
                    ) : (
                      <img src={m.url} alt={`${property.title} photo ${idx + 1}`} className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core Summary & Specs */}
          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{property.title}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
                  {property.addressLine ? `${property.addressLine}, ` : ''}
                  {property.locality}, {property.city}, {property.state}
                  {property.pincode ? ` - ${property.pincode}` : ''}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-extrabold text-navy-900 sm:text-3xl tabular-price">
                  {formatPropertyPrice(property.price, property.listingPurpose)}
                </p>
                {perSqft > 0 && property.listingPurpose === 'buy' && (
                  <p className="mt-0.5 text-xs font-medium text-slate-500 tabular-price">
                    Est. {formatINR(perSqft)} / sq.ft
                  </p>
                )}
                {property.listingPurpose === 'rent' && property.securityDeposit > 0 && (
                  <p className="mt-0.5 text-xs font-semibold text-slate-500 tabular-price">
                    Security Deposit: {formatINR(property.securityDeposit, true)}
                  </p>
                )}
                {property.maintenanceMonthly > 0 && (
                  <p className="text-xs text-slate-500 tabular-price">
                    Maintenance: {formatINR(property.maintenanceMonthly)}/mo
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {property.propertyType === 'plot' || property.propertyType === 'land' ? 'Plot Area' : 'Super Area'}
                </span>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-900 tabular-price">
                  <Maximize2 className="h-4 w-4 text-brand-600" />
                  {property.areaSqft.toLocaleString('en-IN')} sq.ft
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {property.propertyType === 'plot' || property.propertyType === 'land' ? 'Property Type' : 'Configuration'}
                </span>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  {property.bedrooms > 0 && property.propertyType !== 'plot' && property.propertyType !== 'land' ? (
                    <>
                      <BedDouble className="h-4 w-4 text-brand-600" />
                      {property.bedrooms} BHK &middot; <Bath className="h-3.5 w-3.5 text-slate-500" /> {property.bathrooms}
                    </>
                  ) : (
                    formatLabel(property.propertyType)
                  )}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {property.propertyType === 'plot' || property.propertyType === 'land' ? 'Facing' : 'Furnishing'}
                </span>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {property.propertyType === 'plot' || property.propertyType === 'land'
                    ? property.facing || 'Not specified'
                    : formatLabel(property.furnishing)}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Possession</span>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatLabel(property.possessionStatus)}</p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-base font-bold text-slate-900">Property Description</h2>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-600">
                {property.description}
              </p>
            </div>

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
              <div className="flex items-start gap-2.5">
                <Compass className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <span className="text-xs text-slate-500">Facing</span>
                  <p className="font-semibold text-slate-800">{property.facing || 'Not specified'}</p>
                </div>
              </div>
              {property.propertyType !== 'plot' && property.propertyType !== 'land' && (
                <div className="flex items-start gap-2.5">
                  <Layers className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-xs text-slate-400">Floor Level</span>
                    <p className="font-semibold text-slate-800">
                      {property.floorNumber !== null
                        ? `${property.floorNumber} of ${property.totalFloors || property.floorNumber}`
                        : 'Ground / Independent'}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <span className="text-xs text-slate-400">RERA / Registration</span>
                  <p className="font-semibold text-slate-800">{property.reraId || 'Owner Direct Listing'}</p>
                </div>
              </div>
            </div>

            {property.amenities.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Amenities &amp; Features
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {property.amenities.map((am) => (
                    <span
                      key={am}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {am}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {property.videoUrl && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Property Video Walkthrough
                </h3>
                <video src={property.videoUrl} controls className="mt-3 max-h-80 w-full rounded-xl bg-black" />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Listed on {formatDate(property.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1 tabular-price">
                <Eye className="h-3.5 w-3.5" /> {property.viewsCount} views
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Contact Owner Sidebar */}
        <div className="lg:col-span-4">
          <div className="card sticky top-20 p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-base font-bold text-white">
                {property.ownerName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Property Owner</p>
                <p className="text-sm font-bold text-slate-900">{property.ownerName}</p>
                <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Protected Messaging via ZAIDAAT
                </p>
              </div>
            </div>

            {isOwner ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  <p className="font-bold text-slate-900">This is your active listing</p>
                  <p className="mt-1">
                    Track incoming enquiries and site visit schedules in your Customer Dashboard.
                  </p>
                </div>
                <Link to="/dashboard" className="btn-primary w-full">
                  Open Enquiries Dashboard
                </Link>
              </div>
            ) : (
              <form onSubmit={handleEnquiry} className="mt-5 space-y-3.5">
                <h3 className="text-sm font-bold text-slate-900">Contact Owner / Schedule Site Visit</h3>
                {!user && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Please <Link to="/login" className="font-bold underline">sign in</Link> to message the property owner securely.
                  </div>
                )}

                <div>
                  <label className="label-field">Your Name</label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="input-field"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="label-field">Mobile Number (10-digit)</label>
                  <input
                    type="tel"
                    required
                    pattern="[6-9][0-9]{9}"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="input-field"
                    placeholder="98XXXXXXXX"
                  />
                </div>
                <div>
                  <label className="label-field">Email (optional)</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="label-field">Preferred Site Visit Date</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Message</label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input-field"
                  />
                </div>

                {enqStatus.ok && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    {enqStatus.ok}
                  </div>
                )}
                {enqStatus.err && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                    {enqStatus.err}
                  </div>
                )}

                <button type="submit" disabled={sending} className="btn-primary w-full py-2.5">
                  <UserCheck className="h-4 w-4" />
                  {sending ? 'Sending Enquiry...' : 'Send Direct Enquiry'}
                </button>
              </form>
            )}

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Building2 className="h-4 w-4 text-brand-600" />
                Need Pre-Purchase Inspection or Interiors?
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Hire verified Civil Engineers, Architects, or Interior Designers in {property.city}.
              </p>
              <Link
                to={`/professionals?city=${encodeURIComponent(property.city)}`}
                className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline"
              >
                Explore Specialists in {property.city} &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report Property Listing">
        {reportDone ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm font-semibold text-emerald-700">
              Thank you. Your report has been routed to ZAIDAAT Administrators for review.
            </p>
            <button type="button" onClick={() => setReportOpen(false)} className="btn-primary">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleReport} className="space-y-4">
            <div>
              <label className="label-field">Reason</label>
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="input-field">
                <option>Incorrect Price or Details</option>
                <option>Duplicate or Spam Listing</option>
                <option>Property Already Sold / Rented</option>
                <option>Suspected Fraudulent Document</option>
              </select>
            </div>
            <div>
              <label className="label-field">Details</label>
              <textarea
                rows={4}
                required
                minLength={10}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe what looks inaccurate or suspicious..."
                className="input-field"
              />
            </div>
            <button type="submit" disabled={reportBusy} className="btn-primary w-full">
              {reportBusy ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
