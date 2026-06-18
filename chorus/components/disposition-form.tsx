import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { dispositionIssueAction } from '@/lib/actions';
import { BRAND_DECISIONS } from '@/types/enums';
import { brandDecisionLabels } from '@/types/labels';
import type { BrandDecision } from '@/types/enums';

/** Brand disposition control. Rejection requires a written rationale. */
export function DispositionForm({
  issueId,
  current,
}: {
  issueId: string;
  current: BrandDecision | null;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<BrandDecision | null>(current);
  const [rationale, setRationale] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!decision) {
      toast.error('Pick a decision');
      return;
    }
    if (decision === 'rejected' && !rationale.trim()) {
      toast.error('A rejection requires a written rationale');
      return;
    }
    startTransition(async () => {
      const res = await dispositionIssueAction({ issue_id: issueId, decision, rationale });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Disposition recorded');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {BRAND_DECISIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDecision(d)}
            className={
              'rounded-md border px-3 py-1.5 text-sm ' +
              (decision === d ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted')
            }
          >
            {brandDecisionLabels[d]}
          </button>
        ))}
      </div>
      {decision === 'rejected' ? (
        <Textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={3}
          placeholder="Rejection rationale (required) — why this recommendation isn't being taken"
        />
      ) : null}
      <Button onClick={submit} disabled={isPending} size="sm">
        {isPending ? 'Recording…' : 'Record disposition'}
      </Button>
    </div>
  );
}
