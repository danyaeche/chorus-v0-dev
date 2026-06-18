'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { setImplementationAction } from '@/app/actions';
import type { ImplementationState } from '@/types/enums';

export function ImplementationControl({
  issueId,
  revisions,
  createdOnRevisionId,
  implementationState,
  implementedInRevisionId,
}: {
  issueId: string;
  revisions: { id: string; label: string }[];
  createdOnRevisionId: string | null;
  implementationState: ImplementationState;
  implementedInRevisionId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Candidate "implemented-in" revisions: anything other than the one it was raised on.
  const candidates = revisions.filter((r) => r.id !== createdOnRevisionId);
  const [revId, setRevId] = useState<string>(
    implementedInRevisionId ?? candidates[candidates.length - 1]?.id ?? '',
  );

  function run(state: ImplementationState) {
    if (state === 'implemented' && !revId) {
      toast.error('Upload a later revision to carry the fix first');
      return;
    }
    startTransition(async () => {
      const res = await setImplementationAction({ issue_id: issueId, state, revision_id: revId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(state === 'implemented' ? 'Marked implemented — validation requested' : 'Implementation updated');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Implemented in revision</Label>
        {candidates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No later revision exists yet — upload a fix revision on the part page, then link it here.
          </p>
        ) : (
          <select
            className="h-9 w-full max-w-xs rounded-md border bg-transparent px-3 text-sm"
            value={revId}
            onChange={(e) => setRevId(e.target.value)}
          >
            {candidates.map((r) => (
              <option key={r.id} value={r.id}>
                Rev {r.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => run('in_progress')}
          disabled={pending || implementationState === 'in_progress'}
        >
          Mark in progress
        </Button>
        <Button size="sm" onClick={() => run('implemented')} disabled={pending || candidates.length === 0}>
          {pending ? 'Saving…' : 'Mark implemented → request validation'}
        </Button>
      </div>
    </div>
  );
}
