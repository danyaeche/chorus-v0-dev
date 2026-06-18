import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge, ToneDot } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import {
  getDashboardStats,
  listActivity,
  listIssues,
  listProjectSummaries,
} from '@/lib/db';
import {
  issueSeverityTone,
  issueStatusLabels,
  issueStatusTone,
} from '@/types/labels';
import { timeAgo } from '@/utils/format';

export default async function DashboardPage() {
  const viewer = await requireBrandViewer();
  const stats = getDashboardStats(viewer);
  const projects = listProjectSummaries(viewer);
  const needsAttention = listIssues(viewer)
    .filter((i) => i.status === 'open' || (i.status === 'implemented' && i.validation_state === 'pending'))
    .slice(0, 6);
  const activity = listActivity(viewer, { limit: 6 });

  const completion = stats.dfm_completion_pct;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="DFM issues across all projects in the workspace"
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Open issues" value={stats.open_issues} hint="need a decision or fix" accent="danger" />
        <StatCard label="Awaiting validation" value={stats.awaiting_validation} hint="fix uploaded · supplier to confirm" accent="warning" />
        <StatCard label="Accepted" value={stats.accepted} hint="to implement next rev" />
        <StatCard label="Closed" value={stats.closed} hint="resolved this program" accent="success" />
        <StatCard label="DFM approved" value={stats.dfm_approved_parts} hint="parts cleared to cut steel" accent="success" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Needs attention</h2>
            <Link href="/issues" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              All issues <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-3 divide-y">
            {needsAttention.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Nothing needs attention. 🎉</p>
            ) : (
              needsAttention.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/issues/${issue.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ToneDot tone={issueSeverityTone[issue.severity]} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        <span className="text-muted-foreground">#{issue.number}</span> {issue.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {issue.reviewer?.company ?? 'Brand'} · {issueStatusLabels[issue.status]}
                      </div>
                    </div>
                  </div>
                  <StatusBadge label={issueStatusLabels[issue.status]} tone={issueStatusTone[issue.status]} />
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">DFM completion</h2>
          <div className="mt-4 flex flex-col items-center">
            <div className="relative flex size-32 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(var(--color-chart-1, #10b981) ${completion * 3.6}deg, var(--muted) 0deg)`,
              }}
            >
              <div className="flex size-24 flex-col items-center justify-center rounded-full bg-card">
                <span className="text-2xl font-semibold tabular-nums">{completion}%</span>
                <span className="text-[11px] text-muted-foreground">resolved</span>
              </div>
            </div>
            <div className="mt-4 w-full space-y-1.5 text-sm">
              <Row label="Closed" value={stats.closed} dot="success" />
              <Row label="Awaiting validation" value={stats.awaiting_validation} dot="warning" />
              <Row label="Open" value={stats.open_issues} dot="danger" />
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link href="/activity" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              Full feed <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ul className="mt-3 space-y-3">
            {activity.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-foreground/90">{e.summary}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">DFM by project</h2>
            <Link href="/projects" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              All projects <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {projects.map((p) => (
              <Link key={p.project.id} href={`/projects/${p.project.id}`} className="block">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.project.name}</span>
                  <span className="text-muted-foreground">{p.dfm_completion_pct}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.dfm_completion_pct}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.part_count} parts · {p.open_issue_count} open · {p.awaiting_validation_count} awaiting validation
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value, dot }: { label: string; value: number; dot: 'success' | 'warning' | 'danger' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <ToneDot tone={dot} /> {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
