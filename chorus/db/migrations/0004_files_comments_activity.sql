-- Chorus v0 — files, comments, activity, access tokens (magic links), audit

-- files (metadata; bytes live in Supabase Storage private buckets) ----------
create table files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  part_id uuid references parts(id) on delete cascade,
  revision_id uuid references part_revisions(id) on delete cascade,
  dfm_id uuid references dfms(id) on delete cascade,        -- set => confidential to one provider
  issue_id uuid references issues(id) on delete cascade,
  package_item_id uuid references package_items(id) on delete set null,
  kind file_kind not null default 'other',
  storage_bucket text not null default 'chorus-files',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  watermarked boolean not null default false,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_by_reviewer_id uuid references external_reviewers(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_files_part on files(part_id);
create index idx_files_revision on files(revision_id);
create index idx_files_dfm on files(dfm_id);

-- deferred FK: package_items.file_id -> files
alter table package_items
  add constraint package_items_file_fk
  foreign key (file_id) references files(id) on delete set null;

-- comments ------------------------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  issue_id uuid references issues(id) on delete cascade,
  dfm_id uuid references dfms(id) on delete cascade,
  signoff_id uuid references signoffs(id) on delete cascade,
  body text not null,
  author_profile_id uuid references profiles(id) on delete set null,
  author_reviewer_id uuid references external_reviewers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_comments_issue on comments(issue_id);
create trigger trg_comments_updated before update on comments
  for each row execute function set_updated_at();

-- activity_events (human-facing feed) ---------------------------------------
create table activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  part_id uuid references parts(id) on delete cascade,
  dfm_id uuid references dfms(id) on delete cascade,
  issue_id uuid references issues(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  actor_reviewer_id uuid references external_reviewers(id) on delete set null,
  type activity_type not null,
  summary text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_project on activity_events(project_id, created_at desc);
create index idx_activity_part on activity_events(part_id, created_at desc);

-- access_tokens (scoped magic links for external reviewers) -----------------
-- An external reviewer needs no account; access is granted entirely by a
-- scoped, revocable, expiring token. allowed_part_ids / allowed_dfm_ids /
-- permissions narrow what the bearer can see and do.
create table access_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  external_reviewer_id uuid not null references external_reviewers(id) on delete cascade,
  token_hash text not null unique,             -- sha-256 of the opaque token
  allowed_part_ids uuid[] not null default '{}',
  allowed_dfm_ids uuid[] not null default '{}',
  permissions access_permission[] not null default '{}',
  expires_at timestamptz,
  revoked boolean not null default false,
  revoked_at timestamptz,
  revoked_by uuid references profiles(id) on delete set null,
  last_opened_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_access_tokens_reviewer on access_tokens(external_reviewer_id);
create index idx_access_tokens_project on access_tokens(project_id);

-- audit_events (sensitive access + workflow actions) ------------------------
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  access_token_id uuid references access_tokens(id) on delete set null,
  actor_profile_id uuid references profiles(id) on delete set null,
  actor_reviewer_id uuid references external_reviewers(id) on delete set null,
  action audit_action not null,
  target_type text,
  target_id uuid,
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_org on audit_events(organization_id, created_at desc);
create index idx_audit_token on audit_events(access_token_id, created_at desc);
