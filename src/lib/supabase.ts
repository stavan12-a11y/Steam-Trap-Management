import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cloud mode is active when both Supabase env vars are set. In that mode the
 * app shares one live dataset across everyone who signs in.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

export const STATE_ROW_ID = 'steam-trap';
export const STATE_TABLE = 'steam_trap_state';
