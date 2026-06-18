import { Link } from '@/lib/router';
import { PageHeader } from '@/components/page-header';
import { CreatePartForm } from '@/components/create-part-form';
import { requireBrandViewer } from '@/lib/auth/session';
import { listProjects } from '@/lib/db';

export default function NewPartPage() {
  const viewer = requireBrandViewer();
  const projects = listProjects(viewer);
  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href="/parts" className="hover:underline">
            Parts
          </Link>
        }
        title="New part"
        subtitle="A package checklist is created for the chosen process. Reviewers can be invited once the package is Complete."
      />
      <CreatePartForm projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
    </>
  );
}
