/**
 * Repository layer — the only module pages and server actions import to read or
 * write Chorus data. Every function takes a `Viewer` and applies the permission
 * helpers so confidentiality is enforced centrally, regardless of backend.
 *
 * In demo mode it reads/writes the in-memory store (lib/db/store). When Supabase
 * is configured the same function signatures are the seam to swap in Postgres
 * queries (the permission filtering stays identical).
 */
import { store } from './store';
import {
  canApproveDfm,
  canComment,
  canCreateIssue,
  canManageReviewers,
  canValidateIssue,
  canViewDfm,
  canViewIssue,
  canViewIssueGroup,
  filterVisibleFiles,
  isBrand,
  isReviewer,
  type Viewer,
} from '@/lib/permissions';
import type { ReviewerViewer } from '@/lib/permissions/types';
import {
  dfmApprovalReadiness,
  derivePartState,
  deriveIssueStatus,
  summarizePackage,
} from '@/lib/workflow';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { packageChecklistFor } from '@/types/package-checklist';
import type {
  AccessPermission,
  ActivityEvent,
  ActivityType,
  AuditAction,
  AuditEvent,
  Dfm,
  DfmApproval,
  ExternalReviewer,
  ImplementationState,
  Issue,
  NdaStatus,
  Part,
  PartRevision,
  Profile,
  Project,
  ProviderRole,
  Signoff,
  SignoffState,
  UUID,
} from '@/types';
import type { ConfidentialityLevel } from '@/types/enums';
import type {
  DashboardStats,
  DfmView,
  IssueGroupView,
  IssueView,
  PartDetailView,
  PartListItem,
  ProjectSummary,
  ReviewerPartView,
  ReviewerPortalView,
  SignoffView,
} from '@/types/view';

// --- small lookups ------------------------------------------------------------

export function getProfile(id: UUID | null): Profile | null {
  if (!id) return null;
  return store().profiles.find((p) => p.id === id) ?? null;
}

export function getRevision(id: UUID | null): PartRevision | null {
  if (!id) return null;
  return store().partRevisions.find((r) => r.id === id) ?? null;
}

export function getReviewer(id: UUID | null): ExternalReviewer | null {
  if (!id) return null;
  return store().externalReviewers.find((r) => r.id === id) ?? null;
}

function dfmById(id: UUID): Dfm | null {
  return store().dfms.find((d) => d.id === id) ?? null;
}

function revisionsForPart(partId: UUID): PartRevision[] {
  return store()
    .partRevisions.filter((r) => r.part_id === partId)
    .sort((a, b) => a.rev_index - b.rev_index);
}

/** Revisions of a part the viewer can access, oldest → newest. */
export function listPartRevisions(viewer: Viewer, partId: UUID): PartRevision[] {
  return getPart(viewer, partId) ? revisionsForPart(partId) : [];
}

// --- issues -------------------------------------------------------------------

