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
import { Root } from '@/src/root';
import BrandLayout from '@/src/routes/brand/layout';
import DashboardPage from '@/src/routes/brand/dashboard/page';
import ProjectsPage from '@/src/routes/brand/projects/page';
import ProjectDetailPage from '@/src/routes/brand/projects/$projectId/page';
import NewProjectPage from '@/src/routes/brand/projects/new/page';
import PartsPage from '@/src/routes/brand/parts/page';
import PartDetailPage from '@/src/routes/brand/parts/$partId/page';
import NewPartPage from '@/src/routes/brand/parts/new/page';
import RevisionsPage from '@/src/routes/brand/parts/$partId/revisions/page';
import DfmPage from '@/src/routes/brand/parts/$partId/dfm/$dfmId/page';
import IssueGroupsPage from '@/src/routes/brand/parts/$partId/issue-groups/page';
import SignoffsPage from '@/src/routes/brand/parts/$partId/signoffs/page';
import ApprovalPage from '@/src/routes/brand/parts/$partId/approval/page';
import IssuesPage from '@/src/routes/brand/issues/page';
import IssueDetailPage from '@/src/routes/brand/issues/$issueId/page';
import ActivityPage from '@/src/routes/brand/activity/page';
import TeamPage from '@/src/routes/brand/team/page';
import ReviewersPage from '@/src/routes/brand/reviewers/page';
import SettingsPage from '@/src/routes/brand/settings/page';
import LoginPage from '@/src/routes/login/page';
import SignupPage from '@/src/routes/signup/page';
import SupplierPortalPage from '@/src/routes/supplier/$token/page';
import SupplierPartPage from '@/src/routes/supplier/$token/parts/$partId/page';
import SupplierIssuePage from '@/src/routes/supplier/$token/issues/$issueId/page';
import NotFound from '@/src/not-found';
import '@/src/globals.css';

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
