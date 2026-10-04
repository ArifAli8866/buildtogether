import { z } from 'zod';

// ==========================================
// ENUMS & HELPERS
// ==========================================

export const communityPostTypeEnum = z.enum([
  'project_announcement',
  'recruitment',
  'technical_discussion',
  'project_update',
  'question',
  'achievement',
  'learning',
]);

const tagSchema = z
  .string()
  .trim()
  .min(1, 'Tag cannot be empty')
  .max(30, 'Tag cannot exceed 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Tag can only contain letters, numbers, hyphens, and underscores');

// ==========================================
// COMMUNITY POST SCHEMAS
// ==========================================

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z
    .string()
    .trim()
    .min(5, 'Content must be at least 5 characters')
    .max(10000, 'Content cannot exceed 10,000 characters'),
  post_type: communityPostTypeEnum,
  project_id: z.string().uuid('Invalid project ID').optional().nullable(),
  tags: z
    .array(tagSchema)
    .max(10, 'Cannot exceed 10 tags')
    .optional()
    .default([]),
});

export const updatePostSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z
    .string()
    .trim()
    .min(5, 'Content must be at least 5 characters')
    .max(10000, 'Content cannot exceed 10,000 characters'),
  post_type: communityPostTypeEnum,
  project_id: z.string().uuid('Invalid project ID').optional().nullable(),
  tags: z
    .array(tagSchema)
    .max(10, 'Cannot exceed 10 tags')
    .optional()
    .default([]),
});

export const deletePostSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
});

export const togglePostLikeSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
});

export const togglePostSaveSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
});

// ==========================================
// COMMENTS SCHEMAS
// ==========================================

export const createPostCommentSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment cannot exceed 2,000 characters'),
  parentId: z.string().uuid('Invalid parent comment ID').optional().nullable(),
});

export const deletePostCommentSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
});

// ==========================================
// DEVELOPER NETWORK & CONNECTIONS SCHEMAS
// ==========================================

export const sendConnectionRequestSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID'),
});

export const respondConnectionRequestSchema = z.object({
  connectionId: z.string().uuid('Invalid connection ID'),
  action: z.enum(['accept', 'decline']),
});

export const removeConnectionSchema = z.object({
  connectionId: z.string().uuid('Invalid connection ID'),
});

// ==========================================
// NOTIFICATIONS SCHEMAS
// ==========================================

export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
});

// Inferred TypeScript Types
export type CreatePostInput = z.input<typeof createPostSchema>;
export type UpdatePostInput = z.input<typeof updatePostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
export type TogglePostLikeInput = z.infer<typeof togglePostLikeSchema>;
export type TogglePostSaveInput = z.infer<typeof togglePostSaveSchema>;
export type CreatePostCommentInput = z.infer<typeof createPostCommentSchema>;
export type DeletePostCommentInput = z.infer<typeof deletePostCommentSchema>;
export type SendConnectionRequestInput = z.infer<typeof sendConnectionRequestSchema>;
export type RespondConnectionRequestInput = z.infer<typeof respondConnectionRequestSchema>;
export type RemoveConnectionInput = z.infer<typeof removeConnectionSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
