/**
 * Demo seed — the worked TM-4 Bike Program example (ALSO as the brand).
 *
 * This seed is shaped so the canonical DFM flow can be driven end-to-end from a
 * clean starting point:
 *
 *   Project → Part → complete package → invite reviewer → supplier opens magic
 *   link → supplier raises an issue → brand dispositions → brand links the fix to
 *   a later revision → supplier validates → sign-off signed → DFM approved.
 *
 * The hero part (Battery enclosure — lower) starts at that clean point:
 *   - package is 6 of 7 (one item left to tick — the gate is still closed),
 *   - Hsinchu Precision is in the reviewer address book but NOT yet invited to a
 *     DFM (no DFM, no magic link, no issues yet),
 *   - two revisions are staged (Rev A under review, Rev B as the candidate fix),
 *   - one proposed "Gate location" sign-off awaits alignment.
 *
 * A second project (Cargo eBike · Mainframe enclosure) is seeded fully approved —
 * "cleared to cut steel" — so the finished state and audit trail are visible
 * without driving the whole flow.
 *
 * All IDs are readable constants and all timestamps are fixed ISO strings so the
 * UI is deterministic.
 */
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
  IssueGroupLink,
  Membership,
  Organization,
  Part,
  PartRevision,
  PackageItem,
  Profile,
  Project,
  Signoff,
  SignoffParty,
} from '@/types';
import { deriveIssueStatus } from '@/lib/workflow';
import { hashToken } from '@/lib/auth/tokens';
import type { BrandViewer } from '@/lib/permissions/types';

const t = (iso: string) => iso;

// --- Org / people -------------------------------------------------------------
export const ORG_ID = 'org-also';
export const PROFILE_MATHIEU = 'prof-mathieu';
export const PROFILE_THOMAS = 'prof-thomas';
export const PROFILE_ELENA = 'prof-elena';

const organizations: Organization[] = [
  { id: ORG_ID, name: 'ALSO', slug: 'also', created_at: t('2026-01-04T00:00:00Z'), updated_at: t('2026-01-04T00:00:00Z') },
];

const profiles: Profile[] = [
  { id: PROFILE_MATHIEU, email: 'mkury@also.com', full_name: 'Mathieu Kury', avatar_url: null, created_at: t('2026-01-04T00:00:00Z'), updated_at: t('2026-01-04T00:00:00Z') },
  { id: PROFILE_THOMAS, email: 'tsallaud@also.com', full_name: 'Thomas Sallaud', avatar_url: null, created_at: t('2026-01-04T00:00:00Z'), updated_at: t('2026-01-04T00:00:00Z') },
  { id: PROFILE_ELENA, email: 'erossi@also.com', full_name: 'Elena Rossi', avatar_url: null, created_at: t('2026-01-04T00:00:00Z'), updated_at: t('2026-01-04T00:00:00Z') },
];

const memberships: Membership[] = [
  { id: 'mem-1', organization_id: ORG_ID, profile_id: PROFILE_MATHIEU, role: 'owner', created_at: t('2026-01-04T00:00:00Z') },
  { id: 'mem-2', organization_id: ORG_ID, profile_id: PROFILE_THOMAS, role: 'admin', created_at: t('2026-01-04T00:00:00Z') },
  { id: 'mem-3', organization_id: ORG_ID, profile_id: PROFILE_ELENA, role: 'member', created_at: t('2026-01-04T00:00:00Z') },
];

// --- Projects -----------------------------------------------------------------
export const PROJECT_TM4 = 'proj-tm4';
export const PROJECT_CARGO = 'proj-cargo';

const projects: Project[] = [
  {
    id: PROJECT_TM4, organization_id: ORG_ID, name: 'TM-4 Bike Program',
    description: 'Frame + enclosure DFM for the TM-4 platform.', status: 'active',
    brand_owner_id: PROFILE_MATHIEU, supply_chain_owner_id: PROFILE_THOMAS,
    start_date: '2026-02-01', target_completion: '2026-09-30',
    created_by: PROFILE_MATHIEU, created_at: t('2026-02-01T00:00:00Z'), updated_at: t('2026-06-16T00:00:00Z'),
  },
  {
    id: PROJECT_CARGO, organization_id: ORG_ID, name: 'Cargo eBike',
    description: 'Cargo platform — enclosure + lighting DFM.', status: 'active',
    brand_owner_id: PROFILE_MATHIEU, supply_chain_owner_id: PROFILE_THOMAS,
    start_date: '2026-03-15', target_completion: '2026-11-30',
    created_by: PROFILE_MATHIEU, created_at: t('2026-03-15T00:00:00Z'), updated_at: t('2026-06-01T00:00:00Z'),
  },
];

