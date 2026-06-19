import { Link } from '@/lib/router';
import { PageHeader } from '@/components/page-header';
import { CreateProjectForm } from '@/components/create-project-form';

export default function NewProjectPage() {
  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href="/projects" className="hover:underline">
            Projects
          </Link>
        }
        title="New project"
        subtitle="One project per program. Add parts next — each can run its own DFM with multiple providers."
      />
      <CreateProjectForm />
    </>
  );
}
