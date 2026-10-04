/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createGoalAction,
  updateGoalAction,
  deleteGoalAction,
  createRoadmapItemAction,
  updateRoadmapItemAction,
  reorderRoadmapAction,
  deleteRoadmapItemAction,
  createMilestoneAction,
  updateMilestoneAction,
  deleteMilestoneAction,
  createTaskAction,
  updateTaskAction,
  updateTaskStatusAction,
  updateTaskPriorityAction,
  deleteTaskAction,
} from './workspace';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Workspace Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = { id: '11111111-1111-4111-8111-111111111111' };
  const mockOtherUser = { id: '99999999-9999-4999-8999-999999999999' };
  const projectId = '11111111-1111-4111-8111-111111111111';
  const goalId = '22222222-2222-4222-8222-222222222222';
  const milestoneId = '33333333-3333-4333-8333-333333333333';
  const taskId = '44444444-4444-4444-8444-444444444444';
  const roadmapItemId = '55555555-5555-4555-8555-555555555555';

  describe('Authorization Guards', () => {
    it('blocks unauthenticated callers with UNAUTHORIZED', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not logged in' },
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createGoalAction({
        projectId,
        title: 'Launch Project',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('blocks non-members with FORBIDDEN', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: 'different-owner' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null, // not a member
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createGoalAction({
        projectId,
        title: 'Unauthorized Goal',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Goals Actions', () => {
    it('creates a goal and records activity for project members', async () => {
      const insertedGoal = { id: goalId, title: 'Beta Release' };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'goals') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: insertedGoal,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createGoalAction({
        projectId,
        title: 'Beta Release',
        description: 'First public deployment',
        targetDate: '2026-12-01',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(goalId);
      }
    });

    it('prevents non-admin non-creator from deleting a goal', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: 'some-owner' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { role: 'contributor' }, // regular member, not admin
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'goals') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: goalId, creator_id: 'another-creator' }, // different creator
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteGoalAction(goalId, projectId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Roadmap Actions', () => {
    it('creates a roadmap item with position and logs activity', async () => {
      const insertedItem = { id: roadmapItemId, title: 'Phase 1 MVP' };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_roadmap_items') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { position: 1000 },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: insertedItem,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createRoadmapItemAction({
        projectId,
        title: 'Phase 1 MVP',
        targetQuarter: 'Q4 2026',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(roadmapItemId);
      }
    });

    it('reorders roadmap items by updating position', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_roadmap_items') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await reorderRoadmapAction({
        projectId,
        itemIds: [roadmapItemId],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Milestones Actions', () => {
    it('creates milestone and links valid project goal', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'goals') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: goalId },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'milestones') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: milestoneId },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createMilestoneAction({
        projectId,
        title: 'Core UI Complete',
        goalId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(milestoneId);
      }
    });
  });

  describe('Task Actions & Assignee Invariants', () => {
    it('rejects task creation if assignee is NOT a verified project member', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            // Assignee membership check returns null (not a member)
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createTaskAction({
        projectId,
        title: 'Unauthorized assignment task',
        assigneeId: mockOtherUser.id, // non-member
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('Tasks can only be assigned to accepted members');
      }
    });

    it('rejects task creation if milestone does not belong to project', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'milestones') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null, // milestone not found in project
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createTaskAction({
        projectId,
        title: 'Task with cross-project milestone',
        milestoneId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('selected milestone does not belong to this project');
      }
    });

    it('successfully creates task for project member and logs activity', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({
                          data: { position: 1000 },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: taskId },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createTaskAction({
        projectId,
        title: 'Build Kanban Board DnD',
        description: 'Accessible drag and drop with keyboard controls',
        priority: 'high',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(taskId);
      }
    });

    it('updates task status and logs task_status_changed event', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: taskId, status: 'in_progress', title: 'Task' },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateTaskStatusAction({
        taskId,
        projectId,
        status: 'done',
      });

      expect(result.success).toBe(true);
    });

    it('updates task priority and logs task_priority_changed event', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: taskId, priority: 'medium', title: 'Task' },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateTaskPriorityAction({
        taskId,
        projectId,
        priority: 'urgent',
      });

      expect(result.success).toBe(true);
    });

    it('updates a task full details', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: taskId, title: 'Old Title', status: 'todo' },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateTaskAction({
        taskId,
        projectId,
        title: 'New Title',
      });

      expect(result.success).toBe(true);
    });

    it('deletes a task when requested by project owner', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'tasks') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: taskId, title: 'To Delete', creator_id: mockUser.id },
                      error: null,
                    }),
                  }),
                }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteTaskAction(taskId, projectId);
      expect(result.success).toBe(true);
    });
  });

  describe('Additional Action Coverage', () => {
    it('updates a goal', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'goals') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateGoalAction({
        goalId,
        projectId,
        title: 'Updated Goal Title',
        status: 'achieved',
      });
      expect(result.success).toBe(true);
    });

    it('updates and deletes a roadmap item', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'project_roadmap_items') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: roadmapItemId, title: 'Item', created_by: mockUser.id },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const updateRes = await updateRoadmapItemAction({
        itemId: roadmapItemId,
        projectId,
        title: 'Updated Item Title',
      });
      expect(updateRes.success).toBe(true);

      const deleteRes = await deleteRoadmapItemAction(roadmapItemId, projectId);
      expect(deleteRes.success).toBe(true);
    });

    it('updates and deletes a milestone', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'milestones') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: milestoneId, title: 'Milestone' },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const updateRes = await updateMilestoneAction({
        milestoneId,
        projectId,
        title: 'Updated Milestone',
      });
      expect(updateRes.success).toBe(true);

      const deleteRes = await deleteMilestoneAction(milestoneId, projectId);
      expect(deleteRes.success).toBe(true);
    });
  });
});
