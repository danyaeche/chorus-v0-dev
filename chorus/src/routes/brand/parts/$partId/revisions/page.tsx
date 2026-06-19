import { Link } from '@/lib/router';
import { notFound } from '@/lib/router';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { UploadRevisionDialog } from '@/components/upload-revision-dialog';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getPartDetail, getProfile } from '@/lib/db';
import { formatCurrency, formatDate, rev } from '@/utils/format';


export default function RevisionsPage({ params }: { params: { partId: string } }) {
  const { partId } = params;
  const viewer = requireBrandViewer();
  const detail = getPartDetail(viewer, partId);
  if (!detail) notFound();

  const nextRevIndex = detail.revisions.length ? Math.max(...detail.revisions.map((r) => r.rev_index)) + 1 : 0;
  const nextRevLabel = String.fromCharCode(65 + Math.min(nextRevIndex, 25));

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href={`/parts/${partId}`} className="hover:underline">
            {detail.part.name}
          </Link>
        }
        title="Revision history"
        subtitle="Shared design — every provider reviews these. Each change is recorded against issues."
        actions={<UploadRevisionDialog partId={partId} nextRevLabel={nextRevLabel} />}
      />

      <ol className="space-y-3">
        {[...detail.revisions].reverse().map((r) => {
          const uploader = getProfile(r.uploaded_by);
          const isCurrent = r.id === detail.current_revision?.id;
          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{rev(r.rev_label)}</span>
                  {isCurrent ? <StatusBadge label="Current" tone="success" /> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {uploader?.full_name ?? '—'} · {formatDate(r.created_at)} · quote {formatCurrency(r.quote_amount)}
                </div>
              </div>
              {r.change_summary ? <p className="mt-2 text-sm text-muted-foreground">{r.change_summary}</p> : null}
            </Card>
          );
        })}
      </ol>
    </>
  );
}
