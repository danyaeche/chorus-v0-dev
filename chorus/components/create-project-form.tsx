import { useRouter } from '@/lib/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createProjectAction } from '@/lib/actions';
import { createProjectSchema, type CreateProjectInput } from '@/lib/validation';

export function CreateProjectForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({ resolver: zodResolver(createProjectSchema) });

  async function onSubmit(values: CreateProjectInput) {
    const res = await createProjectAction(values);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Project created');
    router.push(`/projects/${res.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-5">
      <Field label="Project name" error={errors.name?.message}>
        <Input placeholder="e.g. TM-4 Bike Program" {...register('name')} />
      </Field>
      <Field label="Description" error={errors.description?.message}>
        <Textarea rows={3} placeholder="One line about the program" {...register('description')} />
      </Field>
      <Field label="Target completion" error={errors.target_completion?.message}>
        <Input type="date" {...register('target_completion')} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create project'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
