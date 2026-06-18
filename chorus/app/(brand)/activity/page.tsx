import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { listActivity } from '@/lib/db';
import { activityTypeMeta } from '@/types/labels';
import { formatDate, timeAgo } from '@/utils/format';

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
                  <StatusBadge label={activityTypeMeta[e.type].label} tone={activityTypeMeta[e.type].tone} />
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
