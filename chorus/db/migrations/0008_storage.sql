-- Chorus v0 — Supabase Storage buckets
--
-- All Chorus file bytes live in a single PRIVATE bucket. Access is never public;
-- the app issues short-lived signed URLs through lib/storage after the
-- permission helpers authorize the request. File-level confidentiality
-- (provider isolation, NDA gating, watermarking) is enforced in the app layer
-- against the `files` table — Storage only holds opaque bytes keyed by path.
--
-- Path convention: {organization_id}/{project_id}/{part_id}/{revision_id}/{file_id}-{name}

insert into storage.buckets (id, name, public)
values ('chorus-files', 'chorus-files', false)
on conflict (id) do nothing;

-- No public storage policies are created on purpose: the private bucket is only
-- reachable via service-role signed-URL minting from the server (lib/storage).
-- If you later want brand users to read directly via RLS, add a policy that
-- checks is_org_member() against the org-id path segment.
