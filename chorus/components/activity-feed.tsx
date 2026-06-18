import { StatusBadge } from '@/components/status-badge';
import { activityTypeMeta } from '@/types/labels';
import { timeAgo } from '@/utils/format';
import type { ActivityEvent } from '@/types';

/** A compact, reusable activity timeline (brand-facing program events). */
export function ActivityFeed({
  events,
  emptyLabel = 'No activity yet.',
}: {
  events: ActivityEvent[];
  emptyLabel?: string;
}) {
  if (events.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {events.map((e) => {
        const meta = activityTypeMeta[e.type];
        return (
          <li key={e.id} className="flex items-center gap-3 text-sm">
            <StatusBadge label={meta.label} tone={meta.tone} className="shrink-0" />
            <span className="flex-1 text-foreground/90">{e.summary}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
