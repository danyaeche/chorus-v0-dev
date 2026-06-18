'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { approveDfmAction } from '@/app/actions';

export function ApproveDfmForm({
  partId,
  revisions,
  defaultRevisionId,
  ready,
  canApprove,
}: {
  partId: string;
  revisions: { id: string; label: string }[];
  defaultRevisionId: string | null;
  ready: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revId, setRevId] = useState(defaultRevisionId ?? revisions[revisions.length - 1]?.id ?? '');
  const [po, setPo] = useState('');
  const [tooling, setTooling] = useState('');
  const [notes, setNotes] = useState('');

  function submit() {
    if (!revId) {
      toast.error('Select the revision to freeze');
      return;
    }
    startTransition(async () => {
      const res = await approveDfmAction({
        part_id: partId,
        approved_revision_id: revId,
        po_reference: po,
        tooling_reference: tooling,
        notes,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('DFM approved — cleared to cut steel');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Approved revision (frozen)</Label>
        <select
          className="h-9 w-full max-w-xs rounded-md border bg-transparent px-3 text-sm"
          value={revId}
          onChange={(e) => setRevId(e.target.value)}
        >
          {revisions.map((r) => (
            <option key={r.id} value={r.id}>
              Rev {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">PO reference (optional)</Label>
          <Input value={po} onChange={(e) => setPo(e.target.value)} placeholder="PO-2026-0142" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tooling reference (optional)</Label>
          <Input value={tooling} onChange={(e) => setTooling(e.target.value)} placeholder="TOOL-2001" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Notes (optional)</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button className="w-full" onClick={submit} disabled={!ready || !canApprove || pending}>
        <ShieldCheck className="size-4" />
        {ready ? (pending ? 'Recording…' : 'Record DFM Approval — cut steel') : 'Gate not met'}
      </Button>
      {!canApprove ? (
        <p className="text-center text-xs text-muted-foreground">Only owners/admins can record DFM Approval.</p>
      ) : null}
    </div>
  );
}
