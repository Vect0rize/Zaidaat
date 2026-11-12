import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/authContext';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: 'Google sign-in is not configured on this server yet.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_invalid_state: 'Google sign-in session expired or did not match. Please try again.',
  google_missing_code: 'Google did not return an authorization code. Please try again.',
  google_token_exchange_failed: 'Could not complete Google authentication. Please verify your redirect URI settings.',
  google_profile_incomplete: 'Your Google account must have a verified email address.',
  account_suspended: 'This account has been suspended by moderation.',
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { providers, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const rawError = searchParams.get('error') || '';
  const [error, setError] = useState(OAUTH_ERROR_MESSAGES[rawError] || rawError);
  const [busy, setBusy] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/auth/login', { identifier, password });
      await refreshUser();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-12">
        {/* Left Editorial Context */}
        <div className="hidden flex-col justify-between border-r border-slate-200 bg-slate-50 p-8 lg:col-span-5 lg:flex">
          <div>
            <p className="section-kicker">ZAIDAAT Workspace</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900">
              Sign in to manage properties, tenders &amp; site projects
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Review buyer enquiries, submit itemized trade quotations, manage hiring updates, and upload KYC records.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
            <img
              src="/uploads/seed/prop-bengaluru-villa.jpg"
              alt="Residential property workspace preview"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>

        {/* Right Form Column */}
        <div className="p-6 sm:p-8 lg:col-span-7">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-navy-900">Sign In to ZAIDAAT</h1>
            <p className="mt-1 text-xs text-slate-500">Access properties, enquiries, jobs &amp; quotations</p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email or 10-Digit Mobile</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or 98XXXXXXXX"
                className="input-field"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Google Auth */}
          <div className="mt-5 border-t border-slate-100 pt-5">
            {providers.googleConfigured ? (
              <a
                href="/api/auth/google"
                className="btn-secondary w-full py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <GoogleMark />
                Continue with Google
              </a>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-[11px] text-slate-500">
                Google Sign-In activates automatically when <code className="font-semibold">GOOGLE_CLIENT_ID</code> &amp; <code className="font-semibold">GOOGLE_CLIENT_SECRET</code> are configured.
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            New to ZAIDAAT?{' '}
            <Link to="/register" className="font-bold text-brand-600 hover:underline">
              Create Free Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { providers, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'professional'>('customer');
  const [defaultState, setDefaultState] = useState('Maharashtra');
  const [defaultCity, setDefaultCity] = useState('Mumbai');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/auth/register', {
        fullName,
        email,
        phone,
        password,
        role,
        defaultState,
        defaultCity,
      });
      await refreshUser();
      navigate(role === 'professional' ? '/become-professional' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-12">
        <div className="hidden flex-col justify-between border-r border-slate-200 bg-slate-50 p-8 lg:col-span-5 lg:flex">
          <div>
            <p className="section-kicker">Create Account</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy-900">
              One ZAIDAAT account for real estate &amp; trade services
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              List homes, commercial spaces, and residential plots, post construction briefs, or set up your contractor profile with portfolio proof.
            </p>
          </div>
          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
            <img
              src="/uploads/seed/prop-interior-gallery.jpg"
              alt="Residential interior fitout"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:col-span-7">
          <div className="lg:hidden">
            <h1 className="text-xl font-bold text-navy-900">Create Your ZAIDAAT Account</h1>
            <p className="mt-1 text-xs text-slate-500">One account for properties, services &amp; projects</p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 lg:mt-0">
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'customer', label: 'Property Buyer / Owner' },
                { key: 'professional', label: 'Worker / Contractor' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRole(opt.key as any)}
                  className={`rounded-md border px-3 py-2.5 text-xs font-semibold transition ${
                    role === opt.key
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Full Name</label>
              <input type="text" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">10-Digit Mobile Number</label>
              <input
                type="tel"
                required
                pattern="[6-9][0-9]{9}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">State</label>
                <input type="text" value={defaultState} onChange={(e) => setDefaultState(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">City</label>
                <input type="text" value={defaultCity} onChange={(e) => setDefaultCity(e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Password (min 8 chars)</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" />
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? 'Creating Account...' : 'Register Account'}
            </button>
          </form>

          {providers.googleConfigured && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <a
                href="/api/auth/google"
                className="btn-secondary w-full py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <GoogleMark />
                Continue with Google
              </a>
            </div>
          )}

          <p className="mt-5 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-brand-600 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<{ message?: string; devResetToken?: string }>({});
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ message: string; devResetToken?: string }>('/api/auth/forgot-password', { email });
      setResult(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-7">
        <p className="section-kicker">Account Recovery</p>
        <h1 className="mt-1 text-xl font-bold text-navy-900">Forgot Password</h1>
        <p className="mt-1 text-xs text-slate-500">Enter your registered email to reset your password.</p>

        {result.message ? (
          <div className="mt-5 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
            <p className="font-semibold">{result.message}</p>
            {result.devResetToken && (
              <div>
                <p className="font-bold">Local Dev Reset Link:</p>
                <Link
                  to={`/reset-password?token=${encodeURIComponent(result.devResetToken)}`}
                  className="mt-1 inline-block font-bold text-brand-700 underline"
                >
                  Continue to Reset Password &rarr;
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
            />
            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? 'Generating...' : 'Send Reset Instructions'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await api.post('/api/auth/reset-password', { token, newPassword });
      setDone(true);
    } catch (e: any) {
      setErr(e.message || 'Reset failed');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-7">
        <p className="section-kicker">Password Update</p>
        <h1 className="mt-1 text-xl font-bold text-navy-900">Set New Password</h1>
        {done ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm font-semibold text-emerald-700">Password updated successfully! All previous sessions were signed out.</p>
            <button type="button" onClick={() => navigate('/login')} className="btn-primary w-full">
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {err && <div className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{err}</div>}
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Reset Token"
              className="input-field"
            />
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password (min 8 chars)"
              className="input-field"
            />
            <button type="submit" className="btn-primary w-full py-2.5">
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
