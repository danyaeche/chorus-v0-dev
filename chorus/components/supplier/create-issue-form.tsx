import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { createIssueAction } from '@/lib/supplier-actions';
import { ISSUE_TYPES, ISSUE_CATEGORIES, ISSUE_SEVERITIES } from '@/types/enums';
import { issueTypeLabels, issueCategoryLabels, issueSeverityLabels } from '@/types/labels';
import type { IssueCategory, IssueSeverity, IssueType } from '@/types/enums';

export function CreateIssueForm({
  token,
  dfmId,
  revLabel,
}: {
  token: string;
  dfmId: string;
  revLabel: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('finding');
  const [category, setCategory] = useState<IssueCategory>('geometry');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [recommendation, setRecommendation] = useState('');
  const [costImpact, setCostImpact] = useState('');
  const [yieldImpact, setYieldImpact] = useState('');

  function reset() {
    setTitle('');
    setDescription('');
    setType('finding');
    setCategory('geometry');
    setSeverity('medium');
    setRecommendation('');
    setCostImpact('');
    setYieldImpact('');
  }

  function submit() {
    if (title.trim().length < 3) {
      toast.error('Give the issue a clear title');
      return;
    }
    if (!description.trim()) {
      toast.error('Describe the manufacturability risk');
      return;
    }
    startTransition(async () => {
      const res = await createIssueAction(token, {
        dfm_id: dfmId,
        title,
        description,
        type,
        category,
        severity,
        recommendation,
        cost_impact: costImpact ? Number(costImpact) : undefined,
        yield_impact: yieldImpact,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Issue raised');
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" /> Raise an issue
      </Button>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Raise an issue {revLabel ? `on Rev ${revLabel}` : ''}</h3>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Insufficient draft for ejection" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the manufacturability risk on the current revision"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as IssueType)}>
              {ISSUE_TYPES.map((x) => (
                <option key={x} value={x}>
                  {issueTypeLabels[x]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value as IssueCategory)}>
              {ISSUE_CATEGORIES.map((x) => (
                <option key={x} value={x}>
                  {issueCategoryLabels[x]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Severity</Label>
            <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value as IssueSeverity)}>
              {ISSUE_SEVERITIES.map((x) => (
                <option key={x} value={x}>
                  {issueSeverityLabels[x]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Recommendation</Label>
          <Textarea
            rows={2}
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            placeholder="e.g. Increase draft angle on vertical ribs to improve ejection and reduce tool wear"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Cost impact / unit (optional)</Label>
            <Input type="number" step="0.01" value={costImpact} onChange={(e) => setCostImpact(e.target.value)} placeholder="0.12" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Yield impact (optional)</Label>
            <Input value={yieldImpact} onChange={(e) => setYieldImpact(e.target.value)} placeholder="Reduces scrap on ejection" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? 'Submitting…' : 'Submit issue'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
