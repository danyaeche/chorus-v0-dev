/**
 * Unit tests for the workflow state machines (pure functions, no I/O).
 * These are the invariants that make a DFM a workflow rather than a slide deck.
 */
import { describe, expect, it } from 'vitest';
import {
  canAdvanceSignoff,
  deriveIssueStatus,
  derivePartState,
  deriveProjectState,
  dfmApprovalReadiness,
  summarizePackage,
} from '@/lib/workflow';
import type { Issue, PackageItem, PartRevision } from '@/types';

// --- helpers ------------------------------------------------------------------

type IssueFacts = Pick<
  Issue,
  'brand_decision' | 'implementation_state' | 'implemented_in_revision_id' | 'validation_state'
>;

function facts(over: Partial<IssueFacts> = {}): IssueFacts {
  return {
    brand_decision: null,
    implementation_state: 'not_started',
    implemented_in_revision_id: null,
    validation_state: 'pending',
    ...over,
  };
}

function pkgItem(over: Partial<PackageItem> = {}): PackageItem {
  return {
    id: 'pkg', part_id: 'part', key: 'k', label: 'L', required: true, complete: false,
    file_id: null, notes: null, completed_by: null, completed_at: null,
    created_at: '', updated_at: '', ...over,
  };
}

const REV_B: PartRevision = {
  id: 'rev-b', part_id: 'part', rev_label: 'B', rev_index: 1,
  change_summary: null, quote_amount: null, uploaded_by: null, created_at: '',
};

// --- deriveIssueStatus --------------------------------------------------------

describe('deriveIssueStatus', () => {
  it('starts open with no decision', () => {
    expect(deriveIssueStatus(facts())).toBe('open');
  });

  it('moves to dispositioned once a (non-terminal) decision is recorded', () => {
    expect(deriveIssueStatus(facts({ brand_decision: 'accepted' }))).toBe('dispositioned');
    expect(deriveIssueStatus(facts({ brand_decision: 'needs_clarification' }))).toBe('dispositioned');
  });

  it('closes immediately on rejection', () => {
    expect(deriveIssueStatus(facts({ brand_decision: 'rejected' }))).toBe('closed');
  });

  it('moves to implemented when an accepted fix lands in a revision', () => {
    expect(
      deriveIssueStatus(
        facts({ brand_decision: 'accepted', implementation_state: 'implemented', implemented_in_revision_id: 'rev-b' }),
      ),
    ).toBe('implemented');
  });

  it('closes when validated', () => {
    expect(
      deriveIssueStatus(
        facts({ brand_decision: 'accepted', implementation_state: 'implemented', implemented_in_revision_id: 'rev-b', validation_state: 'validated' }),
      ),
    ).toBe('closed');
  });

  it('reopens (open) on a failed validation even though a fix was implemented', () => {
    expect(
      deriveIssueStatus(
        facts({ brand_decision: 'accepted', implementation_state: 'implemented', implemented_in_revision_id: 'rev-b', validation_state: 'validation_failed' }),
      ),
    ).toBe('open');
  });
});

// --- dfmApprovalReadiness (the cut-steel gate) --------------------------------

describe('dfmApprovalReadiness', () => {
  const signedOff = [{ state: 'signed' as const }];

  it('is ready when every issue is settled, sign-offs signed, and a revision is frozen', () => {
    const r = dfmApprovalReadiness({
      issues: [{ status: 'closed' }, { status: 'dispositioned' }],
      signoffs: signedOff,
      frozenRevision: REV_B,
    });
    expect(r.ready).toBe(true);
  });

  it('blocks while an issue is still open (awaiting a brand decision)', () => {
    const r = dfmApprovalReadiness({
      issues: [{ status: 'open' }],
      signoffs: signedOff,
      frozenRevision: REV_B,
    });
    expect(r.ready).toBe(false);
    expect(r.criteria.find((c) => c.key === 'issues_dispositioned')?.met).toBe(false);
  });

  it('blocks a reopened (failed-validation) issue even though it carries a brand decision', () => {
    // Regression: the gate must not treat "has a decision" as "settled" — a fix
    // that failed validation is reopened (status open) and unresolved.
    const r = dfmApprovalReadiness({
      issues: [{ status: 'open' }], // reopened by a failed validation
      signoffs: signedOff,
      frozenRevision: REV_B,
    });
    expect(r.ready).toBe(false);
  });

  it('blocks when a required sign-off is unsigned', () => {
    const r = dfmApprovalReadiness({
      issues: [{ status: 'closed' }],
      signoffs: [{ state: 'aligned' }],
      frozenRevision: REV_B,
    });
    expect(r.ready).toBe(false);
    expect(r.criteria.find((c) => c.key === 'signoffs_signed')?.met).toBe(false);
  });

  it('blocks when no revision is frozen', () => {
    const r = dfmApprovalReadiness({
      issues: [{ status: 'closed' }],
      signoffs: signedOff,
      frozenRevision: null,
    });
    expect(r.ready).toBe(false);
    expect(r.criteria.find((c) => c.key === 'revision_frozen')?.met).toBe(false);
  });
});

