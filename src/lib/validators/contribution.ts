import { z } from 'zod';

export const submitContributionSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  projectRoleId: z.string().uuid('Invalid role ID').optional().nullable(),
  pitch: z
    .string()
    .min(30, 'Please explain your motivation and relevant technical background (at least 30 characters)')
    .max(2000, 'Pitch cannot exceed 2000 characters'),
  portfolioLinks: z
    .array(z.string().url('Each link must be a valid URL'))
    .max(5, 'You can include up to 5 portfolio links')
    .default([]),
  weeklyHours: z.coerce
    .number()
    .int('Weekly hours must be a whole number')
    .min(1, 'Must commit at least 1 hour per week')
    .max(80, 'Commitment cannot exceed 80 hours per week'),
});

export type SubmitContributionInput = z.infer<typeof submitContributionSchema>;

export const reviewContributionSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
  decision: z.enum(['accepted', 'rejected', 'under_review', 'info_requested']),
  reviewNotes: z.string().max(1000, 'Review notes cannot exceed 1000 characters').optional().nullable(),
});

export type ReviewContributionInput = z.infer<typeof reviewContributionSchema>;

export const manageMemberRoleSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  memberId: z.string().uuid('Invalid member ID'),
  newRole: z.enum(['maintainer', 'contributor', 'viewer']),
});

export type ManageMemberRoleInput = z.infer<typeof manageMemberRoleSchema>;

export const removeMemberSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  memberId: z.string().uuid('Invalid member ID'),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
