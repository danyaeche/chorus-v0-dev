import { useTransition } from 'react';
import { useRouter } from '@/lib/router';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { validateIssueAction } from '@/lib/supplier-actions';

/**
 * Validation controls for the reviewer who raised the issue. Compares the
 * created-on revision against the implemented-in revision: a pass closes the
 * issue, a fail reopens it.
 */
export function ValidateControls({
  token,
  issueId,
  fromRev,
  toRev,
}: {
  token: string;
  issueId: string;
  fromRev: string | null;
  toRev: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(result: 'validated' | 'validation_failed') {
    startTransition(async () => {
      const res = await validateIssueAction(token, { issue_id: issueId, result });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(result === 'validated' ? 'Validated — issue closed' : 'Validation failed — issue reopened');
      router.refresh();
    });
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
        Validate the fix — Rev {fromRev ?? '?'} → Rev {toRev ?? '?'}
      </p>
      <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/70">
        Confirm the implemented revision resolves what you raised. Passing closes the issue.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => run('validated')} disabled={pending}>
          <Check className="size-4" /> Validate &amp; close
        </Button>
        <Button size="sm" variant="outline" onClick={() => run('validation_failed')} disabled={pending}>
          <X className="size-4" /> Fails — reopen
        </Button>
      </div>
    </div>
  );
}
