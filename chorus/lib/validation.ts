/**
 * Zod schemas shared by React Hook Form (client validation) and the server
 * actions (authoritative validation). One schema, both sides.
 */
import { z } from 'zod';
import {
  BRAND_DECISIONS,
  CONFIDENTIALITY_LEVELS,
  IMPLEMENTATION_STATES,
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_TYPES,
  NDA_STATUSES,
  PART_PROCESSES,
  PROVIDER_ROLES,
  ACCESS_PERMISSIONS,
  SIGNOFF_STATES,
} from '@/types/enums';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name is required'),
  description: z.string().max(400).optional().or(z.literal('')),
  target_completion: z.string().optional().or(z.literal('')),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createPartSchema = z.object({
  project_id: z.string().min(1, 'Pick a project'),
  part_number: z.string().min(1, 'Part number is required'),
  name: z.string().min(2, 'Part name is required'),
  material: z.string().optional().or(z.literal('')),
  finish: z.string().optional().or(z.literal('')),
  process: z.enum(PART_PROCESSES),
  target_volume: z.coerce.number().int().nonnegative().optional(),
  target_cost: z.coerce.number().nonnegative().optional(),
  description: z.string().max(600).optional().or(z.literal('')),
});
export type CreatePartInput = z.infer<typeof createPartSchema>;

export const createIssueSchema = z.object({
  dfm_id: z.string().min(1),
  title: z.string().min(3, 'Give the issue a clear title'),
  description: z.string().min(1, 'Describe the manufacturability risk'),
  type: z.enum(ISSUE_TYPES),
  category: z.enum(ISSUE_CATEGORIES),
  severity: z.enum(ISSUE_SEVERITIES),
  recommendation: z.string().optional().or(z.literal('')),
  cost_impact: z.coerce.number().optional(),
  yield_impact: z.string().optional().or(z.literal('')),
});
export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const commentSchema = z.object({
  issue_id: z.string().min(1),
  body: z.string().min(1, 'Write a comment'),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const implementationSchema = z.object({
  issue_id: z.string().min(1),
  state: z.enum(IMPLEMENTATION_STATES),
  revision_id: z.string().optional().or(z.literal('')),
}).refine((v) => v.state !== 'implemented' || (v.revision_id && v.revision_id.length > 0), {
  message: 'Pick the revision the fix was implemented in',
  path: ['revision_id'],
});
export type ImplementationInput = z.infer<typeof implementationSchema>;

export const validateIssueSchema = z.object({
  issue_id: z.string().min(1),
  result: z.enum(['validated', 'validation_failed']),
});
export type ValidateIssueInput = z.infer<typeof validateIssueSchema>;

export const advanceSignoffSchema = z.object({
  signoff_id: z.string().min(1),
  state: z.enum(SIGNOFF_STATES),
  rationale: z.string().optional().or(z.literal('')),
});
export type AdvanceSignoffInput = z.infer<typeof advanceSignoffSchema>;

export const uploadRevisionSchema = z.object({
  part_id: z.string().min(1),
  change_summary: z.string().min(3, 'Describe what changed in this revision'),
  quote_amount: z.coerce.number().nonnegative().optional(),
  set_current: z.boolean().optional(),
});
export type UploadRevisionInput = z.infer<typeof uploadRevisionSchema>;

export const approveDfmSchema = z.object({
  part_id: z.string().min(1),
  approved_revision_id: z.string().min(1, 'Select the revision to freeze'),
  po_reference: z.string().optional().or(z.literal('')),
  tooling_reference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
export type ApproveDfmInput = z.infer<typeof approveDfmSchema>;

export const dispositionSchema = z
  .object({
    issue_id: z.string().min(1),
    decision: z.enum(BRAND_DECISIONS),
    rationale: z.string().optional().or(z.literal('')),
  })
  .refine((v) => v.decision !== 'rejected' || (v.rationale && v.rationale.length > 0), {
    message: 'A rejection requires a written rationale',
    path: ['rationale'],
  });
export type DispositionInput = z.infer<typeof dispositionSchema>;

export const inviteReviewerSchema = z.object({
  part_id: z.string().min(1, 'Pick a part to scope access to'),
  company: z.string().min(2, 'Company is required'),
  contact_name: z.string().min(2, 'Contact name is required'),
  contact_email: z.string().email('Valid email required'),
  provider_role: z.enum(PROVIDER_ROLES),
  nda_status: z.enum(NDA_STATUSES),
  confidentiality: z.enum(CONFIDENTIALITY_LEVELS),
  permissions: z.array(z.enum(ACCESS_PERMISSIONS)).min(1, 'Grant at least one permission'),
  expiry_days: z.coerce.number().int().positive().max(365).default(30),
});
export type InviteReviewerInput = z.infer<typeof inviteReviewerSchema>;