// --- Reviewers (the org's external-provider address book) ---------------------
export const REVIEWER_HSINCHU = 'rev-hsinchu';
export const REVIEWER_DONGGUAN = 'rev-dongguan';

const externalReviewers: ExternalReviewer[] = [
  {
    id: REVIEWER_HSINCHU, organization_id: ORG_ID, project_id: PROJECT_TM4,
    company: 'Hsinchu Precision', contact_name: 'Benjamin Chen',
    contact_email: 'benjamin.chen@hsinchu-precision.com', provider_role: 'cm',
    nda_status: 'signed', confidentiality: 'nda_required',
    watermark_policy: 'recipient_email_diagonal', created_by: PROFILE_MATHIEU,
    created_at: t('2026-05-04T00:00:00Z'), updated_at: t('2026-05-04T00:00:00Z'),
  },
  {
    id: REVIEWER_DONGGUAN, organization_id: ORG_ID, project_id: PROJECT_CARGO,
    company: 'Dongguan Molding', contact_name: 'Grace Wong',
    contact_email: 'grace.wong@dongguan-molding.com', provider_role: 'cm',
    nda_status: 'signed', confidentiality: 'standard',
    watermark_policy: null, created_by: PROFILE_MATHIEU,
    created_at: t('2026-04-05T00:00:00Z'), updated_at: t('2026-04-05T00:00:00Z'),
  },
];

// --- Parts --------------------------------------------------------------------
export const PART_BATTERY = 'part-battery-lower';
export const PART_TOPTUBE = 'part-top-tube';
export const PART_CARGO_HOUSING = 'part-cargo-housing';

export const REV_BATTERY_A = 'rev-batt-a';
export const REV_BATTERY_B = 'rev-batt-b';

const parts: Part[] = [
  {
    id: PART_BATTERY, organization_id: ORG_ID, project_id: PROJECT_TM4, library_ref: 'LIB-2001',
    part_number: 'TM-4-2001', name: 'Battery enclosure — lower',
    description: 'Lower battery enclosure housing for the TM-4 down-tube pack — Class-A visible upper.',
    material: 'PC-ABS (UL94 V-0)', finish: 'Bead blast · matte', process: 'injection_molded',
    target_volume: 50000, target_cost: 3.4, owner_id: PROFILE_MATHIEU,
    // Hero part: package one item short of complete, no DFM yet — ready to be driven.
    part_state: 'draft', package_state: 'incomplete',
    current_revision_id: REV_BATTERY_A, created_by: PROFILE_MATHIEU,
    created_at: t('2026-04-22T00:00:00Z'), updated_at: t('2026-06-16T00:00:00Z'),
  },
  {
    id: PART_TOPTUBE, organization_id: ORG_ID, project_id: PROJECT_TM4, library_ref: 'LIB-1001',
    part_number: 'TM-4-1001', name: 'Top tube assembly',
    description: 'Machined top-tube + head-tube subassembly for the TM-4 frameset.',
    material: '6061-T6 Aluminum', finish: 'Bead blast · clear anodize', process: 'cnc',
    target_volume: 5000, target_cost: 4.2, owner_id: PROFILE_THOMAS,
    part_state: 'draft', package_state: 'incomplete',
    current_revision_id: 'rev-tt-a', created_by: PROFILE_THOMAS,
    created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-06-12T00:00:00Z'),
  },
  {
    id: PART_CARGO_HOUSING, organization_id: ORG_ID, project_id: PROJECT_CARGO, library_ref: null,
    part_number: 'CG-1001', name: 'Mainframe enclosure',
    description: 'Cargo mainframe enclosure housing — fully dispositioned and frozen.',
    material: 'PC-ABS', finish: 'Matte', process: 'injection_molded',
    target_volume: 12000, target_cost: 5.6, owner_id: PROFILE_MATHIEU,
    part_state: 'dfm_approved', package_state: 'complete',
    current_revision_id: 'rev-cargo-c', created_by: PROFILE_MATHIEU,
    created_at: t('2026-04-05T00:00:00Z'), updated_at: t('2026-06-01T00:00:00Z'),
  },
];

