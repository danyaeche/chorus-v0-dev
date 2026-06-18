import { PageHeader } from '@/components/page-header';
import { IssueTable, type IssueRow } from '@/components/issue-table';
import { requireBrandViewer } from '@/lib/auth/session';
import { getPart, getProject, listIssues } from '@/lib/db';

export default function IssuesPage({
  searchParams,
}: {
  searchParams: { part?: string; project?: string };
}) {
  const { part, project } = searchParams;
  const viewer = requireBrandViewer();
  const issues = listIssues(viewer, { partId: part, projectId: project });

  const rows: IssueRow[] = issues.map((i) => {
    const p = getPart(viewer, i.part_id);
    const proj = getProject(viewer, i.project_id);
    return {
      id: i.id,
      number: i.number,
      title: i.title,
      partName: p?.name ?? '—',
      projectName: proj?.name ?? '—',
      provider: i.reviewer?.company ?? null,
      type: i.type,
      category: i.category,
      severity: i.severity,
      status: i.status,
      updated_at: i.updated_at,
    };
  });

  return (
    <>
      <PageHeader
        title="Issue inbox"
        subtitle="Every DFM issue — the atomic unit of work — across all parts and projects"
      />
      <IssueTable rows={rows} />
    </>
  );
}
