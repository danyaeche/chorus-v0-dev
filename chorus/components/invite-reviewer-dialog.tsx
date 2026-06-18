import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/router';
import { Link } from '@/lib/router';
import { Check, Copy, ExternalLink, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteReviewerAction } from '@/lib/actions';
import { ACCESS_PERMISSIONS, PROVIDER_ROLES, NDA_STATUSES, CONFIDENTIALITY_LEVELS } from '@/types/enums';
import { ndaStatusLabels, providerRoleLabels } from '@/types/labels';
import type { AccessPermission, ConfidentialityLevel, NdaStatus, ProviderRole } from '@/types/enums';

const PERMISSION_LABEL: Record<AccessPermission, string> = {
  view_files: 'View assigned part / revision',
  download: 'Download files',
  comment: 'Comment',
  create_issues: 'Create issues',
  validate_fixes: 'Validate implemented fixes',
};

const CONFIDENTIALITY_LABEL: Record<ConfidentialityLevel, string> = {
  standard: 'Standard',
  nda_required: 'NDA required',
  confidential_no_download: 'Confidential — no download',
};

export interface InviteDefaults {
  company?: string;
  contact_name?: string;
  contact_email?: string;
  provider_role?: ProviderRole;
  nda_status?: NdaStatus;
  confidentiality?: ConfidentialityLevel;
}

export interface InvitablePart {
  id: string;
  name: string;
  packageComplete: boolean;
}

export function InviteReviewerDialog({
  partId,
  packageComplete = false,
  parts,
  defaults,
  triggerLabel = 'Invite reviewer',
  triggerSize = 'sm',
}: {
  /** Fixed-part mode (part page). */
  partId?: string;
  packageComplete?: boolean;
  /** Part-picker mode (reviewers page). */
  parts?: InvitablePart[];
  defaults?: InviteDefaults;
  triggerLabel?: string;
  triggerSize?: 'sm' | 'default';
}) {
  const router = useRouter();
  const selectorMode = !!parts;

  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const firstComplete = parts?.find((p) => p.packageComplete)?.id ?? parts?.[0]?.id ?? '';
  const [selectedPartId, setSelectedPartId] = useState(firstComplete);

  const [company, setCompany] = useState(defaults?.company ?? '');
  const [contactName, setContactName] = useState(defaults?.contact_name ?? '');
  const [email, setEmail] = useState(defaults?.contact_email ?? '');
  const [role, setRole] = useState<ProviderRole>(defaults?.provider_role ?? 'cm');
  const [nda, setNda] = useState<NdaStatus>(defaults?.nda_status ?? 'signed');
  const [confidentiality, setConfidentiality] = useState<ConfidentialityLevel>(
    defaults?.confidentiality ?? 'nda_required',
  );
  const [expiryDays, setExpiryDays] = useState(30);
  const [permissions, setPermissions] = useState<AccessPermission[]>([
    'view_files',
    'comment',
    'create_issues',
    'validate_fixes',
  ]);

  const effectivePartId = selectorMode ? selectedPartId : partId;
  const effectiveComplete = selectorMode
    ? (parts?.find((p) => p.id === selectedPartId)?.packageComplete ?? false)
    : packageComplete;
  const triggerDisabled = selectorMode ? !parts?.some((p) => p.packageComplete) : !packageComplete;

  function togglePermission(p: AccessPermission) {
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function submit() {
    if (!effectivePartId) {
      toast.error('Pick a part to scope access to');
      return;
    }
    if (!effectiveComplete) {
      toast.error('The selected part’s package must be Complete first');
      return;
    }
    if (!company.trim() || !contactName.trim() || !email.trim()) {
      toast.error('Company, contact, and email are required');
      return;
    }
    if (permissions.length === 0) {
      toast.error('Grant at least one permission');
      return;
    }
    startTransition(async () => {
      const res = await inviteReviewerAction({
        part_id: effectivePartId,
        company,
        contact_name: contactName,
        contact_email: email,
        provider_role: role,
        nda_status: nda,
        confidentiality,
        permissions,
        expiry_days: expiryDays,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLink(`${window.location.origin}${res.magic_link_path}`);
      toast.success('Reviewer invited — magic link created');
      router.refresh();
    });
  }

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setTimeout(() => setLink(null), 200);
  }

  return (
    <>
      <Button
        size={triggerSize}
        onClick={() => setOpen(true)}
        disabled={triggerDisabled}
        title={triggerDisabled ? 'Complete a part package first' : undefined}
      >
        {triggerDisabled ? <Lock className="size-4" /> : <Mail className="size-4" />} {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          {link ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Magic link ready</DialogTitle>
                <DialogDescription>
                  Scoped to this part &amp; DFM only — NDA-gated, time-boxed, revocable. Share it with the
                  reviewer; no account needed.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                <input
                  readOnly
                  value={link}
                  className="min-w-0 flex-1 bg-transparent px-1 text-xs outline-none"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
                <Link href={link} target="_blank" className="inline-flex">
                  <Button size="sm">
                    <ExternalLink className="size-4" /> Open supplier portal
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Invite external reviewer</DialogTitle>
                <DialogDescription>
                  Create a scoped, NDA-gated magic link for a provider to review this part for
                  manufacturability.
                </DialogDescription>
              </DialogHeader>

              {selectorMode ? (
                <Field label="Part">
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                  >
                    {parts!.map((p) => (
                      <option key={p.id} value={p.id} disabled={!p.packageComplete}>
                        {p.name} {p.packageComplete ? '' : '— package incomplete'}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Company">
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Hsinchu Precision" />
                </Field>
                <Field label="Contact name">
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Benjamin Chen" />
                </Field>
                <Field label="Email">
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@provider.com" />
                </Field>
                <Field label="Provider role">
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={role}
                    onChange={(e) => setRole(e.target.value as ProviderRole)}
                  >
                    {PROVIDER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {providerRoleLabels[r]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="NDA status">
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={nda}
                    onChange={(e) => setNda(e.target.value as NdaStatus)}
                  >
                    {NDA_STATUSES.map((n) => (
                      <option key={n} value={n}>
                        {ndaStatusLabels[n]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Confidentiality">
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={confidentiality}
                    onChange={(e) => setConfidentiality(e.target.value as ConfidentialityLevel)}
                  >
                    {CONFIDENTIALITY_LEVELS.map((c) => (
                      <option key={c} value={c}>
                        {CONFIDENTIALITY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Permissions</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Files are visible only when NDA is complete. Validation is reserved to the issue&apos;s author.
                </p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {ACCESS_PERMISSIONS.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={permissions.includes(p)}
                        onChange={() => togglePermission(p)}
                        className="size-4"
                      />
                      {PERMISSION_LABEL[p]}
                    </label>
                  ))}
                </div>
              </div>

              <Field label="Link expires in (days)">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-32"
                />
              </Field>

              {!effectiveComplete ? (
                <p className="flex items-center gap-1.5 text-xs text-amber-600">
                  <Lock className="size-3.5" /> The selected part’s package must be Complete before inviting.
                </p>
              ) : null}

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submit} disabled={pending || !effectiveComplete}>
                  {pending ? 'Creating…' : 'Create magic link'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
