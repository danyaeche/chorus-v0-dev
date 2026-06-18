/**
 * Demo seed — the worked TM-4 Bike Program example (ALSO as the brand, Hsinchu
 * Precision + Shenzhen Optics reviewing in parallel). This is the canonical data
 * the app renders in demo mode (no Supabase configured). It exercises every
 * confidentiality and workflow invariant:
 *
 *  - Two providers on the same part at DIFFERENT revisions (Hsinchu on Rev C,
 *    Shenzhen on Rev B).
 *  - A cross-provider issue group with a conflict flag (brand-side only).
 *  - The package gate (battery enclosure complete; top tube incomplete).
 *  - Sign-offs as joint agreements; a part not yet cleared to cut steel.
 *
 * All IDs are readable constants; all timestamps are fixed ISO strings so the
 * UI is deterministic.
 */
import type {
  AccessToken,
  ActivityEvent,
  Comment,
  Dfm,
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
    description: 'Frame + drivetrain DFM for the TM-4 platform.', status: 'active',
    brand_owner_id: PROFILE_MATHIEU, supply_chain_owner_id: PROFILE_THOMAS,
    start_date: '2026-02-01', target_completion: '2026-09-30',
    created_by: PROFILE_MATHIEU, created_at: t('2026-02-01T00:00:00Z'), updated_at: t('2026-06-16T00:00:00Z'),
  },
  {
    id: PROJECT_CARGO, organization_id: ORG_ID, name: 'Cargo eBike',
    description: 'Cargo platform — enclosure + lighting DFM.', status: 'active',
    brand_owner_id: PROFILE_MATHIEU, supply_chain_owner_id: PROFILE_THOMAS,
    start_date: '2026-03-15', target_completion: '2026-11-30',
    created_by: PROFILE_MATHIEU, created_at: t('2026-03-15T00:00:00Z'), updated_at: t('2026-06-10T00:00:00Z'),
  },
];

// --- Reviewers (providers) ----------------------------------------------------
export const REVIEWER_HSINCHU = 'rev-hsinchu';
export const REVIEWER_SHENZHEN = 'rev-shenzhen';

const externalReviewers: ExternalReviewer[] = [
  {
    id: REVIEWER_HSINCHU, organization_id: ORG_ID, project_id: PROJECT_TM4,
    company: 'Hsinchu Precision', contact_name: 'Benjamin Chen',
    contact_email: 'benjamin.chen@hsinchu-precision.com', provider_role: 'cm',
    nda_status: 'signed', confidentiality: 'nda_required',
    watermark_policy: 'recipient_email_diagonal', created_by: PROFILE_MATHIEU,
    created_at: t('2026-05-07T00:00:00Z'), updated_at: t('2026-05-07T00:00:00Z'),
  },
  {
    id: REVIEWER_SHENZHEN, organization_id: ORG_ID, project_id: PROJECT_TM4,
    company: 'Shenzhen Optics', contact_name: 'Wei Liu',
    contact_email: 'wei.liu@shenzhen-optics.com', provider_role: 'supplier',
    nda_status: 'signed', confidentiality: 'standard',
    watermark_policy: null, created_by: PROFILE_MATHIEU,
    created_at: t('2026-05-09T00:00:00Z'), updated_at: t('2026-05-09T00:00:00Z'),
  },
];

// --- Parts --------------------------------------------------------------------
export const PART_BATTERY = 'part-battery-lower';
export const PART_TOPTUBE = 'part-top-tube';
export const PART_BEZEL = 'part-display-bezel';
export const PART_CARGO_HOUSING = 'part-cargo-housing';

