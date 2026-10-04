import { z } from 'zod';

export const projectRoleInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2, 'Role title must be at least 2 characters').max(60),
  description: z.string().min(5, 'Role description must be at least 5 characters').max(500),
  requiredSkills: z.array(z.string()).min(1, 'Select at least 1 required skill').max(10),
  capacityCount: z.coerce.number().int().min(1, 'Capacity must be at least 1').max(10).default(1),
  commitmentHours: z.coerce.number().int().min(1, 'Must commit at least 1 hr/wk').max(60).default(10),
});

export type ProjectRoleInput = z.infer<typeof projectRoleInputSchema>;

export const createProjectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(80),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
  tagline: z.string().min(10, 'Tagline must be at least 10 characters').max(160),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  problemStatement: z.string().min(10, 'Problem statement must be at least 10 characters').max(3000),
  proposedSolution: z.string().min(10, 'Proposed solution must be at least 10 characters').max(3000),
  category: z.string().min(2, 'Category is required').max(50),
  stage: z.enum(['idea', 'planning', 'in_development', 'testing', 'shipped']).default('idea'),
  visibility: z.enum(['public', 'private']).default('public'),
  collaborationType: z.enum(['remote', 'hybrid', 'in_person']).default('remote'),
  technologyIds: z.array(z.string().uuid()).default([]),
  roles: z.array(projectRoleInputSchema).min(1, 'Define at least one contributor role needed for this project'),
  initialGoals: z.array(z.string().max(120)).max(5).default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(80),
  tagline: z.string().min(10).max(160),
  description: z.string().min(20).max(5000),
  problemStatement: z.string().min(10).max(3000),
  proposedSolution: z.string().min(10).max(3000),
  category: z.string().min(2).max(50),
  stage: z.enum(['idea', 'planning', 'in_development', 'testing', 'shipped']),
  visibility: z.enum(['public', 'private']),
  collaborationType: z.enum(['remote', 'hybrid', 'in_person']),
  technologyIds: z.array(z.string().uuid()).default([]),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
