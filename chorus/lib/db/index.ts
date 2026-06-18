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
  canViewDfm,
  canViewIssue,
  canViewIssueGroup,
  filterVisibleFiles,
  isBrand,
  type Viewer,
} from '@/lib/permissions';
import type { ReviewerViewer } from '@/lib/permissions/types';
import {
  dfmApprovalReadiness,
  deriveIssueStatus,
  summarizePackage,
} from '@/lib/workflow';
import { hashToken } from '@/lib/auth/tokens';
import { packageChecklistFor } from '@/types/package-checklist';
import type {
  ActivityEvent,
  Dfm,
  ExternalReviewer,
  Issue,
  Part,
  PartRevision,
  Profile,
  Project,
  Signoff,
  UUID,
} from '@/types';
import type {
  DashboardStats,
  DfmView,
  IssueGroupView,
  IssueView,
  PartDetailView,
  PartListItem,
  ProjectSummary,
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

function storeApproval(partId: UUID) {
  // dfm_approvals are not seeded for TM-4 parts; cargo housing is approved but
  // has no detail page wired in demo. Returns null unless present.
  void partId;
  return null;
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
  };
}

// --- mutations (demo: mutate the in-memory store) -----------------------------

function uid(prefix: string): string {
  return `${prefix}-${Math.round(Math.random() * 1e9).toString(36)}`;
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

  item.complete = complete;
  item.completed_by = complete ? viewer.profileId : null;
  item.completed_at = complete ? new Date().toISOString() : null;

  const pkg = summarizePackage(s.packageItems.filter((i) => i.part_id === part.id));
  part.package_state = pkg.state;
  if (pkg.state === 'complete' && part.part_state === 'draft') part.part_state = 'package_complete';
  if (pkg.state === 'incomplete' && part.part_state === 'package_complete') part.part_state = 'draft';
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
  issue.decided_at = new Date().toISOString();
  issue.status = deriveIssueStatus(issue);
  issue.updated_at = new Date().toISOString();

  s.activityEvents.push({
    id: `act-${Math.round(Math.random() * 1e9)}`,
    organization_id: issue.organization_id, project_id: issue.project_id, part_id: issue.part_id,
    dfm_id: issue.dfm_id, issue_id: issue.id, actor_profile_id: viewer.profileId, actor_reviewer_id: null,
    type: 'decision_recorded', summary: `Disposition recorded on #${issue.number}: ${decision}`,
    metadata: null, created_at: new Date().toISOString(),
  });
  return true;
}
