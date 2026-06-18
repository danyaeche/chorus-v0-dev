-- Chorus v0 — issues, issue groups, sign-offs, DFM approval

-- issues --------------------------------------------------------------------
create table issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  dfm_id uuid not null references dfms(id) on delete cascade,
  number integer not null,                       -- per-project display number
  title text not null,
  description text,
  type issue_type not null default 'finding',
  category issue_category not null default 'geometry',
  severity issue_severity not null default 'medium',
  status issue_status not null default 'open',    -- derived; kept in sync by trigger
  created_on_revision_id uuid references part_revisions(id) on delete set null,
  created_by_reviewer_id uuid references external_reviewers(id) on delete set null,
  created_by_profile_id uuid references profiles(id) on delete set null,
  recommendation text,
  cost_impact numeric(12,2),
  yield_impact text,
  brand_decision brand_decision,
  rejection_rationale text,
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  implementation_state implementation_state not null default 'not_started',
  implemented_in_revision_id uuid references part_revisions(id) on delete set null,
  validation_state validation_state not null default 'pending',
  validated_by_reviewer_id uuid references external_reviewers(id) on delete set null,
  validated_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number),
  -- A rejected issue must carry a rationale.
  constraint issues_rejection_rationale_chk
    check (brand_decision <> 'rejected' or rejection_rationale is not null)
);
create index idx_issues_part on issues(part_id);
create index idx_issues_dfm on issues(dfm_id);
create index idx_issues_status on issues(status);
create trigger trg_issues_updated before update on issues
  for each row execute function set_updated_at();

-- Derived-status trigger: keep issues.status consistent with the lifecycle.
-- Open -> Dispositioned (decision recorded) -> Implemented (fix in a revision)
--      -> Validated -> Closed. Rejected disposition closes immediately.
--      Validation failure reopens to Implemented's prior state.
create or replace function derive_issue_status() returns trigger as $$
begin
  if new.validation_state = 'validated' then
    new.status := 'closed';
    if new.closed_at is null then new.closed_at := now(); end if;
  elsif new.brand_decision = 'rejected' then
    new.status := 'closed';
    if new.closed_at is null then new.closed_at := now(); end if;
  elsif new.validation_state = 'validation_failed' then
    -- reopen: a failed validation drops the fix back to Open for re-work
    new.status := 'open';
    new.closed_at := null;
  elsif new.implemented_in_revision_id is not null
        and new.implementation_state = 'implemented' then
    new.status := 'implemented';
    new.closed_at := null;
  elsif new.brand_decision is not null then
    new.status := 'dispositioned';
    new.closed_at := null;
  else
    new.status := 'open';
    new.closed_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_issues_derive_status before insert or update on issues
  for each row execute function derive_issue_status();

-- issue_groups (brand-side only) --------------------------------------------
create table issue_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  title text not null,
  description text,
  conflict_flag boolean not null default false,
  brand_decision brand_decision,
  decision_rationale text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_issue_groups_part on issue_groups(part_id);
create trigger trg_issue_groups_updated before update on issue_groups
  for each row execute function set_updated_at();

create table issue_group_links (
  id uuid primary key default gen_random_uuid(),
  issue_group_id uuid not null references issue_groups(id) on delete cascade,
  issue_id uuid not null references issues(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (issue_group_id, issue_id)
);
create index idx_group_links_issue on issue_group_links(issue_id);

-- sign-offs (first-class joint agreements) ----------------------------------
create table signoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  topic signoff_topic not null,
  custom_topic text,
  title text not null,
  state signoff_state not null default 'proposed',
  rationale text,
  proposed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_signoffs_part on signoffs(part_id);
create trigger trg_signoffs_updated before update on signoffs
  for each row execute function set_updated_at();

create table signoff_parties (
  id uuid primary key default gen_random_uuid(),
  signoff_id uuid not null references signoffs(id) on delete cascade,
  party_type text not null check (party_type in ('brand', 'reviewer')),
  profile_id uuid references profiles(id) on delete set null,
  external_reviewer_id uuid references external_reviewers(id) on delete set null,
  agreed boolean not null default false,
  agreed_at timestamptz,
  check (
    (party_type = 'brand' and profile_id is not null) or
    (party_type = 'reviewer' and external_reviewer_id is not null)
  )
);
create index idx_signoff_parties_signoff on signoff_parties(signoff_id);

-- dfm_approvals (terminal gate — cleared to cut steel) ----------------------
create table dfm_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade unique,
  approved_by uuid references profiles(id) on delete set null,
  approved_at timestamptz not null default now(),
  approved_revision_id uuid references part_revisions(id) on delete set null,
  po_reference text,
  tooling_reference text,
  notes text,
  created_at timestamptz not null default now()
);
