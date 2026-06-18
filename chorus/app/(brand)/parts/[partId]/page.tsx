import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Box, FileText, Upload } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PackagePanel } from '@/components/package-panel';
import { StatusBadge, ToneDot } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getPartDetail } from '@/lib/db';
import { dfmApprovalReadiness } from '@/lib/workflow';
import {
  dfmStateLabels,
  dfmStateTone,
  issueSeverityTone,
  issueStatusLabels,
  issueStatusTone,
  partProcessLabels,
  partStateLabels,
  partStateTone,
  signoffStateLabels,
  signoffStateTone,
  signoffTopicLabels,
} from '@/types/labels';
import { formatCurrency, formatDate, formatNumber, initials, rev } from '@/utils/format';

export default async function PartDetailPage({ params }: { params: Promise<{ partId: string }> }) {
  const { partId } = await params;
  const viewer = await requireBrandViewer();
  const detail = getPartDetail(viewer, partId);
  if (!detail) notFound();

  const { part, project, owner, revisions, current_revision, dfms, signoffs, issue_groups, package: pkg } = detail;
  const allIssues = dfms.flatMap((d) => d.issues);
  const readiness = dfmApprovalReadiness({ issues: allIssues, signoffs, frozenRevision: current_revision ?? null });

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
            <Button size="sm" variant="outline">
              <Upload className="size-4" /> Upload revision
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/reviewers">Send to supplier</Link>
            </Button>
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
            <Detail label="Package" value={<StatusBadge label={pkg.state === 'complete' ? 'Complete' : 'Incomplete'} tone={pkg.state === 'complete' ? 'success' : 'warning'} />} />
            <Detail label="Providers" value={`${dfms.length}`} />
          </dl>
          {part.description ? (
            <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">{part.description}</p>
          ) : null}
        </Card>

        {/* DFM Approval readiness */}
        <Card className="p-5">
          <h2 className="font-semibold">DFM Approval readiness</h2>
          <p className="mt-1 text-xs text-muted-foreground">The terminal gate — cleared to cut steel.</p>
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
          <Button asChild size="sm" className="mt-4 w-full" disabled={!readiness.ready}>
            <Link href={`/parts/${part.id}/approval`}>
              {readiness.ready ? 'Approve DFM — freeze & cut steel' : 'Approval gate not met'}
            </Link>
          </Button>
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

        {/* Files / CAD placeholder */}
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Files — {rev(current_revision?.rev_label)}</h2>
          </div>
          <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 py-8 text-muted-foreground">
            <Box className="size-10" />
            <p className="mt-2 text-xs">3D/2D viewer (vNext) · drag a CAD file to replace</p>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {detail.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-muted/40">
                <span className="flex items-center gap-2 truncate">
                  <FileText className="size-3.5 text-muted-foreground" />
                  <span className="truncate">{f.file_name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{f.watermarked ? 'watermarked' : ''}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Package gate */}
        <PackagePanel items={pkg.items} />
      </div>

      {/* Per-provider DFMs */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">DFM reviews</h2>
          <span className="text-sm text-muted-foreground">
            {dfms.length} provider{dfms.length === 1 ? '' : 's'} · walled off from each other · each on its own revision
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {dfms.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                      {initials(d.reviewer.contact_name)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{d.reviewer.company}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.reviewer.contact_name} · reviewing {rev(d.current_revision?.rev_label)}
                      </div>
                    </div>
                  </div>
                </div>
                <StatusBadge label={dfmStateLabels[d.state]} tone={dfmStateTone[d.state]} />
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
                <Link href={`/issues?part=${part.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                  View all issues →
                </Link>
              </div>
            </Card>
          ))}
        </div>
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
          <ul className="mt-3 divide-y">
            {signoffs.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{signoffTopicLabels[s.topic]}</div>
                </div>
                <StatusBadge label={signoffStateLabels[s.state]} tone={signoffStateTone[s.state]} />
              </li>
            ))}
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
