import { z } from 'zod';

// ==========================================
// ENUMS & HELPERS
// ==========================================

export const canvasItemTypeEnum = z.enum([
  'sticky_note',
  'idea',
  'risk',
  'tech_stack',
  'decision',
]);

export const meetingStatusEnum = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

export const meetingParticipantStatusEnum = z.enum([
  'attending',
  'declined',
  'tentative',
]);

// Hex color validation
const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// URL validation helper (allows empty string or valid http/https url)
const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val || val.length === 0) return true;
      try {
        const u = new URL(val);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid URL starting with http:// or https://' }
  );

// ==========================================
// DISCUSSIONS SCHEMAS
// ==========================================

export const createDiscussionSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  content: z
    .string()
    .trim()
    .min(5, 'Content must be at least 5 characters')
    .max(10000, 'Content cannot exceed 10000 characters'),
  category: z
    .string()
    .trim()
    .min(1, 'Category cannot be empty')
    .max(50, 'Category cannot exceed 50 characters')
    .default('general'),
  pinned: z.boolean().default(false),
});

export type CreateDiscussionInput = z.input<typeof createDiscussionSchema>;

export const updateDiscussionSchema = z.object({
  discussionId: z.string().uuid('Invalid discussion ID'),
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters')
    .optional(),
  content: z
    .string()
    .trim()
    .min(5, 'Content must be at least 5 characters')
    .max(10000, 'Content cannot exceed 10000 characters')
    .optional(),
  category: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional(),
  pinned: z.boolean().optional(),
});

export type UpdateDiscussionInput = z.input<typeof updateDiscussionSchema>;

