-- Chorus v0 — enum types
-- Mirrors types/enums.ts. Run order: 0001 before all table migrations.

create extension if not exists "pgcrypto";

create type membership_role as enum ('owner', 'admin', 'member');
create type provider_role as enum ('cm', 'supplier', 'fabricator', 'tooling', 'other');

create type part_state as enum (
  'draft', 'package_complete', 'dfm_active', 'awaiting_validation', 'dfm_approved'
);
create type part_process as enum ('injection_molded', 'cnc', 'sheet_metal', 'cast', 'other');
create type package_state as enum ('incomplete', 'complete');

create type dfm_state as enum (
  'invited', 'in_review', 'feedback_submitted', 'awaiting_validation', 'complete'
);

create type issue_status as enum ('open', 'dispositioned', 'implemented', 'validated', 'closed');
create type issue_type as enum ('show_stopper', 'finding', 'proposal', 'info');
create type issue_category as enum (
  'geometry', 'tolerance', 'material', 'tooling', 'assembly', 'process', 'cost_yield'
);
create type issue_severity as enum ('critical', 'medium', 'low');
create type brand_decision as enum ('accepted', 'rejected', 'needs_clarification');
create type implementation_state as enum ('not_started', 'in_progress', 'implemented');
create type validation_state as enum ('pending', 'validated', 'validation_failed');

create type signoff_topic as enum (
  'parting_line', 'gate_location', 'material_lock', 'tooling_ownership', 'custom'
);
create type signoff_state as enum ('proposed', 'aligned', 'signed');

create type nda_status as enum ('not_required', 'pending', 'signed');
create type confidentiality_level as enum ('standard', 'nda_required', 'confidential_no_download');
create type access_permission as enum (
  'view_files', 'download', 'comment', 'create_issues', 'validate_fixes'
);

create type file_kind as enum (
  'cad_step', 'drawing_2d', 'material_spec', 'quote_pdf',
  'issue_screenshot', 'supplier_upload', 'revision_file', 'other'
);

create type activity_type as enum (
  'reviewer_invited', 'part_added', 'revision_uploaded', 'issue_opened',
  'decision_recorded', 'validation_requested', 'issue_closed', 'signoff_recorded',
  'dfm_approved', 'package_completed', 'comment_added'
);
create type audit_action as enum (
  'magic_link_opened', 'nda_accepted', 'file_viewed', 'file_downloaded',
  'issue_raised', 'comment_posted', 'validation_submitted', 'access_revoked', 'access_granted'
);

create type project_status as enum ('active', 'on_hold', 'archived');
