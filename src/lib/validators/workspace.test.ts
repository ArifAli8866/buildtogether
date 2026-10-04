import { describe, it, expect } from 'vitest';
import {
  createGoalSchema,
  updateGoalSchema,
  createRoadmapItemSchema,
  updateRoadmapItemSchema,
  reorderRoadmapSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  updateTaskPrioritySchema,
} from './workspace';

describe('Workspace Validators', () => {
  const validUUID = '11111111-1111-4111-8111-111111111111';
  const validUUID2 = '22222222-2222-4222-8222-222222222222';
  const validUUID3 = '33333333-3333-4333-8333-333333333333';

  describe('createGoalSchema', () => {
    it('validates a correct goal creation payload', () => {
      const result = createGoalSchema.safeParse({
        projectId: validUUID,
        title: 'Launch MVP v1.0',
        description: 'Complete core features and launch on Product Hunt',
        targetDate: '2026-12-31',
        status: 'in_progress',
      });
      expect(result.success).toBe(true);
    });

    it('defaults status to in_progress if not provided', () => {
      const result = createGoalSchema.safeParse({
        projectId: validUUID,
        title: 'Build Architecture Docs',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('in_progress');
      }
    });

    it('fails if title is too short', () => {
      const result = createGoalSchema.safeParse({
        projectId: validUUID,
        title: 'No',
      });
      expect(result.success).toBe(false);
    });

    it('fails if projectId is invalid UUID', () => {
      const result = createGoalSchema.safeParse({
        projectId: 'not-a-uuid',
        title: 'Valid Title',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateGoalSchema', () => {
    it('validates goal update with partial fields', () => {
      const result = updateGoalSchema.safeParse({
        goalId: validUUID,
        projectId: validUUID2,
        status: 'achieved',
        title: 'Completed Goal Title',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = updateGoalSchema.safeParse({
        goalId: validUUID,
        projectId: validUUID2,
        status: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createRoadmapItemSchema', () => {
    it('validates a complete roadmap item payload', () => {
      const result = createRoadmapItemSchema.safeParse({
        projectId: validUUID,
        title: 'Q1 Production Release',
        description: 'Hardening security, load tests, and multi-region deployment.',
        targetQuarter: 'Q1 2027',
        targetDate: '2027-03-31',
        status: 'planned',
        goalId: validUUID2,
        milestoneId: validUUID3,
      });
      expect(result.success).toBe(true);
    });

    it('allows optional goalId and milestoneId as null or undefined', () => {
      const result = createRoadmapItemSchema.safeParse({
        projectId: validUUID,
        title: 'Exploration Spike',
        goalId: null,
        milestoneId: null,
      });
      expect(result.success).toBe(true);
    });

    it('fails if title is empty', () => {
      const result = createRoadmapItemSchema.safeParse({
        projectId: validUUID,
        title: '  ',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reorderRoadmapSchema', () => {
    it('validates reordered item position array', () => {
      const result = reorderRoadmapSchema.safeParse({
        projectId: validUUID,
        itemIds: [validUUID, validUUID2, validUUID3],
      });
      expect(result.success).toBe(true);
    });

    it('fails if itemIds contains non-UUIDs', () => {
      const result = reorderRoadmapSchema.safeParse({
        projectId: validUUID,
        itemIds: ['item-1', 'item-2'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createMilestoneSchema', () => {
    it('validates milestone with linked goal and due date', () => {
      const result = createMilestoneSchema.safeParse({
        projectId: validUUID,
        title: 'Alpha Release (Sprint 4)',
        description: 'End-to-end integration test passes',
        dueDate: '2026-11-15',
        goalId: validUUID2,
      });
      expect(result.success).toBe(true);
    });

    it('fails if title exceeds 150 characters', () => {
      const result = createMilestoneSchema.safeParse({
        projectId: validUUID,
        title: 'a'.repeat(151),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createTaskSchema', () => {
    it('validates a complete task creation payload with assignee and labels', () => {
      const result = createTaskSchema.safeParse({
        projectId: validUUID,
        title: 'Implement Kanban Board drag-and-drop',
        description: 'Support optimistic updates and keyboard accessibility.',
        status: 'in_progress',
        priority: 'high',
        assigneeId: validUUID2,
        milestoneId: validUUID3,
        goalId: null,
        estimateHours: 8,
        labels: ['frontend', 'react', 'a11y'],
        dueDate: '2026-10-10',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('high');
        expect(result.data.labels).toHaveLength(3);
        expect(result.data.estimateHours).toBe(8);
      }
    });

    it('defaults status to todo and priority to medium if omitted', () => {
      const result = createTaskSchema.safeParse({
        projectId: validUUID,
        title: 'Quick task description',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('todo');
        expect(result.data.priority).toBe('medium');
      }
    });

    it('fails if priority is invalid', () => {
      const result = createTaskSchema.safeParse({
        projectId: validUUID,
        title: 'Task title',
        priority: 'super-critical',
      });
      expect(result.success).toBe(false);
    });

    it('fails if estimateHours is negative', () => {
      const result = createTaskSchema.safeParse({
        projectId: validUUID,
        title: 'Task title',
        estimateHours: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTaskStatusSchema', () => {
    it('validates valid status transitions', () => {
      const statuses = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;
      for (const status of statuses) {
        const result = updateTaskStatusSchema.safeParse({
          taskId: validUUID,
          projectId: validUUID2,
          status,
          position: 2,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid status', () => {
      const result = updateTaskStatusSchema.safeParse({
        taskId: validUUID,
        projectId: validUUID2,
        status: 'archived',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTaskPrioritySchema', () => {
    it('validates valid priority transitions', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'] as const;
      for (const priority of priorities) {
        const result = updateTaskPrioritySchema.safeParse({
          taskId: validUUID,
          projectId: validUUID2,
          priority,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('updateRoadmapItemSchema', () => {
    it('validates partial roadmap update', () => {
      const result = updateRoadmapItemSchema.safeParse({
        itemId: validUUID,
        projectId: validUUID2,
        title: 'Updated Title',
        status: 'in_progress',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateMilestoneSchema', () => {
    it('validates partial milestone update', () => {
      const result = updateMilestoneSchema.safeParse({
        milestoneId: validUUID,
        projectId: validUUID2,
        title: 'Updated Milestone',
        status: 'completed',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateTaskSchema', () => {
    it('validates partial task update', () => {
      const result = updateTaskSchema.safeParse({
        taskId: validUUID,
        projectId: validUUID2,
        title: 'Updated Task',
        priority: 'urgent',
        status: 'done',
      });
      expect(result.success).toBe(true);
    });
  });
});
