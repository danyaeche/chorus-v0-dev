import { requireBrandViewer } from '@/lib/auth/session';
import {
  addComment,
  advanceSignoff,
  approveDfm,
  createPart,
  createProject,
  dispositionIssue,
  inviteReviewer,
  setIssueImplementation,
  setPackageItemComplete,
  uploadRevision,
} from '@/lib/db';
import {
  advanceSignoffSchema,
  approveDfmSchema,
  commentSchema,
  createPartSchema,
  createProjectSchema,
  dispositionSchema,
  implementationSchema,
  inviteReviewerSchema,
  uploadRevisionSchema,
} from '@/lib/validation';

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };
export type InviteResult =
  | { ok: true; magic_link_path: string; raw_token: string }
  | { ok: false; error: string };

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
  return { ok: true, id };
}

export async function createPartAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = createPartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const id = createPart(viewer, parsed.data);
  if (!id) return { ok: false, error: 'Not authorized' };
  return { ok: true, id };
}

export async function togglePackageItemAction(itemId: string, complete: boolean): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const ok = setPackageItemComplete(viewer, itemId, complete);
  if (!ok) return { ok: false, error: 'Could not update package item' };
  return { ok: true };
}

export async function dispositionIssueAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = dispositionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const ok = dispositionIssue(viewer, parsed.data.issue_id, parsed.data.decision, parsed.data.rationale || undefined);
  if (!ok) return { ok: false, error: 'Could not record disposition' };
  return { ok: true };
}

export async function inviteReviewerAction(input: unknown): Promise<InviteResult> {
  const viewer = await requireBrandViewer();
  const parsed = inviteReviewerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const result = inviteReviewer(viewer, {
    part_id: parsed.data.part_id,
    company: parsed.data.company,
    contact_name: parsed.data.contact_name,
    contact_email: parsed.data.contact_email,
    provider_role: parsed.data.provider_role,
    nda_status: parsed.data.nda_status,
    confidentiality: parsed.data.confidentiality,
    permissions: parsed.data.permissions,
    expiry_days: parsed.data.expiry_days,
  });
  if (!result) {
    return { ok: false, error: 'Could not invite — the package must be Complete and you must be an admin/owner.' };
  }
  return { ok: true, magic_link_path: result.magic_link_path, raw_token: result.raw_token };
}

export async function uploadRevisionAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = uploadRevisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const id = uploadRevision(viewer, parsed.data.part_id, {
    change_summary: parsed.data.change_summary,
    quote_amount: parsed.data.quote_amount ?? null,
    set_current: parsed.data.set_current,
  });
  if (!id) return { ok: false, error: 'Could not upload revision' };
  return { ok: true, id };
}

export async function setImplementationAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = implementationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const ok = setIssueImplementation(viewer, parsed.data.issue_id, {
    state: parsed.data.state,
    revision_id: parsed.data.revision_id || undefined,
  });
  if (!ok) return { ok: false, error: 'Could not update implementation' };
  return { ok: true };
}

export async function advanceSignoffAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = advanceSignoffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const ok = advanceSignoff(viewer, parsed.data.signoff_id, parsed.data.state, parsed.data.rationale || undefined);
  if (!ok) return { ok: false, error: 'Could not update sign-off' };
  return { ok: true };
}

export async function approveDfmAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = approveDfmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const ok = approveDfm(viewer, parsed.data.part_id, {
    approved_revision_id: parsed.data.approved_revision_id,
    po_reference: parsed.data.po_reference || undefined,
    tooling_reference: parsed.data.tooling_reference || undefined,
    notes: parsed.data.notes || undefined,
  });
  if (!ok) return { ok: false, error: 'Approval gate not met, or you are not authorized.' };
  return { ok: true };
}

export async function addBrandCommentAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireBrandViewer();
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const id = addComment(viewer, { issue_id: parsed.data.issue_id, body: parsed.data.body });
  if (!id) return { ok: false, error: 'Could not add comment' };
  return { ok: true, id };
}
