/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPostAction,
  updatePostAction,
  deletePostAction,
  togglePostLikeAction,
  togglePostSaveAction,
  createPostCommentAction,
  deletePostCommentAction,
  sendConnectionRequestAction,
  respondConnectionRequestAction,
  removeConnectionAction,
} from './community';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Community & Network Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = { id: '11111111-1111-4111-8111-111111111111' };
  const mockOtherUser = { id: '99999999-9999-4999-8999-999999999999' };
  const postId = '22222222-2222-4222-8222-222222222222';
  const commentId = '33333333-3333-4333-8333-333333333333';
  const connectionId = '44444444-4444-4444-8444-444444444444';
  const projectId = '55555555-5555-4555-8555-555555555555';

  describe('Post Actions', () => {
    it('blocks unauthenticated user from creating a post', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not logged in' },
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createPostAction({
        title: 'New Post',
        content: 'Valid content here',
        post_type: 'technical_discussion',
      });

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('UNAUTHORIZED');
    });

    it('rejects post creation with unauthorized project_id', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { owner_id: mockOtherUser.id }, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createPostAction({
        title: 'New Project Post',
        content: 'Post associated with project',
        post_type: 'project_update',
        project_id: projectId,
      });

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('FORBIDDEN');
    });

    it('successfully creates post for authorized author', async () => {
      const mockPost = {
        id: postId,
        author_id: mockUser.id,
        title: 'Announcing Our New Framework',
        content: 'We built a great open source framework.',
        post_type: 'project_announcement',
        tags: ['framework', 'release'],
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'community_posts') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockPost, error: null }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { username: 'alice' }, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createPostAction({
        title: 'Announcing Our New Framework',
        content: 'We built a great open source framework.',
        post_type: 'project_announcement',
        tags: ['framework', 'release'],
      });

      expect(result.success).toBe(true);
      expect((result as any).data?.id).toBe(postId);
    });

    it('prevents non-author from updating a post', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: postId, author_id: mockOtherUser.id },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updatePostAction({
        postId,
        title: 'Modified Title',
        content: 'Modified content',
        post_type: 'technical_discussion',
      });

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('FORBIDDEN');
    });

    it('prevents non-author from deleting a post', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { author_id: mockOtherUser.id },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deletePostAction({ postId });
      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Post Likes & Saves', () => {
    it('unlikes a post if already liked', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'community_posts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: postId, title: 'Test Post', author_id: mockOtherUser.id },
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
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { post_id: postId, user_id: mockUser.id },
                      error: null,
                    }),
                  }),
                }),
              }),
              delete: mockDelete,
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await togglePostLikeAction({ postId });
      expect(result.success).toBe(true);
      expect((result as any).data?.hasLiked).toBe(false);
    });

    it('likes a post and creates notification for author', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'community_posts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: postId, title: 'Interesting Topic', author_id: mockOtherUser.id },
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
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              insert: mockInsert,
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { full_name: 'Alice Cooper', username: 'alice' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'notifications') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'notif-1' }, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await togglePostLikeAction({ postId });
      expect(result.success).toBe(true);
      expect((result as any).data?.hasLiked).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('toggles post save', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'community_posts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: postId }, error: null }),
                }),
              }),
            };
          }
          if (table === 'post_saves') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await togglePostSaveAction({ postId });
      expect(result.success).toBe(true);
      expect((result as any).data?.hasSaved).toBe(true);
    });
  });

  describe('Comment Actions', () => {
    it('creates comment and triggers notification', async () => {
      const mockComment = {
        id: commentId,
        post_id: postId,
        author_id: mockUser.id,
        content: 'Solid architecture!',
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'community_posts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: postId, title: 'Architecture Post', author_id: mockOtherUser.id },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'post_comments') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockComment, error: null }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { full_name: 'Alice', username: 'alice' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'notifications') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'notif-1' }, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createPostCommentAction({
        postId,
        content: 'Solid architecture!',
      });

      expect(result.success).toBe(true);
      expect((result as any).data?.id).toBe(commentId);
    });

    it('prevents non-author from deleting comment', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { author_id: mockOtherUser.id, post_id: postId },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deletePostCommentAction({ commentId });
      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('FORBIDDEN');
    });
  });

  describe('Developer Network Actions', () => {
    it('prevents self-connection request', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await sendConnectionRequestAction({
        recipientId: mockUser.id,
      });

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate pending connection request', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: mockOtherUser.id }, error: null }),
                }),
              }),
            };
          }
          if (table === 'user_connections') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: connectionId,
                      requester_id: mockUser.id,
                      recipient_id: mockOtherUser.id,
                      status: 'pending',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await sendConnectionRequestAction({
        recipientId: mockOtherUser.id,
      });

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('CONFLICT');
    });

    it('successfully sends connection request and notifies recipient', async () => {
      const mockConnection = {
        id: connectionId,
        requester_id: mockUser.id,
        recipient_id: mockOtherUser.id,
        status: 'pending',
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: mockOtherUser.id, username: 'bob', full_name: 'Bob' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'user_connections') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockConnection, error: null }),
                }),
              }),
            };
          }
          if (table === 'notifications') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'notif-1' }, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await sendConnectionRequestAction({
        recipientId: mockOtherUser.id,
      });

      expect(result.success).toBe(true);
      expect((result as any).data?.id).toBe(connectionId);
    });

    it('prevents non-recipient from accepting connection request', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: connectionId,
                  requester_id: mockUser.id,
                  recipient_id: mockOtherUser.id,
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await respondConnectionRequestAction({
        connectionId,
        action: 'accept',
      });

      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('FORBIDDEN');
    });

    it('allows recipient to accept connection request', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'user_connections') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: connectionId,
                      requester_id: mockOtherUser.id,
                      recipient_id: mockUser.id,
                      status: 'pending',
                    },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { full_name: 'Alice', username: 'alice' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'notifications') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'notif-1' }, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await respondConnectionRequestAction({
        connectionId,
        action: 'accept',
      });

      expect(result.success).toBe(true);
      expect((result as any).data?.status).toBe('accepted');
    });

    it('prevents third party from removing connection', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'random-user-id' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: connectionId,
                  requester_id: mockUser.id,
                  recipient_id: mockOtherUser.id,
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await removeConnectionAction({ connectionId });
      expect(result.success).toBe(false);
      expect((result as any).error?.code).toBe('FORBIDDEN');
    });
  });
});
