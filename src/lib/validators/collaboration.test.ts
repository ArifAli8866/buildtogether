import { describe, it, expect } from 'vitest';
import {
  createDiscussionSchema,
  updateDiscussionSchema,
  deleteDiscussionSchema,
  createDiscussionCommentSchema,
  updateDiscussionCommentSchema,
  deleteDiscussionCommentSchema,
  createMeetingSchema,
  updateMeetingSchema,
  deleteMeetingSchema,
  updateMeetingParticipantSchema,
  saveMeetingNoteSchema,
  createProjectNoteSchema,
  updateProjectNoteSchema,
  deleteProjectNoteSchema,
  saveCanvasItemSchema,
  updateCanvasItemPositionSchema,
  deleteCanvasItemSchema,
} from './collaboration';

describe('Collaboration Validators', () => {
  const validUUID = '11111111-1111-4111-8111-111111111111';
  const validUUID2 = '22222222-2222-4222-8222-222222222222';
  const validUUID3 = '33333333-3333-4333-8333-333333333333';

  describe('Discussion Schemas', () => {
    it('validates valid discussion input with defaults', () => {
      const res = createDiscussionSchema.safeParse({
        projectId: validUUID,
        title: 'Realtime Architecture Proposal',
        content: 'We should use Supabase Realtime channels with postgres_changes.',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.category).toBe('general');
        expect(res.data.pinned).toBe(false);
      }
    });

    it('validates discussion with specific category and pinned status', () => {
      const res = createDiscussionSchema.safeParse({
        projectId: validUUID,
        title: 'Database Schema Review',
        content: 'Reviewing tables and foreign keys.',
        category: 'architecture',
        pinned: true,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.category).toBe('architecture');
        expect(res.data.pinned).toBe(true);
      }
    });

    it('fails on empty title or content', () => {
      expect(
        createDiscussionSchema.safeParse({
          projectId: validUUID,
          title: '',
          content: 'Some content',
        }).success
      ).toBe(false);

      expect(
        createDiscussionSchema.safeParse({
          projectId: validUUID,
          title: 'Valid Title',
          content: '',
        }).success
      ).toBe(false);
    });

    it('validates discussion updates and deletes', () => {
      expect(
        updateDiscussionSchema.safeParse({
          discussionId: validUUID,
          projectId: validUUID2,
          title: 'Updated Title',
        }).success
      ).toBe(true);

      expect(
        deleteDiscussionSchema.safeParse({
          discussionId: validUUID,
          projectId: validUUID2,
        }).success
      ).toBe(true);
    });
  });

  describe('Discussion Comments Schemas', () => {
    it('validates top-level comment', () => {
      const res = createDiscussionCommentSchema.safeParse({
        discussionId: validUUID,
        projectId: validUUID2,
        content: 'This is a great idea.',
      });
      expect(res.success).toBe(true);
    });

    it('validates nested reply comment', () => {
      const res = createDiscussionCommentSchema.safeParse({
        discussionId: validUUID,
        projectId: validUUID2,
        parentCommentId: validUUID3,
        content: 'I agree with your proposal.',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.parentCommentId).toBe(validUUID3);
      }
    });

    it('fails if comment content exceeds limit or is empty', () => {
      expect(
        createDiscussionCommentSchema.safeParse({
          discussionId: validUUID,
          projectId: validUUID2,
          content: '',
        }).success
      ).toBe(false);

      expect(
        createDiscussionCommentSchema.safeParse({
          discussionId: validUUID,
          projectId: validUUID2,
          content: 'a'.repeat(5001),
        }).success
      ).toBe(false);
    });

    it('validates comment update and delete schemas', () => {
      expect(
        updateDiscussionCommentSchema.safeParse({
          commentId: validUUID,
          projectId: validUUID2,
          content: 'Edited comment content',
        }).success
      ).toBe(true);

      expect(
        deleteDiscussionCommentSchema.safeParse({
          commentId: validUUID,
          projectId: validUUID2,
        }).success
      ).toBe(true);
    });
  });

  describe('Meeting Schemas', () => {
    it('validates createMeetingSchema with valid attributes', () => {
      const res = createMeetingSchema.safeParse({
        projectId: validUUID,
        title: 'Weekly Standup',
        scheduledAt: '2026-10-10T10:00:00Z',
        durationMinutes: 45,
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        participantIds: [validUUID2, validUUID3],
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe('scheduled');
        expect(res.data.durationMinutes).toBe(45);
      }
    });

    it('fails on invalid meeting url format if provided', () => {
      expect(
        createMeetingSchema.safeParse({
          projectId: validUUID,
          title: 'Weekly Standup',
          scheduledAt: '2026-10-10T10:00:00Z',
          meetingUrl: 'not-a-url',
        }).success
      ).toBe(false);
    });

    it('validates updateMeetingParticipantSchema RSVP', () => {
      expect(
        updateMeetingParticipantSchema.safeParse({
          meetingId: validUUID,
          projectId: validUUID2,
          status: 'attending',
        }).success
      ).toBe(true);

      expect(
        updateMeetingParticipantSchema.safeParse({
          meetingId: validUUID,
          projectId: validUUID2,
          status: 'declined',
        }).success
      ).toBe(true);

      expect(
        updateMeetingParticipantSchema.safeParse({
          meetingId: validUUID,
          projectId: validUUID2,
          status: 'tentative',
        }).success
      ).toBe(true);

      expect(
        updateMeetingParticipantSchema.safeParse({
          meetingId: validUUID,
          projectId: validUUID2,
          status: 'unknown_status',
        }).success
      ).toBe(false);
    });

    it('validates saveMeetingNoteSchema', () => {
      const res = saveMeetingNoteSchema.safeParse({
        meetingId: validUUID,
        projectId: validUUID2,
        content: 'Discussed timeline and milestones.',
        decisions: 'Agreed on Phase 5 completion.',
        actionItems: '@arif to verify Next.js build.',
      });
      expect(res.success).toBe(true);
    });

    it('validates updateMeetingSchema and deleteMeetingSchema', () => {
      expect(
        updateMeetingSchema.safeParse({
          meetingId: validUUID,
          projectId: validUUID2,
          status: 'completed',
        }).success
      ).toBe(true);

      expect(
        deleteMeetingSchema.safeParse({
          meetingId: validUUID,
          projectId: validUUID2,
        }).success
      ).toBe(true);
    });
  });

  describe('Project Notes Schemas', () => {
    it('validates createProjectNoteSchema with defaults', () => {
      const res = createProjectNoteSchema.safeParse({
        projectId: validUUID,
        title: 'ADR-005: Realtime Architecture',
        content: '## Context\nDecisions made on Supabase Realtime.',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.category).toBe('general');
      }
    });

    it('validates updateProjectNoteSchema and deleteProjectNoteSchema', () => {
      expect(
        updateProjectNoteSchema.safeParse({
          noteId: validUUID,
          projectId: validUUID2,
          category: 'decisions',
          content: 'Updated decisions',
        }).success
      ).toBe(true);

      expect(
        deleteProjectNoteSchema.safeParse({
          noteId: validUUID,
          projectId: validUUID2,
        }).success
      ).toBe(true);
    });
  });

  describe('Canvas Item Schemas', () => {
    it('validates saveCanvasItemSchema with defaults', () => {
      const res = saveCanvasItemSchema.safeParse({
        projectId: validUUID,
        content: 'Postgres RLS is critical for data security.',
        positionX: 100,
        positionY: 200,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.itemType).toBe('sticky_note');
        expect(res.data.color).toBe('#fef08a');
        expect(res.data.width).toBe(220);
        expect(res.data.height).toBe(180);
      }
    });

    it('validates saveCanvasItemSchema with custom dimensions and type', () => {
      const res = saveCanvasItemSchema.safeParse({
        id: validUUID3,
        projectId: validUUID,
        itemType: 'idea',
        content: 'Add AI assistant in Phase 8',
        color: '#bae6fd',
        positionX: 450,
        positionY: 300,
        width: 300,
        height: 250,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.id).toBe(validUUID3);
        expect(res.data.itemType).toBe('idea');
        expect(res.data.width).toBe(300);
      }
    });

    it('validates updateCanvasItemPositionSchema and deleteCanvasItemSchema', () => {
      expect(
        updateCanvasItemPositionSchema.safeParse({
          itemId: validUUID,
          projectId: validUUID2,
          positionX: 500,
          positionY: 600,
          width: 250,
          height: 200,
        }).success
      ).toBe(true);

      expect(
        deleteCanvasItemSchema.safeParse({
          itemId: validUUID,
          projectId: validUUID2,
        }).success
      ).toBe(true);
    });
  });
});
