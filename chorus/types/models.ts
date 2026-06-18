/**
 * Row-level domain models. Each interface mirrors a table declared in
 * db/migrations and is the shape returned by the repository layer (lib/db).
 *
 * Timestamps are ISO-8601 strings (how Supabase returns `timestamptz`). UUIDs
 * are plain strings.
 */

import type {
  AccessPermission,
  ActivityType,
  AuditAction,
  BrandDecision,
  ConfidentialityLevel,
  DfmState,
  FileKind,
  ImplementationState,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  IssueType,
  MembershipRole,
  NdaStatus,
  PackageState,
  PartProcess,
  PartState,
  ProjectStatus,
  ProviderRole,
  SignoffState,
  SignoffTopic,
  ValidationState,
} from './enums';

export type UUID = string;
export type Timestamp = string;

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Profile {
  id: UUID; // mirrors auth.users.id
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Membership {
  id: UUID;
  organization_id: UUID;
  profile_id: UUID;
  role: MembershipRole;
  created_at: Timestamp;
}

export interface Project {
  id: UUID;
  organization_id: UUID;
  name: string;
  description: string | null;
  status: ProjectStatus;
  brand_owner_id: UUID | null;
  supply_chain_owner_id: UUID | null;
  start_date: string | null;
  target_completion: string | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Part {
  id: UUID;
  organization_id: UUID;
  project_id: UUID;
  /**
   * vNext hook: a shared part design can be referenced by many projects. In v0
   * a part belongs to a single project; `library_ref` records the shared design
   * number so the reusable-part model can be layered in later without a
   * migration of existing rows.
   */
  library_ref: string | null;
  part_number: string;
  name: string;
  description: string | null;
  material: string | null;
  finish: string | null;
  process: PartProcess;
  target_volume: number | null;
  target_cost: number | null;
  owner_id: UUID | null;
  part_state: PartState;
  package_state: PackageState;
  /** Current released revision pointer (frozen at DFM approval). */
  current_revision_id: UUID | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PackageItem {
  id: UUID;
  part_id: UUID;
  key: string;
  label: string;
  required: boolean;
  complete: boolean;
  file_id: UUID | null;
  notes: string | null;
  completed_by: UUID | null;
  completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PartRevision {
  id: UUID;
  part_id: UUID;
  /** Bare label, e.g. "A", "B", "C". Display as "Rev A". */
  rev_label: string;
  /** Monotonic ordering index (A=0, B=1, …). */
  rev_index: number;
  change_summary: string | null;
  quote_amount: number | null;
  uploaded_by: UUID | null;
  created_at: Timestamp;
}

export interface ExternalReviewer {
  id: UUID;
  organization_id: UUID;
  project_id: UUID | null;
  company: string;
  contact_name: string;
  contact_email: string;
  provider_role: ProviderRole;
  nda_status: NdaStatus;
  confidentiality: ConfidentialityLevel;
  /** Stub for the file-watermarking policy applied to this reviewer. */
  watermark_policy: string | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Dfm {
  id: UUID;
  organization_id: UUID;
  project_id: UUID;
  part_id: UUID;
  external_reviewer_id: UUID;
  provider_role: ProviderRole;
  state: DfmState;
  /** This DFM's own revision-under-review pointer — independent per provider. */
  current_revision_id: UUID | null;
  confidential: boolean;
  invited_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Issue {
  id: UUID;
  organization_id: UUID;
  project_id: UUID;
  part_id: UUID;
  dfm_id: UUID;
  /** Per-project display number, e.g. #12. */
  number: number;
  title: string;
  description: string | null;
  type: IssueType;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  created_on_revision_id: UUID | null;
  created_by_reviewer_id: UUID | null;
  created_by_profile_id: UUID | null;
  recommendation: string | null;
  cost_impact: number | null;
  yield_impact: string | null;
  brand_decision: BrandDecision | null;
  rejection_rationale: string | null;
  decided_by: UUID | null;
  decided_at: Timestamp | null;
  implementation_state: ImplementationState;
  implemented_in_revision_id: UUID | null;
  validation_state: ValidationState;
  validated_by_reviewer_id: UUID | null;
  validated_at: Timestamp | null;
  closed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface IssueGroup {
  id: UUID;
  organization_id: UUID;
  project_id: UUID;
  part_id: UUID;
  title: string;
  description: string | null;
  /** Set when linked provider issues carry contradictory recommendations. */
  conflict_flag: boolean;
  brand_decision: BrandDecision | null;
  decision_rationale: string | null;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface IssueGroupLink {
  id: UUID;
  issue_group_id: UUID;
  issue_id: UUID;
  created_at: Timestamp;
}

export interface Signoff {
  id: UUID;
  organization_id: UUID;
  project_id: UUID;
  part_id: UUID;
  topic: SignoffTopic;
  custom_topic: string | null;
  title: string;
  state: SignoffState;
  rationale: string | null;
  proposed_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SignoffParty {
  id: UUID;
  signoff_id: UUID;
  party_type: 'brand' | 'reviewer';
  profile_id: UUID | null;
  external_reviewer_id: UUID | null;
  agreed: boolean;
  agreed_at: Timestamp | null;
}

export interface DfmApproval {
  id: UUID;
  organization_id: UUID;
  project_id: UUID;
  part_id: UUID;
  approved_by: UUID | null;
  approved_at: Timestamp;
  approved_revision_id: UUID | null;
  po_reference: string | null;
  tooling_reference: string | null;
  notes: string | null;
  created_at: Timestamp;
}

export interface FileObject {
  id: UUID;
  organization_id: UUID;
  project_id: UUID | null;
  part_id: UUID | null;
  revision_id: UUID | null;
  /** When set, the file is confidential to a single provider DFM. */
  dfm_id: UUID | null;
  issue_id: UUID | null;
  package_item_id: UUID | null;
  kind: FileKind;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  watermarked: boolean;
  uploaded_by: UUID | null;
  uploaded_by_reviewer_id: UUID | null;
  created_at: Timestamp;
}

export interface Comment {
  id: UUID;
  organization_id: UUID;
  issue_id: UUID | null;
  dfm_id: UUID | null;
  signoff_id: UUID | null;
  body: string;
  author_profile_id: UUID | null;
  author_reviewer_id: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ActivityEvent {
  id: UUID;
  organization_id: UUID;
  project_id: UUID | null;
  part_id: UUID | null;
  dfm_id: UUID | null;
  issue_id: UUID | null;
  actor_profile_id: UUID | null;
  actor_reviewer_id: UUID | null;
  type: ActivityType;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: Timestamp;
}

export interface AccessToken {
  id: UUID;
  organization_id: UUID;
  project_id: UUID;
  external_reviewer_id: UUID;
  /** SHA-256 of the opaque token; the raw token is only shown once at creation. */
  token_hash: string;
  allowed_part_ids: UUID[];
  allowed_dfm_ids: UUID[];
  permissions: AccessPermission[];
  expires_at: Timestamp | null;
  revoked: boolean;
  revoked_at: Timestamp | null;
  revoked_by: UUID | null;
  last_opened_at: Timestamp | null;
  created_by: UUID | null;
  created_at: Timestamp;
}

export interface AuditEvent {
  id: UUID;
  organization_id: UUID;
  project_id: UUID | null;
  access_token_id: UUID | null;
  actor_profile_id: UUID | null;
  actor_reviewer_id: UUID | null;
  action: AuditAction;
  target_type: string | null;
  target_id: UUID | null;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Timestamp;
}
