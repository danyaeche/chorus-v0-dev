/**
 * Server-side Supabase clients.
 *
 *  - `createServerSupabase()` — request-scoped client bound to the user's auth
 *    cookies; subject to RLS. Use for brand/admin reads & writes.
 *  - `createServiceSupabase()` — service-role client that BYPASSES RLS. Use only
 *    on the server, only after the permission helpers have authorized the
 *    request. This is how scoped external-reviewer (magic-link) access is served.
 *
 * Both return null when Supabase is not configured (demo mode).
 */
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env, hasServiceRole, isSupabaseConfigured } from '@/lib/env';

export async function createServerSupabase() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — cookie mutation is a no-op here and
          // is refreshed by the middleware instead. Safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client. Never expose to the browser. Confidentiality for the
 * data it touches must be enforced by the caller via lib/permissions.
 */
export function createServiceSupabase() {
  if (!hasServiceRole()) return null;
  return createSupabaseJsClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
