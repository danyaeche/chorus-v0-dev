import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { getOrganization } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/env';

export default function SettingsPage() {
  const viewer = requireBrandViewer();
  const org = getOrganization(viewer);

  return (
    <>
      <PageHeader title="Settings" subtitle={`${org?.name} workspace · account & security`} />

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="font-semibold">Security & data residency</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <Row label="Hosting & data residency" value="Supabase Postgres (single private project)" hint="Per-org row-level security via memberships" />
            <Row label="Encryption" value="TLS 1.2+ in transit · AES-256 at rest" />
            <Row
              label="Access & authentication"
              value="Brand users sign in with Supabase Auth · reviewers use scoped magic links — no account"
            />
            <Row label="Backend mode" value={isSupabaseConfigured() ? 'Connected to Supabase' : 'Demo (in-memory seed)'} />
            <Row label="Audit log" value="Every comment, decision, file view/download, and magic-link open is recorded" />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Confidentiality model</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Providers never see each other&apos;s DFMs, recommendations, files, comments, or issue records.</li>
            <li>Issue Groups are brand-side only and are never exposed to reviewers in v0.</li>
            <li>NDA status gates file visibility; downloads honor the per-reviewer confidentiality policy.</li>
            <li>Files are served only through short-lived signed URLs after the permission layer authorizes the request.</li>
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Workspace</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <Row label="Workspace name" value={org?.name ?? '—'} />
            <Row label="Signed in as" value={`${viewer.fullName} · ${viewer.email}`} />
            <Row label="Role" value={viewer.role} />
          </dl>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b pb-3 last:border-0 last:pb-0">
      <div>
        <div className="font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="text-right text-muted-foreground">{value}</div>
    </div>
  );
}
