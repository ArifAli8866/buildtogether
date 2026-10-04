import { z } from 'zod';

export const goalStatusEnum = z.enum(['in_progress', 'achieved', 'paused', 'archived']);
export type GoalStatus = z.infer<typeof goalStatusEnum>;

export const milestoneStatusEnum = z.enum(['planned', 'in_progress', 'completed', 'cancelled']);
export type MilestoneStatus = z.infer<typeof milestoneStatusEnum>;

export const roadmapStatusEnum = z.enum(['planned', 'in_progress', 'completed', 'blocked']);
export type RoadmapStatus = z.infer<typeof roadmapStatusEnum>;

export const taskStatusEnum = z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof taskPriorityEnum>;

// ==========================================
// GOALS SCHEMAS
// ==========================================

export const createGoalSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(3, 'Goal title must be at least 3 characters')
    .max(140, 'Goal title cannot exceed 140 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format').optional().nullable(),
  status: goalStatusEnum.default('in_progress'),
});

export type CreateGoalInput = z.input<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID'),
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(3, 'Goal title must be at least 3 characters')
    .max(140, 'Goal title cannot exceed 140 characters')
    .optional(),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format').optional().nullable(),
  status: goalStatusEnum.optional(),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

// ==========================================
// ROADMAP SCHEMAS
// ==========================================

export const createRoadmapItemSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(3, 'Roadmap title must be at least 3 characters')
    .max(140, 'Roadmap title cannot exceed 140 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
  status: roadmapStatusEnum.default('planned'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format').optional().nullable(),
  targetQuarter: z.string().trim().max(30, 'Timeframe cannot exceed 30 characters').optional().nullable(),
  goalId: z.string().uuid('Invalid goal ID').optional().nullable(),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  position: z.number().optional(),
});

export type CreateRoadmapItemInput = z.input<typeof createRoadmapItemSchema>;

export const updateRoadmapItemSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(3, 'Roadmap title must be at least 3 characters')
    .max(140, 'Roadmap title cannot exceed 140 characters')
    .optional(),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
  status: roadmapStatusEnum.optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format').optional().nullable(),
  targetQuarter: z.string().trim().max(30, 'Timeframe cannot exceed 30 characters').optional().nullable(),
  goalId: z.string().uuid('Invalid goal ID').optional().nullable(),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  position: z.number().optional(),
});

export type UpdateRoadmapItemInput = z.infer<typeof updateRoadmapItemSchema>;

export const reorderRoadmapSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  itemIds: z.array(z.string().uuid()).min(1, 'Must provide at least one item ID to reorder'),
});

export type ReorderRoadmapInput = z.infer<typeof reorderRoadmapSchema>;

// ==========================================
// MILESTONES SCHEMAS
// ==========================================

export const createMilestoneSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  goalId: z.string().uuid('Invalid goal ID').optional().nullable(),
  title: z
    .string()
    .trim()
    .min(3, 'Milestone title must be at least 3 characters')
    .max(140, 'Milestone title cannot exceed 140 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format').optional().nullable(),
  status: milestoneStatusEnum.default('planned'),
});

export type CreateMilestoneInput = z.input<typeof createMilestoneSchema>;

export const updateMilestoneSchema = z.object({
  milestoneId: z.string().uuid('Invalid milestone ID'),
  projectId: z.string().uuid('Invalid project ID'),
  goalId: z.string().uuid('Invalid goal ID').optional().nullable(),
  title: z
    .string()
    .trim()
    .min(3, 'Milestone title must be at least 3 characters')
    .max(140, 'Milestone title cannot exceed 140 characters')
    .optional(),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format').optional().nullable(),
  status: milestoneStatusEnum.optional(),
});

export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// ==========================================
// TASKS SCHEMAS
// ==========================================

export const createTaskSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  goalId: z.string().uuid('Invalid goal ID').optional().nullable(),
  title: z
    .string()
    .trim()
    .min(2, 'Task title must be at least 2 characters')
    .max(180, 'Task title cannot exceed 180 characters'),
  description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').default(''),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  status: taskStatusEnum.default('todo'),
  priority: taskPriorityEnum.default('medium'),
  estimateHours: z.coerce.number().min(0, 'Estimate cannot be negative').max(500, 'Estimate cannot exceed 500 hours').optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format').optional().nullable(),
  labels: z
    .array(z.string().trim().min(1).max(30))
    .max(10, 'Maximum of 10 labels allowed')
    .default([]),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .trim()
    .min(2, 'Task title must be at least 2 characters')
    .max(180, 'Task title cannot exceed 180 characters')
    .optional(),
  description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  milestoneId: z.string().uuid('Invalid milestone ID').optional().nullable(),
  goalId: z.string().uuid('Invalid goal ID').optional().nullable(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  estimateHours: z.coerce.number().min(0).max(500).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format').optional().nullable(),
  labels: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  projectId: z.string().uuid('Invalid project ID'),
  status: taskStatusEnum,
  position: z.number().optional(),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const updateTaskPrioritySchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  projectId: z.string().uuid('Invalid project ID'),
  priority: taskPriorityEnum,
});

export type UpdateTaskPriorityInput = z.infer<typeof updateTaskPrioritySchema>;
