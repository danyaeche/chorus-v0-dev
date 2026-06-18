/**
 * Chorus v0 — canonical workflow enums.
 *
 * These string-literal unions are the single source of truth for every state
 * machine in the product. The Postgres migrations declare matching `enum` types
 * (see db/migrations), and the seed/repository layer is typed against these.
 *
 * Keep the literal values in sync with db/migrations/0001_enums.sql.
 */

// --- Membership / actor roles -------------------------------------------------

/** Brand-side membership role within an organization. */
export const MEMBERSHIP_ROLES = ['owner', 'admin', 'member'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

/** The manufacturing role a provider/external reviewer plays on a DFM. */
export const PROVIDER_ROLES = [
  'cm', // contract manufacturer
  'supplier',
  'fabricator',
  'tooling',
  'other',
] as const;
export type ProviderRole = (typeof PROVIDER_ROLES)[number];

// --- Part lifecycle -----------------------------------------------------------

export const PART_STATES = [
  'draft',
  'package_complete',
  'dfm_active',
  'awaiting_validation',
  'dfm_approved',
] as const;
export type PartState = (typeof PART_STATES)[number];

/** Manufacturing process — drives which package checklist applies. */
export const PART_PROCESSES = [
  'injection_molded',
  'cnc',
  'sheet_metal',
  'cast',
  'other',
] as const;
export type PartProcess = (typeof PART_PROCESSES)[number];

// --- Package gate -------------------------------------------------------------

export const PACKAGE_STATES = ['incomplete', 'complete'] as const;
export type PackageState = (typeof PACKAGE_STATES)[number];

// --- DFM lifecycle ------------------------------------------------------------

export const DFM_STATES = [
  'invited',
  'in_review',
  'feedback_submitted',
  'awaiting_validation',
  'complete',
] as const;
export type DfmState = (typeof DFM_STATES)[number];

// --- Issue state machine ------------------------------------------------------

export const ISSUE_STATUSES = [
  'open',
  'dispositioned',
  'implemented',
  'validated',
  'closed',
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_TYPES = ['show_stopper', 'finding', 'proposal', 'info'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_CATEGORIES = [
  'geometry',
  'tolerance',
  'material',
  'tooling',
  'assembly',
  'process',
  'cost_yield',
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_SEVERITIES = ['critical', 'medium', 'low'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

/** Brand disposition of a provider-raised issue. */
export const BRAND_DECISIONS = ['accepted', 'rejected', 'needs_clarification'] as const;
export type BrandDecision = (typeof BRAND_DECISIONS)[number];

export const IMPLEMENTATION_STATES = ['not_started', 'in_progress', 'implemented'] as const;
export type ImplementationState = (typeof IMPLEMENTATION_STATES)[number];

export const VALIDATION_STATES = ['pending', 'validated', 'validation_failed'] as const;
export type ValidationState = (typeof VALIDATION_STATES)[number];

// --- Sign-offs ----------------------------------------------------------------

export const SIGNOFF_TOPICS = [
  'parting_line',
  'gate_location',
  'material_lock',
  'tooling_ownership',
  'custom',
] as const;
export type SignoffTopic = (typeof SIGNOFF_TOPICS)[number];

export const SIGNOFF_STATES = ['proposed', 'aligned', 'signed'] as const;
export type SignoffState = (typeof SIGNOFF_STATES)[number];

// --- External reviewers / access ---------------------------------------------

export const NDA_STATUSES = ['not_required', 'pending', 'signed'] as const;
export type NdaStatus = (typeof NDA_STATUSES)[number];

/** Confidentiality posture applied to a reviewer's file access. */
export const CONFIDENTIALITY_LEVELS = [
  'standard',
  'nda_required',
  'confidential_no_download',
] as const;
export type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number];

/** Discrete permissions a magic-link access token may grant. */
export const ACCESS_PERMISSIONS = [
  'view_files',
  'download',
  'comment',
  'create_issues',
  'validate_fixes',
] as const;
export type AccessPermission = (typeof ACCESS_PERMISSIONS)[number];

// --- Files --------------------------------------------------------------------

export const FILE_KINDS = [
  'cad_step',
  'drawing_2d',
  'material_spec',
  'quote_pdf',
  'issue_screenshot',
  'supplier_upload',
  'revision_file',
  'other',
] as const;
export type FileKind = (typeof FILE_KINDS)[number];

// --- Activity / audit ---------------------------------------------------------

export const ACTIVITY_TYPES = [
  'reviewer_invited',
  'part_added',
  'revision_uploaded',
  'issue_opened',
  'decision_recorded',
  'validation_requested',
  'issue_closed',
  'validation_failed',
  'signoff_recorded',
  'dfm_approved',
  'package_completed',
  'comment_added',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const AUDIT_ACTIONS = [
  'magic_link_opened',
  'nda_accepted',
  'file_viewed',
  'file_downloaded',
  'issue_raised',
  'comment_posted',
  'validation_submitted',
  'access_revoked',
  'access_granted',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const PROJECT_STATUSES = ['active', 'on_hold', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Derived program state shown on the project hub. Unlike `ProjectStatus` (the
 * stored lifecycle flag), this is computed from the project's parts:
 *   - setup:        no part has an active DFM yet
 *   - dfm_active:   at least one part is in DFM review
 *   - dfm_approved: every part is DFM-approved (cleared to cut steel)
 */
export const PROJECT_STATES = ['setup', 'dfm_active', 'dfm_approved'] as const;
export type ProjectState = (typeof PROJECT_STATES)[number];
