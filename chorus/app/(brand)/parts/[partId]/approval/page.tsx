import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getPartDetail } from '@/lib/db';
import { dfmApprovalReadiness } from '@/lib/workflow';
import { canApproveDfm } from '@/lib/permissions';
import { rev } from '@/utils/format';

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
            <h2 className="font-semibold">Approve & freeze</h2>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Approved revision</dt>
              <dd className="font-medium">{rev(detail.current_revision?.rev_label)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Approver</dt>
              <dd className="font-medium">{viewer.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">PO / tooling ref</dt>
              <dd className="text-muted-foreground">optional</dd>
            </div>
          </dl>

          {!mayApprove ? (
            <p className="mt-4 text-xs text-muted-foreground">Only owners/admins can record DFM Approval.</p>
          ) : null}

          <Button className="mt-4 w-full" disabled={!readiness.ready || !mayApprove}>
            {readiness.ready ? 'Record DFM Approval — cut steel' : 'Gate not met'}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            DFM Approved means the part is cleared to cut steel.
          </p>
        </Card>
      </div>
    </>
  );
}
