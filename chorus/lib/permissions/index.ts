/**
 * Chorus permission helpers — the single place every access decision is made.
 *
 * Confidentiality rules this module enforces:
 *  - Brand/admin users see everything in their own organization (and nothing in
 *    any other organization).
 *  - External reviewers see ONLY the project, parts, revisions, files, DFM,
 *    issues, comments and uploads their magic-link token is scoped to.
 *  - Providers never see each other's DFMs, recommendations, comments, files or
 *    issues — a reviewer is bound to exactly one external_reviewer_id, and every
 *    confidential resource is matched against it.
 *  - Issue Groups are brand-side only; reviewers can never read them.
 *
 * These are pure predicates over a Viewer + a resource shape. They contain no
 * I/O; the data layer calls them to filter rows, and mutation helpers call them
 * to authorize mutations.
 */
import type {
  AccessPermission,
  Comment,
  Dfm,
  FileObject,
  Issue,
  Part,
  PartRevision,
  Project,
  UUID,
} from '@/types';
import { type Viewer, isBrand, isReviewer } from './types';

export * from './types';

// --- Organization scoping -----------------------------------------------------

export function canAccessOrganization(viewer: Viewer, organizationId: UUID): boolean {
  return viewer.organizationId === organizationId;
}

export function canAccessProject(viewer: Viewer, project: Pick<Project, 'id' | 'organization_id'>): boolean {
  if (!canAccessOrganization(viewer, project.organization_id)) return false;
  if (isBrand(viewer)) return true;
  // Reviewer: must be the project the token was issued for.
  return viewer.projectId === project.id;
}

// --- Parts --------------------------------------------------------------------

export function canViewPart(viewer: Viewer, part: Pick<Part, 'id' | 'organization_id' | 'project_id'>): boolean {
  if (!canAccessOrganization(viewer, part.organization_id)) return false;
  if (isBrand(viewer)) return true;
  return viewer.projectId === part.project_id && viewer.allowedPartIds.includes(part.id);
}

// --- Revisions ----------------------------------------------------------------

export function canViewRevision(
  viewer: Viewer,
  revision: Pick<PartRevision, 'part_id'>,
  partOrg: UUID,
  partProject: UUID,
): boolean {
  return canViewPart(viewer, {
    id: revision.part_id,
    organization_id: partOrg,
    project_id: partProject,
  });
}

// --- DFMs (provider isolation) ------------------------------------------------

/**
 * A reviewer may only ever see their OWN DFM. Brand users see every DFM in org.
 * This is the core walling-off rule between competing providers.
 */
export function canViewDfm(viewer: Viewer, dfm: Pick<Dfm, 'id' | 'organization_id' | 'external_reviewer_id'>): boolean {
  if (!canAccessOrganization(viewer, dfm.organization_id)) return false;
  if (isBrand(viewer)) return true;
  return (
    dfm.external_reviewer_id === viewer.externalReviewerId &&
    viewer.allowedDfmIds.includes(dfm.id)
  );
}

// --- Issues -------------------------------------------------------------------

/** Issues belong to a provider DFM; reviewers only see issues on their own DFM. */
export function canViewIssue(
  viewer: Viewer,
  issue: Pick<Issue, 'organization_id' | 'dfm_id'>,
  dfm: Pick<Dfm, 'id' | 'organization_id' | 'external_reviewer_id'>,
): boolean {
  if (!canAccessOrganization(viewer, issue.organization_id)) return false;
  if (isBrand(viewer)) return true;
  return canViewDfm(viewer, dfm);
}

// --- Issue Groups (brand-only) ------------------------------------------------

/** Cross-provider rollups are never exposed to reviewers in v0. */
export function canViewIssueGroup(viewer: Viewer): boolean {
  return isBrand(viewer);
}

// --- Files (provider isolation + NDA gate + download policy) ------------------

/**
 * File visibility:
 *  - Brand: any file in org.
 *  - Reviewer: file must be in their project & allowed part, must NOT belong to
 *    another provider's DFM (dfm_id null or own DFM), and the reviewer's NDA must
 *    be cleared.
 */