// --- canAdvanceSignoff --------------------------------------------------------

describe('canAdvanceSignoff', () => {
  it('allows the forward path and the aligned→proposed step-back', () => {
    expect(canAdvanceSignoff('proposed', 'aligned')).toBe(true);
    expect(canAdvanceSignoff('aligned', 'signed')).toBe(true);
    expect(canAdvanceSignoff('aligned', 'proposed')).toBe(true);
  });

  it('forbids jumping straight from proposed to signed', () => {
    expect(canAdvanceSignoff('proposed', 'signed')).toBe(false);
  });

  it('forbids re-advancing a signed agreement and no-op transitions', () => {
    expect(canAdvanceSignoff('signed', 'aligned')).toBe(false);
    expect(canAdvanceSignoff('proposed', 'proposed')).toBe(false);
  });
});

// --- summarizePackage / derived part + project state --------------------------

describe('summarizePackage', () => {
  it('is complete only when every required item is complete', () => {
    expect(summarizePackage([pkgItem({ complete: true }), pkgItem({ required: false })]).state).toBe('complete');
    expect(summarizePackage([pkgItem({ complete: true }), pkgItem({ complete: false })]).state).toBe('incomplete');
  });

  it('is incomplete with no required items (an empty checklist cannot pass the gate)', () => {
    expect(summarizePackage([pkgItem({ required: false })]).state).toBe('incomplete');
  });
});

describe('derivePartState', () => {
  const base = { part: { package_state: 'complete' as const }, hasDfms: true, approved: false, anyAwaitingValidation: false };
  it('is draft until the package is complete', () => {
    expect(derivePartState({ ...base, part: { package_state: 'incomplete' } })).toBe('draft');
  });
  it('is package_complete once the gate opens but no DFM exists', () => {
    expect(derivePartState({ ...base, hasDfms: false })).toBe('package_complete');
  });
  it('is awaiting_validation when a fix is pending validation', () => {
    expect(derivePartState({ ...base, anyAwaitingValidation: true })).toBe('awaiting_validation');
  });
  it('is dfm_active with DFMs and nothing awaiting validation', () => {
    expect(derivePartState(base)).toBe('dfm_active');
  });
  it('is dfm_approved once approved (overrides everything)', () => {
    expect(derivePartState({ ...base, approved: true, part: { package_state: 'incomplete' } })).toBe('dfm_approved');
  });
});

describe('deriveProjectState', () => {
  it('is setup with no parts or only draft parts', () => {
    expect(deriveProjectState([])).toBe('setup');
    expect(deriveProjectState([{ part_state: 'draft' }, { part_state: 'package_complete' }])).toBe('setup');
  });
  it('is dfm_active when any part is in (or past) review', () => {
    expect(deriveProjectState([{ part_state: 'draft' }, { part_state: 'dfm_active' }])).toBe('dfm_active');
  });
  it('is dfm_approved only when every part is approved', () => {
    expect(deriveProjectState([{ part_state: 'dfm_approved' }, { part_state: 'dfm_approved' }])).toBe('dfm_approved');
    expect(deriveProjectState([{ part_state: 'dfm_approved' }, { part_state: 'dfm_active' }])).toBe('dfm_active');
  });
});
