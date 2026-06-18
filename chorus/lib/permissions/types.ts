/**
 * Viewer contexts — who is asking, and what they're scoped to.
 *
 * Every permission decision is a pure function of a `Viewer` plus the resource.
 * There are exactly two viewer kinds in v0:
 *   - BrandViewer:   an authenticated org member (full org visibility, role-gated).
 *   - ReviewerViewer: a magic-link bearer scoped to specific parts/DFMs/permissions.
 */
import type { AccessPermission, MembershipRole, UUID } from '@/types';

export interface BrandViewer {
  kind: 'brand';
  profileId: UUID;
  email: string;
  fullName: string | null;
  organizationId: UUID;
  role: MembershipRole;
}

export interface ReviewerViewer {
  kind: 'reviewer';
  accessTokenId: UUID;
  organizationId: UUID;
  projectId: UUID;
  externalReviewerId: UUID;
  allowedPartIds: UUID[];
  allowedDfmIds: UUID[];
  permissions: AccessPermission[];
  /** Resolved from external_reviewers.nda_status === 'signed' (or not_required). */
  ndaCleared: boolean;
  /** True when 'download' is not granted or files are confidential-no-download. */
  downloadBlocked: boolean;
}

export type Viewer = BrandViewer | ReviewerViewer;

export function isBrand(v: Viewer): v is BrandViewer {
  return v.kind === 'brand';
}

export function isReviewer(v: Viewer): v is ReviewerViewer {
  return v.kind === 'reviewer';
}
