import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Box, FileText } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PackagePanel } from '@/components/package-panel';
import { StatusBadge, ToneDot } from '@/components/status-badge';
import { ActivityFeed } from '@/components/activity-feed';
import { InviteReviewerDialog } from '@/components/invite-reviewer-dialog';
import { UploadRevisionDialog } from '@/components/upload-revision-dialog';
import { SignoffControls } from '@/components/signoff-controls';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getPartDetail, listReviewers } from '@/lib/db';
import { dfmApprovalReadiness } from '@/lib/workflow';
import {
  dfmStateLabels,
  dfmStateTone,
  issueSeverityTone,
  issueStatusLabels,
  issueStatusTone,
  ndaStatusLabels,
  ndaStatusTone,
  partProcessLabels,
  partStateLabels,
  partStateTone,
  providerRoleLabels,
  signoffStateLabels,
  signoffStateTone,
  signoffTopicLabels,
} from '@/types/labels';
import { formatCurrency, formatDate, formatNumber, initials, rev } from '@/utils/format';

export const dynamic = 'force-dynamic';

export default async function PartDetailPage({ params }: { params: Promise<{ partId: string }> }) {
  const { partId } = await params;
  const viewer = await requireBrandViewer();
  const detail = getPartDetail(viewer, partId);
  if (!detail) notFound();

  const { part, project, owner, revisions, current_revision, dfms, signoffs, issue_groups, package: pkg, approval } = detail;
  const allIssues = dfms.flatMap((d) => d.issues);
  const readiness = dfmApprovalReadiness({ issues: allIssues, signoffs, frozenRevision: current_revision ?? null });
  const packageComplete = pkg.state === 'complete';

  const nextRevIndex = revisions.length ? Math.max(...revisions.map((r) => r.rev_index)) + 1 : 0;
  const nextRevLabel = String.fromCharCode(65 + Math.min(nextRevIndex, 25));

  // Prefill the invite with a project reviewer who isn't yet a provider on this part.
  const providerReviewerIds = new Set(dfms.map((d) => d.external_reviewer_id));
  const candidateReviewer = listReviewers(viewer).find(
    (r) => r.project_id === part.project_id && !providerReviewerIds.has(r.id),
  );

  return (
    <>
      <PageHeader
        breadcrumb={
          <span className="flex items-center gap-1.5">
            <Link href="/projects" className="hover:underline">Projects</Link>
            <span>/</span>
            <Link href={`/projects/${project.id}`} className="hover:underline">{project.name}</Link>
          </span>
        }
        title={
          <span className="flex items-center gap-3">
            {part.name}
            <StatusBadge label={partStateLabels[part.part_state]} tone={partStateTone[part.part_state]} />
          </span>
        }
        subtitle={`${part.part_number} · ${part.material ?? '—'} · ${partProcessLabels[part.process]}`}
        actions={
          <>
            <UploadRevisionDialog partId={part.id} nextRevLabel={nextRevLabel} />
            <InviteReviewerDialog
              partId={part.id}
              packageComplete={packageComplete}
              triggerLabel="Invite reviewer"
              defaults={
                candidateReviewer
                  ? {
                      company: candidateReviewer.company,
                      contact_name: candidateReviewer.contact_name,
                      contact_email: candidateReviewer.contact_email,
                      provider_role: candidateReviewer.provider_role,
                      nda_status: candidateReviewer.nda_status,
                      confidentiality: candidateReviewer.confidentiality,
                    }
                  : undefined
              }
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Part details */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Part details</h2>
            <span className="text-xs text-muted-foreground">{part.part_number} · {rev(current_revision?.rev_label)}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Detail label="Part number" value={part.part_number} />
            <Detail label="Material" value={part.material ?? '—'} />
            <Detail label="Finish" value={part.finish ?? '—'} />
            <Detail label="Process" value={partProcessLabels[part.process]} />
            <Detail label="Target volume" value={`${formatNumber(part.target_volume)} / yr`} />
            <Detail label="Target cost" value={`${formatCurrency(part.target_cost)} / unit`} />
            <Detail label="Owner" value={owner?.full_name ?? '—'} />
            <Detail label="Part state" value={<StatusBadge label={partStateLabels[part.part_state]} tone={partStateTone[part.part_state]} />} />
            <Detail label="Package" value={<StatusBadge label={pkg.state === 'complete' ? 'Complete' : 'Incomplete'} tone={pkg.state === 'complete' ? 'success' : 'warning'} />} />
          </dl>
          {part.description ? (
            <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">{part.description}</p>
          ) : null}
        </Card>

        {/* DFM Approval readiness */}
        <Card className="p-5">
          <h2 className="font-semibold">DFM Approval readiness</h2>
          <p className="mt-1 text-xs text-muted-foreground">The terminal gate — cleared to cut steel.</p>
          {approval ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
              <div className="font-medium text-emerald-700 dark:text-emerald-300">DFM Approved · Rev {revisions.find((r) => r.id === approval.approved_revision_id)?.rev_label ?? '—'}</div>
              <div className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/70">Cleared to cut steel · {formatDate(approval.approved_at)}</div>
            </div>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {readiness.criteria.map((c) => (
                  <li key={c.key} className="flex items-start gap-2 text-sm">
                    <span className={c.met ? 'text-emerald-600' : 'text-amber-600'}>{c.met ? '✓' : '○'}</span>
                    <div>
                      <div>{c.label}</div>
                      {c.detail ? <div className="text-xs text-muted-foreground">{c.detail}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>
              {readiness.ready ? (
                <Link href={`/parts/${part.id}/approval`} className={buttonVariants({ size: 'sm', className: 'mt-4 w-full' })}>
                  Approve DFM — freeze &amp; cut steel
                </Link>
              ) : (
                <Link href={`/parts/${part.id}/approval`} className={buttonVariants({ size: 'sm', variant: 'outline', className: 'mt-4 w-full' })}>
                  View approval gate
                </Link>
              )}
            </>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Revisions */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Revisions</h2>
            <Link href={`/parts/${part.id}/revisions`} className="text-sm text-muted-foreground hover:text-foreground">
              History →
            </Link>
          </div>
          <ol className="mt-3 space-y-2">
            {[...revisions].reverse().map((r) => (
              <li key={r.id} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {rev(r.rev_label)}
                    {r.id === current_revision?.id ? <StatusBadge label="Current" tone="success" /> : null}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatCurrency(r.quote_amount)}</span>
                </div>
                {r.change_summary ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.change_summary}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>

        {/* Files */}
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Files — {rev(current_revision?.rev_label)}</h2>
          </div>
          <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 py-8 text-muted-foreground">
            <Box className="size-10" />
            <p className="mt-2 text-xs">3D/2D viewer (vNext)</p>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {detail.files.length === 0 ? (
              <li className="text-xs text-muted-foreground">No files yet.</li>
            ) : (
              detail.files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-muted/40">
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span className="truncate">{f.file_name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{f.watermarked ? 'watermarked' : ''}</span>
                </li>
              ))
            )}
          </ul>
        </Card>

        {/* Package gate */}
        <PackagePanel items={pkg.items} />
      </div>

      {/* Per-provider DFMs / external reviewers */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">External reviewers &amp; DFM reviews</h2>
          <span className="text-sm text-muted-foreground">
            {dfms.length} provider{dfms.length === 1 ? '' : 's'} · each walled off &amp; on its own revision
          </span>
        </div>
        {dfms.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No reviewers invited yet.
              {packageComplete
                ? ' Invite a provider to start a confidential DFM review.'
                : ' Complete the package above to unlock reviewer invites.'}
            </p>
            <InviteReviewerDialog
              partId={part.id}
              packageComplete={packageComplete}
              triggerLabel="Invite reviewer"
              defaults={
                candidateReviewer
                  ? {
                      company: candidateReviewer.company,
                      contact_name: candidateReviewer.contact_name,
                      contact_email: candidateReviewer.contact_email,
                      provider_role: candidateReviewer.provider_role,
                      nda_status: candidateReviewer.nda_status,
                      confidentiality: candidateReviewer.confidentiality,
                    }
                  : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {dfms.map((d) => (
              <Card key={d.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                      {initials(d.reviewer.contact_name)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{d.reviewer.company}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.reviewer.contact_name} · {providerRoleLabels[d.provider_role]} · reviewing {rev(d.current_revision?.rev_label)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge label={dfmStateLabels[d.state]} tone={dfmStateTone[d.state]} />
                    <StatusBadge label={`NDA ${ndaStatusLabels[d.reviewer.nda_status]}`} tone={ndaStatusTone[d.reviewer.nda_status]} />
                  </div>
                </div>

                <div className="mt-3 divide-y border-t">
                  {d.issues.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">No issues raised yet.</p>
                  ) : (
                    d.issues.map((i) => (
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
                <div className="mt-3 text-right">
                  <Link href={`/parts/${part.id}/dfm/${d.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                    Open DFM →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sign-offs + Issue groups */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Sign-offs</h2>
            <Link href={`/parts/${part.id}/signoffs`} className="text-sm text-muted-foreground hover:text-foreground">
              Manage →
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Joint agreements — not issues one side &quot;accepts.&quot;</p>
          <ul className="mt-3 space-y-3">
            {signoffs.length === 0 ? (
              <li className="py-2 text-sm text-muted-foreground">No sign-offs yet.</li>
            ) : (
              signoffs.map((s) => (
                <li key={s.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{signoffTopicLabels[s.topic]}</div>
                    </div>
                    <StatusBadge label={signoffStateLabels[s.state]} tone={signoffStateTone[s.state]} />
                  </div>
                  <div className="mt-2">
                    <SignoffControls signoffId={s.id} state={s.state} rationale={s.rationale} />
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Issue groups</h2>
            <Link href={`/parts/${part.id}/issue-groups`} className="text-sm text-muted-foreground hover:text-foreground">
              Manage →
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Brand-side rollups across providers — never shown to reviewers.</p>
          <ul className="mt-3 divide-y">
            {issue_groups.length === 0 ? (
              <li className="py-4 text-sm text-muted-foreground">No cross-provider groups yet.</li>
            ) : (
              issue_groups.map((g) => (
                <li key={g.id} className="py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{g.title}</span>
                    {g.conflict_flag ? <StatusBadge label="Conflict" tone="danger" /> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.issues.map((i) => `#${i.number}`).join(', ')} · {g.issues.length} linked issues
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      {/* Activity log */}
      <Card className="mt-4 p-5">
        <h2 className="font-semibold">Activity</h2>
        <div className="mt-3">
          <ActivityFeed events={detail.activity} emptyLabel="No activity on this part yet." />
        </div>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Created {formatDate(part.created_at)} · library ref {part.library_ref ?? '—'}
      </p>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
