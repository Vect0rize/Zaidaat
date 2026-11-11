import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { formatINR } from '../lib/format';

export function PlansPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [gatewayConfigured, setGatewayConfigured] = useState(false);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ plans: any[]; paymentGatewayConfigured: boolean }>('/api/plans').then((res) => {
      setPlans(res.plans);
      setGatewayConfigured(res.paymentGatewayConfigured);
    });
  }, []);

  const handleActivate = async (planCode: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setError('');
    setMsg('');
    try {
      const res = await api.post<{ subscription: any; mode: string }>('/api/plans/subscribe', {
        planCode,
        billingCycle: cycle,
      });
      await refreshUser();
      setMsg(
        `Plan "${planCode}" activated (${cycle}) in ${
          res.mode === 'razorpay' ? 'Razorpay Live' : 'Local Development Sandbox'
        } mode.`
      );
    } catch (err: any) {
      setError(err.message || 'Could not activate plan.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="section-kicker">Membership &amp; Subscriptions</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            Plans for Property Owners &amp; Trade Professionals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {gatewayConfigured
              ? 'Razorpay signature verification is active for paid tiers.'
              : 'Local development billing sandbox active — configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env before production billing.'}
          </p>
        </div>

        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={`rounded px-3.5 py-1.5 text-xs font-semibold transition ${
              cycle === 'monthly' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle('yearly')}
            className={`rounded px-3.5 py-1.5 text-xs font-semibold transition ${
              cycle === 'yearly' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Yearly (Save 2 Months)
          </button>
        </div>
      </div>

      {msg && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-800">
          {msg}
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const price = cycle === 'yearly' ? p.yearlyInr : p.monthlyInr;
          const isCurrent = user?.subscription?.plan_code === p.code;
          const highlighted = p.code === 'pro_verified_plus';
          return (
            <div
              key={p.code}
              className={`flex flex-col justify-between rounded-lg border bg-white p-6 ${
                highlighted ? 'border-t-4 border-brand-600' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                    {p.roleScope}
                  </span>
                  {highlighted && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                      Recommended
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-lg font-bold text-navy-900">{p.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{p.tagline}</p>

                <p className="tabular-price mt-5 text-3xl font-bold text-navy-900">
                  {price === 0 ? 'Free' : formatINR(price)}
                  {price > 0 && (
                    <span className="text-xs font-medium text-slate-500">
                      /{cycle === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  )}
                </p>

                <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-xs text-slate-700">
                  {p.features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={isCurrent}
                onClick={() => handleActivate(p.code)}
                className={`mt-6 w-full ${isCurrent ? 'btn-secondary' : highlighted ? 'btn-primary' : 'btn-navy'}`}
              >
                {isCurrent ? 'Current Active Plan' : 'Select Plan'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
