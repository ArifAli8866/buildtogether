import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name cannot exceed 100 characters'),
  headline: z.string().max(160, 'Headline cannot exceed 160 characters').optional().nullable(),
  bio: z.string().max(2000, 'Bio cannot exceed 2000 characters').optional().nullable(),
  location: z.string().max(100, 'Location cannot exceed 100 characters').optional().nullable(),
  timezone: z.string().max(50).default('UTC').optional(),
  availabilityHours: z.coerce.number().int().min(0, 'Hours must be 0 or greater').max(100, 'Hours cannot exceed 100'),
  githubUsername: z.string().max(40).optional().nullable(),
  portfolioUrl: z
    .string()
    .url('Must be a valid URL (include https://)')
    .or(z.literal(''))
    .optional()
    .nullable(),
  socialLinks: z.record(z.string()).default({}),
  skillIds: z.array(z.string().uuid()).max(20, 'You can select up to 20 skills').default([]),
  technologyIds: z.array(z.string().uuid()).max(20, 'You can select up to 20 technologies').default([]),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const addExperienceSchema = z.object({
  title: z.string().min(2, 'Job or role title must be at least 2 characters').max(100),
  companyOrProject: z.string().min(2, 'Company or project name is required').max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD')
    .or(z.literal(''))
    .optional()
    .nullable(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
});

export type AddExperienceInput = z.infer<typeof addExperienceSchema>;
