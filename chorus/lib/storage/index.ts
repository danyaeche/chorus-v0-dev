/**
 * Supabase Storage helpers. All Chorus files live in one PRIVATE bucket and are
 * served only through short-lived signed URLs minted on the server after the
 * permission layer authorizes the request.
 */
import { createServiceSupabase } from '@/lib/supabase/server';
import { hasServiceRole } from '@/lib/env';
import type { FileObject, UUID } from '@/types';

export const FILES_BUCKET = 'chorus-files';

/** Deterministic storage path for a file row. */
export function buildStoragePath(opts: {
  organizationId: UUID;
  projectId?: UUID | null;
  partId?: UUID | null;
  revisionId?: UUID | null;
  fileId: UUID;
  fileName: string;
}): string {
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return [
    opts.organizationId,
    opts.projectId ?? 'org',
    opts.partId ?? 'part',
    opts.revisionId ?? 'rev',
    `${opts.fileId}-${safeName}`,
  ].join('/');
}

const DEFAULT_TTL_SECONDS = 60 * 10; // 10 minutes

/**
 * Mint a signed URL for a stored file. Returns null in demo mode (no bucket).
 * The caller is responsible for having authorized this access first.
 */
export async function getSignedUrl(
  file: Pick<FileObject, 'storage_bucket' | 'storage_path'>,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  if (!hasServiceRole()) return null;
  const supabase = createServiceSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(file.storage_bucket || FILES_BUCKET)
    .createSignedUrl(file.storage_path, ttlSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}

/** Upload bytes to the private bucket. Server-only. */
export async function uploadFile(
  path: string,
  body: ArrayBuffer | Blob | Buffer,
  contentType?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasServiceRole()) return { ok: false, error: 'storage_not_configured' };
  const supabase = createServiceSupabase();
  if (!supabase) return { ok: false, error: 'storage_not_configured' };

  const { error } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(path, body, { contentType, upsert: false });

  return error ? { ok: false, error: error.message } : { ok: true };
}
