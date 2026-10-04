import { describe, it, expect } from 'vitest';
import {
  createPostSchema,
  updatePostSchema,
  createPostCommentSchema,
  sendConnectionRequestSchema,
  respondConnectionRequestSchema,
} from './community';

describe('Community & Network Validators', () => {
  describe('createPostSchema', () => {
    it('validates a correct post payload', () => {
      const valid = {
        title: 'Building a High-Performance Distributed DB',
        content: 'We are sharing our findings on building distributed systems in Rust.',
        post_type: 'technical_discussion',
        tags: ['rust', 'databases', 'distributed-systems'],
      };
      const result = createPostSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates with optional project_id', () => {
      const valid = {
        title: 'Project Launch Announcement',
        content: 'We just shipped v1.0 of our collaborative coding platform.',
        post_type: 'project_announcement',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        tags: ['launch', 'v1'],
      };
      const result = createPostSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects short title or empty content', () => {
      const invalid = {
        title: 'Hi',
        content: '',
        post_type: 'question',
      };
      const result = createPostSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid post type', () => {
      const invalid = {
        title: 'Valid Title Here',
        content: 'Valid content explaining the problem.',
        post_type: 'invalid_type_name',
      };
      const result = createPostSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid tag characters', () => {
      const invalid = {
        title: 'Valid Title Here',
        content: 'Valid content here for the test.',
        post_type: 'question',
        tags: ['tag with spaces!'],
      };
      const result = createPostSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePostSchema', () => {
    it('validates update payload with valid postId', () => {
      const valid = {
        postId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Updated Post Title',
        content: 'Updated post content for test.',
        post_type: 'learning',
        tags: ['learning'],
      };
      const result = updatePostSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects update payload with missing or invalid postId', () => {
      const invalid = {
        postId: 'not-a-uuid',
        title: 'Updated Title',
        content: 'Updated content here.',
        post_type: 'learning',
      };
      const result = updatePostSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('createPostCommentSchema', () => {
    it('validates a valid comment', () => {
      const valid = {
        postId: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Great insight! We had similar challenges with raft consensus.',
      };
      const result = createPostCommentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates a nested comment reply with parentId', () => {
      const valid = {
        postId: '550e8400-e29b-41d4-a716-446655440000',
        parentId: '660e8400-e29b-41d4-a716-446655440000',
        content: 'Thanks @alex! Agree on consensus bottleneck.',
      };
      const result = createPostCommentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects empty comment', () => {
      const invalid = {
        postId: '550e8400-e29b-41d4-a716-446655440000',
        content: '   ',
      };
      const result = createPostCommentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('sendConnectionRequestSchema', () => {
    it('validates recipientId uuid', () => {
      const valid = { recipientId: '550e8400-e29b-41d4-a716-446655440000' };
      expect(sendConnectionRequestSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects invalid recipientId', () => {
      const invalid = { recipientId: 'not-uuid' };
      expect(sendConnectionRequestSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('respondConnectionRequestSchema', () => {
    it('validates accept action', () => {
      const valid = {
        connectionId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'accept',
      };
      expect(respondConnectionRequestSchema.safeParse(valid).success).toBe(true);
    });

    it('validates decline action', () => {
      const valid = {
        connectionId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'decline',
      };
      expect(respondConnectionRequestSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects unknown action', () => {
      const invalid = {
        connectionId: '550e8400-e29b-41d4-a716-446655440000',
        action: 'block',
      };
      expect(respondConnectionRequestSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
