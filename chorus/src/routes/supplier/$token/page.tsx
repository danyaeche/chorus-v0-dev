import { Link } from '@/lib/router';
import { AlertTriangle, ArrowRight, Check, Download, Eye, Lock, ShieldCheck, X } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { PortalBeacon } from '@/components/supplier/portal-beacon';
import { Card } from '@/components/ui/card';
import { getReviewerPortal, resolveReviewerToken } from '@/lib/db';
import { ACCESS_PERMISSIONS } from '@/types/enums';
import { dfmStateLabels, dfmStateTone, ndaStatusLabels } from '@/types/labels';
import { formatDate, rev, timeAgo } from '@/utils/format';
import type { AccessPermission, AuditAction } from '@/types/enums';


const PERMISSION_LABEL: Record<AccessPermission, string> = {
  view_files: 'View files',
  download: 'Download',
  comment: 'Comment',
  create_issues: 'Create issues',
  validate_fixes: 'Validate fixes',
};

const AUDIT_LABEL: Record<AuditAction, string> = {
  magic_link_opened: 'Magic link opened',
  nda_accepted: 'NDA accepted',
  file_viewed: 'File viewed',
  file_downloaded: 'File downloaded',
  issue_raised: 'Issue raised',
  comment_posted: 'Comment posted',
  validation_submitted: 'Validation submitted',
  access_revoked: 'Access revoked',
  access_granted: 'Access granted',
};

export default function SupplierPortalPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const viewer = resolveReviewerToken(token, new Date().toISOString());

  if (!viewer) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle className="size-10 text-amber-500" />
        <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="text-sm text-muted-foreground">
          The magic link is unknown, expired, or has been revoked. Ask your contact at the brand to re-share access.
        </p>
      </div>
    );
  }

  const portal = getReviewerPortal(viewer);
  if (!portal) return null;

  const { reviewer, project, parts, token: tk, audit } = portal;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PortalBeacon token={token} />

      {/* Invite header */}
      <Card className="overflow-hidden p-0">
        <div className="bg-foreground p-6 text-background">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-80">chorus</span>
            <StatusBadge
              label={`Magic link · expires ${formatDate(tk.expires_at)}`}
              tone="neutral"
              className="bg-background/10 text-background border-transparent"
            />
          </div>
          <p className="mt-4 text-xs opacity-70">You&apos;ve been invited to review for manufacturability</p>
          <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
          <p className="mt-2 text-sm opacity-80">
            Reviewing as {reviewer.contact_name} · {reviewer.company} · No account needed
          </p>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your access · scoped</div>
            <p className="mt-2 text-sm">
              {parts.length} part{parts.length === 1 ? '' : 's'} shared with you · <strong>{project.name}</strong> only.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              You can&apos;t see the brand&apos;s other programs, parts, internal notes, or any other provider&apos;s DFM.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              NDA: {ndaStatusLabels[reviewer.nda_status]} {viewer.ndaCleared ? '· files unlocked' : '· files locked until signed'}
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACCESS_PERMISSIONS.map((p) => {
                const granted = viewer.permissions.includes(p);
                return (
                  <span
                    key={p}
                    className={
                      'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ' +
                      (granted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'text-muted-foreground')
                    }
                  >
                    {granted ? <Check className="size-3" /> : <X className="size-3" />} {PERMISSION_LABEL[p]}
                  </span>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Access is logged below and can be revoked at any time.</p>
          </div>
        </div>
      </Card>

      {/* Parts to review */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold">{parts.length} part{parts.length === 1 ? '' : 's'} to review</h2>
        <Card className="divide-y p-0">
          {parts.map((p) => (
            <Link
              key={p.part.id}
              href={`/supplier/${token}/parts/${p.part.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
            >
              <div>
                <div className="font-medium">{p.part.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.part.part_number} · {rev(p.current_revision_label)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {p.dfm ? <StatusBadge label={dfmStateLabels[p.dfm.state]} tone={dfmStateTone[p.dfm.state]} /> : null}
                {p.open_issue_count > 0 ? (
                  <span className="text-xs text-amber-600">{p.open_issue_count} open</span>
                ) : null}
                <ArrowRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </Card>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> You only ever see your own DFM — other providers&apos; reviews of these parts are
          walled off.
        </p>
      </div>

      {/* Activity / audit log */}
      <div className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 font-semibold">Your access log</h2>
        <Card className="p-5">
          <ul className="space-y-2.5 text-sm">
            {audit.length === 0 ? (
              <li className="text-muted-foreground">No access events yet.</li>
            ) : (
              audit.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Eye className="size-3.5 text-muted-foreground" /> {AUDIT_LABEL[e.action]}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
                </li>
              ))
            )}
            {viewer.permissions.includes('download') ? (
              <li className="flex items-center justify-between gap-3 text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Download className="size-3.5" /> Download permitted (watermarked)
                </span>
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">Powered by Chorus</p>
    </div>
  );
}
