import { Link } from '@/lib/router';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PartsTable } from '@/components/parts-table';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requireBrandViewer } from '@/lib/auth/session';
import { listParts, listProjects } from '@/lib/db';

export default function PartsPage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  const { project } = searchParams;
  const viewer = requireBrandViewer();
  const projects = listProjects(viewer);
  const parts = listParts(viewer, project ? { projectId: project } : {});

  return (
    <>
      <PageHeader
        title="Parts"
        subtitle="Every part across the workspace — package, revisions, provider DFMs, and issues"
        actions={
          <Link href="/parts/new" className={buttonVariants({ size: 'sm' })}>
            <Plus className="size-4" /> New part
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <FilterPill href="/parts" label="All projects" active={!project} />
        {projects.map((p) => (
          <FilterPill key={p.id} href={`/parts?project=${p.id}`} label={p.name} active={project === p.id} />
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <PartsTable parts={parts} />
      </Card>
    </>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        'rounded-full border px-3 py-1 ' +
        (active ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')
      }
    >
      {label}
    </Link>
  );
}
