import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  Building2,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { to: '/buy', label: 'Buy', icon: Building2 },
    { to: '/rent', label: 'Rent', icon: Building2 },
    { to: '/sell', label: 'Sell', icon: PlusCircle },
    { to: '/professionals', label: 'Find Professionals', icon: Users },
    { to: '/find-work', label: 'Find Work', icon: Briefcase },
  ];

  useEffect(() => {
    if (!userMenuOpen) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onOutsideClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutsideClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [mobileOpen]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 xl:gap-8">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-900 text-white">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
                <path
                  d="M4 19V7.5L12 3L20 7.5V19"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 10.5H15.5L8.5 16.5H15.5"
                  stroke="#E57A50"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="leading-none">
              <span className="text-[17px] font-extrabold tracking-tight text-navy-900">
                ZAI<span className="text-brand-600">DAAT</span>
              </span>
              <span className="mt-0.5 hidden text-[10px] font-medium tracking-wide text-slate-500 sm:block">
                Property &amp; Services
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-100 font-semibold text-navy-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Link
                to="/post-job"
                className="hidden xl:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <PlusCircle className="h-3.5 w-3.5 text-brand-600" />
                Post a Job
              </Link>

              <Link
                to="/messages"
                className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                title="Messages"
                aria-label="Messages"
              >
                <MessageSquare className="h-[18px] w-[18px]" />
                {user.unreadMessages > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {user.unreadMessages}
                  </span>
                )}
              </Link>

              <Link
                to="/notifications"
                className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                {user.unreadNotifications > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                    {user.unreadNotifications}
                  </span>
                )}
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 shadow-subtle transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                    {user.fullName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[110px] truncate text-xs font-semibold sm:inline">
                    {user.fullName}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition duration-150 ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-elevated animate-dropdown-in"
                  >
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <p className="truncate text-sm font-bold text-slate-900">{user.fullName}</p>
                      <p className="truncate text-xs text-slate-500">{user.email || user.phone}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {user.roles.map((r) => (
                          <span
                            key={r}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <LayoutDashboard className="h-4 w-4 text-brand-600" />
                        Dashboard &amp; Listings
                      </Link>
                      <Link
                        to="/saved"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Heart className="h-4 w-4 text-rose-500" />
                        Saved Properties &amp; Jobs
                      </Link>
                      <Link
                        to="/post-job"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <PlusCircle className="h-4 w-4 text-slate-500" />
                        Post a Work Requirement
                      </Link>
                      {!user.professionalProfile && (
                        <Link
                          to="/become-professional"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          <Users className="h-4 w-4" />
                          Register as Professional
                        </Link>
                      )}
                      {user.roles.includes('admin') && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-100"
                        >
                          <ShieldCheck className="h-4 w-4 text-brand-600" />
                          Admin Console
                        </Link>
                      )}
                      <Link
                        to="/plans"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Briefcase className="h-4 w-4 text-slate-500" />
                        Membership Plans
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-ghost px-3.5 py-2 text-xs font-semibold">
                Sign in
              </Link>
              <Link to="/register" className="btn-navy px-4 py-2 text-xs">
                Get Started
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden animate-dropdown-in">
          <div className="grid gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive ? 'bg-slate-100 font-semibold text-navy-900' : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  {item.label}
                </NavLink>
              );
            })}
            <NavLink
              to="/post-job"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <PlusCircle className="h-4 w-4 text-brand-600" />
              Post a Job
            </NavLink>
            <NavLink
              to="/plans"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Briefcase className="h-4 w-4 text-slate-500" />
              Membership Plans
            </NavLink>

            {user ? (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="btn-secondary py-2 text-xs">
                  Dashboard
                </Link>
                <button type="button" onClick={handleLogout} className="btn-ghost py-2 text-xs text-rose-600">
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary py-2 text-xs">
                  Sign in
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-navy py-2 text-xs">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
