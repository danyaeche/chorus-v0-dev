import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { partProcessLabels, partStateLabels, partStateTone } from '@/types/labels';
import { rev } from '@/utils/format';
import type { PartListItem } from '@/types/view';

/** Shared parts table used by the project-detail and parts-list pages. */
export function PartsTable({ parts }: { parts: PartListItem[] }) {
  if (parts.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">No parts yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Part</TableHead>
          <TableHead>Revision</TableHead>
          <TableHead>Process</TableHead>
          <TableHead>Providers</TableHead>
          <TableHead>State</TableHead>
          <TableHead className="text-right">Open issues</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parts.map(({ part, current_revision_label, provider_count, open_issue_count }) => (
          <TableRow key={part.id}>
            <TableCell>
              <Link href={`/parts/${part.id}`} className="font-medium hover:underline">
                {part.name}
              </Link>
              <div className="text-xs text-muted-foreground">{part.part_number}</div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{rev(current_revision_label)}</TableCell>
            <TableCell className="text-sm">{partProcessLabels[part.process]}</TableCell>
            <TableCell className="text-sm tabular-nums">{provider_count}</TableCell>
            <TableCell>
              <StatusBadge label={partStateLabels[part.part_state]} tone={partStateTone[part.part_state]} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {open_issue_count > 0 ? (
                <span className="text-red-600 dark:text-red-400">{open_issue_count}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
