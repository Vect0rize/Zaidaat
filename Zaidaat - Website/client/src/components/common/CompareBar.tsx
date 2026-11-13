import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, ShieldCheck, X } from 'lucide-react';
import { useCompare } from '../../lib/compareContext';
import { formatINR, formatLabel, formatPropertyPrice } from '../../lib/format';
import { Modal } from './Modal';

export function CompareBar() {
  const { compareItems, removeCompare, clearCompare } = useCompare();
  const [open, setOpen] = useState(false);

  if (compareItems.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-3 left-1/2 z-40 w-[96%] max-w-3xl -translate-x-1/2 rounded-xl border border-slate-700 bg-navy-900 px-3 py-2 text-white shadow-elevated animate-toast-in sm:bottom-4 sm:w-[94%] sm:px-4 sm:py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:gap-3 sm:pb-0">
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-400">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Compare ({compareItems.length}/4)
            </span>
            <div className="flex items-center gap-1.5">
              {compareItems.map((item) => (
                <div
                  key={item.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-100 sm:px-2.5"
                >
                  <span className="max-w-[95px] truncate sm:max-w-[110px]">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => removeCompare(item.id)}
                    className="text-slate-400 hover:text-white"
                    aria-label={`Remove ${item.title} from compare`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={clearCompare}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              Compare Side-by-Side
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Side-by-Side Property Comparison"
        subtitle="Compare price per sq.ft, configuration, furnishing, and location across shortlisted properties"
        maxWidth="4xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="w-36 py-3 pr-4 font-semibold text-slate-500">Attribute</th>
                {compareItems.map((p) => (
                  <th key={p.id} className="min-w-[190px] px-3 py-3 align-top">
                    <div className="space-y-2">
                      <img
                        src={
                          p.images.find((im) => im.isPrimary && im.mediaType === 'image')?.url ||
                          p.images.find((im) => im.mediaType === 'image')?.url ||
                          p.images[0]?.url ||
                          '/uploads/seed/prop-pune-apt.jpg'
                        }
                        alt={p.title}
                        className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/uploads/seed/prop-pune-apt.jpg';
                        }}
                      />
                      <Link
                        to={`/properties/${p.id}`}
                        onClick={() => setOpen(false)}
                        className="block text-sm font-bold text-slate-900 hover:text-brand-600 line-clamp-2"
                      >
                        {p.title}
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">Purpose</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700">
                      For {p.listingPurpose === 'buy' ? 'Sale' : 'Rent'}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">Price</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 font-bold text-navy-900 tabular-price">
                    {formatPropertyPrice(p.price, p.listingPurpose)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">Rate / sq.ft</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-slate-700 tabular-price">
                    {p.areaSqft > 0 ? `${formatINR(Math.round(p.price / p.areaSqft))}/sq.ft` : '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">Location</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-slate-700">
                    {p.locality}, {p.city}, {p.state}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">Type</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-slate-700">
                    {formatLabel(p.propertyCategory)} &middot; {formatLabel(p.propertyType)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">Area</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-slate-700 tabular-price">
                    {p.areaSqft.toLocaleString('en-IN')} sq.ft
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">Configuration</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-slate-700">
                    {p.bedrooms > 0 ? `${p.bedrooms} BHK &middot; ${p.bathrooms} Bath` : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">Furnishing</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-slate-700">
                    {formatLabel(p.furnishing)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">Possession</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-slate-700">
                    {formatLabel(p.possessionStatus)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-slate-500">RERA / Status</td>
                {compareItems.map((p) => (
                  <td key={p.id} className="px-3 py-2.5">
                    {p.reraId ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verified ID
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Standard Listing</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
