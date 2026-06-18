import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'default' | 'danger' | 'warning' | 'success';
}) {
  const accentClass =
    accent === 'danger'
      ? 'text-red-600 dark:text-red-400'
      : accent === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : accent === 'success'
          ? 'text-emerald-600 dark:text-emerald-400'
          : '';
  return (
    <Card className="gap-1 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('text-3xl font-semibold tabular-nums', accentClass)}>{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}
