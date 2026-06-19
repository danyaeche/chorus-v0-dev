import { Link } from '@/lib/router';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { StatusBadge, ToneDot } from '@/components/status-badge';
import { CommentForm } from '@/components/comment-form';
import { ValidateControls } from '@/components/supplier/validate-controls';
import { Card } from '@/components/ui/card';
import { getIssue, getProfile, getReviewer, resolveReviewerToken } from '@/lib/db';
import {
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
import { rev, timeAgo } from '@/utils/format';


export default function SupplierIssuePage({
  params,
}: {
  params: { token: string; issueId: string };
}) {
  const { token, issueId } = params;
  const viewer = resolveReviewerToken(token, new Date().toISOString());
  if (!viewer) return <Invalid />;

  const issue = getIssue(viewer, issueId);
  if (!issue) return <Invalid />;

  const isAuthor = issue.created_by_reviewer_id === viewer.externalReviewerId;
  const canValidate =
    isAuthor && viewer.permissions.includes('validate_fixes') && issue.status === 'implemented';
  const canComment = viewer.permissions.includes('comment');

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href={`/supplier/${token}/parts/${issue.part_id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to part
      </Link>

      <div className="border-b pb-5">
        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
          {issue.title}
          <span className="text-muted-foreground">#{issue.number}</span>
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge label={issueStatusLabels[issue.status]} tone={issueStatusTone[issue.status]} />
          <StatusBadge label={issueTypeLabels[issue.type]} tone={issueTypeTone[issue.type]} />
          <span className="flex items-center gap-1 text-sm">
            <ToneDot tone={issueSeverityTone[issue.severity]} /> {issueSeverityLabels[issue.severity]}
          </span>
          <span className="text-sm text-muted-foreground">· {issueCategoryLabels[issue.category]}</span>
        </div>
      </div>

      {/* Validation prompt */}
      {canValidate ? (
        <div className="mt-4">
          <ValidateControls
            token={token}
            issueId={issue.id}
            fromRev={issue.created_on_revision?.rev_label ?? null}
            toRev={issue.implemented_in_revision?.rev_label ?? null}
          />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-2 text-sm text-foreground/90">{issue.description}</p>
            {issue.recommendation ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Your recommendation
                </div>
                <p className="mt-1">{issue.recommendation}</p>
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Discussion</h2>
            <ul className="mt-3 space-y-4">
              {(issue.comments ?? []).map((c) => {
                const author = c.author_profile_id
                  ? getProfile(c.author_profile_id)?.full_name ?? 'Brand'
                  : getReviewer(c.author_reviewer_id)?.contact_name ?? 'You';
                return (
                  <li key={c.id} className="flex gap-3 text-sm">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {(author ?? '?').slice(0, 1)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{author}</span>
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
            {canComment ? (
              <div className="mt-4 border-t pt-4">
                <CommentForm issueId={issue.id} token={token} />
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-3 p-5 text-sm">
            <Meta label="Status" value={<StatusBadge label={issueStatusLabels[issue.status]} tone={issueStatusTone[issue.status]} />} />
            <Meta label="Type" value={issueTypeLabels[issue.type]} />
            <Meta label="Category" value={issueCategoryLabels[issue.category]} />
            <Meta label="Severity" value={issueSeverityLabels[issue.severity]} />
            <Meta
              label="Validation"
              value={<StatusBadge label={validationStateLabels[issue.validation_state]} tone={validationStateTone[issue.validation_state]} />}
            />
          </Card>

          <Card className="space-y-3 p-5 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revision lineage</div>
            <Meta label="Created on" value={rev(issue.created_on_revision?.rev_label)} />
            <Meta label="Implemented in" value={rev(issue.implemented_in_revision?.rev_label)} />
            <p className="text-xs text-muted-foreground">
              Validation compares created-on → implemented-in. A failed validation reopens the issue.
            </p>
          </Card>
        </div>
      </div>
    </div>
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

function Invalid() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="size-10 text-amber-500" />
      <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
      <p className="text-sm text-muted-foreground">
        The magic link is unknown, expired, revoked, or doesn&apos;t grant access to this issue.
      </p>
    </div>
  );
}
