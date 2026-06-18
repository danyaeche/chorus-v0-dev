/**
 * Centralized environment-variable access for Supabase.
 *
 * Chorus runs in two modes:
 *  - **Connected**: Supabase env vars are present -> real Postgres/Auth/Storage.
 *  - **Demo**: env vars are absent -> the app falls back to the in-memory seed
 *    (lib/db) so the foundation is runnable without provisioning Supabase.
 *
 * `isSupabaseConfigured()` lets the data/auth layers pick the right backend
 * without throwing at import time.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  // Server-only. Never import this into a client component.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  // Used to build absolute magic-link URLs in emails / invites.
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasServiceRole(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

/** Throws a clear error when a Supabase-only code path is hit without config. */
export function assertSupabaseConfigured(context: string): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      `[chorus] ${context} requires Supabase. Set NEXT_PUBLIC_SUPABASE_URL and ` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).`,
    );
  }
}
