/**
 * Brand/admin session resolution.
 *
 * The TanStack/Vite app runs entirely in the browser for the demo workspace.
 * When Supabase is not configured it returns the seeded brand user so the app is
 * fully navigable without auth provisioning. Connected-browser auth can be added
 * through Supabase client APIs without relying on framework server primitives.
 */
import { isSupabaseConfigured } from '@/lib/env';
import { demoBrandViewer } from '@/lib/db/seed';
import type { BrandViewer } from '@/lib/permissions/types';

export function getBrandViewer(): BrandViewer | null {
  if (!isSupabaseConfigured()) return demoBrandViewer();

  // Connected auth is intentionally not attempted in the client-only shell yet.
  // Returning null sends users to the login placeholder instead of exposing data.
  return null;
}

export function requireBrandViewer(): BrandViewer {
  const viewer = getBrandViewer();
  if (!viewer) throw new Error('UNAUTHENTICATED');
  return viewer;
}