export const deleteDiscussionSchema = z.object({
  discussionId: z.string().uuid('Invalid discussion ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

export type DeleteDiscussionInput = z.infer<typeof deleteDiscussionSchema>;

// ==========================================
// DISCUSSION COMMENTS SCHEMAS
// ==========================================

export const createDiscussionCommentSchema = z.object({
  discussionId: z.string().uuid('Invalid discussion ID'),
  projectId: z.string().uuid('Invalid project ID'),
  parentCommentId: z.string().uuid('Invalid parent comment ID').optional().nullable(),
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(3000, 'Comment cannot exceed 3000 characters'),
});

export type CreateDiscussionCommentInput = z.input<typeof createDiscussionCommentSchema>;

export const updateDiscussionCommentSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
  projectId: z.string().uuid('Invalid project ID'),
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(3000, 'Comment cannot exceed 3000 characters'),
});

export type UpdateDiscussionCommentInput = z.infer<typeof updateDiscussionCommentSchema>;

export const deleteDiscussionCommentSchema = z.object({
  commentId: z.string().uuid('Invalid comment ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

export type DeleteDiscussionCommentInput = z.infer<typeof deleteDiscussionCommentSchema>;

// ==========================================
// MEETINGS SCHEMAS
// ==========================================

export const createMeetingSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(3, 'Meeting title must be at least 3 characters')
    .max(150, 'Meeting title cannot exceed 150 characters'),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').default(''),
  scheduledAt: z.string().min(1, 'Scheduled date and time is required'),
  durationMinutes: z.coerce.number().int().min(5, 'Minimum duration is 5 minutes').max(480, 'Maximum duration is 8 hours').default(30),
  meetingUrl: optionalUrlSchema,
  status: meetingStatusEnum.default('scheduled'),
  participantIds: z.array(z.string().uuid('Invalid user ID')).default([]),
});

export type CreateMeetingInput = z.input<typeof createMeetingSchema>;

export const updateMeetingSchema = z.object({
  meetingId: z.string().uuid('Invalid meeting ID'),
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(3, 'Meeting title must be at least 3 characters')
    .max(150, 'Meeting title cannot exceed 150 characters')
    .optional(),
  description: z.string().trim().max(2000).optional(),
  scheduledAt: z.string().min(1).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  meetingUrl: optionalUrlSchema,
  status: meetingStatusEnum.optional(),
});

export type UpdateMeetingInput = z.input<typeof updateMeetingSchema>;

export const deleteMeetingSchema = z.object({
  meetingId: z.string().uuid('Invalid meeting ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

export type DeleteMeetingInput = z.infer<typeof deleteMeetingSchema>;

export const updateMeetingParticipantSchema = z.object({
  meetingId: z.string().uuid('Invalid meeting ID'),
  projectId: z.string().uuid('Invalid project ID'),
  status: meetingParticipantStatusEnum,
});

export type UpdateMeetingParticipantInput = z.infer<typeof updateMeetingParticipantSchema>;

// ==========================================
// MEETING NOTES SCHEMAS
// ==========================================

export const saveMeetingNoteSchema = z.object({
  meetingId: z.string().uuid('Invalid meeting ID'),
  projectId: z.string().uuid('Invalid project ID'),
  content: z.string().trim().max(10000, 'Notes cannot exceed 10000 characters').default(''),
  decisions: z.string().trim().max(5000, 'Decisions cannot exceed 5000 characters').default(''),
  actionItems: z.string().trim().max(5000, 'Action items cannot exceed 5000 characters').default(''),
});

export type SaveMeetingNoteInput = z.input<typeof saveMeetingNoteSchema>;

// ==========================================
// PROJECT NOTES SCHEMAS
// ==========================================

export const createProjectNoteSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(2, 'Note title must be at least 2 characters')
    .max(150, 'Note title cannot exceed 150 characters'),
  content: z.string().trim().max(20000, 'Note content cannot exceed 20000 characters').default(''),
  category: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .default('general'),
});

export type CreateProjectNoteInput = z.input<typeof createProjectNoteSchema>;

export const updateProjectNoteSchema = z.object({
  noteId: z.string().uuid('Invalid note ID'),
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(2, 'Note title must be at least 2 characters')
    .max(150, 'Note title cannot exceed 150 characters')
    .optional(),
  content: z.string().trim().max(20000).optional(),
  category: z.string().trim().min(1).max(50).optional(),
});

export type UpdateProjectNoteInput = z.input<typeof updateProjectNoteSchema>;

export const deleteProjectNoteSchema = z.object({
  noteId: z.string().uuid('Invalid note ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

export type DeleteProjectNoteInput = z.infer<typeof deleteProjectNoteSchema>;

// ==========================================
// PROJECT CANVAS & STICKY NOTES SCHEMAS
// ==========================================

export const saveCanvasItemSchema = z.object({
  id: z.string().uuid('Invalid canvas item ID').optional(),
  projectId: z.string().uuid('Invalid project ID'),
  itemType: canvasItemTypeEnum.default('sticky_note'),
  content: z
    .string()
    .trim()
    .min(1, 'Sticky note content cannot be empty')
    .max(1000, 'Sticky note content cannot exceed 1000 characters'),
  color: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color')
    .default('#fef08a'),
  positionX: z.coerce.number().default(100),
  positionY: z.coerce.number().default(100),
  width: z.coerce.number().min(120).max(600).default(220),
  height: z.coerce.number().min(80).max(600).default(180),
});

export type SaveCanvasItemInput = z.input<typeof saveCanvasItemSchema>;

export const updateCanvasItemPositionSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  projectId: z.string().uuid('Invalid project ID'),
  positionX: z.coerce.number(),
  positionY: z.coerce.number(),
  width: z.coerce.number().min(120).max(600).optional(),
  height: z.coerce.number().min(80).max(600).optional(),
});

export type UpdateCanvasItemPositionInput = z.infer<typeof updateCanvasItemPositionSchema>;

export const deleteCanvasItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  projectId: z.string().uuid('Invalid project ID'),
});

export type DeleteCanvasItemInput = z.infer<typeof deleteCanvasItemSchema>;
