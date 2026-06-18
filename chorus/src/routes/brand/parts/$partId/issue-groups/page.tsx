import { Link } from '@/lib/router';
import { notFound } from '@/lib/router';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getPart, listIssueGroups } from '@/lib/db';
import { issueStatusLabels, issueStatusTone } from '@/types/labels';

export default function IssueGroupsPage({ params }: { params: { partId: string } }) {
  const { partId } = params;
  const viewer = requireBrandViewer();
  const part = getPart(viewer, partId);
  if (!part) notFound();
  const groups = listIssueGroups(viewer, { partId });

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href={`/parts/${partId}`} className="hover:underline">
            {part.name}
          </Link>
        }
        title="Issue groups"
        subtitle="Brand-side rollups of the same concern across provider DFMs. Providers see only their own issue — never the group."
      />

      {groups.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No issue groups yet.</Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{g.title}</span>
                    {g.conflict_flag ? (
                      <StatusBadge label="Conflicting recommendations" tone="danger" />
                    ) : null}
                  </div>
                  {g.description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{g.description}</p> : null}
                </div>
              </div>

              {g.conflict_flag ? (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>Providers gave contradictory recommendations. Reconcile to a single geometry both can run, then disposition once.</span>
                </div>
              ) : null}

              <div className="mt-3 divide-y border-t">
                {g.issues.map((i) => (
                  <Link
                    key={i.id}
                    href={`/issues/${i.id}`}
                    className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-muted/40 -mx-2 px-2 rounded"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-muted-foreground">#{i.number}</span> {i.title}
                      <span className="ml-2 text-xs text-muted-foreground">{i.reviewer?.company}</span>
                    </span>
                    <StatusBadge label={issueStatusLabels[i.status]} tone={issueStatusTone[i.status]} />
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
