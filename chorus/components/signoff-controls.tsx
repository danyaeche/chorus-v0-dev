'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { advanceSignoffAction } from '@/app/actions';
import type { SignoffState } from '@/types/enums';

const NEXT: Record<SignoffState, SignoffState | null> = {
  proposed: 'aligned',
  aligned: 'signed',
  signed: null,
};

const NEXT_LABEL: Record<SignoffState, string> = {
  proposed: 'Mark aligned',
  aligned: 'Sign off',
  signed: 'Signed',
};

export function SignoffControls({
  signoffId,
  state,
  rationale,
}: {
  signoffId: string;
  state: SignoffState;
  rationale: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(rationale ?? '');
  const next = NEXT[state];

  function advance(target: SignoffState) {
    startTransition(async () => {
      const res = await advanceSignoffAction({ signoff_id: signoffId, state: target, rationale: note });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(target === 'signed' ? 'Sign-off recorded' : `Marked ${target}`);
      router.refresh();
    });
  }

  if (state === 'signed') {
    return <p className="text-xs text-emerald-600">Signed — joint agreement recorded.</p>;
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Record / rationale for this agreement"
        className="text-sm"
      />
      <div className="flex items-center gap-2">
        {next ? (
          <Button size="sm" onClick={() => advance(next)} disabled={pending}>
            {pending ? 'Saving…' : NEXT_LABEL[state]}
          </Button>
        ) : null}
        {state === 'aligned' ? (
          <Button size="sm" variant="ghost" onClick={() => advance('proposed')} disabled={pending}>
            Back to proposed
          </Button>
        ) : null}
      </div>
    </div>
  );
}
