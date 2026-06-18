/**
 * End-to-end repository tests against the in-memory demo store.
 *
 * These drive the canonical DFM flow through the real mutation functions —
 * package gate → invite → issue → disposition → implement → validate → sign-off
 * → approval — and assert the hardening guards (foreign-revision scoping, the
 * reopen→re-implement→re-validate loop, sign-off transition rules, duplicate-DFM
 * prevention, package-gate monotonicity, and provider isolation).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceSignoff,
  approveDfm,
  createIssueByReviewer,
  dispositionIssue,
  getDfm,
  getIssue,
  getPart,
  getPartDetail,
  inviteReviewer,
  listDfmsForPart,
  listIssues,
  markPortalOpened,
  resolveReviewerToken,
  setIssueImplementation,
  setPackageItemComplete,
  validateIssue,
} from '@/lib/db';
import { resetStore } from '@/lib/db/store';
import {
  demoBrandViewer,
  DFM_CARGO,
  PART_BATTERY,
  PART_CARGO_HOUSING,
  REV_BATTERY_B,
} from '@/lib/db/seed';
import type { ReviewerViewer } from '@/lib/permissions/types';

const CARGO_REV = 'rev-cargo-c'; // a revision that belongs to a DIFFERENT part
const REVIEWER_EMAIL = 'grace@orbit-precision.com';

const brand = () => demoBrandViewer();
const nowIso = () => new Date().toISOString();

/** Tick the one outstanding required package item so the gate opens. */
function completePackage() {
  const detail = getPartDetail(brand(), PART_BATTERY)!;
  const item = detail.package.items.find((i) => i.required && !i.complete)!;
  const ok = setPackageItemComplete(brand(), item.id, true);
  expect(ok).toBe(true);
  return item.id;
}

/** Complete the package and invite a reviewer; return the scoped reviewer viewer. */
function invite(): { reviewer: ReviewerViewer; dfmId: string } {
  // The package gate must be Complete before a reviewer can be invited.
  if (getPartDetail(brand(), PART_BATTERY)!.package.state !== 'complete') completePackage();
  const result = inviteReviewer(brand(), {
    part_id: PART_BATTERY,
    company: 'Orbit Precision',
    contact_name: 'Grace Lin',
    contact_email: REVIEWER_EMAIL,
    provider_role: 'cm',
    nda_status: 'signed',
    confidentiality: 'standard',
    permissions: ['view_files', 'comment', 'create_issues', 'validate_fixes'],
    expiry_days: 30,
  });
  expect(result).not.toBeNull();
  const reviewer = resolveReviewerToken(result!.raw_token, nowIso())!;
  expect(reviewer).not.toBeNull();
  markPortalOpened(reviewer);
  return { reviewer, dfmId: result!.dfm_id };
}

/** Raise an issue and accept it — the common starting point for fix tests. */
function raiseAndAccept(reviewer: ReviewerViewer, dfmId: string): string {
  const issueId = createIssueByReviewer(reviewer, {
    dfm_id: dfmId,
    title: 'Draft angle too shallow on Class-A faces',
    description: 'Textured Class-A faces at 0.5° will drag on ejection.',
    type: 'finding',
    category: 'tooling',
    severity: 'medium',
  })!;
  expect(issueId).not.toBeNull();
  expect(dispositionIssue(brand(), issueId, 'accepted')).toBe(true);
  return issueId;
}

beforeEach(() => resetStore());

// --- happy path ---------------------------------------------------------------

describe('full DFM lifecycle', () => {
  it('drives package → invite → issue → accept → implement → validate → sign-off → approval', () => {
    const { reviewer, dfmId } = invite();
    const issueId = raiseAndAccept(reviewer, dfmId);

    expect(setIssueImplementation(brand(), issueId, { state: 'implemented', revision_id: REV_BATTERY_B })).toBe(true);
    expect(getIssue(brand(), issueId)!.status).toBe('implemented');

    expect(validateIssue(reviewer, issueId, 'validated')).toBe(true);
    expect(getIssue(brand(), issueId)!.status).toBe('closed');

    // Sign-off must walk Proposed → Aligned → Signed.
    expect(advanceSignoff(brand(), 'so-batt-gate', 'aligned')).toBe(true);
    expect(advanceSignoff(brand(), 'so-batt-gate', 'signed')).toBe(true);

    expect(approveDfm(brand(), PART_BATTERY, { approved_revision_id: REV_BATTERY_B })).toBe(true);
    expect(getPart(brand(), PART_BATTERY)!.part_state).toBe('dfm_approved');
  });
});

// --- the reopen loop (headline bug) -------------------------------------------

