# Chorus v0 — database migrations

Plain SQL migrations, applied in lexical order. They target Supabase Postgres
(they reference `auth.users` and `storage.buckets`).

| File | Contents |
| ---- | -------- |
| `0001_enums.sql` | All workflow enum types (mirror of `types/enums.ts`) |
| `0002_core_tables.sql` | organizations, profiles, memberships, projects, parts, package_items, part_revisions, external_reviewers, dfms |
| `0003_issues_signoffs_approval.sql` | issues (+ derived-status trigger), issue_groups, issue_group_links, signoffs, signoff_parties, dfm_approvals |
| `0004_files_comments_activity.sql` | files, comments, activity_events, access_tokens (magic links), audit_events |
| `0005_package_gate.sql` | package-state recompute + the reviewer-invite gate backstop |
| `0006_rls.sql` | Row Level Security: org-member scoping for brand users |
| `0007_seed.sql` | Schema-validation seed (TM-4 Bike Program, abbreviated) |
| `0008_storage.sql` | Private `chorus-files` storage bucket |

## Applying

With the Supabase CLI:

```bash
supabase db reset            # local: re-applies everything in order
```

Against a hosted Supabase project, set `DIRECT_URL` to the session-mode pooler
connection string (port `5432`) and apply the SQL files in lexical order:

```bash
for file in db/migrations/*.sql; do
  psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f "$file"
done
```

Use `DATABASE_URL` for transaction-mode pooler connections (port `6543`,
`?pgbouncer=true`) if you add runtime SQL/ORM tooling later. Do not use the
transaction pooler for migrations.

Or paste each file into the Supabase SQL editor in order.

## Notes on access control

- **Brand/admin users** authenticate with Supabase Auth and are scoped to their
  organization by the RLS policies in `0006_rls.sql` (via the `memberships`
  table and the `is_org_member()` helper).
- **External reviewers** have no account. They are served through scoped,
  server-side queries run with the service role after a magic-link
  `access_tokens` row is verified; the `lib/permissions` helpers narrow every
  result set to the token's `allowed_part_ids` / `allowed_dfm_ids` /
  `permissions`. Provider-to-provider isolation and NDA gating live in the app
  layer, not in RLS, because the service role intentionally bypasses RLS.
