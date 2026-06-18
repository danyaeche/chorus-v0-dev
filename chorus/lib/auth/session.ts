/**
 * Brand/admin session resolution.
 *
 * In connected mode this reads the Supabase Auth user and their org membership.
 * In demo mode it returns the seeded brand user so the app is fully navigable
 * without auth provisioning. Either way the result is a `BrandViewer` consumed
 * by lib/permissions.
 */
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { demoBrandViewer } from '@/lib/db/seed';
import type { BrandViewer } from '@/lib/permissions/types';

/**
 * Resolve the current brand viewer, or null if unauthenticated.
 * Demo mode always resolves to the seeded brand owner.
 */
export async function getBrandViewer(): Promise<BrandViewer | null> {
  if (!isSupabaseConfigured()) {
    return demoBrandViewer();
  }

  const supabase = await createServerSupabase();
  if (!supabase) return demoBrandViewer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, role')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  return {
    kind: 'brand',
    profileId: user.id,
    email: user.email ?? '',
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    organizationId: membership.organization_id,
    role: membership.role,
  };
}

/** Require a brand viewer or throw (used by server actions/protected routes). */
export async function requireBrandViewer(): Promise<BrandViewer> {
  const viewer = await getBrandViewer();
  if (!viewer) throw new Error('UNAUTHENTICATED');
  return viewer;
}
