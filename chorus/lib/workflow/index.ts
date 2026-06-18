/**
 * Chorus workflow logic — the state machines that make a DFM a workflow rather
 * than a slide deck. Pure functions, no I/O. The SQL triggers in
 * db/migrations/0003 + 0005 mirror the issue-status and package-gate rules here
 * so the invariants hold at both the app and data layers.
 */
import type {
  Issue,
  IssueStatus,
  PackageItem,
  Part,
  PartRevision,
  ProjectState,
  Signoff,
  SignoffState,
  ValidationState,
} from '@/types';
import type { PackageSummary } from '@/types/view';

// --- Issue state machine ------------------------------------------------------
//
// Open -> Dispositioned -> Implemented -> Validated -> Closed
//   ├─ Dispositioned(rejected) -> Closed         (rationale required)
//   ├─ Needs clarification -> Open               (loop)
//   └─ Implemented + Validation failed -> Open   (reopen)

export function deriveIssueStatus(issue: Pick<
  Issue,
  'brand_decision' | 'implementation_state' | 'implemented_in_revision_id' | 'validation_state'
>): IssueStatus {
  if (issue.validation_state === 'validated') return 'closed';
  if (issue.brand_decision === 'rejected') return 'closed';
  if (issue.validation_state === 'validation_failed') return 'open'; // reopen for rework
  if (issue.implemented_in_revision_id && issue.implementation_state === 'implemented') {
    return 'implemented';
  }
  if (issue.brand_decision != null) return 'dispositioned';
  return 'open';
}

/** Is this issue dispositioned (a decision has been recorded)? */
export function isDispositioned(issue: Pick<Issue, 'brand_decision'>): boolean {
  return issue.brand_decision != null;
}

/** Open == not dispositioned and not closed — needs a brand decision or fix. */
export function isOpen(issue: Pick<Issue, 'status'>): boolean {
  return issue.status === 'open';
}

export function isAwaitingValidation(issue: Pick<Issue, 'status' | 'validation_state'>): boolean {
  return issue.status === 'implemented' && issue.validation_state === 'pending';
}

/**
 * Validation compares the revision an issue was CREATED ON against the revision
 * its fix was IMPLEMENTED IN. A pass closes the issue; a fail reopens it.
 */
export function applyValidation(
  issue: Pick<Issue, 'created_on_revision_id' | 'implemented_in_revision_id'>,
  result: 'validated' | 'validation_failed',
): { validation_state: ValidationState; reopened: boolean } {
  const reopened = result === 'validation_failed';
  return { validation_state: result, reopened };
}

/** Human description of the revision lineage a validation spans. */
export function validationSpan(
  issue: Pick<Issue, 'created_on_revision_id' | 'implemented_in_revision_id'>,
  revisions: PartRevision[],
): { from: string | null; to: string | null } {
  const label = (id: string | null) =>
    id ? (revisions.find((r) => r.id === id)?.rev_label ?? null) : null;
  return { from: label(issue.created_on_revision_id), to: label(issue.implemented_in_revision_id) };
}

// --- Package gate -------------------------------------------------------------

export function summarizePackage(items: PackageItem[]): PackageSummary {
  const required = items.filter((i) => i.required);
  const requiredComplete = required.filter((i) => i.complete).length;
  return {
    state: required.length > 0 && requiredComplete === required.length ? 'complete' : 'incomplete',
    required_total: required.length,
    required_complete: requiredComplete,
    items,
  };
}

/**
 * The hard gate: external reviewers cannot be invited until the package is
 * Complete. Used by the invite server action and surfaced in the UI.
 */
export function canInviteReviewers(items: PackageItem[]): boolean {
  return summarizePackage(items).state === 'complete';
}

// --- DFM approval gate (terminal — cleared to cut steel) ----------------------

export interface ApprovalCriterion {
  key: string;
  label: string;
  met: boolean;
  detail?: string;
}

export interface ApprovalReadiness {
  ready: boolean;
  criteria: ApprovalCriterion[];
}

/**
 * Entry criteria for DFM Approval:
 *   1. Every issue is dispositioned (no open issues awaiting a decision).
 *   2. Every required sign-off is Signed.
 *   3. An approved revision is selected/frozen.
 */