describe('reopen → re-implement → re-validate loop', () => {
  it('lets a failed validation be re-implemented and validated again', () => {
    const { reviewer, dfmId } = invite();
    const issueId = raiseAndAccept(reviewer, dfmId);

    setIssueImplementation(brand(), issueId, { state: 'implemented', revision_id: REV_BATTERY_B });
    expect(validateIssue(reviewer, issueId, 'validation_failed')).toBe(true);
    expect(getIssue(brand(), issueId)!.status).toBe('open'); // reopened

    // Re-implementing the fix must reset validation back to pending so the issue
    // returns to 'implemented' (the bug: it used to stay stuck 'open' forever).
    expect(setIssueImplementation(brand(), issueId, { state: 'implemented', revision_id: REV_BATTERY_B })).toBe(true);
    const reimplemented = getIssue(brand(), issueId)!;
    expect(reimplemented.status).toBe('implemented');
    expect(reimplemented.validation_state).toBe('pending');

    expect(validateIssue(reviewer, issueId, 'validated')).toBe(true);
    expect(getIssue(brand(), issueId)!.status).toBe('closed');
  });

  it('blocks DFM approval while an issue is reopened by a failed validation', () => {
    const { reviewer, dfmId } = invite();
    const issueId = raiseAndAccept(reviewer, dfmId);
    setIssueImplementation(brand(), issueId, { state: 'implemented', revision_id: REV_BATTERY_B });
    validateIssue(reviewer, issueId, 'validation_failed');

    advanceSignoff(brand(), 'so-batt-gate', 'aligned');
    advanceSignoff(brand(), 'so-batt-gate', 'signed');
    // Issue is open (reopened) → not cleared to cut steel.
    expect(approveDfm(brand(), PART_BATTERY, { approved_revision_id: REV_BATTERY_B })).toBe(false);
  });
});

// --- guards -------------------------------------------------------------------

describe('foreign-revision guards', () => {
  it('refuses to link a fix to a revision from another part', () => {
    const { reviewer, dfmId } = invite();
    const issueId = raiseAndAccept(reviewer, dfmId);
    expect(setIssueImplementation(brand(), issueId, { state: 'implemented', revision_id: CARGO_REV })).toBe(false);
    expect(getIssue(brand(), issueId)!.status).toBe('dispositioned'); // unchanged
  });

  it('refuses to freeze approval on another part’s revision', () => {
    const { reviewer, dfmId } = invite();
    const issueId = raiseAndAccept(reviewer, dfmId);
    setIssueImplementation(brand(), issueId, { state: 'implemented', revision_id: REV_BATTERY_B });
    validateIssue(reviewer, issueId, 'validated');
    advanceSignoff(brand(), 'so-batt-gate', 'aligned');
    advanceSignoff(brand(), 'so-batt-gate', 'signed');

    expect(approveDfm(brand(), PART_BATTERY, { approved_revision_id: CARGO_REV })).toBe(false);
    expect(approveDfm(brand(), PART_BATTERY, { approved_revision_id: REV_BATTERY_B })).toBe(true);
  });
});

describe('implementation requires an accepted, open issue', () => {
  it('refuses to implement an issue that was never accepted', () => {
    const { reviewer, dfmId } = invite();
    const issueId = createIssueByReviewer(reviewer, {
      dfm_id: dfmId, title: 'Sink risk on bosses', description: 'thin walls',
      type: 'finding', category: 'geometry', severity: 'low',
    })!;
    expect(setIssueImplementation(brand(), issueId, { state: 'implemented', revision_id: REV_BATTERY_B })).toBe(false);
  });
});

describe('sign-off transition rules', () => {
  it('refuses to jump straight from proposed to signed', () => {
    expect(advanceSignoff(brand(), 'so-batt-gate', 'signed')).toBe(false);
    expect(advanceSignoff(brand(), 'so-batt-gate', 'aligned')).toBe(true);
  });
});

describe('duplicate DFM prevention', () => {
  it('reuses the existing DFM when the same reviewer is re-invited to a part', () => {
    invite();
    expect(listDfmsForPart(brand(), PART_BATTERY)).toHaveLength(1);
    // Re-invite the same reviewer (same email) to the same part.
    invite();
    expect(listDfmsForPart(brand(), PART_BATTERY)).toHaveLength(1);
  });
});

describe('package-gate monotonicity', () => {
  it('refuses to un-complete a required package item once a reviewer is invited', () => {
    const itemId = completePackage();
    inviteReviewer(brand(), {
      part_id: PART_BATTERY, company: 'Orbit Precision', contact_name: 'Grace Lin',
      contact_email: REVIEWER_EMAIL, provider_role: 'cm', nda_status: 'signed',
      confidentiality: 'standard', permissions: ['create_issues'], expiry_days: 30,
    });
    expect(setPackageItemComplete(brand(), itemId, false)).toBe(false);
    expect(getPartDetail(brand(), PART_BATTERY)!.package.state).toBe('complete');
  });
});

// --- provider isolation -------------------------------------------------------

describe('provider isolation', () => {
  it('scopes a reviewer to their own part/DFM and hides others', () => {
    const { reviewer, dfmId } = invite();
    raiseAndAccept(reviewer, dfmId);

    // Cannot see another part or another provider's DFM.
    expect(getPart(reviewer, PART_CARGO_HOUSING)).toBeNull();
    expect(getDfm(reviewer, DFM_CARGO)).toBeNull();

    // Only sees issues on their own DFM.
    const visible = listIssues(reviewer);
    expect(visible.every((i) => i.dfm_id === dfmId)).toBe(true);
  });
});
