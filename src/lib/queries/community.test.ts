/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCommunityPosts,
  getPostComments,
  getUserConnections,
  getConnectionState,
  getDiscoverableDevelopers,
} from './community';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Community & Network Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = '22222222-2222-4222-8222-222222222222';
  const postId = '33333333-3333-4333-8333-333333333333';

  describe('getCommunityPosts', () => {
    it('queries posts and attaches has_liked and has_saved for authenticated user', async () => {
      const mockPosts = [
        { id: postId, title: 'Test Post', likes_count: 5 },
      ];

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'community_posts') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockPosts,
                    count: 1,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'post_likes') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    data: [{ post_id: postId }],
                  }),
                }),
              }),
            };
          }
          if (table === 'post_saves') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    data: [],
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await getCommunityPosts({ currentUserId: userA });
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].has_liked).toBe(true);
      expect(result.posts[0].has_saved).toBe(false);
    });
  });

  describe('getPostComments', () => {
    it('reconstructs nested reply tree from flat comment list', async () => {
      const rootCommentId = 'root-1';
      const replyCommentId = 'reply-1';

      const mockComments = [
        { id: rootCommentId, post_id: postId, parent_id: null, content: 'Root comment' },
        { id: replyCommentId, post_id: postId, parent_id: rootCommentId, content: 'Nested reply' },
      ];

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockComments,
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const tree = await getPostComments(postId);
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe(rootCommentId);
      expect(tree[0].replies).toHaveLength(1);
      expect(tree[0].replies![0].id).toBe(replyCommentId);
    });
  });

  describe('getUserConnections', () => {
    it('categorizes connections into connected, incoming, and sent', async () => {
      const mockConnections = [
        { id: 'c1', requester_id: userA, recipient_id: userB, status: 'accepted' },
        { id: 'c2', requester_id: userB, recipient_id: userA, status: 'pending' },
        { id: 'c3', requester_id: userA, recipient_id: 'user-c', status: 'pending' },
      ];

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockConnections,
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await getUserConnections(userA);
      expect(result.connected).toHaveLength(1);
      expect(result.incoming).toHaveLength(1);
      expect(result.incoming[0].id).toBe('c2');
      expect(result.sent).toHaveLength(1);
      expect(result.sent[0].id).toBe('c3');
    });
  });

  describe('getConnectionState', () => {
    it('returns none for self-check', async () => {
      const res = await getConnectionState(userA, userA);
      expect(res.state).toBe('none');
    });

    it('returns connected when accepted', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'c1', requester_id: userA, recipient_id: userB, status: 'accepted' },
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await getConnectionState(userA, userB);
      expect(res.state).toBe('connected');
      expect(res.connectionId).toBe('c1');
    });

    it('returns pending with isRequester flag', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'c2', requester_id: userA, recipient_id: userB, status: 'pending' },
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await getConnectionState(userA, userB);
      expect(res.state).toBe('pending');
      expect(res.isRequester).toBe(true);
    });
  });

  describe('getDiscoverableDevelopers', () => {
    it('calculates deterministic shared skills and sorts by relevance', async () => {
      const dev1 = {
        id: 'dev-1',
        username: 'dev1',
        full_name: 'Dev One',
        availability_hours_per_week: 15,
        updated_at: '2026-10-01T00:00:00Z',
      };
      const dev2 = {
        id: 'dev-2',
        username: 'dev2',
        full_name: 'Dev Two',
        availability_hours_per_week: 10,
        updated_at: '2026-10-02T00:00:00Z',
      };

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { availability_hours_per_week: 10 },
                  }),
                }),
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    neq: vi.fn().mockResolvedValue({
                      data: [dev1, dev2],
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'profile_skills') {
            return {
              select: vi.fn().mockImplementation((cols: string) => {
                if (cols.includes('profile_id')) {
                  return {
                    in: vi.fn().mockResolvedValue({
                      data: [
                        { profile_id: 'dev-1', skills: { id: 's1', name: 'TypeScript' } },
                        { profile_id: 'dev-1', skills: { id: 's2', name: 'React' } },
                        { profile_id: 'dev-2', skills: { id: 's1', name: 'TypeScript' } },
                      ],
                    }),
                  };
                }
                return {
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      { skills: { name: 'TypeScript' } },
                      { skills: { name: 'React' } },
                    ],
                  }),
                };
              }),
            };
          }
          if (table === 'profile_technologies') {
            return {
              select: vi.fn().mockImplementation((cols: string) => {
                if (cols.includes('profile_id')) {
                  return {
                    in: vi.fn().mockResolvedValue({ data: [] }),
                  };
                }
                return {
                  eq: vi.fn().mockResolvedValue({ data: [] }),
                };
              }),
            };
          }
          if (table === 'user_connections') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue({ data: [] }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const devs = await getDiscoverableDevelopers(userA);
      expect(devs).toHaveLength(2);
      // dev1 has 2 shared skills (TypeScript, React), dev2 has 1 shared skill (TypeScript)
      expect(devs[0].profile.id).toBe('dev-1');
      expect(devs[0].sharedSkills).toEqual(['TypeScript', 'React']);
      expect(devs[1].profile.id).toBe('dev-2');
      expect(devs[1].sharedSkills).toEqual(['TypeScript']);
    });
  });
});
