import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Single shared login.
//
// • Cloud mode (Supabase configured): the login is a real Supabase Auth account
//   shared by the team. Sign-in protects the shared database (RLS requires an
//   authenticated session), so the data is genuinely access-controlled.
//
// • Local mode (no Supabase): a lightweight static username/password gate using
//   VITE_APP_USERNAME / VITE_APP_PASSWORD, with per-browser localStorage data.
//   Handy for development; not server-grade security.
// ---------------------------------------------------------------------------

const LOCAL_USERNAME = import.meta.env.VITE_APP_USERNAME ?? 'admin';
const LOCAL_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? 'tamu-steam-2026';

/** True when running the local static gate with its built-in default password. */
export const USING_DEFAULT_CREDENTIALS = !isSupabaseConfigured && !import.meta.env.VITE_APP_PASSWORD;

export const AUTH_MODE: 'cloud' | 'local' = isSupabaseConfigured ? 'cloud' : 'local';

const LOCAL_STORAGE_KEY = 'steam-trap-auth-v1';

interface AuthContextValue {
  authed: boolean;
  /** False until the initial session check completes (cloud mode). */
  ready: boolean;
  mode: 'cloud' | 'local';
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(() => {
    if (isSupabaseConfigured) return false;
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [ready, setReady] = useState<boolean>(!isSupabaseConfigured);

  // Cloud mode: restore an existing Supabase session and watch for changes.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuthed(Boolean(data.session));
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: identifier.trim(),
        password,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    const ok = identifier.trim() === LOCAL_USERNAME && password === LOCAL_PASSWORD;
    if (ok) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, '1');
      } catch {
        // ignore
      }
      setAuthed(true);
      return { ok: true };
    }
    return { ok: false, error: 'Incorrect username or password.' };
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setAuthed(false);
      return;
    }
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // ignore
    }
    setAuthed(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ authed, ready, mode: AUTH_MODE, login, logout }),
    [authed, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
