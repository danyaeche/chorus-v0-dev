'use server';

import { revalidatePath } from 'next/cache';
import {
  addComment,
  createIssueByReviewer,
  markPortalOpened,
  resolveReviewerToken,
  validateIssue,
} from '@/lib/db';
import { commentSchema, createIssueSchema, validateIssueSchema } from '@/lib/validation';

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Resolve the bearer's magic-link token to a scoped reviewer identity. All
 * supplier-portal mutations go through this — there is no brand session here,
 * only the scoped token, and every write is authorized against it.
 */
function reviewer(token: string) {
  return resolveReviewerToken(token, new Date().toISOString());
}

export async function markPortalOpenedAction(token: string): Promise<ActionResult> {
  const viewer = reviewer(token);
  if (!viewer) return { ok: false, error: 'Invalid link' };
  markPortalOpened(viewer);
  return { ok: true };
}

export async function createIssueAction(token: string, input: unknown): Promise<ActionResult> {
  const viewer = reviewer(token);
  if (!viewer) return { ok: false, error: 'This link is no longer valid.' };
  const parsed = createIssueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const id = createIssueByReviewer(viewer, {
    dfm_id: parsed.data.dfm_id,
    title: parsed.data.title,
    description: parsed.data.description,
    type: parsed.data.type,
    category: parsed.data.category,
    severity: parsed.data.severity,
    recommendation: parsed.data.recommendation || undefined,
    cost_impact: parsed.data.cost_impact ?? null,
    yield_impact: parsed.data.yield_impact || undefined,
  });
  if (!id) return { ok: false, error: 'You do not have permission to raise an issue.' };
  revalidatePath(`/supplier/${token}`, 'layout');
  return { ok: true, id };
}

export async function addReviewerCommentAction(token: string, input: unknown): Promise<ActionResult> {
  const viewer = reviewer(token);
  if (!viewer) return { ok: false, error: 'This link is no longer valid.' };
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const id = addComment(viewer, { issue_id: parsed.data.issue_id, body: parsed.data.body });
  if (!id) return { ok: false, error: 'You do not have permission to comment.' };
  revalidatePath(`/supplier/${token}`, 'layout');
  return { ok: true, id };
}

export async function validateIssueAction(token: string, input: unknown): Promise<ActionResult> {
  const viewer = reviewer(token);
  if (!viewer) return { ok: false, error: 'This link is no longer valid.' };
  const parsed = validateIssueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const ok = validateIssue(viewer, parsed.data.issue_id, parsed.data.result);
  if (!ok) return { ok: false, error: 'Only the reviewer who raised this issue can validate its implemented fix.' };
  revalidatePath(`/supplier/${token}`, 'layout');
  return { ok: true };
}
