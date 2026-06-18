/** Framework-free Supabase helpers for the Vite/TanStack app. */
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { env, hasServiceRole, isSupabaseConfigured } from '@/lib/env';

export async function createServerSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseJsClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export function createServiceSupabase() {
  if (!hasServiceRole()) return null;
  return createSupabaseJsClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
