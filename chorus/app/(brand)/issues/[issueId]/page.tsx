import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { DispositionForm } from '@/components/disposition-form';
import { StatusBadge, ToneDot } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getIssue, getPart, getProfile, getReviewer } from '@/lib/db';
import {
  brandDecisionLabels,
  brandDecisionTone,
  implementationStateLabels,
  issueCategoryLabels,
  issueSeverityLabels,
  issueSeverityTone,
  issueStatusLabels,
  issueStatusTone,
  issueTypeLabels,
  issueTypeTone,
  validationStateLabels,
  validationStateTone,
} from '@/types/labels';
import { ISSUE_STATUSES } from '@/types/enums';
import { formatCurrency, rev, timeAgo } from '@/utils/format';

const STEPPER = ISSUE_STATUSES; // open → dispositioned → implemented → validated → closed

export default async function IssueDetailPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const viewer = await requireBrandViewer();
  const issue = getIssue(viewer, issueId);
  if (!issue) notFound();

  const part = getPart(viewer, issue.part_id);
  const reviewer = getReviewer(issue.created_by_reviewer_id);
  const span = {
    from: issue.created_on_revision?.rev_label ?? null,
    to: issue.implemented_in_revision?.rev_label ?? null,
  };
  const reachedIdx = STEPPER.indexOf(issue.status);

  return (
    <>
      <PageHeader
        breadcrumb={
          <span className="flex items-center gap-1.5">
            <Link href="/issues" className="hover:underline">Issues</Link>
            {part ? (
              <>
                <span>/</span>
                <Link href={`/parts/${part.id}`} className="hover:underline">{part.name}</Link>
              </>
            ) : null}
          </span>
        }
        title={
          <span className="flex items-center gap-3">
            {issue.title}
            <span className="text-muted-foreground">#{issue.number}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge label={issueStatusLabels[issue.status]} tone={issueStatusTone[issue.status]} />
            <StatusBadge label={issueTypeLabels[issue.type]} tone={issueTypeTone[issue.type]} />
            <span className="flex items-center gap-1 text-sm">
              <ToneDot tone={issueSeverityTone[issue.severity]} /> {issueSeverityLabels[issue.severity]}
            </span>
            <span className="text-sm">· raised by {reviewer?.contact_name ?? 'brand'} ({reviewer?.company})</span>
          </span>
        }
      />

      {/* Lifecycle stepper */}
      <Card className="mb-4 p-4">
        <div className="flex items-center justify-between">
          {STEPPER.map((s, idx) => {
            const done = idx <= reachedIdx;
            return (
              <div key={s} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={
                      'flex size-7 items-center justify-center rounded-full text-xs font-medium ' +
                      (done ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground')
                    }
                  >
                    {idx + 1}
                  </span>
                  <span className={'text-xs ' + (done ? 'font-medium' : 'text-muted-foreground')}>
                    {issueStatusLabels[s]}
                  </span>
                </div>
                {idx < STEPPER.length - 1 ? (
                  <div className={'mx-2 h-0.5 flex-1 ' + (idx < reachedIdx ? 'bg-emerald-600' : 'bg-muted')} />
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Description + recommendation */}
          <Card className="p-5">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-2 text-sm text-foreground/90">{issue.description}</p>
            {issue.recommendation ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Provider recommendation
                </div>
                <p className="mt-1">{issue.recommendation}</p>
              </div>
            ) : null}
          </Card>

          {/* Disposition */}
          <Card className="p-5">
            <h2 className="font-semibold">Brand disposition</h2>
            {issue.brand_decision ? (
              <div className="mt-2">
                <StatusBadge label={brandDecisionLabels[issue.brand_decision]} tone={brandDecisionTone[issue.brand_decision]} />
                {issue.rejection_rationale ? (
                  <p className="mt-2 text-sm text-muted-foreground">{issue.rejection_rationale}</p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3">
              <DispositionForm issueId={issue.id} current={issue.brand_decision} />
            </div>
          </Card>

          {/* Comment thread */}
          <Card className="p-5">
            <h2 className="font-semibold">Discussion</h2>
            <ul className="mt-3 space-y-4">
              {(issue.comments ?? []).map((c) => {
                const author =
                  c.author_profile_id ? getProfile(c.author_profile_id)?.full_name : getReviewer(c.author_reviewer_id)?.contact_name;
                return (
                  <li key={c.id} className="flex gap-3 text-sm">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {(author ?? '?').slice(0, 1)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{author ?? 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="mt-0.5 text-foreground/90">{c.body}</p>
                    </div>
                  </li>
                );
              })}
              {(issue.comments ?? []).length === 0 ? (
                <li className="text-sm text-muted-foreground">No comments yet.</li>
              ) : null}
            </ul>
          </Card>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          <Card className="space-y-3 p-5 text-sm">
            <Meta label="Status" value={<StatusBadge label={issueStatusLabels[issue.status]} tone={issueStatusTone[issue.status]} />} />
            <Meta label="Type" value={issueTypeLabels[issue.type]} />
            <Meta label="Category" value={issueCategoryLabels[issue.category]} />
            <Meta label="Severity" value={issueSeverityLabels[issue.severity]} />
            <Meta label="Implementation" value={implementationStateLabels[issue.implementation_state]} />
            <Meta
              label="Validation"
              value={<StatusBadge label={validationStateLabels[issue.validation_state]} tone={validationStateTone[issue.validation_state]} />}
            />
            {issue.cost_impact != null ? <Meta label="Cost impact" value={formatCurrency(issue.cost_impact)} /> : null}
          </Card>

          <Card className="space-y-3 p-5 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revision lineage</div>
            <Meta label="Created on" value={rev(span.from)} />
            <Meta label="Implemented in" value={rev(span.to)} />
            <p className="text-xs text-muted-foreground">
              Validation compares created-on → implemented-in. A failed validation reopens the issue.
            </p>
          </Card>

          <Card className="space-y-2 p-5 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reporter</div>
            <div>{reviewer?.contact_name ?? '—'}</div>
            <div className="text-xs text-muted-foreground">{reviewer?.company}</div>
          </Card>
        </div>
      </div>
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