const parts: Part[] = [
  {
    id: PART_BATTERY, organization_id: ORG_ID, project_id: PROJECT_TM4, library_ref: 'LIB-2001',
    part_number: 'TM-4-2001', name: 'Battery enclosure — lower',
    description: 'Lower battery enclosure housing for the TM-4 down-tube pack — Class-A visible upper.',
    material: 'PC-ABS (UL94 V-0)', finish: 'Bead blast · matte', process: 'injection_molded',
    target_volume: 50000, target_cost: 3.4, owner_id: PROFILE_MATHIEU,
    part_state: 'dfm_active', package_state: 'complete',
    current_revision_id: 'rev-batt-c', created_by: PROFILE_MATHIEU,
    created_at: t('2026-04-22T00:00:00Z'), updated_at: t('2026-06-17T00:00:00Z'),
  },
  {
    id: PART_TOPTUBE, organization_id: ORG_ID, project_id: PROJECT_TM4, library_ref: 'LIB-1001',
    part_number: 'TM-4-1001', name: 'Top tube assembly',
    description: 'Welded top-tube + head-tube subassembly for the TM-4 frameset.',
    material: '6061-T6 Aluminum', finish: 'Bead blast · clear anodize', process: 'cnc',
    target_volume: 5000, target_cost: 4.2, owner_id: PROFILE_MATHIEU,
    part_state: 'draft', package_state: 'incomplete',
    current_revision_id: 'rev-tt-a', created_by: PROFILE_MATHIEU,
    created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-06-12T00:00:00Z'),
  },
  {
    id: PART_BEZEL, organization_id: ORG_ID, project_id: PROJECT_TM4, library_ref: null,
    part_number: 'TM-4-2003', name: 'Display bezel',
    description: 'Top-mounted display bezel — gloss Class-A.',
    material: 'PC (clear)', finish: 'Gloss · clear', process: 'injection_molded',
    target_volume: 50000, target_cost: 1.1, owner_id: PROFILE_ELENA,
    part_state: 'package_complete', package_state: 'complete',
    current_revision_id: 'rev-bz-a', created_by: PROFILE_ELENA,
    created_at: t('2026-05-12T00:00:00Z'), updated_at: t('2026-06-09T00:00:00Z'),
  },
  {
    id: PART_CARGO_HOUSING, organization_id: ORG_ID, project_id: PROJECT_CARGO, library_ref: null,
    part_number: 'CG-1001', name: 'Mainframe enclosure',
    description: 'Cargo mainframe enclosure housing.',
    material: 'PC-ABS', finish: 'Matte', process: 'injection_molded',
    target_volume: 12000, target_cost: 5.6, owner_id: PROFILE_MATHIEU,
    part_state: 'dfm_approved', package_state: 'complete',
    current_revision_id: 'rev-cargo-c', created_by: PROFILE_MATHIEU,
    created_at: t('2026-04-10T00:00:00Z'), updated_at: t('2026-06-01T00:00:00Z'),
  },
];

