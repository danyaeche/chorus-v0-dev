import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { getBrandViewer } from '@/lib/auth/session';
import { getOrganization } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/env';
import { initials } from '@/utils/format';

// The demo store is mutated by server actions; render brand routes per-request.
export const dynamic = 'force-dynamic';

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getBrandViewer();
  if (!viewer) {
    // Only happens in connected mode without a session.
    redirect('/login');
  }
  const org = getOrganization(viewer);

  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar workspaceName={org?.name ?? 'Workspace'} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center justify-between border-b px-6">
          <div className="text-sm text-muted-foreground">
            {isSupabaseConfigured() ? 'Connected' : 'Demo workspace'}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{viewer.fullName}</span>
            <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
              {initials(viewer.fullName)}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
