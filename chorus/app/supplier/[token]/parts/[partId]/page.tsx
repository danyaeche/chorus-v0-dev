import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Box, FileText, Lock } from 'lucide-react';
import { StatusBadge, ToneDot } from '@/components/status-badge';
import { CreateIssueForm } from '@/components/supplier/create-issue-form';
import { Card } from '@/components/ui/card';
import { getReviewerPartView, resolveReviewerToken } from '@/lib/db';
import {
  dfmStateLabels,
  dfmStateTone,
  issueSeverityTone,
  issueStatusLabels,
  issueStatusTone,
  partProcessLabels,
} from '@/types/labels';
import { rev } from '@/utils/format';

export const dynamic = 'force-dynamic';

export default async function SupplierPartPage({
  params,
}: {
  params: Promise<{ token: string; partId: string }>;
}) {
  const { token, partId } = await params;
  const viewer = resolveReviewerToken(token, new Date().toISOString());
  if (!viewer) return <Invalid />;

  const view = getReviewerPartView(viewer, partId);
  if (!view) return <Invalid />;

  const { part, dfm, current_revision, files, issues, permissions, nda_cleared } = view;
  const canCreate = permissions.includes('create_issues');

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        href={`/supplier/${token}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All assigned parts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-5">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            {part.name}
            <StatusBadge label={dfmStateLabels[dfm.state]} tone={dfmStateTone[dfm.state]} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {part.part_number} · {partProcessLabels[part.process]} · reviewing {rev(current_revision?.rev_label)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Revision under review */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold">Revision under review — {rev(current_revision?.rev_label)}</h2>
          {current_revision?.change_summary ? (
            <p className="mt-2 text-sm text-muted-foreground">{current_revision.change_summary}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No change summary.</p>
          )}
          {part.description ? (
            <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">{part.description}</p>
          ) : null}
        </Card>

        {/* Files (NDA-gated) */}
        <Card className="p-5">
          <h2 className="font-semibold">Files</h2>
          {!nda_cleared ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              <span>Files are locked until your NDA is complete.</span>
            </div>
          ) : files.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No files shared for this revision.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-muted/40">
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span className="truncate">{f.file_name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{f.watermarked ? 'watermarked' : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 py-6 text-muted-foreground">
            <Box className="size-8" />
            <p className="mt-1 text-xs">3D/2D viewer (vNext)</p>
          </div>
        </Card>
      </div>

      {/* Raise an issue */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Your DFM issues</h2>
          {canCreate ? (
            <CreateIssueForm token={token} dfmId={dfm.id} revLabel={current_revision?.rev_label ?? null} />
          ) : null}
        </div>
        <Card className="divide-y p-0">
          {issues.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No issues yet. {canCreate ? 'Raise the first manufacturability finding on this revision.' : ''}
            </p>
          ) : (
            issues.map((i) => {
              const awaitingValidation = i.status === 'implemented' && i.validation_state === 'pending';
              return (
                <Link
                  key={i.id}
                  href={`/supplier/${token}/issues/${i.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ToneDot tone={issueSeverityTone[i.severity]} />
                    <span className="truncate text-sm">
                      <span className="text-muted-foreground">#{i.number}</span> {i.title}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {awaitingValidation ? <StatusBadge label="Validate" tone="warning" /> : null}
                    <StatusBadge label={issueStatusLabels[i.status]} tone={issueStatusTone[i.status]} />
                  </span>
                </Link>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}

function Invalid() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="size-10 text-amber-500" />
      <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
      <p className="text-sm text-muted-foreground">
        The magic link is unknown, expired, revoked, or doesn&apos;t grant access to this part.
      </p>
    </div>
  );
}
