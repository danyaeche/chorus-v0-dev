import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getPart, getReviewer, getProfile, listSignoffs } from '@/lib/db';
import { signoffStateLabels, signoffStateTone, signoffTopicLabels } from '@/types/labels';

const FLOW = ['proposed', 'aligned', 'signed'] as const;

export default async function SignoffsPage({ params }: { params: Promise<{ partId: string }> }) {
  const { partId } = await params;
  const viewer = await requireBrandViewer();
  const part = getPart(viewer, partId);
  if (!part) notFound();
  const signoffs = listSignoffs(viewer, partId);

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href={`/parts/${partId}`} className="hover:underline">
            {part.name}
          </Link>
        }
        title="Sign-offs"
        subtitle="First-class joint agreements: Proposed → Aligned → Signed. All required sign-offs must be Signed before DFM Approval."
      />

      <div className="space-y-3">
        {signoffs.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.title}</span>
                  <StatusBadge label={signoffTopicLabels[s.topic]} tone="neutral" />
                </div>
                {s.rationale ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{s.rationale}</p> : null}
              </div>
              <StatusBadge label={signoffStateLabels[s.state]} tone={signoffStateTone[s.state]} />
            </div>

            {/* State flow */}
            <div className="mt-4 flex items-center gap-2 text-xs">
              {FLOW.map((step, idx) => {
                const reachedIdx = FLOW.indexOf(s.state);
                const done = idx <= reachedIdx;
                return (
                  <span key={step} className="flex items-center gap-2">
                    <span className={done ? 'font-medium text-emerald-600' : 'text-muted-foreground'}>
                      {signoffStateLabels[step]}
                    </span>
                    {idx < FLOW.length - 1 ? <span className="text-muted-foreground">→</span> : null}
                  </span>
                );
              })}
            </div>

            {/* Parties */}
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              {s.parties.map((p) => {
                const name =
                  p.party_type === 'brand'
                    ? getProfile(p.profile_id)?.full_name ?? 'Brand'
                    : getReviewer(p.external_reviewer_id)?.company ?? 'Reviewer';
                return (
                  <span
                    key={p.id}
                    className={
                      'rounded-full border px-2.5 py-0.5 text-xs ' +
                      (p.agreed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'text-muted-foreground')
                    }
                  >
                    {name} {p.agreed ? '✓' : '· pending'}
                  </span>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
