import { useRouter } from '@/lib/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { z } from 'zod';
import { createPartAction } from '@/lib/actions';
import { createPartSchema, type CreatePartInput } from '@/lib/validation';

type PartFormValues = z.input<typeof createPartSchema>;
import { PART_PROCESSES } from '@/types/enums';
import { partProcessLabels } from '@/types/labels';

export function CreatePartForm({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PartFormValues, unknown, CreatePartInput>({
    resolver: zodResolver(createPartSchema),
    defaultValues: { process: 'injection_molded', project_id: projects[0]?.id },
  });

  async function onSubmit(values: CreatePartInput) {
    const res = await createPartAction(values);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Part created — complete the package to invite reviewers');
    router.push(`/parts/${res.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Project" error={errors.project_id?.message}>
          <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" {...register('project_id')}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Process" error={errors.process?.message}>
          <select className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" {...register('process')}>
            {PART_PROCESSES.map((p) => (
              <option key={p} value={p}>
                {partProcessLabels[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Part number" error={errors.part_number?.message}>
          <Input placeholder="e.g. TM-4-2001" {...register('part_number')} />
        </Field>
        <Field label="Part name" error={errors.name?.message}>
          <Input placeholder="e.g. Battery enclosure — lower" {...register('name')} />
        </Field>
        <Field label="Material" error={errors.material?.message}>
          <Input placeholder="e.g. PC-ABS (UL94 V-0)" {...register('material')} />
        </Field>
        <Field label="Finish" error={errors.finish?.message}>
          <Input placeholder="e.g. Bead blast · matte" {...register('finish')} />
        </Field>
        <Field label="Target volume / yr" error={errors.target_volume?.message}>
          <Input type="number" placeholder="50000" {...register('target_volume')} />
        </Field>
        <Field label="Target cost / unit" error={errors.target_cost?.message}>
          <Input type="number" step="0.01" placeholder="3.40" {...register('target_cost')} />
        </Field>
      </div>
      <Field label="Description" error={errors.description?.message}>
        <Textarea rows={3} {...register('description')} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create part'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
