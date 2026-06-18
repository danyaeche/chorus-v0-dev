import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { ApproveDfmForm } from '@/components/approve-dfm-form';
import { StatusBadge } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getPartDetail, getProfile } from '@/lib/db';
import { dfmApprovalReadiness } from '@/lib/workflow';
import { canApproveDfm } from '@/lib/permissions';
import { formatDate, rev } from '@/utils/format';

export const dynamic = 'force-dynamic';

export default async function ApprovalPage({ params }: { params: Promise<{ partId: string }> }) {
  const { partId } = await params;
  const viewer = await requireBrandViewer();
  const detail = getPartDetail(viewer, partId);
  if (!detail) notFound();

  const allIssues = detail.dfms.flatMap((d) => d.issues);
  const readiness = dfmApprovalReadiness({
    issues: allIssues,
    signoffs: detail.signoffs,
    frozenRevision: detail.current_revision ?? null,
  });
  const mayApprove = canApproveDfm(viewer);
  const approval = detail.approval ?? null;
  const approvedRev = approval ? detail.revisions.find((r) => r.id === approval.approved_revision_id) : null;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href={`/parts/${partId}`} className="hover:underline">
            {detail.part.name}
          </Link>
        }
        title="DFM Approval"
        subtitle="The terminal gate. Freeze the approved revision — the part is cleared to cut steel."
      />

      {approval ? (
        <Card className="mb-4 border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" />
            <h2 className="font-semibold text-emerald-800 dark:text-emerald-200">DFM Approved — cleared to cut steel</h2>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Info label="Approved revision" value={rev(approvedRev?.rev_label)} />
            <Info label="Approved by" value={getProfile(approval.approved_by)?.full_name ?? '—'} />
            <Info label="Approved at" value={formatDate(approval.approved_at)} />
            <Info label="PO / tooling" value={`${approval.po_reference ?? '—'} · ${approval.tooling_reference ?? '—'}`} />
          </dl>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Entry criteria</h2>
          <ul className="mt-3 space-y-3">
            {readiness.criteria.map((c) => (
              <li key={c.key} className="flex items-start gap-3 text-sm">
                <span
                  className={
                    'mt-0.5 flex size-5 items-center justify-center rounded-full text-xs ' +
                    (c.met ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
                  }
                >
                  {c.met ? '✓' : '!'}
                </span>
                <div>
                  <div className="font-medium">{c.label}</div>
                  {c.detail ? <div className="text-xs text-muted-foreground">{c.detail}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className={readiness.ready ? 'size-5 text-emerald-600' : 'size-5 text-muted-foreground'} />
            <h2 className="font-semibold">Approve &amp; freeze</h2>
          </div>
          {approval ? (
            <div className="mt-4">
              <StatusBadge label="Already approved" tone="success" />
              <p className="mt-2 text-xs text-muted-foreground">This part has been cleared to cut steel.</p>
            </div>
          ) : (
            <div className="mt-4">
              <ApproveDfmForm
                partId={detail.part.id}
                revisions={detail.revisions.map((r) => ({ id: r.id, label: r.rev_label }))}
                defaultRevisionId={detail.current_revision?.id ?? null}
                ready={readiness.ready}
                canApprove={mayApprove}
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                DFM Approved means the part is cleared to cut steel.
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-emerald-700/70 dark:text-emerald-300/70">{label}</dt>
      <dd className="mt-0.5 font-medium text-emerald-900 dark:text-emerald-100">{value}</dd>
    </div>
  );
}
