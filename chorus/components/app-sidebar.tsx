import { Link } from '@/lib/router';
import { usePathname } from '@/lib/router';
import {
  Activity,
  Boxes,
  CircleDot,
  LayoutDashboard,
  Link2,
  Settings,
  Users,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Boxes },
  { href: '/parts', label: 'Parts', icon: Workflow },
  { href: '/issues', label: 'Issues', icon: CircleDot },
  { href: '/activity', label: 'Activity', icon: Activity },
];

const FOOTER_NAV = [
  { href: '/team', label: 'Team', icon: Users },
  { href: '/reviewers', label: 'Magic links', icon: Link2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();

  const item = (nav: { href: string; label: string; icon: typeof LayoutDashboard }) => {
    const active = pathname === nav.href || pathname.startsWith(nav.href + '/');
    const Icon = nav.icon;
    return (
      <Link
        key={nav.href}
        href={nav.href}
        className={cn(
          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" />
        {nav.label}
      </Link>
    );
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
          <Workflow className="size-4" />
        </div>
        <span className="text-base font-semibold tracking-tight">chorus</span>
      </div>

      <div className="px-3 pb-2">
        <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Workspace
        </div>
        <div className="mt-1 rounded-md border bg-background/40 px-3 py-2 text-sm font-medium">
          {workspaceName}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">{NAV.map(item)}</nav>

      <nav className="flex flex-col gap-0.5 border-t px-3 py-3">{FOOTER_NAV.map(item)}</nav>
    </aside>
  );
}