export function canViewFile(
  viewer: Viewer,
  file: Pick<FileObject, 'organization_id' | 'project_id' | 'part_id' | 'dfm_id'>,
): boolean {
  if (!canAccessOrganization(viewer, file.organization_id)) return false;
  if (isBrand(viewer)) return true;

  if (!viewer.ndaCleared) return false;
  if (file.project_id && file.project_id !== viewer.projectId) return false;
  if (file.part_id && !viewer.allowedPartIds.includes(file.part_id)) return false;
  // Confidential to another provider's DFM -> hidden.
  if (file.dfm_id && !viewer.allowedDfmIds.includes(file.dfm_id)) return false;
  return true;
}

/** Whether a reviewer may download (vs. view-only) a file they can see. */
export function canDownloadFile(viewer: Viewer, file: Pick<FileObject, 'organization_id' | 'project_id' | 'part_id' | 'dfm_id'>): boolean {
  if (!canViewFile(viewer, file)) return false;
  if (isBrand(viewer)) return true;
  return hasPermission(viewer, 'download') && !viewer.downloadBlocked;
}

// --- Comments -----------------------------------------------------------------

export function canViewComment(
  viewer: Viewer,
  comment: Pick<Comment, 'organization_id' | 'dfm_id' | 'issue_id'>,
  dfm: Pick<Dfm, 'id' | 'organization_id' | 'external_reviewer_id'> | null,
): boolean {
  if (!canAccessOrganization(viewer, comment.organization_id)) return false;
  if (isBrand(viewer)) return true;
  // A reviewer-visible comment must hang off their own DFM thread.
  if (!dfm) return false;
  return canViewDfm(viewer, dfm);
}

// --- Reviewer capability checks (magic-link permissions) ----------------------

export function hasPermission(viewer: Viewer, permission: AccessPermission): boolean {
  if (isBrand(viewer)) return true; // brand users are not permission-gated in v0
  return viewer.permissions.includes(permission);
}

export function canCreateIssue(viewer: Viewer, dfm: Pick<Dfm, 'id' | 'organization_id' | 'external_reviewer_id'>): boolean {
  if (isBrand(viewer)) return true;
  return hasPermission(viewer, 'create_issues') && canViewDfm(viewer, dfm);
}

export function canComment(viewer: Viewer): boolean {
  return hasPermission(viewer, 'comment');
}

/**
 * Validation is owned by the reviewer who RAISED the issue (a brand cannot
 * validate its own fixes). This enforces that ownership.
 */
export function canValidateIssue(viewer: Viewer, issue: Pick<Issue, 'created_by_reviewer_id'>): boolean {
  if (isBrand(viewer)) return false; // brand never validates its own fixes
  return (
    hasPermission(viewer, 'validate_fixes') &&
    issue.created_by_reviewer_id === viewer.externalReviewerId
  );
}

// --- Brand-only workflow mutations -------------------------------------------

export function canDispositionIssue(viewer: Viewer): boolean {
  return isBrand(viewer);
}

export function canApproveDfm(viewer: Viewer): boolean {
  // Owner/admin only — the terminal cut-steel decision.
  return isBrand(viewer) && (viewer.role === 'owner' || viewer.role === 'admin');
}

export function canManageReviewers(viewer: Viewer): boolean {
  return isBrand(viewer) && (viewer.role === 'owner' || viewer.role === 'admin');
}

// --- Bulk filters (convenience for the data layer) ----------------------------

export function filterVisibleDfms<T extends Pick<Dfm, 'id' | 'organization_id' | 'external_reviewer_id'>>(
  viewer: Viewer,
  dfms: T[],
): T[] {
  return dfms.filter((d) => canViewDfm(viewer, d));
}

export function filterVisibleFiles<T extends Pick<FileObject, 'organization_id' | 'project_id' | 'part_id' | 'dfm_id'>>(
  viewer: Viewer,
  files: T[],
): T[] {
  return files.filter((f) => canViewFile(viewer, f));
}

/** Reviewer view of a part must hide everything but their own DFM/issues. */
export function isProviderIsolated(viewer: Viewer): boolean {
  return isReviewer(viewer);
}
