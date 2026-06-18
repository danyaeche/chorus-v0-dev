/**
 * Zod schemas shared by React Hook Form (client validation) and the server
 * actions (authoritative validation). One schema, both sides.
 */
import { z } from 'zod';
import {
  BRAND_DECISIONS,
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_TYPES,
  PART_PROCESSES,
  PROVIDER_ROLES,
  ACCESS_PERMISSIONS,
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
});
export type CreateIssueInput = z.infer<typeof createIssueSchema>;

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
  company: z.string().min(2, 'Company is required'),
  contact_name: z.string().min(2, 'Contact name is required'),
  contact_email: z.string().email('Valid email required'),
  provider_role: z.enum(PROVIDER_ROLES),
  project_id: z.string().min(1),
  permissions: z.array(z.enum(ACCESS_PERMISSIONS)).min(1, 'Grant at least one permission'),
});
export type InviteReviewerInput = z.infer<typeof inviteReviewerSchema>;