// --- Revisions ----------------------------------------------------------------
const partRevisions: PartRevision[] = [
  { id: 'rev-batt-a', part_id: PART_BATTERY, rev_label: 'A', rev_index: 0, change_summary: 'Initial package — CAD/STEP, 2D drawing, material spec, volume forecast. Sent to Hsinchu.', quote_amount: 4.12, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-07T15:00:00Z') },
  { id: 'rev-batt-b', part_id: PART_BATTERY, rev_label: 'B', rev_index: 1, change_summary: 'Reworked the parting line and relocated the gate; added ejector-pin relief on non-cosmetic faces.', quote_amount: 3.95, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-12T18:30:00Z') },
  { id: 'rev-batt-c', part_id: PART_BATTERY, rev_label: 'C', rev_index: 2, change_summary: 'Draft opened to 1.5° on the textured Class-A face. Candidate fix for the draft/ejection issue.', quote_amount: 3.8, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-16T09:42:00Z') },
  { id: 'rev-tt-a', part_id: PART_TOPTUBE, rev_label: 'A', rev_index: 0, change_summary: 'Initial CAD + 2D drawing.', quote_amount: null, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-02T12:00:00Z') },
  { id: 'rev-bz-a', part_id: PART_BEZEL, rev_label: 'A', rev_index: 0, change_summary: 'Initial package.', quote_amount: null, uploaded_by: PROFILE_ELENA, created_at: t('2026-05-12T12:00:00Z') },
  { id: 'rev-cargo-a', part_id: PART_CARGO_HOUSING, rev_label: 'A', rev_index: 0, change_summary: 'Initial package.', quote_amount: 6.1, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-04-10T12:00:00Z') },
  { id: 'rev-cargo-b', part_id: PART_CARGO_HOUSING, rev_label: 'B', rev_index: 1, change_summary: 'Wall thickness + boss rework.', quote_amount: 5.8, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-05T12:00:00Z') },
  { id: 'rev-cargo-c', part_id: PART_CARGO_HOUSING, rev_label: 'C', rev_index: 2, change_summary: 'Final — approved & frozen.', quote_amount: 5.6, uploaded_by: PROFILE_MATHIEU, created_at: t('2026-05-28T12:00:00Z') },
];

// --- Package items ------------------------------------------------------------
const battPkg = (key: string, label: string, complete: boolean): PackageItem => ({
  id: `pkg-batt-${key}`, part_id: PART_BATTERY, key, label, required: true, complete,
  file_id: null, notes: null, completed_by: complete ? PROFILE_MATHIEU : null,
  completed_at: complete ? t('2026-05-07T00:00:00Z') : null,
  created_at: t('2026-04-22T00:00:00Z'), updated_at: t('2026-05-07T00:00:00Z'),
});

const packageItems: PackageItem[] = [
  battPkg('cad_step', '3D CAD / STEP', true),
  battPkg('drawing_2d_gdt', '2D Drawing with GD&T callouts', true),
  battPkg('material_spec', 'Material Spec / Approved Shortlist', true),
  battPkg('cosmetic_grades', 'Cosmetic Surface Grades', true),
  battPkg('volume_forecast', 'Volume Forecast + Initial Order Qty', true),
  battPkg('packaging_labeling', 'Packaging & Labeling Requirements', true),
  battPkg('regulatory', 'Regulatory Requirements', true),
  // Top tube — 3 of 5 complete (gate open: reviewers cannot be invited).
  { id: 'pkg-tt-cad', part_id: PART_TOPTUBE, key: 'cad_step', label: '3D CAD / STEP', required: true, complete: true, file_id: null, notes: null, completed_by: PROFILE_MATHIEU, completed_at: t('2026-05-02T00:00:00Z'), created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-02T00:00:00Z') },
  { id: 'pkg-tt-2d', part_id: PART_TOPTUBE, key: 'drawing_2d_gdt', label: '2D Drawing with GD&T callouts', required: true, complete: true, file_id: null, notes: null, completed_by: PROFILE_MATHIEU, completed_at: t('2026-05-03T00:00:00Z'), created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-03T00:00:00Z') },
  { id: 'pkg-tt-mat', part_id: PART_TOPTUBE, key: 'material_spec', label: 'Material Spec / Approved Shortlist', required: true, complete: true, file_id: null, notes: null, completed_by: PROFILE_MATHIEU, completed_at: t('2026-05-03T00:00:00Z'), created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-03T00:00:00Z') },
  { id: 'pkg-tt-vol', part_id: PART_TOPTUBE, key: 'volume_forecast', label: 'Volume Forecast + Initial Order Qty', required: true, complete: false, file_id: null, notes: null, completed_by: null, completed_at: null, created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-02T00:00:00Z') },
  { id: 'pkg-tt-reg', part_id: PART_TOPTUBE, key: 'regulatory', label: 'Regulatory Requirements', required: false, complete: false, file_id: null, notes: null, completed_by: null, completed_at: null, created_at: t('2026-05-02T00:00:00Z'), updated_at: t('2026-05-02T00:00:00Z') },
];

// --- DFMs (per-provider, independent revision pointers) -----------------------
export const DFM_HSINCHU = 'dfm-hsinchu';
export const DFM_SHENZHEN = 'dfm-shenzhen';

const dfms: Dfm[] = [
  {
    id: DFM_HSINCHU, organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY,
    external_reviewer_id: REVIEWER_HSINCHU, provider_role: 'cm', state: 'awaiting_validation',
    current_revision_id: 'rev-batt-c', confidential: true,            // Hsinchu reviewing Rev C
    invited_at: t('2026-05-07T16:00:00Z'), created_at: t('2026-05-07T16:00:00Z'), updated_at: t('2026-06-17T00:00:00Z'),
  },
  {
    id: DFM_SHENZHEN, organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY,
    external_reviewer_id: REVIEWER_SHENZHEN, provider_role: 'supplier', state: 'in_review',
    current_revision_id: 'rev-batt-b', confidential: true,            // Shenzhen still on Rev B
    invited_at: t('2026-05-09T10:00:00Z'), created_at: t('2026-05-09T10:00:00Z'), updated_at: t('2026-06-15T00:00:00Z'),
  },
];

// --- Issues (status derived) --------------------------------------------------
function mkIssue(p: Omit<Issue, 'status' | 'organization_id' | 'project_id' | 'part_id'> & {
  organization_id?: string; project_id?: string; part_id?: string;
}): Issue {
  const base = {
    organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, ...p,
  } as Omit<Issue, 'status'>;
  return { ...base, status: deriveIssueStatus(base) };
}

const issues: Issue[] = [
  mkIssue({
    id: 'iss-12', dfm_id: DFM_HSINCHU, number: 12, title: 'Insufficient draft for ejection',
    description: 'The side walls carry only 0.5° draft on the textured (MT-11010) Class-A face. The part won\'t release cleanly from the cavity — expect drag marks and sink across the Class-A surface.',
    type: 'show_stopper', category: 'geometry', severity: 'critical',
    created_on_revision_id: 'rev-batt-a', created_by_reviewer_id: REVIEWER_HSINCHU, created_by_profile_id: null,
    recommendation: 'Open the draft to 1.5° on all textured faces; 3° preferred on the deep ribs to clear the Class-A face.',
    cost_impact: null, yield_impact: 'Reduces scrap on ejection',
    brand_decision: 'accepted', rejection_rationale: null, decided_by: PROFILE_MATHIEU, decided_at: t('2026-05-13T00:00:00Z'),
    implementation_state: 'implemented', implemented_in_revision_id: 'rev-batt-c',
    validation_state: 'pending', validated_by_reviewer_id: null, validated_at: null, closed_at: null,
    created_at: t('2026-05-08T14:00:00Z'), updated_at: t('2026-05-16T00:00:00Z'),
  }),
  mkIssue({
    id: 'iss-13', dfm_id: DFM_HSINCHU, number: 13, title: 'Boss wall thickness too thin',
    description: 'Mounting boss walls at 1.0mm against a 2.4mm nominal will sink on the Class-A face above. Recommend coring out.',
    type: 'finding', category: 'geometry', severity: 'medium',
    created_on_revision_id: 'rev-batt-c', created_by_reviewer_id: REVIEWER_HSINCHU, created_by_profile_id: null,
    recommendation: 'Core out the boss and hold a 1.5mm nominal wall; add a gusset for stiffness.',
    cost_impact: null, yield_impact: null,
    brand_decision: null, rejection_rationale: null, decided_by: null, decided_at: null,
    implementation_state: 'not_started', implemented_in_revision_id: null,
    validation_state: 'pending', validated_by_reviewer_id: null, validated_at: null, closed_at: null,
    created_at: t('2026-05-17T11:00:00Z'), updated_at: t('2026-05-17T11:00:00Z'),
  }),
  mkIssue({
    id: 'iss-14', dfm_id: DFM_SHENZHEN, number: 14, title: 'Gate location drags on Class-A',
    description: 'The current gate witness lands on the visible top face. Recommend relocating to the rib underside to keep the witness off the cosmetic surface.',
    type: 'finding', category: 'process', severity: 'medium',
    created_on_revision_id: 'rev-batt-b', created_by_reviewer_id: REVIEWER_SHENZHEN, created_by_profile_id: null,
    recommendation: 'Relocate the gate to the underside rib, opposite the draft change.',
    cost_impact: null, yield_impact: null,
    brand_decision: null, rejection_rationale: null, decided_by: null, decided_at: null,
    implementation_state: 'not_started', implemented_in_revision_id: null,
    validation_state: 'pending', validated_by_reviewer_id: null, validated_at: null, closed_at: null,
    created_at: t('2026-06-02T09:00:00Z'), updated_at: t('2026-06-02T09:00:00Z'),
  }),
  // A closed issue (validated) to show the full lifecycle.
  mkIssue({
    id: 'iss-7', dfm_id: DFM_HSINCHU, number: 7, title: 'Weld access at gusset',
    description: 'Robot torch cannot reach the gusset weld at the current geometry.',
    type: 'finding', category: 'process', severity: 'medium',
    created_on_revision_id: 'rev-batt-a', created_by_reviewer_id: REVIEWER_HSINCHU, created_by_profile_id: null,
    recommendation: 'Add a 6mm relief at the gusset root.',
    cost_impact: null, yield_impact: null,
    brand_decision: 'accepted', rejection_rationale: null, decided_by: PROFILE_MATHIEU, decided_at: t('2026-05-10T00:00:00Z'),
    implementation_state: 'implemented', implemented_in_revision_id: 'rev-batt-b',
    validation_state: 'validated', validated_by_reviewer_id: REVIEWER_HSINCHU, validated_at: t('2026-05-14T00:00:00Z'), closed_at: t('2026-05-14T00:00:00Z'),
    created_at: t('2026-05-08T10:00:00Z'), updated_at: t('2026-05-14T00:00:00Z'),
  }),
];

// --- Issue group (brand-only, conflict) ---------------------------------------
const issueGroups: IssueGroup[] = [
  {
    id: 'grp-1', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY,
    title: 'Class-A ejection / gate strategy',
    description: 'Hsinchu wants more draft (#12); Shenzhen wants the gate relocated (#14). These interact on the same Class-A face — the brand must reconcile a single geometry both providers can run.',
    conflict_flag: true, brand_decision: null, decision_rationale: null,
    created_by: PROFILE_MATHIEU, created_at: t('2026-06-03T00:00:00Z'), updated_at: t('2026-06-03T00:00:00Z'),
  },
];

const issueGroupLinks: IssueGroupLink[] = [
  { id: 'gl-1', issue_group_id: 'grp-1', issue_id: 'iss-12', created_at: t('2026-06-03T00:00:00Z') },
  { id: 'gl-2', issue_group_id: 'grp-1', issue_id: 'iss-14', created_at: t('2026-06-03T00:00:00Z') },
];

// --- Sign-offs ----------------------------------------------------------------
const signoffs: Signoff[] = [
  { id: 'so-1', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, topic: 'parting_line', custom_topic: null, title: 'Parting line on the mid-flange', state: 'signed', rationale: 'Run the parting line on the mid-flange to keep witness off the Class-A face. Agreed with Hsinchu May 20.', proposed_by: PROFILE_MATHIEU, created_at: t('2026-05-18T00:00:00Z'), updated_at: t('2026-05-20T00:00:00Z') },
  { id: 'so-2', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, topic: 'material_lock', custom_topic: null, title: 'Material lock — PC-ABS UL94 V-0', state: 'aligned', rationale: 'Both providers aligned on PC-ABS V-0; awaiting written sign-off.', proposed_by: PROFILE_MATHIEU, created_at: t('2026-05-22T00:00:00Z'), updated_at: t('2026-06-08T00:00:00Z') },
  { id: 'so-3', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, topic: 'gate_location', custom_topic: null, title: 'Gate location', state: 'proposed', rationale: null, proposed_by: PROFILE_MATHIEU, created_at: t('2026-06-03T00:00:00Z'), updated_at: t('2026-06-03T00:00:00Z') },
];

const signoffParties: SignoffParty[] = [
  { id: 'sp-1', signoff_id: 'so-1', party_type: 'brand', profile_id: PROFILE_MATHIEU, external_reviewer_id: null, agreed: true, agreed_at: t('2026-05-20T00:00:00Z') },
  { id: 'sp-2', signoff_id: 'so-1', party_type: 'reviewer', profile_id: null, external_reviewer_id: REVIEWER_HSINCHU, agreed: true, agreed_at: t('2026-05-20T00:00:00Z') },
  { id: 'sp-3', signoff_id: 'so-2', party_type: 'brand', profile_id: PROFILE_MATHIEU, external_reviewer_id: null, agreed: true, agreed_at: t('2026-06-08T00:00:00Z') },
  { id: 'sp-4', signoff_id: 'so-2', party_type: 'reviewer', profile_id: null, external_reviewer_id: REVIEWER_HSINCHU, agreed: true, agreed_at: t('2026-06-08T00:00:00Z') },
  { id: 'sp-5', signoff_id: 'so-2', party_type: 'reviewer', profile_id: null, external_reviewer_id: REVIEWER_SHENZHEN, agreed: false, agreed_at: null },
];

// --- Files (some confidential to a single DFM) --------------------------------
const files: FileObject[] = [
  { id: 'file-batt-step-c', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, revision_id: 'rev-batt-c', dfm_id: null, issue_id: null, package_item_id: null, kind: 'cad_step', storage_bucket: 'chorus-files', storage_path: `${ORG_ID}/${PROJECT_TM4}/${PART_BATTERY}/rev-batt-c/enclosure-lower-revC.step`, file_name: 'enclosure-lower_RevC.step', mime_type: 'application/step', size_bytes: 4_210_330, watermarked: true, uploaded_by: PROFILE_MATHIEU, uploaded_by_reviewer_id: null, created_at: t('2026-05-16T09:42:00Z') },
  { id: 'file-batt-2d-c', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, revision_id: 'rev-batt-c', dfm_id: null, issue_id: null, package_item_id: null, kind: 'drawing_2d', storage_bucket: 'chorus-files', storage_path: `${ORG_ID}/${PROJECT_TM4}/${PART_BATTERY}/rev-batt-c/TM-4-2001_RevC.pdf`, file_name: 'TM-4-2001_RevC.pdf', mime_type: 'application/pdf', size_bytes: 880_120, watermarked: true, uploaded_by: PROFILE_MATHIEU, uploaded_by_reviewer_id: null, created_at: t('2026-05-16T09:42:00Z') },
  // Confidential Hsinchu quote — only Hsinchu's DFM may see it.
  { id: 'file-hsinchu-quote', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, revision_id: 'rev-batt-c', dfm_id: DFM_HSINCHU, issue_id: null, package_item_id: null, kind: 'quote_pdf', storage_bucket: 'chorus-files', storage_path: `${ORG_ID}/${PROJECT_TM4}/${PART_BATTERY}/dfm-hsinchu/hsinchu-quote-revC.pdf`, file_name: 'Hsinchu_Quote_RevC.pdf', mime_type: 'application/pdf', size_bytes: 120_400, watermarked: true, uploaded_by_reviewer_id: REVIEWER_HSINCHU, uploaded_by: null, created_at: t('2026-05-17T00:00:00Z') },
  // Issue screenshot for #12.
  { id: 'file-iss12-shot', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, revision_id: null, dfm_id: DFM_HSINCHU, issue_id: 'iss-12', package_item_id: null, kind: 'issue_screenshot', storage_bucket: 'chorus-files', storage_path: `${ORG_ID}/${PROJECT_TM4}/${PART_BATTERY}/iss-12/draft-callout.png`, file_name: 'draft-callout.png', mime_type: 'image/png', size_bytes: 240_990, watermarked: false, uploaded_by_reviewer_id: REVIEWER_HSINCHU, uploaded_by: null, created_at: t('2026-05-08T14:05:00Z') },
];

// --- Comments -----------------------------------------------------------------
const comments: Comment[] = [
  { id: 'cm-1', organization_id: ORG_ID, issue_id: 'iss-12', dfm_id: DFM_HSINCHU, signoff_id: null, body: 'The 1.0mm wall at the dropout is too thin — it\'ll likely cause sink and yield issues at the weld. This is a manufacturability risk on the current geometry.', author_reviewer_id: REVIEWER_HSINCHU, author_profile_id: null, created_at: t('2026-05-08T14:10:00Z'), updated_at: t('2026-05-08T14:10:00Z') },
  { id: 'cm-2', organization_id: ORG_ID, issue_id: 'iss-12', dfm_id: DFM_HSINCHU, signoff_id: null, body: 'Accepted — we\'ll open the draft to 1.5° on the textured face. Fix will land in the next revision.', author_profile_id: PROFILE_MATHIEU, author_reviewer_id: null, created_at: t('2026-05-13T10:00:00Z'), updated_at: t('2026-05-13T10:00:00Z') },
  { id: 'cm-3', organization_id: ORG_ID, issue_id: 'iss-12', dfm_id: DFM_HSINCHU, signoff_id: null, body: 'Uploaded Rev C as the candidate fix — draft opened to 1.5° on the side walls. Requesting validation.', author_profile_id: PROFILE_MATHIEU, author_reviewer_id: null, created_at: t('2026-05-16T09:45:00Z'), updated_at: t('2026-05-16T09:45:00Z') },
];

// --- Activity -----------------------------------------------------------------
const activityEvents: ActivityEvent[] = [
  { id: 'act-1', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, dfm_id: null, issue_id: 'iss-14', actor_profile_id: null, actor_reviewer_id: REVIEWER_SHENZHEN, type: 'issue_opened', summary: 'Wei Liu opened issue #14 — Gate location drags on Class-A', metadata: null, created_at: t('2026-06-02T09:00:00Z') },
  { id: 'act-2', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, dfm_id: null, issue_id: 'iss-12', actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'revision_uploaded', summary: 'Mathieu Kury uploaded Rev C — candidate fix for #12', metadata: null, created_at: t('2026-05-16T09:42:00Z') },
  { id: 'act-3', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, dfm_id: null, issue_id: 'iss-12', actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'decision_recorded', summary: 'Mathieu Kury accepted #12 — Insufficient draft for ejection', metadata: null, created_at: t('2026-05-13T10:00:00Z') },
  { id: 'act-4', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, dfm_id: null, issue_id: 'iss-7', actor_profile_id: null, actor_reviewer_id: REVIEWER_HSINCHU, type: 'issue_closed', summary: 'Benjamin Chen validated #7 → closed', metadata: null, created_at: t('2026-05-14T00:00:00Z') },
  { id: 'act-5', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, dfm_id: null, issue_id: null, actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'signoff_recorded', summary: 'Parting line sign-off signed with Hsinchu', metadata: null, created_at: t('2026-05-20T00:00:00Z') },
  { id: 'act-6', organization_id: ORG_ID, project_id: PROJECT_CARGO, part_id: PART_CARGO_HOUSING, dfm_id: null, issue_id: null, actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'dfm_approved', summary: 'Cargo eBike · Mainframe enclosure reached DFM Approval — cleared to cut steel', metadata: null, created_at: t('2026-06-01T00:00:00Z') },
  { id: 'act-7', organization_id: ORG_ID, project_id: PROJECT_TM4, part_id: PART_BATTERY, dfm_id: null, issue_id: null, actor_profile_id: PROFILE_MATHIEU, actor_reviewer_id: null, type: 'reviewer_invited', summary: 'Invited Hsinchu Precision to review for DFM', metadata: null, created_at: t('2026-05-07T16:00:00Z') },
];

// --- Access tokens (magic links) ----------------------------------------------
import { hashToken } from '@/lib/auth/tokens';

/** Stable demo token so the supplier portal is reachable at a known URL. */
export const DEMO_HSINCHU_TOKEN = 'demo-hsinchu-token';

const accessTokens: AccessToken[] = [
  {
    id: 'tok-hsinchu', organization_id: ORG_ID, project_id: PROJECT_TM4,
    external_reviewer_id: REVIEWER_HSINCHU, token_hash: hashToken(DEMO_HSINCHU_TOKEN),
    allowed_part_ids: [PART_BATTERY], allowed_dfm_ids: [DFM_HSINCHU],
    permissions: ['view_files', 'download', 'comment', 'create_issues', 'validate_fixes'],
    expires_at: t('2026-07-01T00:00:00Z'), revoked: false, revoked_at: null, revoked_by: null,
    last_opened_at: t('2026-06-17T12:00:00Z'), created_by: PROFILE_MATHIEU, created_at: t('2026-05-07T16:00:00Z'),
  },
  {
    id: 'tok-shenzhen', organization_id: ORG_ID, project_id: PROJECT_TM4,
    external_reviewer_id: REVIEWER_SHENZHEN, token_hash: hashToken('demo-shenzhen-token'),
    allowed_part_ids: [PART_BATTERY], allowed_dfm_ids: [DFM_SHENZHEN],
    permissions: ['view_files', 'comment', 'create_issues'],
    expires_at: t('2026-07-01T00:00:00Z'), revoked: false, revoked_at: null, revoked_by: null,
    last_opened_at: t('2026-06-15T08:00:00Z'), created_by: PROFILE_MATHIEU, created_at: t('2026-05-09T10:00:00Z'),
  },
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
  files: FileObject[];
  comments: Comment[];
  activityEvents: ActivityEvent[];
  accessTokens: AccessToken[];
}

export function buildSeed(): SeedData {
  return {
    organizations, profiles, memberships, projects, parts, partRevisions, packageItems,
    externalReviewers, dfms, issues, issueGroups, issueGroupLinks, signoffs, signoffParties,
    files, comments, activityEvents, accessTokens,
  };
}

/** The brand viewer used in demo mode (Mathieu Kury, owner of ALSO). */
export function demoBrandViewer(): BrandViewer {
  return {
    kind: 'brand', profileId: PROFILE_MATHIEU, email: 'mkury@also.com',
    fullName: 'Mathieu Kury', organizationId: ORG_ID, role: 'owner',
  };
}
