import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PartsTable } from '@/components/parts-table';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getProject, listActivity, listParts, listIssues } from '@/lib/db';
import { formatDate, timeAgo } from '@/utils/format';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const viewer = await requireBrandViewer();
  const project = getProject(viewer, projectId);
  if (!project) notFound();

  const parts = listParts(viewer, { projectId });
  const issues = listIssues(viewer, { projectId });
  const activity = listActivity(viewer, { projectId, limit: 8 });

  const openIssues = issues.filter((i) => i.status === 'open').length;
  const awaiting = issues.filter((i) => i.status === 'implemented' && i.validation_state === 'pending').length;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href="/projects" className="hover:underline">
            Projects
          </Link>
        }
        title={project.name}
        subtitle={project.description ?? undefined}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/parts">View parts</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Parts" value={parts.length} />
        <StatCard label="Open issues" value={openIssues} accent="danger" />
        <StatCard label="Awaiting validation" value={awaiting} accent="warning" />
        <StatCard label="Target completion" value={<span className="text-base">{formatDate(project.target_completion)}</span>} />
      </div>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Parts</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href="/parts">
              <Plus className="size-4" /> Add part
            </Link>
          </Button>
        </div>
        <PartsTable parts={parts} />
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="font-semibold">Recent activity</h2>
        <ul className="mt-3 space-y-3">
          {activity.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-foreground/90">{e.summary}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
