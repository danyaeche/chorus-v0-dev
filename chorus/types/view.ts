/**
 * Composite read models — denormalized shapes assembled by the repository layer
 * for the UI. These join the raw rows in `models.ts` into the aggregates each
 * page renders, so server components don't have to stitch relations together.
 */

import type { AccessPermission } from './enums';
import type {
  AccessToken,
  ActivityEvent,
  AuditEvent,
  Comment,
  Dfm,
  DfmApproval,
  ExternalReviewer,
  FileObject,
  Issue,
  IssueGroup,
  Part,
  PartRevision,
  PackageItem,
  Profile,
  Project,
  Signoff,
  SignoffParty,
} from './models';

export interface IssueView extends Issue {
  created_on_revision?: PartRevision | null;
  implemented_in_revision?: PartRevision | null;
  reviewer?: ExternalReviewer | null;
  comments?: Comment[];
  attachments?: FileObject[];
}

export interface DfmView extends Dfm {
  reviewer: ExternalReviewer;
  current_revision?: PartRevision | null;
  issues: IssueView[];
  open_issue_count: number;
}

export interface SignoffView extends Signoff {
  parties: SignoffParty[];
}

export interface IssueGroupView extends IssueGroup {
  issues: IssueView[];
}

export interface PackageSummary {
  state: 'incomplete' | 'complete';
  required_total: number;
  required_complete: number;
  items: PackageItem[];
}

/** The full part hub aggregate rendered on the part-detail page. */
export interface PartDetailView {
  part: Part;
  project: Project;
  owner?: Profile | null;
  revisions: PartRevision[];
  current_revision?: PartRevision | null;
  package: PackageSummary;
  dfms: DfmView[];
  signoffs: SignoffView[];
  issue_groups: IssueGroupView[];
  approval?: DfmApproval | null;
  files: FileObject[];
  activity: ActivityEvent[];
  /** Whether the terminal DFM-approval gate criteria are currently satisfied. */
  approval_ready: boolean;
}

export interface PartListItem {
  part: Part;
  open_issue_count: number;
  awaiting_validation_count: number;
  current_revision_label: string | null;
  provider_count: number;
}

export interface ProjectSummary {
  project: Project;
  part_count: number;
  open_issue_count: number;
  awaiting_validation_count: number;
  dfm_completion_pct: number;
  latest_revision_label: string | null;
}

export interface DashboardStats {
  open_issues: number;
  awaiting_validation: number;
  accepted: number;
  closed: number;
  dfm_completion_pct: number;
  dfm_approved_parts: number;
}

export interface ReviewerPortalView {
  token: AccessToken;
  reviewer: ExternalReviewer;
  project: Project;
  parts: {
    part: Part;
    current_revision_label: string | null;
    dfm?: Dfm | null;
    open_issue_count: number;
  }[];
  activity: ActivityEvent[];
  audit: AuditEvent[];
}

/** What an external reviewer sees for one assigned part — their DFM only. */
export interface ReviewerPartView {
  part: Part;
  project: Project;
  reviewer: ExternalReviewer;
  dfm: DfmView;
  current_revision?: PartRevision | null;
  revisions: PartRevision[];
  files: FileObject[];
  issues: IssueView[];
  permissions: AccessPermission[];
  nda_cleared: boolean;
  download_blocked: boolean;
}
