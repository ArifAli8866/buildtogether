/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { extractMentions, createNotification } from './service';

describe('Notification Service', () => {
  describe('extractMentions', () => {
    it('returns empty array for empty or whitespace text', () => {
      expect(extractMentions('')).toEqual([]);
      expect(extractMentions('   ')).toEqual([]);
    });

    it('extracts single mention', () => {
      const text = 'Hey @alex, can you take a look at this?';
      expect(extractMentions(text)).toEqual(['alex']);
    });

    it('extracts multiple unique mentions and lowercases them', () => {
      const text = 'Shoutout to @Sarah_Connor and @john-doe for the review! Also cc @sarah_connor.';
      const mentions = extractMentions(text);
      expect(mentions).toHaveLength(2);
      expect(mentions).toContain('sarah_connor');
      expect(mentions).toContain('john-doe');
    });

    it('ignores usernames that are too short (less than 3 chars)', () => {
      const text = 'Contact @ab and @xyz for info.';
      const mentions = extractMentions(text);
      expect(mentions).toEqual(['xyz']);
    });

    it('handles punctuation adjacent to mentions', () => {
      const text = 'Hello (@alice)! Check with [@bob], or @charlie.';
      const mentions = extractMentions(text);
      expect(mentions).toEqual(['alice', 'bob', 'charlie']);
    });
  });

  describe('createNotification guard', () => {
    it('returns null and does not insert when recipient is actor (no self-notification)', async () => {
      const mockInsert = vi.fn();
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      };

      const result = await createNotification(
        {
          recipientId: 'user-123',
          actorId: 'user-123',
          type: 'post_like',
          entityType: 'post',
          entityId: 'post-456',
          title: 'Liked your post',
          message: 'Someone liked your post',
        },
        mockSupabase as any
      );

      expect(result).toBeNull();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('calls insert when recipient is different from actor', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'notif-1' },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: mockInsert,
        }),
      };

      const result = await createNotification(
        {
          recipientId: 'user-222',
          actorId: 'user-111',
          type: 'connection_request',
          entityType: 'connection',
          entityId: 'conn-789',
          title: 'New Connection Request',
          message: 'User wants to connect',
        },
        mockSupabase as any
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'user-222',
          actor_id: 'user-111',
          type: 'connection_request',
        })
      );
      expect(result).toEqual({ id: 'notif-1' });
    });
  });
});
