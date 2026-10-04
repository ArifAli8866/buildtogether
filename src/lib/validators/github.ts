import { z } from 'zod';

export const connectRepoSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  repoId: z.number().int().positive('Invalid repository ID'),
  repoOwner: z
    .string()
    .min(1, 'Repository owner is required')
    .max(100)
    .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Invalid repository owner format'),
  repoName: z
    .string()
    .min(1, 'Repository name is required')
    .max(100)
    .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Invalid repository name format'),
  defaultBranch: z.string().min(1).max(100).default('main'),
});

export const disconnectRepoSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

export const syncRepoSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

export const createPrFromReviewSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  projectId: z.string().uuid('Invalid project ID'),
  branchName: z
    .string()
    .min(2, 'Branch name is required')
    .max(100)
    .regex(/^[a-zA-Z0-9_\-\.\/]+$/, 'Invalid Git branch name format'),
  prTitle: z.string().min(3, 'PR title must be at least 3 characters').max(150),
  prBody: z.string().min(5, 'PR description must be at least 5 characters').max(3000),
});

export type ConnectRepoInput = z.input<typeof connectRepoSchema>;
export type DisconnectRepoInput = z.input<typeof disconnectRepoSchema>;
export type SyncRepoInput = z.input<typeof syncRepoSchema>;
export type CreatePrFromReviewInput = z.input<typeof createPrFromReviewSchema>;
