import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-navy-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path
                    d="M4 19V7.5L12 3L20 7.5V19"
                    stroke="currentColor"
                    strokeWidth="2"
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
              <span className="text-base font-extrabold tracking-tight text-white">
                ZAI<span className="text-brand-400">DAAT</span>
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              All-India marketplace uniting residential &amp; commercial property discovery, skilled trade hiring, and itemized work quotations.
            </p>
            <p className="mt-3 text-[11px] font-medium text-slate-500">
              Pan-India coverage across states and major urban centres
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Property</h4>
            <ul className="mt-3.5 space-y-2.5 text-xs text-slate-400">
              <li><Link to="/buy" className="transition hover:text-white">Buy Properties</Link></li>
              <li><Link to="/rent" className="transition hover:text-white">Rent Homes &amp; Offices</Link></li>
              <li><Link to="/sell" className="transition hover:text-white">Sell / List Your Property</Link></li>
              <li><Link to="/buy?category=commercial" className="transition hover:text-white">Commercial Spaces &amp; Plots</Link></li>
              <li><Link to="/saved" className="transition hover:text-white">Saved Shortlist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Services &amp; Work</h4>
            <ul className="mt-3.5 space-y-2.5 text-xs text-slate-400">
              <li><Link to="/professionals" className="transition hover:text-white">Find Professionals</Link></li>
              <li><Link to="/find-work" className="transition hover:text-white">Browse Open Jobs &amp; Tenders</Link></li>
              <li><Link to="/post-job" className="transition hover:text-white">Post a Work Requirement</Link></li>
              <li><Link to="/become-professional" className="transition hover:text-white">Partner as a Contractor / Worker</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform &amp; Workspace</h4>
            <ul className="mt-3.5 space-y-2.5 text-xs text-slate-400">
              <li><Link to="/dashboard" className="transition hover:text-white">Customer &amp; Partner Dashboard</Link></li>
              <li><Link to="/messages" className="transition hover:text-white">Inbox &amp; Quotations</Link></li>
              <li><Link to="/plans" className="transition hover:text-white">Membership Plans</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-800/80 pt-6 text-[11px] text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} ZAIDAAT Technologies India. Demonstration Marketplace.</p>
          <p>RERA metadata &middot; Document KYC workflow &middot; HttpOnly session security</p>
        </div>
      </div>
    </footer>
  );
}