function toIssueView(viewer: Viewer, issue: Issue): IssueView {
  const s = store();
  return {
    ...issue,
    created_on_revision: getRevision(issue.created_on_revision_id),
    implemented_in_revision: getRevision(issue.implemented_in_revision_id),
    reviewer: getReviewer(issue.created_by_reviewer_id),
    comments: s.comments
      .filter((c) => c.issue_id === issue.id)
      .filter(() => {
        // reviewers only see their own DFM's comment thread
        if (isBrand(viewer)) return true;
        const dfm = dfmById(issue.dfm_id);
        return dfm ? canViewDfm(viewer, dfm) : false;
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    attachments: filterVisibleFiles(viewer, s.files.filter((f) => f.issue_id === issue.id)),
  };
}

/** All issues visible to the viewer, optionally filtered. */
export function listIssues(
  viewer: Viewer,
  opts: { projectId?: UUID; partId?: UUID } = {},
): IssueView[] {
  const s = store();
  return s.issues
    .filter((i) => i.organization_id === viewer.organizationId)
    .filter((i) => (opts.projectId ? i.project_id === opts.projectId : true))
    .filter((i) => (opts.partId ? i.part_id === opts.partId : true))
    .filter((i) => {
      const dfm = dfmById(i.dfm_id);
      return dfm ? canViewIssue(viewer, i, dfm) : false;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((i) => toIssueView(viewer, i));
}

export function getIssue(viewer: Viewer, issueId: UUID): IssueView | null {
  const issue = store().issues.find((i) => i.id === issueId);
  if (!issue) return null;
  const dfm = dfmById(issue.dfm_id);
  if (!dfm || !canViewIssue(viewer, issue, dfm)) return null;
  return toIssueView(viewer, issue);
}

// --- DFMs ---------------------------------------------------------------------

function toDfmView(viewer: Viewer, dfm: Dfm): DfmView {
  const reviewer = getReviewer(dfm.external_reviewer_id)!;
  const issues = listIssues(viewer, { partId: dfm.part_id }).filter((i) => i.dfm_id === dfm.id);
  return {
    ...dfm,
    reviewer,
    current_revision: getRevision(dfm.current_revision_id),
    issues,
    open_issue_count: issues.filter((i) => i.status === 'open').length,
  };
}

export function listDfmsForPart(viewer: Viewer, partId: UUID): DfmView[] {
  return store()
    .dfms.filter((d) => d.part_id === partId)
    .filter((d) => canViewDfm(viewer, d))
    .map((d) => toDfmView(viewer, d));
}

export function getDfm(viewer: Viewer, dfmId: UUID): DfmView | null {
  const dfm = dfmById(dfmId);
  if (!dfm || !canViewDfm(viewer, dfm)) return null;
  return toDfmView(viewer, dfm);
}

// --- sign-offs ----------------------------------------------------------------

function toSignoffView(signoff: Signoff): SignoffView {
  return {
    ...signoff,
    parties: store().signoffParties.filter((p) => p.signoff_id === signoff.id),
  };
}

export function listSignoffs(viewer: Viewer, partId: UUID): SignoffView[] {
  return store()
    .signoffs.filter((s) => s.part_id === partId && s.organization_id === viewer.organizationId)
    .map(toSignoffView);
}

// --- issue groups (brand only) ------------------------------------------------

export function listIssueGroups(viewer: Viewer, opts: { partId?: UUID; projectId?: UUID } = {}): IssueGroupView[] {
  if (!canViewIssueGroup(viewer)) return [];
  const s = store();
  return s.issueGroups
    .filter((g) => g.organization_id === viewer.organizationId)
    .filter((g) => (opts.partId ? g.part_id === opts.partId : true))
    .filter((g) => (opts.projectId ? g.project_id === opts.projectId : true))
    .map((g) => {
      const issueIds = s.issueGroupLinks.filter((l) => l.issue_group_id === g.id).map((l) => l.issue_id);
      const issues = s.issues
        .filter((i) => issueIds.includes(i.id))
        .map((i) => toIssueView(viewer, i));
      return { ...g, issues };
    });
}

// --- parts --------------------------------------------------------------------

export function listParts(viewer: Viewer, opts: { projectId?: UUID } = {}): PartListItem[] {
  const s = store();
  return s.parts
    .filter((p) => p.organization_id === viewer.organizationId)
    .filter((p) => (opts.projectId ? p.project_id === opts.projectId : true))
    .filter((p) => {
      if (isBrand(viewer)) return true;
      return viewer.projectId === p.project_id && viewer.allowedPartIds.includes(p.id);
    })
    .map((part) => {
      const issues = listIssues(viewer, { partId: part.id });
      const dfms = listDfmsForPart(viewer, part.id);
      const current = getRevision(part.current_revision_id);
      return {
        part,
        open_issue_count: issues.filter((i) => i.status === 'open').length,
        awaiting_validation_count: issues.filter((i) => i.status === 'implemented' && i.validation_state === 'pending').length,
        current_revision_label: current?.rev_label ?? null,
        provider_count: dfms.length,
      };
    });
}

export function getPart(viewer: Viewer, partId: UUID): Part | null {
  const part = store().parts.find((p) => p.id === partId);
  if (!part || part.organization_id !== viewer.organizationId) return null;
  if (!isBrand(viewer) && !(viewer.projectId === part.project_id && viewer.allowedPartIds.includes(part.id))) {
    return null;
  }
  return part;
}

export function getPartDetail(viewer: Viewer, partId: UUID): PartDetailView | null {
  const part = getPart(viewer, partId);
  if (!part) return null;
  const s = store();
  const project = s.projects.find((p) => p.id === part.project_id)!;

  const packageItems = s.packageItems.filter((i) => i.part_id === part.id);
  const dfms = listDfmsForPart(viewer, part.id);
  const signoffs = listSignoffs(viewer, part.id);
  const approvalRow = storeApproval(part.id);

  const allIssues = listIssues(viewer, { partId: part.id });
  const readiness = dfmApprovalReadiness({
    issues: allIssues,
    signoffs,
    frozenRevision: getRevision(part.current_revision_id),
  });

  return {
    part,
    project,
    owner: getProfile(part.owner_id),
    revisions: revisionsForPart(part.id),
    current_revision: getRevision(part.current_revision_id),
    package: summarizePackage(packageItems),
    dfms,
    signoffs,
    issue_groups: listIssueGroups(viewer, { partId: part.id }),
    approval: approvalRow,
    files: filterVisibleFiles(viewer, s.files.filter((f) => f.part_id === part.id)),
    activity: listActivity(viewer, { partId: part.id }),
    approval_ready: readiness.ready,
  };
}

function storeApproval(partId: UUID): DfmApproval | null {
  return store().dfmApprovals.find((a) => a.part_id === partId) ?? null;
}

// --- projects -----------------------------------------------------------------

export function listProjects(viewer: Viewer): Project[] {
  return store()
    .projects.filter((p) => p.organization_id === viewer.organizationId)
    .filter((p) => (isBrand(viewer) ? true : p.id === viewer.projectId));
}

export function getProject(viewer: Viewer, projectId: UUID): Project | null {
  const project = store().projects.find((p) => p.id === projectId);
  if (!project || project.organization_id !== viewer.organizationId) return null;
  if (!isBrand(viewer) && project.id !== viewer.projectId) return null;
  return project;
}

export function listProjectSummaries(viewer: Viewer): ProjectSummary[] {
  return listProjects(viewer).map((project) => {
    const parts = listParts(viewer, { projectId: project.id });
    const issues = listIssues(viewer, { projectId: project.id });
    const closed = issues.filter((i) => i.status === 'closed').length;
    const total = issues.length || 1;
    const latest = parts
      .map((p) => p.current_revision_label)
      .filter(Boolean)
      .sort()
      .pop();
    return {
      project,
      part_count: parts.length,
      open_issue_count: issues.filter((i) => i.status === 'open').length,
      awaiting_validation_count: issues.filter((i) => i.status === 'implemented' && i.validation_state === 'pending').length,
      dfm_completion_pct: Math.round((closed / total) * 100),
      latest_revision_label: latest ?? null,
    };
  });
}

// --- dashboard ----------------------------------------------------------------

export function getDashboardStats(viewer: Viewer): DashboardStats {
  const issues = listIssues(viewer);
  const parts = store().parts.filter((p) => p.organization_id === viewer.organizationId);
  const closed = issues.filter((i) => i.status === 'closed').length;
  const total = issues.length || 1;
  return {
    open_issues: issues.filter((i) => i.status === 'open').length,
    awaiting_validation: issues.filter((i) => i.status === 'implemented' && i.validation_state === 'pending').length,
    accepted: issues.filter((i) => i.brand_decision === 'accepted' && i.status !== 'closed').length,
    closed,
    dfm_completion_pct: Math.round((closed / total) * 100),
    dfm_approved_parts: parts.filter((p) => p.part_state === 'dfm_approved').length,
  };
}

// --- activity -----------------------------------------------------------------

export function listActivity(
  viewer: Viewer,
  opts: { projectId?: UUID; partId?: UUID; limit?: number } = {},
): ActivityEvent[] {
  const events = store()
    .activityEvents.filter((e) => e.organization_id === viewer.organizationId)
    .filter((e) => (opts.projectId ? e.project_id === opts.projectId : true))
    .filter((e) => (opts.partId ? e.part_id === opts.partId : true))
    // reviewers only see activity on parts they can access
    .filter((e) => {
      if (isBrand(viewer)) return true;
      return e.part_id ? viewer.allowedPartIds.includes(e.part_id) : false;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return opts.limit ? events.slice(0, opts.limit) : events;
}

// --- reviewers & access tokens (brand-side management) ------------------------

export function listReviewers(viewer: Viewer): ExternalReviewer[] {
  if (!isBrand(viewer)) return [];
  return store().externalReviewers.filter((r) => r.organization_id === viewer.organizationId);
}

export function listAccessTokens(viewer: Viewer) {
  if (!isBrand(viewer)) return [];
  return store().accessTokens.filter((tk) => tk.organization_id === viewer.organizationId);
}

export function listMemberships(viewer: Viewer) {
  if (!isBrand(viewer)) return [];
  return store()
    .memberships.filter((m) => m.organization_id === viewer.organizationId)
    .map((m) => ({ membership: m, profile: getProfile(m.profile_id) }));
}

export function getOrganization(viewer: Viewer) {
  return store().organizations.find((o) => o.id === viewer.organizationId) ?? null;
}

// --- reviewer portal (magic-link resolution) ----------------------------------

/**
 * Resolve a raw magic-link token to a scoped ReviewerViewer, or null if the
 * token is unknown / revoked / expired. This is the gate that turns an opaque
 * URL into a confidentiality-scoped identity.
 */
export function resolveReviewerToken(rawToken: string, now: string): ReviewerViewer | null {
  const tokenHash = hashToken(rawToken);
  const tk = store().accessTokens.find((t) => t.token_hash === tokenHash);
  if (!tk) return null;
  if (tk.revoked) return null;
  if (tk.expires_at && tk.expires_at < now) return null;

  const reviewer = getReviewer(tk.external_reviewer_id);
  const ndaCleared = reviewer
    ? reviewer.nda_status === 'signed' || reviewer.nda_status === 'not_required'
    : false;
  const downloadBlocked =
    !tk.permissions.includes('download') ||
    reviewer?.confidentiality === 'confidential_no_download';

  return {
    kind: 'reviewer',
    accessTokenId: tk.id,
    organizationId: tk.organization_id,
    projectId: tk.project_id,
    externalReviewerId: tk.external_reviewer_id,
    allowedPartIds: tk.allowed_part_ids,
    allowedDfmIds: tk.allowed_dfm_ids,
    permissions: tk.permissions,
    ndaCleared,
    downloadBlocked,
  };
}

export function getReviewerPortal(viewer: ReviewerViewer): ReviewerPortalView | null {
  const s = store();
  const tk = s.accessTokens.find((t) => t.id === viewer.accessTokenId);
  const reviewer = getReviewer(viewer.externalReviewerId);
  const project = s.projects.find((p) => p.id === viewer.projectId);
  if (!tk || !reviewer || !project) return null;

  const parts = listParts(viewer, { projectId: project.id }).map((pl) => {
    const dfm = listDfmsForPart(viewer, pl.part.id)[0] ?? null;
    return {
      part: pl.part,
      current_revision_label: pl.current_revision_label,
      dfm,
      open_issue_count: pl.open_issue_count,
    };
  });

  return {
    token: tk,
    reviewer,
    project,
    parts,
    activity: listActivity(viewer, { projectId: project.id, limit: 15 }),
    audit: listAuditEvents(viewer, 20),
  };
}

/** A reviewer's own access-log (audit) entries — scoped to their magic link. */
export function listAuditEvents(viewer: ReviewerViewer, limit?: number): AuditEvent[] {
  const events = store()
    .auditEvents.filter((e) => e.access_token_id === viewer.accessTokenId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return limit ? events.slice(0, limit) : events;
}

/**
 * A single assigned part as the reviewer sees it: their DFM only, the revision
 * under review, NDA-gated files, and the issues on their own DFM. Everything is
 * filtered through the permission helpers, so no other provider's data leaks.
 */
export function getReviewerPartView(viewer: ReviewerViewer, partId: UUID): ReviewerPartView | null {
  const s = store();
  const part = getPart(viewer, partId);
  if (!part) return null;
  const project = s.projects.find((p) => p.id === part.project_id);
  const reviewer = getReviewer(viewer.externalReviewerId);
  const dfm = listDfmsForPart(viewer, partId)[0] ?? null;
  if (!project || !reviewer || !dfm) return null;

  const files = filterVisibleFiles(
    viewer,
    s.files.filter((f) => f.part_id === partId),
  );

  return {
    part,
    project,
    reviewer,
    dfm,
    current_revision: getRevision(dfm.current_revision_id),
    revisions: revisionsForPart(partId),
    files,
    issues: dfm.issues,
    permissions: viewer.permissions,
    nda_cleared: viewer.ndaCleared,
    download_blocked: viewer.downloadBlocked,
  };
}

// --- mutations (demo: mutate the in-memory store) -----------------------------

function uid(prefix: string): string {
  return `${prefix}-${Math.round(Math.random() * 1e9).toString(36)}`;
}

function now(): string {
  return new Date().toISOString();
}

/** Append an activity event (the brand-facing program timeline). */
function writeActivity(e: {
  organization_id: UUID;
  project_id?: UUID | null;
  part_id?: UUID | null;
  dfm_id?: UUID | null;
  issue_id?: UUID | null;
  actor_profile_id?: UUID | null;
  actor_reviewer_id?: UUID | null;
  type: ActivityType;
  summary: string;
}): void {
  store().activityEvents.push({
    id: uid('act'),
    organization_id: e.organization_id,
    project_id: e.project_id ?? null,
    part_id: e.part_id ?? null,
    dfm_id: e.dfm_id ?? null,
    issue_id: e.issue_id ?? null,
    actor_profile_id: e.actor_profile_id ?? null,
    actor_reviewer_id: e.actor_reviewer_id ?? null,
    type: e.type,
    summary: e.summary,
    metadata: null,
    created_at: now(),
  });
}

/** Append an audit event (the reviewer-facing access log). */
function writeAudit(e: {
  organization_id: UUID;
  project_id?: UUID | null;
  access_token_id?: UUID | null;
  actor_profile_id?: UUID | null;
  actor_reviewer_id?: UUID | null;
  action: AuditAction;
  target_type?: string | null;
  target_id?: UUID | null;
}): void {
  store().auditEvents.push({
    id: uid('aud'),
    organization_id: e.organization_id,
    project_id: e.project_id ?? null,
    access_token_id: e.access_token_id ?? null,
    actor_profile_id: e.actor_profile_id ?? null,
    actor_reviewer_id: e.actor_reviewer_id ?? null,
    action: e.action,
    target_type: e.target_type ?? null,
    target_id: e.target_id ?? null,
    ip: null,
    user_agent: null,
    metadata: null,
    created_at: now(),
  });
}

/** Recompute the part lifecycle state from the surrounding facts. */
function recomputePartState(part: Part): void {
  const s = store();
  const hasDfms = s.dfms.some((d) => d.part_id === part.id);
  const approved = s.dfmApprovals.some((a) => a.part_id === part.id);
  const partIssues = s.issues.filter((i) => i.part_id === part.id);
  const anyAwaitingValidation = partIssues.some(
    (i) => i.status === 'implemented' && i.validation_state === 'pending',
  );
  part.part_state = derivePartState({ part, hasDfms, approved, anyAwaitingValidation });
  part.updated_at = now();
}

/**
 * Recompute a provider DFM's state from its issues:
 *   awaiting_validation > complete (all closed) > feedback_submitted (has issues)
 * A DFM with no issues keeps its current invited/in_review state.
 */
function recomputeDfmState(dfm: Dfm): void {
  const dfmIssues = store().issues.filter((i) => i.dfm_id === dfm.id);
  if (dfmIssues.length === 0) return;
  const anyAwaiting = dfmIssues.some(
    (i) => i.status === 'implemented' && i.validation_state === 'pending',
  );
  const allClosed = dfmIssues.every((i) => i.status === 'closed');
  dfm.state = anyAwaiting ? 'awaiting_validation' : allClosed ? 'complete' : 'feedback_submitted';
  dfm.updated_at = now();
}

function nextIssueNumber(projectId: UUID): number {
  const nums = store().issues.filter((i) => i.project_id === projectId).map((i) => i.number);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function nextRevLabel(partId: UUID): { label: string; index: number } {
  const revs = store().partRevisions.filter((r) => r.part_id === partId);
  const index = revs.length ? Math.max(...revs.map((r) => r.rev_index)) + 1 : 0;
  return { label: String.fromCharCode(65 + Math.min(index, 25)), index };
}

/** Create a project in the viewer's org (brand only). Returns the new id. */
export function createProject(
  viewer: Viewer,
  input: { name: string; description?: string; target_completion?: string | null },
): string | null {
  if (!isBrand(viewer)) return null;
  const id = uid('proj');
  const now = new Date().toISOString();
  store().projects.push({
    id,
    organization_id: viewer.organizationId,
    name: input.name,
    description: input.description?.trim() || null,
    status: 'active',
    brand_owner_id: viewer.profileId,
    supply_chain_owner_id: null,
    start_date: now.slice(0, 10),
    target_completion: input.target_completion || null,
    created_by: viewer.profileId,
    created_at: now,
    updated_at: now,
  });
  return id;
}

/** Create a part + seed its package checklist from the process. Returns the id. */
export function createPart(
  viewer: Viewer,
  input: {
    project_id: string;
    part_number: string;
    name: string;
    material?: string;
    finish?: string;
    process: Part['process'];
    target_volume?: number;
    target_cost?: number;
    description?: string;
  },
): string | null {
  if (!isBrand(viewer)) return null;
  if (!getProject(viewer, input.project_id)) return null;
  const id = uid('part');
  const now = new Date().toISOString();
  const s = store();
  s.parts.push({
    id,
    organization_id: viewer.organizationId,
    project_id: input.project_id,
    library_ref: null,
    part_number: input.part_number,
    name: input.name,
    description: input.description?.trim() || null,
    material: input.material?.trim() || null,
    finish: input.finish?.trim() || null,
    process: input.process,
    target_volume: input.target_volume ?? null,
    target_cost: input.target_cost ?? null,
    owner_id: viewer.profileId,
    part_state: 'draft',
    package_state: 'incomplete',
    current_revision_id: null,
    created_by: viewer.profileId,
    created_at: now,
    updated_at: now,
  });
  // Seed the package checklist for this process.
  for (const item of packageChecklistFor(input.process)) {
    s.packageItems.push({
      id: uid('pkg'),
      part_id: id,
      key: item.key,
      label: item.label,
      required: item.required,
      complete: false,
      file_id: null,
      notes: null,
      completed_by: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    });
  }
  s.activityEvents.push({
    id: uid('act'), organization_id: viewer.organizationId, project_id: input.project_id,
    part_id: id, dfm_id: null, issue_id: null, actor_profile_id: viewer.profileId, actor_reviewer_id: null,
    type: 'part_added', summary: `${input.name} added to the program`, metadata: null, created_at: now,
  });
  return id;
}

/** Toggle a package checklist item; the gate + part state recompute follows. */
export function setPackageItemComplete(viewer: Viewer, itemId: UUID, complete: boolean): boolean {
  if (!isBrand(viewer)) return false;
  const s = store();
  const item = s.packageItems.find((i) => i.id === itemId);
  if (!item) return false;
  const part = s.parts.find((p) => p.id === item.part_id);
  if (!part || part.organization_id !== viewer.organizationId) return false;

  const was = part.package_state;
  item.complete = complete;
  item.completed_by = complete ? viewer.profileId : null;
  item.completed_at = complete ? now() : null;

  const pkg = summarizePackage(s.packageItems.filter((i) => i.part_id === part.id));
  part.package_state = pkg.state;
  recomputePartState(part);

  // The gate just closed → opened: this is the event that unlocks reviewer invites.
  if (was !== 'complete' && pkg.state === 'complete') {
    writeActivity({
      organization_id: part.organization_id, project_id: part.project_id, part_id: part.id,
      actor_profile_id: viewer.profileId, type: 'package_completed',
      summary: `Package completed on ${part.name} — ready to invite reviewers`,
    });
  }
  return true;
}

/** Record a brand disposition on an issue; status re-derives. */
export function dispositionIssue(
  viewer: Viewer,
  issueId: UUID,
  decision: Issue['brand_decision'],
  rationale?: string,
): boolean {
  if (!isBrand(viewer)) return false;
  const s = store();
  const issue = s.issues.find((i) => i.id === issueId);
  if (!issue || issue.organization_id !== viewer.organizationId) return false;
  if (decision === 'rejected' && !rationale) return false;

  issue.brand_decision = decision;
  issue.rejection_rationale = decision === 'rejected' ? rationale ?? null : null;
  issue.decided_by = viewer.profileId;
  issue.decided_at = now();
  issue.status = deriveIssueStatus(issue);
  issue.updated_at = now();

  const dfm = dfmById(issue.dfm_id);
  if (dfm) recomputeDfmState(dfm);
  const part = s.parts.find((p) => p.id === issue.part_id);
  if (part) recomputePartState(part);

  const verb = decision === 'accepted' ? 'accepted' : decision === 'rejected' ? 'rejected' : 'asked for clarification on';
  writeActivity({
    organization_id: issue.organization_id, project_id: issue.project_id, part_id: issue.part_id,
    dfm_id: issue.dfm_id, issue_id: issue.id, actor_profile_id: viewer.profileId,
    type: 'decision_recorded', summary: `${viewer.fullName ?? 'Brand'} ${verb} #${issue.number} — ${issue.title}`,
  });
  return true;
}

// --- reviewer invite + magic link (brand) -------------------------------------

export interface InviteResult {
  reviewer_id: UUID;
  dfm_id: UUID;
  access_token_id: UUID;
  /** The raw magic-link token — shown to the brand once, here, and never stored. */
  raw_token: string;
  magic_link_path: string;
}

/**
 * Invite an external reviewer to a part's DFM. Hard gate: the part's package
 * must be Complete first. Creates (or reuses) the reviewer, spins up a confidential
 * provider DFM scoped to the part's current revision, and mints a scoped magic-link
 * access token. Returns the raw token so the brand can copy/open the portal.
 */
export function inviteReviewer(
  viewer: Viewer,
  input: {
    part_id: UUID;
    company: string;
    contact_name: string;
    contact_email: string;
    provider_role: ProviderRole;
    nda_status: NdaStatus;
    confidentiality: ConfidentialityLevel;
    permissions: AccessPermission[];
    expiry_days: number;
  },
): InviteResult | null {
  if (!canManageReviewers(viewer)) return null;
  const brand = viewer.kind === 'brand' ? viewer : null;
  if (!brand) return null;

  const part = getPart(viewer, input.part_id);
  if (!part) return null;

  const s = store();
  // Hard gate — enforced server-side, mirrored in the UI.
  const pkg = summarizePackage(s.packageItems.filter((i) => i.part_id === part.id));
  if (pkg.state !== 'complete') return null;

  // Upsert the reviewer by email within the org.
  const email = input.contact_email.trim().toLowerCase();
  let reviewer = s.externalReviewers.find(
    (r) => r.organization_id === viewer.organizationId && r.contact_email.toLowerCase() === email,
  );
  if (reviewer) {
    reviewer.company = input.company.trim();
    reviewer.contact_name = input.contact_name.trim();
    reviewer.provider_role = input.provider_role;
    reviewer.nda_status = input.nda_status;
    reviewer.confidentiality = input.confidentiality;
    reviewer.project_id = part.project_id;
    reviewer.updated_at = now();
  } else {
    reviewer = {
      id: uid('rev'), organization_id: viewer.organizationId, project_id: part.project_id,
      company: input.company.trim(), contact_name: input.contact_name.trim(), contact_email: input.contact_email.trim(),
      provider_role: input.provider_role, nda_status: input.nda_status, confidentiality: input.confidentiality,
      watermark_policy: input.confidentiality === 'standard' ? null : 'recipient_email_diagonal',
      created_by: brand.profileId, created_at: now(), updated_at: now(),
    };
    s.externalReviewers.push(reviewer);
  }

  // Create the confidential provider DFM, scoped to the part's current revision.
  const dfm: Dfm = {
    id: uid('dfm'), organization_id: viewer.organizationId, project_id: part.project_id, part_id: part.id,
    external_reviewer_id: reviewer.id, provider_role: input.provider_role, state: 'invited',
    current_revision_id: part.current_revision_id, confidential: true,
    invited_at: now(), created_at: now(), updated_at: now(),
  };
  s.dfms.push(dfm);

  // Mint the scoped magic-link token (only the hash is stored).
  const rawToken = generateToken();
  const expires = new Date(Date.now() + input.expiry_days * 86_400_000).toISOString();
  const tokenId = uid('tok');
  s.accessTokens.push({
    id: tokenId, organization_id: viewer.organizationId, project_id: part.project_id,
    external_reviewer_id: reviewer.id, token_hash: hashToken(rawToken),
    allowed_part_ids: [part.id], allowed_dfm_ids: [dfm.id], permissions: input.permissions,
    expires_at: expires, revoked: false, revoked_at: null, revoked_by: null,
    last_opened_at: null, created_by: brand.profileId, created_at: now(),
  });

  recomputePartState(part);
  writeActivity({
    organization_id: viewer.organizationId, project_id: part.project_id, part_id: part.id, dfm_id: dfm.id,
    actor_profile_id: brand.profileId, type: 'reviewer_invited',
    summary: `Invited ${reviewer.company} to review ${part.name} for DFM`,
  });
  writeAudit({
    organization_id: viewer.organizationId, project_id: part.project_id, access_token_id: tokenId,
    actor_profile_id: brand.profileId, action: 'access_granted', target_type: 'part', target_id: part.id,
  });

  return {
    reviewer_id: reviewer.id, dfm_id: dfm.id, access_token_id: tokenId,
    raw_token: rawToken, magic_link_path: `/supplier/${rawToken}`,
  };
}

/** Revoke a magic-link access token (brand). */
export function revokeAccessToken(viewer: Viewer, tokenId: UUID): boolean {
  if (!canManageReviewers(viewer) || viewer.kind !== 'brand') return false;
  const tk = store().accessTokens.find((t) => t.id === tokenId && t.organization_id === viewer.organizationId);
  if (!tk) return false;
  tk.revoked = true;
  tk.revoked_at = now();
  tk.revoked_by = viewer.profileId;
  writeAudit({
    organization_id: viewer.organizationId, project_id: tk.project_id, access_token_id: tk.id,
    actor_profile_id: viewer.profileId, action: 'access_revoked',
  });
  return true;
}

// --- revisions (brand) --------------------------------------------------------

/** Upload (record) a new revision of a part. Returns the new revision id. */
export function uploadRevision(
  viewer: Viewer,
  partId: UUID,
  input: { change_summary: string; quote_amount?: number | null; set_current?: boolean },
): string | null {
  if (!isBrand(viewer)) return null;
  const part = getPart(viewer, partId);
  if (!part) return null;
  const s = store();
  const { label, index } = nextRevLabel(partId);
  const id = uid('rev');
  s.partRevisions.push({
    id, part_id: partId, rev_label: label, rev_index: index,
    change_summary: input.change_summary.trim() || null,
    quote_amount: input.quote_amount ?? null, uploaded_by: viewer.profileId, created_at: now(),
  });
  if (input.set_current) {
    part.current_revision_id = id;
    part.updated_at = now();
  }
  writeActivity({
    organization_id: part.organization_id, project_id: part.project_id, part_id: part.id,
    actor_profile_id: viewer.profileId, type: 'revision_uploaded',
    summary: `${viewer.fullName ?? 'Brand'} uploaded Rev ${label} — ${input.change_summary.trim()}`,
  });
  return id;
}

// --- issues raised by a reviewer (supplier portal) ----------------------------

export function createIssueByReviewer(
  viewer: ReviewerViewer,
  input: {
    dfm_id: UUID;
    title: string;
    description: string;
    type: Issue['type'];
    category: Issue['category'];
    severity: Issue['severity'];
    recommendation?: string;
    cost_impact?: number | null;
    yield_impact?: string;
  },
): string | null {
  if (!isReviewer(viewer)) return null;
  const dfm = dfmById(input.dfm_id);
  if (!dfm || !canCreateIssue(viewer, dfm)) return null;

  const s = store();
  const reviewer = getReviewer(viewer.externalReviewerId);
  const id = uid('iss');
  const issue: Issue = {
    id, organization_id: dfm.organization_id, project_id: dfm.project_id, part_id: dfm.part_id,
    dfm_id: dfm.id, number: nextIssueNumber(dfm.project_id),
    title: input.title.trim(), description: input.description.trim(),
    type: input.type, category: input.category, severity: input.severity, status: 'open',
    created_on_revision_id: dfm.current_revision_id, created_by_reviewer_id: viewer.externalReviewerId,
    created_by_profile_id: null, recommendation: input.recommendation?.trim() || null,
    cost_impact: input.cost_impact ?? null, yield_impact: input.yield_impact?.trim() || null,
    brand_decision: null, rejection_rationale: null, decided_by: null, decided_at: null,
    implementation_state: 'not_started', implemented_in_revision_id: null,
    validation_state: 'pending', validated_by_reviewer_id: null, validated_at: null, closed_at: null,
    created_at: now(), updated_at: now(),
  };
  s.issues.push(issue);
  recomputeDfmState(dfm);

  writeActivity({
    organization_id: issue.organization_id, project_id: issue.project_id, part_id: issue.part_id, dfm_id: dfm.id,
    issue_id: issue.id, actor_reviewer_id: viewer.externalReviewerId, type: 'issue_opened',
    summary: `${reviewer?.contact_name ?? 'Reviewer'} opened issue #${issue.number} — ${issue.title}`,
  });
  writeAudit({
    organization_id: issue.organization_id, project_id: issue.project_id, access_token_id: viewer.accessTokenId,
    actor_reviewer_id: viewer.externalReviewerId, action: 'issue_raised', target_type: 'issue', target_id: issue.id,
  });
  return id;
}

// --- comments (brand or reviewer) ---------------------------------------------

export function addComment(viewer: Viewer, input: { issue_id: UUID; body: string }): string | null {
  const s = store();
  const issue = s.issues.find((i) => i.id === input.issue_id);
  if (!issue) return null;
  const dfm = dfmById(issue.dfm_id);
  if (!dfm) return null;

  if (isReviewer(viewer)) {
    if (!canComment(viewer) || !canViewDfm(viewer, dfm)) return null;
  } else if (issue.organization_id !== viewer.organizationId) {
    return null;
  }

  const id = uid('cm');
  s.comments.push({
    id, organization_id: issue.organization_id, issue_id: issue.id, dfm_id: issue.dfm_id, signoff_id: null,
    body: input.body.trim(),
    author_profile_id: isReviewer(viewer) ? null : viewer.profileId,
    author_reviewer_id: isReviewer(viewer) ? viewer.externalReviewerId : null,
    created_at: now(), updated_at: now(),
  });

  const who = isReviewer(viewer) ? getReviewer(viewer.externalReviewerId)?.contact_name : viewer.fullName;
  writeActivity({
    organization_id: issue.organization_id, project_id: issue.project_id, part_id: issue.part_id, dfm_id: issue.dfm_id,
    issue_id: issue.id, actor_profile_id: isReviewer(viewer) ? null : viewer.profileId,
    actor_reviewer_id: isReviewer(viewer) ? viewer.externalReviewerId : null, type: 'comment_added',
    summary: `${who ?? 'Someone'} commented on #${issue.number}`,
  });
  if (isReviewer(viewer)) {
    writeAudit({
      organization_id: issue.organization_id, project_id: issue.project_id, access_token_id: viewer.accessTokenId,
      actor_reviewer_id: viewer.externalReviewerId, action: 'comment_posted', target_type: 'issue', target_id: issue.id,
    });
  }
  return id;
}

// --- implementation linking (brand) -------------------------------------------

/**
 * Brand marks an accepted issue's fix as implemented in a later revision. When it
 * lands as Implemented the issue moves to "awaiting validation" and the DFM/part
 * states follow — the reviewer who raised it is now asked to validate.
 */
export function setIssueImplementation(
  viewer: Viewer,
  issueId: UUID,
  input: { state: ImplementationState; revision_id?: string },
): boolean {
  if (!isBrand(viewer)) return false;
  const s = store();
  const issue = s.issues.find((i) => i.id === issueId);
  if (!issue || issue.organization_id !== viewer.organizationId) return false;
  if (input.state === 'implemented' && !input.revision_id) return false;

  const wasImplemented = issue.status === 'implemented';
  issue.implementation_state = input.state;
  issue.implemented_in_revision_id = input.state === 'implemented' ? (input.revision_id ?? null) : null;
  issue.status = deriveIssueStatus(issue);
  issue.updated_at = now();

  const dfm = dfmById(issue.dfm_id);
  if (dfm) recomputeDfmState(dfm);
  const part = s.parts.find((p) => p.id === issue.part_id);
  if (part) recomputePartState(part);

  if (issue.status === 'implemented' && !wasImplemented) {
    const revLabel = getRevision(issue.implemented_in_revision_id)?.rev_label;
    writeActivity({
      organization_id: issue.organization_id, project_id: issue.project_id, part_id: issue.part_id, dfm_id: issue.dfm_id,
      issue_id: issue.id, actor_profile_id: viewer.profileId, type: 'validation_requested',
      summary: `Fix for #${issue.number} implemented in Rev ${revLabel} — validation requested`,
    });
  }
  return true;
}

// --- validation (reviewer who raised the issue) -------------------------------

export function validateIssue(
  viewer: ReviewerViewer,
  issueId: UUID,
  result: 'validated' | 'validation_failed',
): boolean {
  if (!isReviewer(viewer)) return false;
  const s = store();
  const issue = s.issues.find((i) => i.id === issueId);
  if (!issue) return false;
  if (!canValidateIssue(viewer, issue)) return false;
  // Can only validate an implemented fix.
  if (issue.status !== 'implemented') return false;

  issue.validation_state = result;
  issue.validated_by_reviewer_id = viewer.externalReviewerId;
  issue.validated_at = result === 'validated' ? now() : null;
  issue.status = deriveIssueStatus(issue);
  issue.closed_at = issue.status === 'closed' ? now() : null;
  issue.updated_at = now();

  const dfm = dfmById(issue.dfm_id);
  if (dfm) recomputeDfmState(dfm);
  const part = s.parts.find((p) => p.id === issue.part_id);
  if (part) recomputePartState(part);

  const reviewer = getReviewer(viewer.externalReviewerId);
  const fromTo = `Rev ${getRevision(issue.created_on_revision_id)?.rev_label ?? '?'} → Rev ${getRevision(issue.implemented_in_revision_id)?.rev_label ?? '?'}`;
  if (result === 'validated') {
    writeActivity({
      organization_id: issue.organization_id, project_id: issue.project_id, part_id: issue.part_id, dfm_id: issue.dfm_id,
      issue_id: issue.id, actor_reviewer_id: viewer.externalReviewerId, type: 'issue_closed',
      summary: `${reviewer?.contact_name ?? 'Reviewer'} validated #${issue.number} (${fromTo}) → closed`,
    });
  } else {
    writeActivity({
      organization_id: issue.organization_id, project_id: issue.project_id, part_id: issue.part_id, dfm_id: issue.dfm_id,
      issue_id: issue.id, actor_reviewer_id: viewer.externalReviewerId, type: 'validation_failed',
      summary: `${reviewer?.contact_name ?? 'Reviewer'} failed validation on #${issue.number} — reopened`,
    });
  }
  writeAudit({
    organization_id: issue.organization_id, project_id: issue.project_id, access_token_id: viewer.accessTokenId,
    actor_reviewer_id: viewer.externalReviewerId, action: 'validation_submitted', target_type: 'issue', target_id: issue.id,
  });
  return true;
}

// --- sign-offs (brand) --------------------------------------------------------

export function advanceSignoff(
  viewer: Viewer,
  signoffId: UUID,
  nextState: SignoffState,
  rationale?: string,
): boolean {
  if (!isBrand(viewer)) return false;
  const s = store();
  const signoff = s.signoffs.find((so) => so.id === signoffId && so.organization_id === viewer.organizationId);
  if (!signoff) return false;

  signoff.state = nextState;
  if (rationale && rationale.trim()) signoff.rationale = rationale.trim();
  signoff.updated_at = now();

  if (nextState === 'signed') {
    // A signed agreement means every party has agreed.
    for (const party of s.signoffParties.filter((p) => p.signoff_id === signoff.id)) {
      party.agreed = true;
      party.agreed_at = now();
    }
    writeActivity({
      organization_id: signoff.organization_id, project_id: signoff.project_id, part_id: signoff.part_id,
      actor_profile_id: viewer.profileId, type: 'signoff_recorded',
      summary: `${signoff.title} sign-off signed`,
    });
  }
  return true;
}

// --- DFM approval (owner/admin — the terminal cut-steel gate) ------------------

export function approveDfm(
  viewer: Viewer,
  partId: UUID,
  input: { approved_revision_id: UUID; po_reference?: string; tooling_reference?: string; notes?: string },
): boolean {
  if (!canApproveDfm(viewer) || viewer.kind !== 'brand') return false;
  const s = store();
  const part = getPart(viewer, partId);
  if (!part) return false;
  if (s.dfmApprovals.some((a) => a.part_id === partId)) return false; // already approved

  // Re-check the entry criteria server-side against the chosen frozen revision.
  const readiness = dfmApprovalReadiness({
    issues: listIssues(viewer, { partId }),
    signoffs: listSignoffs(viewer, partId),
    frozenRevision: getRevision(input.approved_revision_id),
  });
  if (!readiness.ready) return false;

  s.dfmApprovals.push({
    id: uid('appr'), organization_id: part.organization_id, project_id: part.project_id, part_id: part.id,
    approved_by: viewer.profileId, approved_at: now(), approved_revision_id: input.approved_revision_id,
    po_reference: input.po_reference?.trim() || null, tooling_reference: input.tooling_reference?.trim() || null,
    notes: input.notes?.trim() || null, created_at: now(),
  });
  // Freeze the approved revision and advance the part.
  part.current_revision_id = input.approved_revision_id;
  recomputePartState(part);
  // Mark every DFM on the part complete.
  for (const dfm of s.dfms.filter((d) => d.part_id === part.id)) {
    dfm.state = 'complete';
    dfm.updated_at = now();
  }

  const revLabel = getRevision(input.approved_revision_id)?.rev_label;
  writeActivity({
    organization_id: part.organization_id, project_id: part.project_id, part_id: part.id,
    actor_profile_id: viewer.profileId, type: 'dfm_approved',
    summary: `${part.name} reached DFM Approval (Rev ${revLabel}) — cleared to cut steel`,
  });
  return true;
}

// --- supplier portal session (reviewer) ---------------------------------------

/**
 * Record that the magic link was opened: stamps last_opened_at, advances any
 * freshly-invited DFM to "in review", and logs the access (once per open).
 */
export function markPortalOpened(viewer: ReviewerViewer): void {
  const s = store();
  const tk = s.accessTokens.find((t) => t.id === viewer.accessTokenId);
  if (!tk) return;
  tk.last_opened_at = now();
  let firstOpen = false;
  for (const dfm of s.dfms.filter((d) => viewer.allowedDfmIds.includes(d.id))) {
    if (dfm.state === 'invited') {
      dfm.state = 'in_review';
      dfm.updated_at = now();
      firstOpen = true;
    }
  }
  if (firstOpen) {
    writeAudit({
      organization_id: viewer.organizationId, project_id: viewer.projectId, access_token_id: tk.id,
      actor_reviewer_id: viewer.externalReviewerId, action: 'magic_link_opened',
    });
  }
}
