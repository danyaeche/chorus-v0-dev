import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
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
import { listMemberships, listReviewers } from '@/lib/db';
import { ndaStatusLabels, ndaStatusTone, providerRoleLabels } from '@/types/labels';
import { initials } from '@/utils/format';

export default function TeamPage() {
  const viewer = requireBrandViewer();
  const members = listMemberships(viewer);
  const reviewers = listReviewers(viewer);

  return (
    <>
      <PageHeader title="Team" subtitle="Internal members and the external partners they collaborate with" />

      <Card className="overflow-hidden p-0">
        <div className="border-b px-4 py-3 font-semibold">Internal team</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(({ membership, profile }) => (
              <TableRow key={membership.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                      {initials(profile?.full_name)}
                    </span>
                    <span className="font-medium">{profile?.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{profile?.email}</TableCell>
                <TableCell className="capitalize">{membership.role}</TableCell>
              </TableRow>
            ))}
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
              <TableHead>Type</TableHead>
              <TableHead>NDA</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