export function dfmApprovalReadiness(input: {
  issues: Pick<Issue, 'status'>[];
  signoffs: Pick<Signoff, 'state'>[];
  frozenRevision: PartRevision | null;
}): ApprovalReadiness {
  // Any issue still 'open' blocks the gate — whether it is awaiting a brand
  // decision OR was reopened by a failed validation (a fix that did not hold).
  // A reopened issue keeps its prior brand_decision, so filtering on a null
  // decision alone would let an unresolved failed fix slip through to steel.
  const openIssues = input.issues.filter((i) => i.status === 'open');
  const allDispositioned = openIssues.length === 0;

  const unsignedSignoffs = input.signoffs.filter((s) => s.state !== 'signed');
  const allSigned = input.signoffs.length === 0 || unsignedSignoffs.length === 0;

  const revisionFrozen = input.frozenRevision != null;

  const criteria: ApprovalCriterion[] = [
    {
      key: 'issues_dispositioned',
      label: 'All open issues dispositioned',
      met: allDispositioned,
      detail: allDispositioned
        ? undefined
        : `${openIssues.length} issue${openIssues.length === 1 ? '' : 's'} need a decision or fix`,
    },
    {
      key: 'signoffs_signed',
      label: 'All required sign-offs signed',
      met: allSigned,
      detail: allSigned
        ? undefined
        : `${unsignedSignoffs.length} sign-off${unsignedSignoffs.length === 1 ? '' : 's'} not yet signed`,
    },
    {
      key: 'revision_frozen',
      label: 'Approved revision selected & frozen',
      met: revisionFrozen,
      detail: revisionFrozen ? `Rev ${input.frozenRevision?.rev_label}` : 'Select a revision to freeze',
    },
  ];

  return { ready: criteria.every((c) => c.met), criteria };
}

// --- Part-state derivation ----------------------------------------------------

/**
 * Derive the part lifecycle state from the surrounding facts. Mirrors the
 * intent of the package-gate trigger plus DFM activity and approval.
 */
export function derivePartState(input: {
  part: Pick<Part, 'package_state'>;
  hasDfms: boolean;
  approved: boolean;
  anyAwaitingValidation: boolean;
}): Part['part_state'] {
  if (input.approved) return 'dfm_approved';
  if (input.part.package_state !== 'complete') return 'draft';
  if (!input.hasDfms) return 'package_complete';
  if (input.anyAwaitingValidation) return 'awaiting_validation';
  return 'dfm_active';
}

/**
 * Derive the program-level state shown on the project hub from its parts.
 *   - dfm_approved: every part is approved (and there is at least one part)
 *   - dfm_active:   at least one part is in (or past) DFM review
 *   - setup:        otherwise (parts still in draft / package prep)
 */
export function deriveProjectState(parts: Pick<Part, 'part_state'>[]): ProjectState {
  if (parts.length === 0) return 'setup';
  if (parts.every((p) => p.part_state === 'dfm_approved')) return 'dfm_approved';
  const active = parts.some((p) =>
    p.part_state === 'dfm_active' ||
    p.part_state === 'awaiting_validation' ||
    p.part_state === 'dfm_approved',
  );
  return active ? 'dfm_active' : 'setup';
}

// --- Allowed transitions (for UI affordances / validation) --------------------

export const ISSUE_STATUS_FLOW: Record<IssueStatus, IssueStatus[]> = {
  open: ['dispositioned', 'closed'],
  dispositioned: ['implemented', 'open'], // open = needs-clarification loop
  implemented: ['validated', 'open'], // open = validation failed -> reopen
  validated: ['closed'],
  closed: [],
};

export const SIGNOFF_FLOW: Record<SignoffState, readonly SignoffState[]> = {
  proposed: ['aligned'],
  aligned: ['signed', 'proposed'],
  signed: [],
};

/**
 * Whether a sign-off may legally move `from -> to`. Sign-offs are first-class
 * joint agreements, so the brand cannot jump straight from Proposed to Signed —
 * a reviewer must align first. Enforced by the advance mutation, mirrored in UI.
 */
export function canAdvanceSignoff(from: SignoffState, to: SignoffState): boolean {
  return SIGNOFF_FLOW[from].includes(to);
}

export const DFM_FLOW = {
  invited: ['in_review'],
  in_review: ['feedback_submitted'],
  feedback_submitted: ['awaiting_validation', 'in_review'],
  awaiting_validation: ['complete', 'in_review'],
  complete: [],
} as const;
