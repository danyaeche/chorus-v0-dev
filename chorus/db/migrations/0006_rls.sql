-- Chorus v0 — Row Level Security
--
-- Two access patterns:
--   1. Brand / admin users authenticate with Supabase Auth. They see rows in
--      organizations they are a member of (via `memberships`). RLS below
--      enforces org-scoping for these users.
--   2. External reviewers have NO account. They reach data through scoped,
--      server-side queries executed with the service role after the magic-link
--      token is verified and the permission helpers (lib/permissions) narrow
--      the result set to allowed_part_ids / allowed_dfm_ids. The service role
--      bypasses RLS by design; confidentiality for reviewers is therefore
--      enforced in the application layer, not in these policies.
--
-- Net effect: a logged-in brand user can never read another org's data, and an
-- anonymous request (no membership) can read nothing directly.

-- Helper: is the current auth user a member of org? -------------------------
create or replace function is_org_member(p_org uuid)
returns boolean as $$
  select exists (
    select 1 from memberships m
    where m.organization_id = p_org and m.profile_id = auth.uid()
  );
$$ language sql stable security definer;

create or replace function is_org_admin(p_org uuid)
returns boolean as $$
  select exists (
    select 1 from memberships m
    where m.organization_id = p_org
      and m.profile_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$ language sql stable security definer;

-- Enable RLS + org-member read/write policies on every org-scoped table.
do $$
declare
  t text;
  org_tables text[] := array[
    'projects', 'parts', 'package_items', 'part_revisions', 'external_reviewers',
    'dfms', 'issues', 'issue_groups', 'signoffs', 'dfm_approvals', 'files',
    'comments', 'activity_events', 'access_tokens', 'audit_events'
  ];
begin
  foreach t in array org_tables loop
    execute format('alter table %I enable row level security;', t);

    -- Tables that carry organization_id directly.
    execute format($f$
      create policy %1$s_org_select on %1$I
        for select using (is_org_member(organization_id));
    $f$, t);

    execute format($f$
      create policy %1$s_org_write on %1$I
        for all using (is_org_member(organization_id))
        with check (is_org_member(organization_id));
    $f$, t);
  end loop;
end $$;

-- issue_group_links and signoff_parties have no org column; gate them through
-- their parent rows.
alter table issue_group_links enable row level security;
create policy issue_group_links_member on issue_group_links
  for all using (
    exists (select 1 from issue_groups g
            where g.id = issue_group_id and is_org_member(g.organization_id))
  )
  with check (
    exists (select 1 from issue_groups g
            where g.id = issue_group_id and is_org_member(g.organization_id))
  );

alter table signoff_parties enable row level security;
create policy signoff_parties_member on signoff_parties
  for all using (
    exists (select 1 from signoffs s
            where s.id = signoff_id and is_org_member(s.organization_id))
  )
  with check (
    exists (select 1 from signoffs s
            where s.id = signoff_id and is_org_member(s.organization_id))
  );

-- organizations / profiles / memberships ------------------------------------
alter table organizations enable row level security;
create policy organizations_member_select on organizations
  for select using (is_org_member(id));
create policy organizations_admin_write on organizations
  for all using (is_org_admin(id)) with check (is_org_admin(id));

alter table profiles enable row level security;
-- A user can always read/update their own profile; org-mates are readable too.
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_orgmate_select on profiles
  for select using (
    exists (
      select 1 from memberships me
      join memberships them on them.organization_id = me.organization_id
      where me.profile_id = auth.uid() and them.profile_id = profiles.id
    )
  );

alter table memberships enable row level security;
create policy memberships_member_select on memberships
  for select using (is_org_member(organization_id));
create policy memberships_admin_write on memberships
  for all using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));
