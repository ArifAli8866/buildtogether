/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createDiscussionAction,
  updateDiscussionAction,
  deleteDiscussionAction,
  toggleDiscussionPinnedAction,
  createDiscussionCommentAction,
  updateDiscussionCommentAction,
  deleteDiscussionCommentAction,
  createMeetingAction,
  updateMeetingAction,
  deleteMeetingAction,
  updateMeetingParticipantAction,
  saveMeetingNoteAction,
  createProjectNoteAction,
  updateProjectNoteAction,
  deleteProjectNoteAction,
  saveCanvasItemAction,
  updateCanvasItemPositionAction,
  deleteCanvasItemAction,
} from './collaboration';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Collaboration Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = { id: '11111111-1111-4111-8111-111111111111' };
  const mockOtherUser = { id: '99999999-9999-4999-8999-999999999999' };
  const projectId = '11111111-1111-4111-8111-111111111111';
  const discussionId = '22222222-2222-4222-8222-222222222222';
  const commentId = '33333333-3333-4333-8333-333333333333';
  const meetingId = '44444444-4444-4444-8444-444444444444';
  const noteId = '55555555-5555-4555-8555-555555555555';
  const canvasItemId = '66666666-6666-4666-8666-666666666666';

  describe('Authorization Guards', () => {
    it('blocks unauthenticated callers from discussions', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not logged in' },
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createDiscussionAction({
        projectId,
        title: 'Title',
        content: 'Content',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('blocks non-members from creating meetings with FORBIDDEN', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockOtherUser.id },
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createMeetingAction({
        projectId,
        title: 'Standup',
        scheduledAt: '2026-10-10T10:00:00Z',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('Discussions Actions', () => {
    it('allows project member to create a discussion and records activity', async () => {
      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: discussionId,
          project_id: projectId,
          author_id: mockUser.id,
          title: 'Architecture Discussion',
          content: 'Content here',
          category: 'architecture',
          pinned: false,
        },
        error: null,
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'discussions') {
            return {
              insert: insertMock.mockReturnValue({
                select: selectMock.mockReturnValue({
                  single: singleMock,
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

      const result = await createDiscussionAction({
        projectId,
        title: 'Architecture Discussion',
        content: 'Content here',
        category: 'architecture',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Architecture Discussion');
      }
      expect(mockSupabase.from).toHaveBeenCalledWith('activity_logs');
    });

    it('prevents non-author/non-admin from editing someone else discussion', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockOtherUser.id },
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { role: 'contributor' }, // Not admin
              }),
            };
          }
          if (table === 'discussions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: discussionId, author_id: mockOtherUser.id }, // Owned by other
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateDiscussionAction({
        discussionId,
        projectId,
        title: 'Hacked Title',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('toggles discussion pinned status for admin', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id }, // Owner is admin
              }),
            };
          }
          if (table === 'discussions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { pinned: false },
              }),
              update: updateMock.mockReturnValue({
                eq: eqMock,
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await toggleDiscussionPinnedAction(discussionId, projectId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('deletes a discussion if author or admin', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'discussions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: discussionId, author_id: mockUser.id, title: 'Title' },
              }),
              delete: deleteMock.mockReturnValue({
                eq: eqMock,
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

      const result = await deleteDiscussionAction(discussionId, projectId);
      expect(result.success).toBe(true);
    });
  });

  describe('Discussion Comments Actions', () => {
    it('creates a discussion comment and records activity', async () => {
      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: commentId,
          discussion_id: discussionId,
          author_id: mockUser.id,
          content: 'First comment',
        },
        error: null,
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'discussions') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: discussionId, title: 'Discussion Title' },
              }),
            };
          }
          if (table === 'discussion_comments') {
            return {
              insert: insertMock.mockReturnValue({
                select: selectMock.mockReturnValue({
                  single: singleMock,
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

      const result = await createDiscussionCommentAction({
        discussionId,
        projectId,
        content: 'First comment',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('First comment');
      }
    });

    it('rejects editing comment if not the author', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'discussion_comments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: commentId, author_id: mockOtherUser.id },
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateDiscussionCommentAction({
        commentId,
        projectId,
        content: 'New content',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('deletes a discussion comment for author or admin', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'discussion_comments') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: commentId, author_id: mockUser.id, discussion_id: discussionId },
              }),
              delete: deleteMock.mockReturnValue({
                eq: eqMock,
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteDiscussionCommentAction(commentId, projectId);
      expect(result.success).toBe(true);
    });
  });

  describe('Meetings Actions', () => {
    it('creates a meeting and inserts participants', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: meetingId,
          project_id: projectId,
          organizer_id: mockUser.id,
          title: 'Sprint Kickoff',
          scheduled_at: '2026-10-10T10:00:00Z',
          duration_minutes: 30,
          status: 'scheduled',
        },
        error: null,
      });

      const participantInsert = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'meetings') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: singleMock,
                }),
              }),
            };
          }
          if (table === 'meeting_participants') {
            return {
              insert: participantInsert,
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

      const result = await createMeetingAction({
        projectId,
        title: 'Sprint Kickoff',
        scheduledAt: '2026-10-10T10:00:00Z',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Sprint Kickoff');
      }
      expect(participantInsert).toHaveBeenCalled();
    });

    it('updates attendee RSVP status', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'meeting_participants') {
            return {
              upsert: upsertMock,
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateMeetingParticipantAction({
        meetingId,
        projectId,
        status: 'attending',
      });

      expect(result.success).toBe(true);
      expect(upsertMock).toHaveBeenCalled();
    });

    it('saves meeting notes and decisions', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: 'note-1',
          meeting_id: meetingId,
          content: 'Notes content',
          decisions: 'Decisions',
          action_items: 'Action items',
        },
        error: null,
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'meetings') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: meetingId, title: 'Meeting Title' },
              }),
            };
          }
          if (table === 'meeting_notes') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // Test new insert path
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: singleMock,
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

      const result = await saveMeetingNoteAction({
        meetingId,
        projectId,
        content: 'Notes content',
        decisions: 'Decisions',
        actionItems: 'Action items',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.decisions).toBe('Decisions');
      }
    });

    it('updates meeting status', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { id: meetingId, status: 'completed' },
        error: null,
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'meetings') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: meetingId, organizer_id: mockUser.id },
              }),
              update: updateMock.mockReturnValue({
                eq: eqMock.mockReturnValue({
                  select: selectMock.mockReturnValue({
                    single: singleMock,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateMeetingAction({
        meetingId,
        projectId,
        status: 'completed',
      });
      expect(result.success).toBe(true);
    });

    it('deletes a meeting', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'meetings') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: meetingId, organizer_id: mockUser.id, title: 'Title' },
              }),
              delete: deleteMock.mockReturnValue({
                eq: eqMock,
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

      const result = await deleteMeetingAction(meetingId, projectId);
      expect(result.success).toBe(true);
    });
  });

  describe('Project Notes Actions', () => {
    it('creates a project note and records activity', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: noteId,
          project_id: projectId,
          author_id: mockUser.id,
          title: 'ADR-001',
          content: 'Decision content',
          category: 'decisions',
        },
        error: null,
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'project_notes') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: singleMock,
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

      const result = await createProjectNoteAction({
        projectId,
        title: 'ADR-001',
        content: 'Decision content',
        category: 'decisions',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('ADR-001');
      }
    });

    it('updates a project note', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { id: noteId, title: 'Updated ADR', category: 'architecture' },
        error: null,
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'project_notes') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: noteId, author_id: mockUser.id },
              }),
              update: updateMock.mockReturnValue({
                eq: eqMock.mockReturnValue({
                  select: selectMock.mockReturnValue({
                    single: singleMock,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateProjectNoteAction({
        noteId,
        projectId,
        title: 'Updated ADR',
      });
      expect(result.success).toBe(true);
    });

    it('deletes a note if author or admin', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'project_notes') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: noteId, author_id: mockUser.id, title: 'Note Title' },
              }),
              delete: deleteMock.mockReturnValue({
                eq: eqMock,
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

      const result = await deleteProjectNoteAction(noteId, projectId);
      expect(result.success).toBe(true);
    });
  });

  describe('Canvas Actions', () => {
    it('creates a canvas sticky note and records activity', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: canvasItemId,
          project_id: projectId,
          author_id: mockUser.id,
          item_type: 'sticky_note',
          content: 'Brainstorm ideas',
          color: '#fef08a',
          position_x: 100,
          position_y: 100,
          width: 220,
          height: 180,
        },
        error: null,
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'project_canvas_items') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: singleMock,
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

      const result = await saveCanvasItemAction({
        projectId,
        content: 'Brainstorm ideas',
        positionX: 100,
        positionY: 100,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(canvasItemId);
      }
    });

    it('updates position and dimensions of a canvas item', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock1 = vi.fn().mockReturnThis();
      const eqMock2 = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'project_canvas_items') {
            return {
              update: updateMock.mockReturnValue({
                eq: eqMock1.mockReturnValue({
                  eq: eqMock2,
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateCanvasItemPositionAction({
        itemId: canvasItemId,
        projectId,
        positionX: 300,
        positionY: 400,
        width: 250,
        height: 200,
      });

      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          position_x: 300,
          position_y: 400,
          width: 250,
          height: 200,
        })
      );
    });

    it('deletes a canvas item', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: projectId, slug: 'test-proj', owner_id: mockUser.id },
              }),
            };
          }
          if (table === 'project_canvas_items') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: canvasItemId, author_id: mockUser.id },
              }),
              delete: deleteMock.mockReturnValue({
                eq: eqMock,
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

      const result = await deleteCanvasItemAction(canvasItemId, projectId);
      expect(result.success).toBe(true);
    });
  });
});
