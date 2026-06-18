import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { requireBrandViewer } from '@/lib/auth/session';
import { listProjectSummaries } from '@/lib/db';
import { rev } from '@/utils/format';

export default async function ProjectsPage() {
  const viewer = await requireBrandViewer();
  const projects = listProjectSummaries(viewer);

  const totalParts = projects.reduce((n, p) => n + p.part_count, 0);
  const totalOpen = projects.reduce((n, p) => n + p.open_issue_count, 0);
  const avgCompletion = projects.length
    ? Math.round(projects.reduce((n, p) => n + p.dfm_completion_pct, 0) / projects.length)
    : 0;

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Every DFM program — one manufacturing partner per provider, per project"
        actions={
          <Button asChild size="sm">
            <Link href="/projects/new">
              <Plus className="size-4" /> New project
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Active projects" value={projects.filter((p) => p.project.status === 'active').length} />
        <StatCard label="Parts in review" value={totalParts} />
        <StatCard label="Open issues" value={totalOpen} accent="danger" />
        <StatCard label="Avg DFM completion" value={`${avgCompletion}%`} accent="success" />
      </div>

      <Card className="mt-4 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Parts</TableHead>
              <TableHead className="text-right">Open issues</TableHead>
              <TableHead>DFM completion</TableHead>
              <TableHead>Latest rev</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.project.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/projects/${p.project.id}`} className="font-medium hover:underline">
                    {p.project.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{p.project.description}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.part_count}</TableCell>
                <TableCell className="text-right tabular-nums">{p.open_issue_count}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.dfm_completion_pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{p.dfm_completion_pct}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{rev(p.latest_revision_label)}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={p.project.status === 'active' ? 'Active' : p.project.status === 'on_hold' ? 'On hold' : 'Archived'}
                    tone={p.project.status === 'active' ? 'accent' : 'neutral'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
