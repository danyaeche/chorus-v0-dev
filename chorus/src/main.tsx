import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Root } from '@/app/root';
import BrandLayout from '@/app/(brand)/layout';
import DashboardPage from '@/app/(brand)/dashboard/page';
import ProjectsPage from '@/app/(brand)/projects/page';
import ProjectDetailPage from '@/app/(brand)/projects/[projectId]/page';
import NewProjectPage from '@/app/(brand)/projects/new/page';
import PartsPage from '@/app/(brand)/parts/page';
import PartDetailPage from '@/app/(brand)/parts/[partId]/page';
import NewPartPage from '@/app/(brand)/parts/new/page';
import RevisionsPage from '@/app/(brand)/parts/[partId]/revisions/page';
import DfmPage from '@/app/(brand)/parts/[partId]/dfm/[dfmId]/page';
import IssueGroupsPage from '@/app/(brand)/parts/[partId]/issue-groups/page';
import SignoffsPage from '@/app/(brand)/parts/[partId]/signoffs/page';
import ApprovalPage from '@/app/(brand)/parts/[partId]/approval/page';
import IssuesPage from '@/app/(brand)/issues/page';
import IssueDetailPage from '@/app/(brand)/issues/[issueId]/page';
import ActivityPage from '@/app/(brand)/activity/page';
import TeamPage from '@/app/(brand)/team/page';
import ReviewersPage from '@/app/(brand)/reviewers/page';
import SettingsPage from '@/app/(brand)/settings/page';
import LoginPage from '@/app/login/page';
import SignupPage from '@/app/signup/page';
import SupplierPortalPage from '@/app/supplier/[token]/page';
import SupplierPartPage from '@/app/supplier/[token]/parts/[partId]/page';
import SupplierIssuePage from '@/app/supplier/[token]/issues/[issueId]/page';
import NotFound from '@/app/not-found';
import '@/app/globals.css';

function QueryRefresh({ children }: { children: React.ReactNode }) {
  const locationKey = window.location.pathname + window.location.search;
  useQuery({ queryKey: ['route', locationKey], queryFn: async () => ({ ok: true }) });
  return <>{children}</>;
}

function BrandShell() {
  return (
    <BrandLayout>
      <QueryRefresh>
        <Outlet />
      </QueryRefresh>
    </BrandLayout>
  );
}

function WithParams({ component: Component }: { component: React.ComponentType<any> }) {
  const params = useParams({ strict: false });
  return <Component params={params} />;
}

function IssuesRoute() {
  const search = useSearch({ strict: false }) as { part?: string; project?: string };
  return <IssuesPage searchParams={search} />;
}

function PartsRoute() {
  const search = useSearch({ strict: false }) as { project?: string };
  return <PartsPage searchParams={search} />;
}

const rootRoute = createRootRoute({ component: Root, notFoundComponent: NotFound });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', beforeLoad: () => { throw redirect({ to: '/dashboard' }); } });
const brandRoute = createRoute({ getParentRoute: () => rootRoute, id: 'brand', component: BrandShell });

const routes = [
  indexRoute,
  createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/signup', component: SignupPage }),
  brandRoute.addChildren([
    createRoute({ getParentRoute: () => brandRoute, path: '/dashboard', component: DashboardPage }),
    createRoute({ getParentRoute: () => brandRoute, path: '/projects', component: ProjectsPage }),
    createRoute({ getParentRoute: () => brandRoute, path: '/projects/new', component: NewProjectPage }),
    createRoute({ getParentRoute: () => brandRoute, path: '/projects/$projectId', component: () => <WithParams component={ProjectDetailPage} /> }),
    createRoute({ getParentRoute: () => brandRoute, path: '/parts', component: PartsRoute }),
    createRoute({ getParentRoute: () => brandRoute, path: '/parts/new', component: NewPartPage }),
    createRoute({ getParentRoute: () => brandRoute, path: '/parts/$partId', component: () => <WithParams component={PartDetailPage} /> }),
    createRoute({ getParentRoute: () => brandRoute, path: '/parts/$partId/revisions', component: () => <WithParams component={RevisionsPage} /> }),
    createRoute({ getParentRoute: () => brandRoute, path: '/parts/$partId/dfm/$dfmId', component: () => <WithParams component={DfmPage} /> }),
    createRoute({ getParentRoute: () => brandRoute, path: '/parts/$partId/issue-groups', component: () => <WithParams component={IssueGroupsPage} /> }),
    createRoute({ getParentRoute: () => brandRoute, path: '/parts/$partId/signoffs', component: () => <WithParams component={SignoffsPage} /> }),
    createRoute({ getParentRoute: () => brandRoute, path: '/parts/$partId/approval', component: () => <WithParams component={ApprovalPage} /> }),
    createRoute({ getParentRoute: () => brandRoute, path: '/issues', component: IssuesRoute }),
    createRoute({ getParentRoute: () => brandRoute, path: '/issues/$issueId', component: () => <WithParams component={IssueDetailPage} /> }),
    createRoute({ getParentRoute: () => brandRoute, path: '/activity', component: ActivityPage }),
    createRoute({ getParentRoute: () => brandRoute, path: '/team', component: TeamPage }),
    createRoute({ getParentRoute: () => brandRoute, path: '/reviewers', component: ReviewersPage }),
    createRoute({ getParentRoute: () => brandRoute, path: '/settings', component: SettingsPage }),
  ]),
  createRoute({ getParentRoute: () => rootRoute, path: '/supplier/$token', component: () => <WithParams component={SupplierPortalPage} /> }),
  createRoute({ getParentRoute: () => rootRoute, path: '/supplier/$token/parts/$partId', component: () => <WithParams component={SupplierPartPage} /> }),
  createRoute({ getParentRoute: () => rootRoute, path: '/supplier/$token/issues/$issueId', component: () => <WithParams component={SupplierIssuePage} /> }),
];

const routeTree = rootRoute.addChildren(routes);
const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
