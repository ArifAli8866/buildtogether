import { z } from 'zod';

// ==========================================
// FILE VALIDATORS
// ==========================================

export const MAX_FILE_SIZE_BYTES = 26214400; // 25 MB

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
] as const;

export const uploadFileSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  folderPath: z
    .string()
    .min(1)
    .max(100)
    .regex(/^\/[a-zA-Z0-9_\-\/]*$/, 'Folder path must start with / and contain only alphanumeric characters, dashes, and underscores')
    .default('/'),
  description: z.string().max(500).optional().nullable(),
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .regex(/^[^\\/:*?"<>|]+$/, 'File name contains invalid characters'),
  fileSizeBytes: z
    .number()
    .int()
    .positive('File size must be greater than 0')
    .max(MAX_FILE_SIZE_BYTES, 'File size exceeds maximum limit of 25MB'),
  mimeType: z.string().refine((val) => {
    return ALLOWED_MIME_TYPES.includes(val as (typeof ALLOWED_MIME_TYPES)[number]) || val.startsWith('text/');
  }, 'Unsupported file format'),
});

export const deleteFileSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

export const getDownloadUrlSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

// ==========================================
// CODE SNIPPET VALIDATORS
// ==========================================

export const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'sql',
  'html',
  'css',
  'json',
  'yaml',
  'markdown',
  'bash',
  'other',
] as const;

export const createSnippetSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title too long'),
  filePath: z
    .string()
    .min(1, 'File path is required')
    .max(200, 'File path too long')
    .regex(/^[a-zA-Z0-9_\-./]+$/, 'File path contains invalid characters'),
  language: z.enum(SUPPORTED_LANGUAGES).default('typescript'),
  codeContent: z.string().max(50000, 'Code snippet exceeds maximum size of 50,000 characters').default(''),
});

export const updateSnippetSchema = z.object({
  snippetId: z.string().uuid('Invalid snippet ID'),
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(2).max(100).optional(),
  filePath: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9_\-./]+$/, 'File path contains invalid characters')
    .optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
  codeContent: z.string().max(50000).optional(),
});

export const deleteSnippetSchema = z.object({
  snippetId: z.string().uuid('Invalid snippet ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

// ==========================================
// CODE REVIEW VALIDATORS
// ==========================================

export const codeReviewChangeTypeEnum = z.enum(['added', 'modified', 'deleted']);
export const codeReviewStatusEnum = z.enum(['draft', 'review', 'changes_requested', 'approved', 'merged']);

export const codeReviewFileChangeSchema = z.object({
  filePath: z
    .string()
    .min(1, 'File path is required')
    .max(200)
    .regex(/^[a-zA-Z0-9_\-./]+$/, 'File path contains invalid characters'),
  changeType: codeReviewChangeTypeEnum.default('modified'),
  oldContent: z.string().nullable().optional(),
  newContent: z.string().max(50000, 'File content exceeds maximum size of 50,000 characters'),
});

export const createCodeReviewSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(150, 'Title too long'),
  summary: z.string().min(5, 'Summary must be at least 5 characters').max(3000, 'Summary too long'),
  baseBranch: z.string().min(1).max(50).default('main'),
  targetBranch: z.string().min(1, 'Branch name is required').max(50),
  status: codeReviewStatusEnum.default('draft'),
  files: z.array(codeReviewFileChangeSchema).min(1, 'At least one file must be changed in a code review'),
});

export const updateCodeReviewSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(3).max(150).optional(),
  summary: z.string().min(5).max(3000).optional(),
  baseBranch: z.string().min(1).max(50).optional(),
  targetBranch: z.string().min(1).max(50).optional(),
  status: codeReviewStatusEnum.optional(),
});

export const deleteCodeReviewSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

export const submitReviewDecisionSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  projectId: z.string().uuid('Invalid project ID'),
  decision: z.enum(['approved', 'changes_requested', 'review', 'merged']),
  notes: z.string().max(1000).optional().nullable(),
});

export const addCodeReviewCommentSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  codeReviewFileId: z.string().uuid('Invalid review file ID'),
  projectId: z.string().uuid('Invalid project ID'),
  lineNumber: z.number().int().positive().nullable().optional(),
  diffSide: z.enum(['left', 'right']).nullable().optional(),
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
  parentCommentId: z.string().uuid().nullable().optional(),
});

export const deleteCodeReviewCommentSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

export const resolveCodeReviewCommentSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
  projectId: z.string().uuid('Invalid project ID'),
  isResolved: z.boolean(),
});

// Infer types
export type UploadFileInput = z.input<typeof uploadFileSchema>;
export type CreateSnippetInput = z.input<typeof createSnippetSchema>;
export type UpdateSnippetInput = z.input<typeof updateSnippetSchema>;
export type CreateCodeReviewInput = z.input<typeof createCodeReviewSchema>;
export type UpdateCodeReviewInput = z.input<typeof updateCodeReviewSchema>;
export type SubmitReviewDecisionInput = z.input<typeof submitReviewDecisionSchema>;
export type AddCodeReviewCommentInput = z.input<typeof addCodeReviewCommentSchema>;
