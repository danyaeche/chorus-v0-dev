import { Link } from '@/lib/router';
import { notFound } from '@/lib/router';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PartsTable } from '@/components/parts-table';
import { StatCard } from '@/components/stat-card';
import { StatusBadge, ToneDot } from '@/components/status-badge';
import { ActivityFeed } from '@/components/activity-feed';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getProject, listActivity, listDfmsForPart, listParts, listIssues, listReviewers } from '@/lib/db';
import { deriveProjectState } from '@/lib/workflow';
import {
  dfmStateLabels,
  dfmStateTone,
  issueSeverityTone,
  issueStatusLabels,
  issueStatusTone,
  ndaStatusLabels,
  ndaStatusTone,
  projectStateLabels,
  projectStateTone,
  providerRoleLabels,
} from '@/types/labels';
import { formatDate, rev } from '@/utils/format';


export default function ProjectDetailPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;
  const viewer = requireBrandViewer();
  const project = getProject(viewer, projectId);
  if (!project) notFound();

  const parts = listParts(viewer, { projectId });
  const issues = listIssues(viewer, { projectId });
  const activity = listActivity(viewer, { projectId, limit: 10 });
  const reviewers = listReviewers(viewer).filter((r) => r.project_id === projectId);
  const dfms = parts.flatMap((p) => listDfmsForPart(viewer, p.part.id));

  const projectState = deriveProjectState(parts.map((p) => p.part));
  const openIssues = issues.filter((i) => i.status === 'open');
  const awaiting = issues.filter((i) => i.status === 'implemented' && i.validation_state === 'pending');

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href="/projects" className="hover:underline">
            Projects
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            {project.name}
            <StatusBadge label={projectStateLabels[projectState]} tone={projectStateTone[projectState]} />
          </span>
        }
        subtitle={project.description ?? undefined}
        actions={
          <Link href={`/parts?project=${projectId}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
            View parts
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Parts" value={parts.length} />
        <StatCard label="Open issues" value={openIssues.length} accent="danger" />
        <StatCard label="Awaiting validation" value={awaiting.length} accent="warning" />
        <StatCard label="Target completion" value={<span className="text-base">{formatDate(project.target_completion)}</span>} />
      </div>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Parts</h2>
          <Link href={`/parts/new`} className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
            <Plus className="size-4" /> Add part
          </Link>
        </div>
        <PartsTable parts={parts} />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Active DFMs */}
        <Card className="p-5">
          <h2 className="font-semibold">Active DFMs</h2>
          <p className="mt-1 text-xs text-muted-foreground">Per-provider reviews — each walled off from the others.</p>
          <ul className="mt-3 divide-y">
            {dfms.length === 0 ? (
              <li className="py-4 text-sm text-muted-foreground">No DFM reviews started yet.</li>
            ) : (
              dfms.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{d.reviewer.company}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {providerRoleLabels[d.provider_role]} · reviewing {rev(d.current_revision?.rev_label)} · {d.open_issue_count} open
                    </div>
                  </div>
                  <StatusBadge label={dfmStateLabels[d.state]} tone={dfmStateTone[d.state]} />
                </li>
              ))
            )}
          </ul>
        </Card>

        {/* External reviewers */}
        <Card className="p-5">
          <h2 className="font-semibold">External reviewers</h2>
          <p className="mt-1 text-xs text-muted-foreground">Providers in this program&apos;s address book.</p>
          <ul className="mt-3 divide-y">
            {reviewers.length === 0 ? (
              <li className="py-4 text-sm text-muted-foreground">No reviewers yet.</li>
            ) : (
              reviewers.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.company}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.contact_name} · {providerRoleLabels[r.provider_role]}
                    </div>
                  </div>
                  <StatusBadge label={`NDA ${ndaStatusLabels[r.nda_status]}`} tone={ndaStatusTone[r.nda_status]} />
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      {/* Open issues */}
      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Open issues</h2>
          <Link href={`/issues?project=${projectId}`} className="text-sm text-muted-foreground hover:text-foreground">
            All issues →
          </Link>
        </div>
        <ul className="mt-3 divide-y">
          {openIssues.length === 0 ? (
            <li className="py-4 text-sm text-muted-foreground">No open issues. 🎉</li>
          ) : (
            openIssues.map((i) => (
              <Link
                key={i.id}
                href={`/issues/${i.id}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-2 text-sm hover:bg-muted/40"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ToneDot tone={issueSeverityTone[i.severity]} />
                  <span className="truncate">
                    <span className="text-muted-foreground">#{i.number}</span> {i.title}
                  </span>
                </span>
                <StatusBadge label={issueStatusLabels[i.status]} tone={issueStatusTone[i.status]} />
              </Link>
            ))
          )}
        </ul>
      </Card>

      {/* Recent activity */}
      <Card className="mt-4 p-5">
        <h2 className="font-semibold">Recent activity</h2>
        <div className="mt-3">
          <ActivityFeed events={activity} emptyLabel="No activity yet." />
        </div>
      </Card>
    </>
  );
}
