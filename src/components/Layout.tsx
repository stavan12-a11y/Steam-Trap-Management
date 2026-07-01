import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Database,
  Droplets,
  Eraser,
  Gauge,
  LogOut,
  RotateCcw,
  Settings,
  Table2,
} from 'lucide-react';
import { useSteamTrap } from '../store/SteamTrapContext';
import { useAuth } from '../auth/AuthContext';
import { SyncIndicator } from './SyncIndicator';

const NAV = [
  { to: '/', label: 'Dashboard', icon: Gauge },
  { to: '/equipment', label: 'Equipment', icon: Database },
  { to: '/traps', label: 'Traps', icon: Droplets },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/reporting', label: 'Reporting', icon: Table2 },
];

export function Layout() {
  const { resetToSeed, clearAll } = useSteamTrap();
  const { logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-maroon-800 bg-maroon-900 text-white shadow-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Droplets className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold sm:text-lg">Steam Trap Management</h1>
              <p className="text-[11px] text-maroon-200 sm:text-xs">
                Texas A&amp;M University · Utilities &amp; Energy Services
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <SyncIndicator />
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-maroon-100 hover:bg-white/10"
                title="Manage data"
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Data</span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        if (
                          confirm(
                            'Reset all data back to the demo dataset? Any changes you made will be lost.',
                          )
                        ) {
                          resetToSeed();
                        }
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <RotateCcw className="h-4 w-4 text-slate-400" />
                      Reset demo data
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        if (
                          confirm(
                            'Clear ALL data? This removes every equipment, trap, and PM record and cannot be undone.',
                          )
                        ) {
                          clearAll();
                        }
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Eraser className="h-4 w-4" />
                      Clear all data
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                if (confirm('Sign out of the dashboard?')) logout();
              }}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-maroon-100 hover:bg-white/10"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <nav className="border-t border-maroon-800/80 bg-maroon-950/40">
          <div className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 sm:px-6">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'border-white text-white'
                      : 'border-transparent text-maroon-200 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
