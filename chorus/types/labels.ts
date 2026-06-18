/**
 * Display labels and small presentational metadata (badge tone) for the
 * workflow enums. Kept separate from `enums.ts` so the enum module stays a pure
 * data contract that can be shared with non-UI code.
 */

import type {
  ActivityType,
  BrandDecision,
  DfmState,
  ImplementationState,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  IssueType,
  NdaStatus,
  PackageState,
  PartProcess,
  PartState,
  ProjectState,
  ProviderRole,
  SignoffState,
  SignoffTopic,
  ValidationState,
} from './enums';

/** A semantic tone used to pick a badge color in the UI. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export const partStateLabels: Record<PartState, string> = {
  draft: 'Draft',
  package_complete: 'Package Complete',
  dfm_active: 'DFM Active',
  awaiting_validation: 'Awaiting Validation',
  dfm_approved: 'DFM Approved',
};

export const partStateTone: Record<PartState, Tone> = {
  draft: 'neutral',
  package_complete: 'info',
  dfm_active: 'accent',
  awaiting_validation: 'warning',
  dfm_approved: 'success',
};

export const partProcessLabels: Record<PartProcess, string> = {
  injection_molded: 'Injection Mold',
  cnc: 'CNC',
  sheet_metal: 'Sheet Metal',
  cast: 'Cast',
  other: 'Other',
};

export const packageStateLabels: Record<PackageState, string> = {
  incomplete: 'Incomplete',
  complete: 'Complete',
};

export const dfmStateLabels: Record<DfmState, string> = {
  invited: 'Invited',
  in_review: 'In Review',
  feedback_submitted: 'Feedback Submitted',
  awaiting_validation: 'Awaiting Validation',
  complete: 'Complete',
};

export const dfmStateTone: Record<DfmState, Tone> = {
  invited: 'neutral',
  in_review: 'accent',
  feedback_submitted: 'info',
  awaiting_validation: 'warning',
  complete: 'success',
};

export const issueStatusLabels: Record<IssueStatus, string> = {
  open: 'Open',
  dispositioned: 'Dispositioned',
  implemented: 'Implemented',
  validated: 'Validated',
  closed: 'Closed',
};

export const issueStatusTone: Record<IssueStatus, Tone> = {
  open: 'danger',
  dispositioned: 'warning',
  implemented: 'info',
  validated: 'accent',
  closed: 'success',
};

export const issueTypeLabels: Record<IssueType, string> = {
  show_stopper: 'Show-stopper',
  finding: 'Finding',
  proposal: 'Proposal',
  info: 'Info',
};

export const issueTypeTone: Record<IssueType, Tone> = {
  show_stopper: 'danger',
  finding: 'warning',
  proposal: 'info',
  info: 'neutral',
};

export const issueCategoryLabels: Record<IssueCategory, string> = {
  geometry: 'Geometry',
  tolerance: 'Tolerance',
  material: 'Material',
  tooling: 'Tooling',
  assembly: 'Assembly',
  process: 'Process',
  cost_yield: 'Cost / Yield',
};

export const issueSeverityLabels: Record<IssueSeverity, string> = {
  critical: 'Critical',
  medium: 'Medium',
  low: 'Low',
};

export const issueSeverityTone: Record<IssueSeverity, Tone> = {
  critical: 'danger',
  medium: 'warning',
  low: 'neutral',
};

export const brandDecisionLabels: Record<BrandDecision, string> = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  needs_clarification: 'Needs Clarification',
};

export const brandDecisionTone: Record<BrandDecision, Tone> = {
  accepted: 'success',
  rejected: 'danger',
  needs_clarification: 'warning',
};

export const implementationStateLabels: Record<ImplementationState, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  implemented: 'Implemented',
};

export const validationStateLabels: Record<ValidationState, string> = {
  pending: 'Pending',
  validated: 'Validated',
  validation_failed: 'Validation Failed',
};

export const validationStateTone: Record<ValidationState, Tone> = {
  pending: 'neutral',
  validated: 'success',
  validation_failed: 'danger',
};

export const signoffTopicLabels: Record<SignoffTopic, string> = {
  parting_line: 'Parting Line',
  gate_location: 'Gate Location',
  material_lock: 'Material Lock',
  tooling_ownership: 'Tooling Ownership',
  custom: 'Custom',
};

export const signoffStateLabels: Record<SignoffState, string> = {
  proposed: 'Proposed',
  aligned: 'Aligned',
  signed: 'Signed',
};

export const signoffStateTone: Record<SignoffState, Tone> = {
  proposed: 'neutral',
  aligned: 'info',
  signed: 'success',
};

export const providerRoleLabels: Record<ProviderRole, string> = {
  cm: 'CM',
  supplier: 'Supplier',
  fabricator: 'Fabricator',
  tooling: 'Tooling',
  other: 'Other',
};

export const ndaStatusLabels: Record<NdaStatus, string> = {
  not_required: 'Not Required',
  pending: 'Pending',
  signed: 'Signed',
};

export const ndaStatusTone: Record<NdaStatus, Tone> = {
  not_required: 'neutral',
  pending: 'warning',
  signed: 'success',
};

export const projectStateLabels: Record<ProjectState, string> = {
  setup: 'Setup',
  dfm_active: 'DFM Active',
  dfm_approved: 'DFM Approved',
};

export const projectStateTone: Record<ProjectState, Tone> = {
  setup: 'neutral',
  dfm_active: 'accent',
  dfm_approved: 'success',
};

export const activityTypeMeta: Record<ActivityType, { label: string; tone: Tone }> = {
  reviewer_invited: { label: 'Invited', tone: 'info' },
  part_added: { label: 'Part added', tone: 'neutral' },
  revision_uploaded: { label: 'Revision', tone: 'info' },
  issue_opened: { label: 'Opened', tone: 'danger' },
  decision_recorded: { label: 'Decision', tone: 'warning' },
  validation_requested: { label: 'Validation', tone: 'warning' },
  issue_closed: { label: 'Closed', tone: 'success' },
  validation_failed: { label: 'Validation failed', tone: 'danger' },
  signoff_recorded: { label: 'Sign-off', tone: 'accent' },
  dfm_approved: { label: 'DFM approved', tone: 'success' },
  package_completed: { label: 'Package', tone: 'success' },
  comment_added: { label: 'Comment', tone: 'neutral' },
};
