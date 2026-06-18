import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { listActivity } from '@/lib/db';
import type { ActivityType } from '@/types/enums';
import type { Tone } from '@/types/labels';
import { formatDate, timeAgo } from '@/utils/format';

const TYPE_LABEL: Record<ActivityType, { label: string; tone: Tone }> = {
  reviewer_invited: { label: 'Invited', tone: 'info' },
  part_added: { label: 'Part added', tone: 'neutral' },
  revision_uploaded: { label: 'Revision', tone: 'info' },
  issue_opened: { label: 'Opened', tone: 'danger' },
  decision_recorded: { label: 'Decision', tone: 'warning' },
  validation_requested: { label: 'Validation', tone: 'warning' },
  issue_closed: { label: 'Closed', tone: 'success' },
  signoff_recorded: { label: 'Sign-off', tone: 'accent' },
  dfm_approved: { label: 'DFM approved', tone: 'success' },
  package_completed: { label: 'Package', tone: 'success' },
  comment_added: { label: 'Comment', tone: 'neutral' },
};

export default async function ActivityPage() {
  const viewer = await requireBrandViewer();
  const events = listActivity(viewer);

  // Group by day for a readable feed.
  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const day = formatDate(e.created_at);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(e);
  }

  return (
    <>
      <PageHeader title="Activity" subtitle="DFM lifecycle events across every project" />

      <Card className="p-5">
        {[...groups.entries()].map(([day, items]) => (
          <div key={day} className="mb-5 last:mb-0">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
            <ul className="space-y-2.5">
              {items.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <StatusBadge label={TYPE_LABEL[e.type].label} tone={TYPE_LABEL[e.type].tone} />
                  <span className="flex-1">{e.summary}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Card>
    </>
  );
}
