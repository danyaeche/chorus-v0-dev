'use client';

import { useState, useTransition } from 'react';
import { Check, Circle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { togglePackageItemAction } from '@/app/actions';
import type { PackageItem } from '@/types';

/**
 * The package gate panel. Reviewers cannot be invited until every required item
 * is checked — the panel shows live progress and the gate banner.
 */
export function PackagePanel({ items: initial }: { items: PackageItem[] }) {
  const [items, setItems] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const required = items.filter((i) => i.required);
  const requiredComplete = required.filter((i) => i.complete).length;
  const complete = required.length > 0 && requiredComplete === required.length;

  function toggle(item: PackageItem) {
    const next = !item.complete;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, complete: next } : i)));
    startTransition(async () => {
      const res = await togglePackageItemAction(item.id, next);
      if (!res.ok) {
        toast.error(res.error);
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, complete: !next } : i)));
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Package</h2>
        <StatusBadge
          label={complete ? 'Complete' : `${requiredComplete} of ${required.length}`}
          tone={complete ? 'success' : 'warning'}
        />
      </div>

      {!complete ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <span>Reviewers can&apos;t be invited until the package is Complete — the gate is enforced server-side.</span>
        </div>
      ) : null}

      <ul className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => toggle(item)}
              disabled={isPending}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60 disabled:opacity-60"
            >
              {item.complete ? (
                <Check className="size-4 text-emerald-600" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
              {!item.required ? <span className="text-[10px] text-muted-foreground">(optional)</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
