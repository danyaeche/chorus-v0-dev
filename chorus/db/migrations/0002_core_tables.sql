-- Chorus v0 — core tables
-- Hierarchy: organizations -> projects -> parts -> {package_items, part_revisions, dfms}
--            -> issues -> {issue_groups, signoffs, dfm_approvals}

-- updated_at trigger helper -------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- organizations -------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_org_updated before update on organizations
  for each row execute function set_updated_at();

-- profiles (mirrors auth.users) ---------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profile_updated before update on profiles
  for each row execute function set_updated_at();

-- memberships (brand-side org membership) -----------------------------------
create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role membership_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);
create index idx_memberships_profile on memberships(profile_id);
create index idx_memberships_org on memberships(organization_id);

-- projects ------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'active',
  brand_owner_id uuid references profiles(id) on delete set null,
  supply_chain_owner_id uuid references profiles(id) on delete set null,
  start_date date,
  target_completion date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projects_org on projects(organization_id);
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();

-- parts ---------------------------------------------------------------------
create table parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  library_ref text,                       -- vNext hook: shared reusable design number
  part_number text not null,
  name text not null,
  description text,
  material text,
  finish text,
  process part_process not null default 'injection_molded',
  target_volume integer,
  target_cost numeric(12,2),
  owner_id uuid references profiles(id) on delete set null,
  part_state part_state not null default 'draft',
  package_state package_state not null default 'incomplete',
  current_revision_id uuid,               -- FK added after part_revisions exists
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_parts_project on parts(project_id);
create index idx_parts_org on parts(organization_id);
create trigger trg_parts_updated before update on parts
  for each row execute function set_updated_at();

-- part_revisions ------------------------------------------------------------
create table part_revisions (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id) on delete cascade,
  rev_label text not null,                -- "A", "B", "C"
  rev_index integer not null,             -- 0, 1, 2 ... for ordering
  change_summary text,
  quote_amount numeric(12,2),
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (part_id, rev_label),
  unique (part_id, rev_index)
);
create index idx_revisions_part on part_revisions(part_id);

-- deferred FK: parts.current_revision_id -> part_revisions
alter table parts
  add constraint parts_current_revision_fk
  foreign key (current_revision_id) references part_revisions(id) on delete set null;

-- package_items -------------------------------------------------------------
create table package_items (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id) on delete cascade,
  key text not null,
  label text not null,
  required boolean not null default true,
  complete boolean not null default false,
  file_id uuid,                           -- FK added after files exists
  notes text,
  completed_by uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (part_id, key)
);
create index idx_package_items_part on package_items(part_id);
create trigger trg_package_items_updated before update on package_items
  for each row execute function set_updated_at();

-- external_reviewers --------------------------------------------------------
create table external_reviewers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  company text not null,
  contact_name text not null,
  contact_email text not null,
  provider_role provider_role not null default 'cm',
  nda_status nda_status not null default 'pending',
  confidentiality confidentiality_level not null default 'standard',
  watermark_policy text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_reviewers_org on external_reviewers(organization_id);
create index idx_reviewers_project on external_reviewers(project_id);
create trigger trg_reviewers_updated before update on external_reviewers
  for each row execute function set_updated_at();

-- dfms (provider-specific, confidential) ------------------------------------
create table dfms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  external_reviewer_id uuid not null references external_reviewers(id) on delete cascade,
  provider_role provider_role not null default 'cm',
  state dfm_state not null default 'invited',
  current_revision_id uuid references part_revisions(id) on delete set null,
  confidential boolean not null default true,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (part_id, external_reviewer_id)
);
create index idx_dfms_part on dfms(part_id);
create index idx_dfms_reviewer on dfms(external_reviewer_id);
create trigger trg_dfms_updated before update on dfms
  for each row execute function set_updated_at();
