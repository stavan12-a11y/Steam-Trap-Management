import { useState } from 'react';
import { AlertTriangle, Droplets, Loader2, Lock, LogIn } from 'lucide-react';
import { AUTH_MODE, USING_DEFAULT_CREDENTIALS, useAuth } from '../auth/AuthContext';

export function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cloud = AUTH_MODE === 'cloud';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await login(identifier, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Sign in failed.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-maroon-900 to-maroon-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Droplets className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold">Steam Trap Management</h1>
          <p className="text-sm text-maroon-200">Texas A&amp;M · Utilities &amp; Energy Services</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Lock className="h-5 w-5 text-maroon-700" />
            Sign in
          </h2>

          <label className="mb-3 block">
            <span className="label">{cloud ? 'Email' : 'Username'}</span>
            <input
              className="input"
              type={cloud ? 'email' : 'text'}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError(null);
              }}
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-red-600">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary mt-5 w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in
          </button>

          {cloud && (
            <p className="mt-4 text-xs text-slate-500">
              Sign in with a user you created in Supabase Auth (Authentication → Users).
            </p>
          )}

          {USING_DEFAULT_CREDENTIALS && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Using default credentials (<strong>admin</strong> / <strong>tamu-steam-2026</strong>).
              Set <code>VITE_APP_USERNAME</code> and <code>VITE_APP_PASSWORD</code> in your hosting
              provider to choose your own.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
