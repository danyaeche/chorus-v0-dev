import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireBrandViewer } from '@/lib/auth/session';
import { getReviewer, listAccessTokens, listReviewers } from '@/lib/db';
import { ndaStatusLabels, ndaStatusTone, providerRoleLabels } from '@/types/labels';
import { formatDate, timeAgo } from '@/utils/format';

export default async function ReviewersPage() {
  const viewer = await requireBrandViewer();
  const tokens = listAccessTokens(viewer);
  const reviewers = listReviewers(viewer);

  const active = tokens.filter((t) => !t.revoked && (!t.expires_at || t.expires_at > new Date().toISOString()));

  return (
    <>
      <PageHeader
        title="Magic links & access"
        subtitle="Scoped, no-account access for external reviewers — NDA-gated, watermarked, time-boxed, revocable."
        actions={
          <Button size="sm">
            <Plus className="size-4" /> New magic link
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Active links" value={active.length} hint="currently shared" />
        <StatCard label="External reviewers" value={reviewers.length} />
        <StatCard label="Revoked / expired" value={tokens.length - active.length} accent="warning" />
      </div>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="border-b px-4 py-3 font-semibold">Magic links</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reviewer</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Last opened</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((tk) => {
              const r = getReviewer(tk.external_reviewer_id);
              const isActive = !tk.revoked && (!tk.expires_at || tk.expires_at > new Date().toISOString());
              return (
                <TableRow key={tk.id}>
                  <TableCell>
                    <div className="font-medium">{r?.contact_name}</div>
                    <div className="text-xs text-muted-foreground">{r?.company}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tk.allowed_part_ids.length} part{tk.allowed_part_ids.length === 1 ? '' : 's'} ·{' '}
                    {tk.allowed_dfm_ids.length} DFM
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tk.permissions.map((p) => (
                        <span key={p} className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {p.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(tk.expires_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{timeAgo(tk.last_opened_at)}</TableCell>
                  <TableCell>
                    {tk.revoked ? (
                      <StatusBadge label="Revoked" tone="danger" />
                    ) : isActive ? (
                      <StatusBadge label="Active" tone="success" />
                    ) : (
                      <StatusBadge label="Expired" tone="warning" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="border-b px-4 py-3 font-semibold">External reviewers</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reviewer</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>NDA</TableHead>
              <TableHead>Confidentiality</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviewers.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.contact_name}</TableCell>
                <TableCell>{r.company}</TableCell>
                <TableCell>{providerRoleLabels[r.provider_role]}</TableCell>
                <TableCell>
                  <StatusBadge label={ndaStatusLabels[r.nda_status]} tone={ndaStatusTone[r.nda_status]} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.confidentiality.replace(/_/g, ' ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
