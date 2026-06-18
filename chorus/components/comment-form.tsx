'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addBrandCommentAction } from '@/app/actions';
import { addReviewerCommentAction } from '@/app/supplier/actions';

/**
 * Shared comment box. When `token` is provided it posts through the scoped
 * supplier (magic-link) action; otherwise through the brand action.
 */
export function CommentForm({ issueId, token }: { issueId: string; token?: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!body.trim()) {
      toast.error('Write a comment');
      return;
    }
    startTransition(async () => {
      const res = token
        ? await addReviewerCommentAction(token, { issue_id: issueId, body })
        : await addBrandCommentAction({ issue_id: issueId, body });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setBody('');
      toast.success('Comment added');
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment…"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? 'Posting…' : 'Comment'}
        </Button>
      </div>
    </div>
  );
}
