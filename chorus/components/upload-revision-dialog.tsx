'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { uploadRevisionAction } from '@/app/actions';

export function UploadRevisionDialog({
  partId,
  nextRevLabel,
  variant = 'outline',
}: {
  partId: string;
  nextRevLabel: string;
  variant?: 'outline' | 'default' | 'ghost';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState('');
  const [quote, setQuote] = useState('');
  const [setCurrent, setSetCurrent] = useState(false);

  function submit() {
    if (summary.trim().length < 3) {
      toast.error('Describe what changed in this revision');
      return;
    }
    startTransition(async () => {
      const res = await uploadRevisionAction({
        part_id: partId,
        change_summary: summary,
        quote_amount: quote ? Number(quote) : undefined,
        set_current: setCurrent,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Rev ${nextRevLabel} uploaded`);
      setOpen(false);
      setSummary('');
      setQuote('');
      setSetCurrent(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        <Upload className="size-4" /> Upload revision
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Rev {nextRevLabel}</DialogTitle>
            <DialogDescription>
              Record a new revision of the design. In v0 the file is a stub — this captures the change and
              its lineage so issues can be validated revision-to-revision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Change summary</Label>
              <Textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g. Opened draft to 1.5° on textured faces; added ejector relief"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Quote / unit (optional)</Label>
              <Input
                type="number"
                step="0.01"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="3.80"
                className="w-40"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={setCurrent}
                onChange={(e) => setSetCurrent(e.target.checked)}
                className="size-4"
              />
              Set as the current revision
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {pending ? 'Uploading…' : `Upload Rev ${nextRevLabel}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
