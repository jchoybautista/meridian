import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase is optional for browsing. Auth/watchlist/portfolio features are
 * enabled only when env vars are present. `isSupabaseConfigured` lets the UI
 * degrade gracefully (show "connect Supabase to log in") instead of crashing.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;