// --- Revisions ----------------------------------------------------------------
const partRevisions: PartRevision[] = [
  { id: REV_BATTERY_A, part_id: PART_BATTERY, rev_label: 'A', rev_index: 0, change_summary: 'Initial uploaded design — CAD/STEP, 2D drawing with GD&T, material spec, volume forecast. This is the revision sent out for DFM review.', quote_amount: 4.12, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-04T15:00:00Z') },
  { id: REV_BATTERY_B, part_id: PART_BATTERY, rev_label: 'B', rev_index: 1, change_summary: 'Updated design — draft opened to 1.5° on the textured Class-A faces and ejector-pin relief added on non-cosmetic faces. Candidate to carry DFM fixes.', quote_amount: 3.8, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-14T18:30:00Z') },
  { id: 'rev-tt-a', part_id: PART_TOPTUBE, rev_label: 'A', rev_index: 0, change_summary: 'Initial CAD + 2D drawing.', quote_amount: null, uploaded_by: PROFILE_THOMAS, created_at: t('2026-05-02T12:00:00Z') },
  { id: 'rev-cargo-a', part_id: PART_CARGO_HOUSING, rev_label: 'A', rev_index: 0, change_summary: 'Initial package.', quote_amount: 6.1, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-04-05T12:00:00Z') },
  { id: 'rev-cargo-b', part_id: PART_CARGO_HOUSING, rev_label: 'B', rev_index: 1, change_summary: 'Wall thickness + boss rework after DFM feedback.', quote_amount: 5.8, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-05T12:00:00Z') },
  { id: 'rev-cargo-c', part_id: PART_CARGO_HOUSING, rev_label: 'C', rev_index: 2, change_summary: 'Final — approved & frozen.', quote_amount: 5.6, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-28T12:00:00Z') },
];

// --- Package items ------------------------------------------------------------
// Battery — injection-molded checklist, 6 of 7 done (regulatory still open).
const battPkg = (key: string, label: string, complete: boolean): PackageItem => ({
  id: `pkg-batt-${key}`, part_id: PART_BATTERY, key, label, required: true, complete,
  file_id: null, notes: null, completed_by: complete ? PROFILE_MATHIEU : null,
  completed_at: complete ? t('2026-05-04T00:00:00Z') : null,
  created_at: t('2026-04-22T00:00:00Z'), updated_at: t('2026-05-04T00:00:00Z'),
});

const cargoPkg = (key: string, label: string): PackageItem => ({
  id: `pkg-cargo-${key}`, part_id: PART_CARGO_HOUSING, key, label, required: true, complete: true,
  file_id: null, notes: null, completed_by: PROFILE_MATHIEU, completed_at: t('2026-04-08T00:00:00Z'),
  created_at: t('2026-04-05T00:00:00Z'), updated_at: t('2026-04-08T00:00:00Z'),
});

const packageItems: PackageItem[] = [
  // Battery — one required item (Regulatory) left to tick before the gate opens.
  battPkg('cad_step', '3D CAD / STEP', true),
  battPkg('drawing_2d_gdt', '2D Drawing with GD&T callouts', true),
  battPkg('material_spec', 'Material Spec / Approved Shortlist', true),
  battPkg('cosmetic_grades', 'Cosmetic Surface Grades', true),
  battPkg('volume_forecast', 'Volume Forecast + Initial Order Qty', true),
  battPkg('packaging_labeling', 'Packaging & Labeling Requirements', true),
  battPkg('regulatory', 'Regulatory Requirements', false),
  // Top tube — 3 of 4 required complete (gate closed: reviewers cannot be invited).
  { id: 'pkg-tt-cad', part_id: PART_TOPTUBE, key: 'cad_step', label: '3D CAD / STEP', required: true, complete: true, file_id: null, notes: null, completed_by: PROFILE_THOMAS, completed_at: t('2026-05-02T00:00:00Z'), created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-02T00:00:00Z') },
  { id: 'pkg-tt-2d', part_id: PART_TOPTUBE, key: 'drawing_2d_gdt', label: '2D Drawing with GD&T callouts', required: true, complete: true, file_id: null, notes: null, completed_by: PROFILE_THOMAS, completed_at: t('2026-05-03T00:00:00Z'), created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-03T00:00:00Z') },
  { id: 'pkg-tt-mat', part_id: PART_TOPTUBE, key: 'material_spec', label: 'Material Spec / Approved Shortlist', required: true, complete: true, file_id: null, notes: null, completed_by: PROFILE_THOMAS, completed_at: t('2026-05-03T00:00:00Z'), created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-03T00:00:00Z') },
  { id: 'pkg-tt-vol', part_id: PART_TOPTUBE, key: 'volume_forecast', label: 'Volume Forecast + Initial Order Qty', required: true, complete: false, file_id: null, notes: null, completed_by: null, completed_at: null, created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-02T00:00:00Z') },
  { id: 'pkg-tt-reg', part_id: PART_TOPTUBE, key: 'regulatory', label: 'Regulatory Requirements', required: false, complete: false, file_id: null, notes: null, completed_by: null, completed_at: null, created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-02T00:00:00Z') },
  // Cargo — fully complete.
  cargoPkg('cad_step', '3D CAD / STEP'),
  cargoPkg('drawing_2d_gdt', '2D Drawing with GD&T callouts'),
  cargoPkg('material_spec', 'Material Spec / Approved Shortlist'),
  cargoPkg('cosmetic_grades', 'Cosmetic Surface Grades'),
  cargoPkg('volume_forecast', 'Volume Forecast + Initial Order Qty'),
  cargoPkg('packaging_labeling', 'Packaging & Labeling Requirements'),
  cargoPkg('regulatory', 'Regulatory Requirements'),
];

// --- DFMs ---------------------------------------------------------------------
// Battery has NO DFM yet — it is created when the brand invites Hsinchu.
export const DFM_CARGO = 'dfm-cargo';

const dfms: Dfm[] = [
  {
    id: DFM_CARGO, organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING,
    external_reviewer_id: REVIEWER_DONGGUAN, provider_role: 'cm', state: 'complete',
    current_revision_id: 'rev-cargo-c', confidential: true,
    invited_at: t('2026-04-08T16:00:00Z'), created_at: t('2026-04-08T16:00:00Z'), updated_at: t('2026-05-28T00:00:00Z'),
  },
];

// --- Issues -------------------------------------------------------------------
function mkIssue(p: Omit<Issue, 'status'>): Issue {
  return { ...p, status: deriveIssueStatus(p) };
}

const issues: Issue[] = [
  // Cargo showcase — a fully closed issue demonstrating the whole lifecycle.
  mkIssue({
    id: 'iss-cargo-1', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING,
    dfm_id: DFM_CARGO, number: 1, title: 'Boss wall thickness too thin',
    description: 'Mounting boss walls at 1.0mm against a 2.4mm nominal will sink on the Class-A face above. Recommend coring out.',
    type: 'finding', category: 'geometry', severity: 'medium',
    created_on_revision_id: 'rev-cargo-a', created_by_reviewer_id: REVIEWER_DONGGUAN, created_by_profile_id: null,
    recommendation: 'Core out the boss and hold a 1.5mm nominal wall; add a gusset for stiffness.',
    cost_impact: null, yield_impact: 'Reduces sink/scrap on the Class-A face',
    brand_decision: 'accepted', rejection_rationale: null, decided_by: PROFILE_MATHIEU, decided_at: t('2026-04-30T00:00:00Z'),
    implementation_state: 'implemented', implemented_in_revision_id: 'rev-cargo-b',
    validation_state: 'validated', validated_by_reviewer_id: REVIEWER_DONGGUAN, validated_at: t('2026-05-08T00:00:00Z'), closed_at: t('2026-05-08T00:00:00Z'),
    created_at: t('2026-04-20T14:00:00Z'), updated_at: t('2026-05-08T00:00:00Z'),
  }),
];

// --- Issue groups (brand-only, cross-provider rollups) ------------------------
// None in the single-provider vertical slice.
const issueGroups: IssueGroup[] = [];
const issueGroupLinks: IssueGroupLink[] = [];

// --- Sign-offs ----------------------------------------------------------------
const signoffs: Signoff[] = [
  // Battery — the demo joint agreement, proposed and awaiting alignment/sign.
  { id: 'so-batt-gate', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, topic: 'gate_location', custom_topic: null, title: 'Gate location', state: 'proposed', rationale: null, proposed_by: PROFILE_MATHIEU, created_at: t('2026-05-04T00:00:00Z'), updated_at: t('2026-05-04T00:00:00Z') },
  // Cargo — a signed agreement (part is approved).
  { id: 'so-cargo-gate', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, topic: 'gate_location', custom_topic: null, title: 'Gate location', state: 'signed', rationale: 'Gate relocated to the rib underside, agreed with Dongguan May 24.', proposed_by: PROFILE_MATHIEU, created_at: t('2026-05-10T00:00:00Z'), updated_at: t('2026-05-24T00:00:00Z') },
];

const signoffParties: SignoffParty[] = [
  { id: 'sp-batt-1', signoff_id: 'so-batt-gate', party_type: 'brand', profile_id: PROFILE_MATHIEU, external_reviewer_id: null, agreed: true, agreed_at: t('2026-05-04T00:00:00Z') },
  { id: 'sp-batt-2', signoff_id: 'so-batt-gate', party_type: 'reviewer', profile_id: null, external_reviewer_id: REVIEWER_HSINCHU, agreed: false, agreed_at: null },
  { id: 'sp-cargo-1', signoff_id: 'so-cargo-gate', party_type: 'brand', profile_id: PROFILE_MATHIEU, external_reviewer_id: null, agreed: true, agreed_at: t('2026-05-24T00:00:00Z') },
  { id: 'sp-cargo-2', signoff_id: 'so-cargo-gate', party_type: 'reviewer', profile_id: null, external_reviewer_id: REVIEWER_DONGGUAN, agreed: true, agreed_at: t('2026-05-24T00:00:00Z') },
];

// --- DFM approvals ------------------------------------------------------------
const dfmApprovals: DfmApproval[] = [
  {
    id: 'appr-cargo', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING,
    approved_by: PROFILE_MATHIEU, approved_at: t('2026-06-01T00:00:00Z'), approved_revision_id: 'rev-cargo-c',
    po_reference: 'PO-CARGO-2026-014', tooling_reference: 'TOOL-CG-1001',
    notes: 'Cleared to cut steel.', created_at: t('2026-06-01T00:00:00Z'),
  },
];

// --- Files --------------------------------------------------------------------
const files: FileObject[] = [
  // Battery Rev A — the package under review. Visible to an invited, NDA-cleared reviewer.
  { id: 'file-batt-step-a', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, revision_id: REV_BATTERY_A, dfm_id: null, issue_id: null, package_item_id: null, kind: 'cad_step', storage_bucket: 'chorus-files', storage_path: `${ORG_ID}/${PROJECT_TM4}/${PART_BATTERY}/rev-batt-a/enclosure-lower-revA.step`, file_name: 'enclosure-lower_RevA.step', mime_type: 'application/step', size_bytes: 4_120_330, watermarked: true, uploaded_by: PROFILE_MATHIEU, uploaded_by_reviewer_id: null, created_at: t('2026-05-04T15:00:00Z') },
  { id: 'file-batt-2d-a', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, revision_id: REV_BATTERY_A, dfm_id: null, issue_id: null, package_item_id: null, kind: 'drawing_2d', storage_bucket: 'chorus-files', storage_path: `${ORG_ID}/${PROJECT_TM4}/${PART_BATTERY}/rev-batt-a/TM-4-2001_RevA.pdf`, file_name: 'TM-4-2001_RevA.pdf', mime_type: 'application/pdf', size_bytes: 860_120, watermarked: true, uploaded_by: PROFILE_MATHIEU, uploaded_by_reviewer_id: null, created_at: t('2026-05-04T15:00:00Z') },
  // Battery Rev B — the candidate fix revision.
  { id: 'file-batt-step-b', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, revision_id: REV_BATTERY_B, dfm_id: null, issue_id: null, package_item_id: null, kind: 'cad_step', storage_bucket: 'chorus-files', storage_path: `${ORG_ID}/${PROJECT_TM4}/${PART_BATTERY}/rev-batt-b/enclosure-lower-revB.step`, file_name: 'enclosure-lower_RevB.step', mime_type: 'application/step', size_bytes: 4_180_990, watermarked: true, uploaded_by: PROFILE_MATHIEU, uploaded_by_reviewer_id: null, created_at: t('2026-05-14T18:30:00Z') },
  // Cargo final.
  { id: 'file-cargo-step-c', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, revision_id: 'rev-cargo-c', dfm_id: null, issue_id: null, package_item_id: null, kind: 'cad_step', storage_bucket: 'chorus-files', storage_path: `${ORG_ID}/${PROJECT_CARGO}/${PART_CARGO_HOUSING}/rev-cargo-c/mainframe-revC.step`, file_name: 'mainframe_RevC.step', mime_type: 'application/step', size_bytes: 5_010_000, watermarked: false, uploaded_by: PROFILE_MATHIEU, uploaded_by_reviewer_id: null, created_at: t('2026-05-28T12:00:00Z') },
];

// --- Comments -----------------------------------------------------------------
const comments: Comment[] = [
  { id: 'cm-cargo-1', organization_id: ORG_ID, issue_id: 'iss-cargo-1', dfm_id: DFM_CARGO, signoff_id: null, body: 'Boss walls are too thin against the nominal — expect sink on the Class-A face. Recommend coring out.', author_reviewer_id: REVIEWER_DONGGUAN, author_profile_id: null, created_at: t('2026-04-20T14:05:00Z'), updated_at: t('2026-04-20T14:05:00Z') },
  { id: 'cm-cargo-2', organization_id: ORG_ID, issue_id: 'iss-cargo-1', dfm_id: DFM_CARGO, signoff_id: null, body: 'Accepted — cored out and held 1.5mm in Rev B. Please validate.', author_profile_id: PROFILE_MATHIEU, author_reviewer_id: null, created_at: t('2026-05-05T10:00:00Z'), updated_at: t('2026-05-05T10:00:00Z') },
];

// --- Activity -----------------------------------------------------------------
const activityEvents: ActivityEvent[] = [
  // Battery history (pre-flow).
  { id: 'act-b1', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, dfm_id: null, issue_id: null, actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'part_added', summary: 'Battery enclosure — lower added to the program', metadata: null, created_at: t('2026-04-22T00:00:00Z') },
  { id: 'act-b2', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, dfm_id: null, issue_id: null, actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'revision_uploaded', summary: 'Mathieu Kury uploaded Rev A — initial design package', metadata: null, created_at: t('2026-05-04T15:00:00Z') },
  { id: 'act-b3', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, dfm_id: null, issue_id: null, actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'revision_uploaded', summary: 'Mathieu Kury uploaded Rev B — candidate fix revision', metadata: null, created_at: t('2026-05-14T18:30:00Z') },
  { id: 'act-tt1', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_TOPTUBE, dfm_id: null, issue_id: null, actor_profile_id: PROFILE_THOMAS, actor_reviewer_id: null, type: 'part_added', summary: 'Top tube assembly added to the program', metadata: null, created_at: t('2026-05-02T00:00:00Z') },
  // Cargo history (full lifecycle).
  { id: 'act-c1', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, dfm_id: DFM_CARGO, issue_id: null, actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'reviewer_invited', summary: 'Invited Dongguan Molding to review for DFM', metadata: null, created_at: t('2026-04-08T16:00:00Z') },
  { id: 'act-c2', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, dfm_id: DFM_CARGO, issue_id: 'iss-cargo-1', actor_profile_id: null, actor_reviewer_id: REVIEWER_DONGGUAN, type: 'issue_opened', summary: 'Grace Wong opened issue #1 — Boss wall thickness too thin', metadata: null, created_at: t('2026-04-20T14:00:00Z') },
  { id: 'act-c3', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, dfm_id: DFM_CARGO, issue_id: 'iss-cargo-1', actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'decision_recorded', summary: 'Mathieu Kury accepted #1 — Boss wall thickness too thin', metadata: null, created_at: t('2026-04-30T00:00:00Z') },
  { id: 'act-c4', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, dfm_id: DFM_CARGO, issue_id: 'iss-cargo-1', actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'validation_requested', summary: 'Fix landed in Rev B — validation requested on #1', metadata: null, created_at: t('2026-05-05T10:00:00Z') },
  { id: 'act-c5', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, dfm_id: DFM_CARGO, issue_id: 'iss-cargo-1', actor_profile_id: null, actor_reviewer_id: REVIEWER_DONGGUAN, type: 'issue_closed', summary: 'Grace Wong validated #1 (Rev A → Rev B) → closed', metadata: null, created_at: t('2026-05-08T00:00:00Z') },
  { id: 'act-c6', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, dfm_id: null, issue_id: null, actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'signoff_recorded', summary: 'Gate location sign-off signed with Dongguan', metadata: null, created_at: t('2026-05-24T00:00:00Z') },
  { id: 'act-c7', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, dfm_id: null, issue_id: null, actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'dfm_approved', summary: 'Mainframe enclosure reached DFM Approval — cleared to cut steel', metadata: null, created_at: t('2026-06-01T00:00:00Z') },
];

// --- Access tokens (magic links) ----------------------------------------------
/** Stable demo token for the Cargo showcase portal (already-completed review). */
export const DEMO_DONGGUAN_TOKEN = 'demo-dongguan-token';

const accessTokens: AccessToken[] = [
  {
    id: 'tok-dongguan', organization_id: ORG_ID, project_id: PROJECT_CARGO,
    external_reviewer_id: REVIEWER_DONGGUAN, token_hash: hashToken(DEMO_DONGGUAN_TOKEN),
    allowed_part_ids: [PART_CARGO_HOUSING], allowed_dfm_ids: [DFM_CARGO],
    permissions: ['view_files', 'download', 'comment', 'create_issues', 'validate_fixes'],
    expires_at: t('2026-07-15T00:00:00Z'), revoked: false, revoked_at: null, revoked_by: null,
    last_opened_at: t('2026-05-08T08:00:00Z'), created_by: PROFILE_MATHIEU, created_at: t('2026-04-08T16:00:00Z'),
  },
];

// --- Audit events (reviewer-facing access log) --------------------------------
const auditEvents: AuditEvent[] = [
  { id: 'aud-c1', organization_id: ORG_ID, project_id: PROJECT_CARGO, access_token_id: 'tok-dongguan', actor_profile_id: null, actor_reviewer_id: REVIEWER_DONGGUAN, action: 'magic_link_opened', target_type: null, target_id: null, ip: null, user_agent: null, metadata: null, created_at: t('2026-04-08T17:00:00Z') },
  { id: 'aud-c2', organization_id: ORG_ID, project_id: PROJECT_CARGO, access_token_id: 'tok-dongguan', actor_profile_id: null, actor_reviewer_id: REVIEWER_DONGGUAN, action: 'issue_raised', target_type: 'issue', target_id: 'iss-cargo-1', ip: null, user_agent: null, metadata: null, created_at: t('2026-04-20T14:00:00Z') },
  { id: 'aud-c3', organization_id: ORG_ID, project_id: PROJECT_CARGO, access_token_id: 'tok-dongguan', actor_profile_id: null, actor_reviewer_id: REVIEWER_DONGGUAN, action: 'validation_submitted', target_type: 'issue', target_id: 'iss-cargo-1', ip: null, user_agent: null, metadata: null, created_at: t('2026-05-08T00:00:00Z') },
];

// --- Assembled seed -----------------------------------------------------------
export interface SeedData {
  organizations: Organization[];
  profiles: Profile[];
  memberships: Membership[];
  projects: Project[];
  parts: Part[];
  partRevisions: PartRevision[];
  packageItems: PackageItem[];
  externalReviewers: ExternalReviewer[];
  dfms: Dfm[];
  issues: Issue[];
  issueGroups: IssueGroup[];
  issueGroupLinks: IssueGroupLink[];
  signoffs: Signoff[];
  signoffParties: SignoffParty[];
  dfmApprovals: DfmApproval[];
  files: FileObject[];
  comments: Comment[];
  activityEvents: ActivityEvent[];
  accessTokens: AccessToken[];
  auditEvents: AuditEvent[];
}

export function buildSeed(): SeedData {
  // Deep-clone the literals so each fresh store starts from a pristine copy and
  // mutations (created issues, invites, etc.) never bleed across resets.
  return structuredClone({
    organizations, profiles, memberships, projects, parts, partRevisions, packageItems,
    externalReviewers, dfms, issues, issueGroups, issueGroupLinks, signoffs, signoffParties,
    dfmApprovals, files, comments, activityEvents, accessTokens, auditEvents,
  });
}

/** The brand viewer used in demo mode (Mathieu Kury, owner of ALSO). */
export function demoBrandViewer(): BrandViewer {
  return {
    kind: 'brand', profileId: PROFILE_MATHIEU, email: 'mkury@also.com',
    fullName: 'Mathieu Kury', organizationId: ORG_ID, role: 'owner',
  };
}
