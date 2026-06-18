/**
 * Browser Supabase client (for client components).
 *
 * Returns null when Supabase is not configured so callers can degrade to the
 * demo data layer rather than crash.
 */
'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env, isSupabaseConfigured } from '@/lib/env';

export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
