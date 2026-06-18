/** Centralized environment-variable access for Supabase and the browser app. */

type EnvRecord = Record<string, string | undefined>;
const viteEnv = (import.meta as unknown as { env?: EnvRecord }).env ?? {};
const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const read = (key: string) => viteEnv[key] ?? nodeEnv[key] ?? '';

const supabaseUrl = read('VITE_SUPABASE_URL') || read('SUPABASE_URL');
const supabasePublishableKey =
  read('VITE_SUPABASE_PUBLISHABLE_KEY') || read('VITE_SUPABASE_ANON_KEY') || read('SUPABASE_PUBLISHABLE_KEY');
const supabaseSecretKey = read('SUPABASE_SECRET_KEY') || read('SUPABASE_SERVICE_ROLE_KEY');

export const env = {
  supabaseUrl,
  supabasePublishableKey,
  supabaseAnonKey: supabasePublishableKey,
  supabaseSecretKey,
  supabaseServiceRoleKey: supabaseSecretKey,
  supabaseJwksUrl: read('SUPABASE_JWKS_URL') || (supabaseUrl ? `${supabaseUrl}/auth/v1/.well-known/jwks.json` : ''),
  appUrl: read('VITE_APP_URL') || 'http://localhost:3000',
} as const;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export function hasServiceRole(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseSecretKey);
}

export function assertSupabaseConfigured(context: string): void {
  if (!isSupabaseConfigured()) {
    throw new Error(`[chorus] ${context} requires Supabase. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.`);
  }
}
