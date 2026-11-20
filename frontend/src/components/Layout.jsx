import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/movies', label: 'Movies' },
  { to: '/rewatch', label: 'Rewatch Plan' },
  { to: '/booking', label: 'Booking' },
];

const linkClass = ({ isActive }) =>
  `rounded-lg px-3.5 py-2 text-sm font-medium transition ${
    isActive ? 'bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/40' : 'text-slate-300 hover:bg-ink-700 hover:text-white'
  }`;

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-600/70 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <NavLink to="/movies" className="flex items-center gap-2.5" aria-label="Doomsday Ready home">
            
<span
  aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-red-600 text-lg shadow-glow"
            >
              ⏳
</span>

            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-white">Doomsday</span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">MCU rewatch planner</span>
            </span>
          </NavLink>

          <nav aria-label="Main" className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-ink-700 py-5 text-center text-xs text-slate-500">
        Doomsday Ready · Blinto Talent Accelerator 2027 assessment project
      </footer>
    </div>
  );
}
