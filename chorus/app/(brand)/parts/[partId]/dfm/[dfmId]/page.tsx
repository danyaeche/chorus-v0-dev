import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Lock } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge, ToneDot } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getDfm, getPart, listActivity } from '@/lib/db';
import {
  dfmStateLabels,
  dfmStateTone,
  issueSeverityTone,
  issueStatusLabels,
  issueStatusTone,
  ndaStatusLabels,
  ndaStatusTone,
  providerRoleLabels,
} from '@/types/labels';
import { rev, timeAgo } from '@/utils/format';

export default async function DfmDetailPage({
  params,
}: {
  params: Promise<{ partId: string; dfmId: string }>;
}) {
  const { partId, dfmId } = await params;
  const viewer = await requireBrandViewer();
  const dfm = getDfm(viewer, dfmId);
  const part = getPart(viewer, partId);
  if (!dfm || !part) notFound();

  const activity = listActivity(viewer, { partId, limit: 10 });

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href={`/parts/${partId}`} className="hover:underline">
            {part.name}
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            {dfm.reviewer.company}
            <StatusBadge label={dfmStateLabels[dfm.state]} tone={dfmStateTone[dfm.state]} />
          </span>
        }
        subtitle={`${dfm.reviewer.contact_name} · ${providerRoleLabels[dfm.provider_role]} · reviewing ${rev(dfm.current_revision?.rev_label)}`}
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Confidential DFM. {dfm.reviewer.company} cannot see other providers&apos; DFMs, files, recommendations, or
          issues — and they never see the cross-provider issue groups.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-5 text-sm lg:col-span-1">
          <Meta label="Provider" value={dfm.reviewer.company} />
          <Meta label="Contact" value={dfm.reviewer.contact_name} />
          <Meta label="Role" value={providerRoleLabels[dfm.provider_role]} />
          <Meta
            label="NDA"
            value={<StatusBadge label={ndaStatusLabels[dfm.reviewer.nda_status]} tone={ndaStatusTone[dfm.reviewer.nda_status]} />}
          />
          <Meta label="Revision under review" value={rev(dfm.current_revision?.rev_label)} />
          <Meta label="State" value={<StatusBadge label={dfmStateLabels[dfm.state]} tone={dfmStateTone[dfm.state]} />} />
          <Meta label="Open issues" value={String(dfm.open_issue_count)} />
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold">Issues on this DFM</h2>
          <div className="mt-3 divide-y border-t">
            {dfm.issues.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No issues raised yet.</p>
            ) : (
              dfm.issues.map((i) => (
                <Link
                  key={i.id}
                  href={`/issues/${i.id}`}
                  className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-muted/40 -mx-2 px-2 rounded"
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
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="font-semibold">Activity</h2>
        <ul className="mt-3 space-y-3">
          {activity.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
              <span>{e.summary}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
