import { z } from 'zod';

export const searchEntityTypeEnum = z.enum([
  'all',
  'projects',
  'developers',
  'posts',
  'tasks',
]);

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Search query must be at least 1 character')
    .max(100, 'Search query cannot exceed 100 characters'),
  type: searchEntityTypeEnum.optional().default('all'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(20),
});

export type SearchQueryInput = z.input<typeof searchQuerySchema>;
export type SearchQueryOutput = z.infer<typeof searchQuerySchema>;
