'use server';

import { revalidatePath } from 'next/cache';
import { requireBrandViewer } from '@/lib/auth/session';
import {
  createPart,
  createProject,
  dispositionIssue,
  setPackageItemComplete,
} from '@/lib/db';
import {
  createPartSchema,
  createProjectSchema,
  dispositionSchema,
} from '@/lib/validation';

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createProjectAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const id = createProject(viewer, {
    name: parsed.data.name,
    description: parsed.data.description || undefined,
    target_completion: parsed.data.target_completion || null,
  });
  if (!id) return { ok: false, error: 'Not authorized' };
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return { ok: true, id };
}

export async function createPartAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = createPartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const id = createPart(viewer, parsed.data);
  if (!id) return { ok: false, error: 'Not authorized' };
  revalidatePath('/parts');
  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { ok: true, id };
}

export async function togglePackageItemAction(itemId: string, complete: boolean): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const ok = setPackageItemComplete(viewer, itemId, complete);
  if (!ok) return { ok: false, error: 'Could not update package item' };
  revalidatePath('/parts');
  return { ok: true };
}

export async function dispositionIssueAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = dispositionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const ok = dispositionIssue(viewer, parsed.data.issue_id, parsed.data.decision, parsed.data.rationale || undefined);
  if (!ok) return { ok: false, error: 'Could not record disposition' };
  revalidatePath(`/issues/${parsed.data.issue_id}`);
  revalidatePath('/issues');
  return { ok: true };
}
