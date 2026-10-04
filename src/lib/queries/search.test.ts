/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performGlobalSearch } from './search';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Global Search Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty results immediately if query is empty or whitespace', async () => {
    const result = await performGlobalSearch({
      query: '   ',
    });

    expect(result.query).toBe('');
    expect(result.totalCount).toBe(0);
    expect(result.projects).toEqual([]);
    expect(result.developers).toEqual([]);
    expect(result.posts).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('queries projects with public visibility boundary for anonymous users', async () => {
    const mockProjects = [
      {
        id: 'proj-1',
        slug: 'collab-hub',
        title: 'Collab Hub',
        tagline: 'Developer collaboration',
        description: 'Open source hub',
        category: 'developer-tools',
        stage: 'building',
        visibility: 'public',
        logo_url: null,
        owner: { username: 'alice', full_name: 'Alice Dev' },
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: mockProjects,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const result = await performGlobalSearch({
      query: 'collab',
      type: 'projects',
      currentUserId: null,
    });

    expect(result.totalCount).toBe(1);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].slug).toBe('collab-hub');
    expect(result.developers).toHaveLength(0);
    expect(result.posts).toHaveLength(0);
    expect(result.tasks).toHaveLength(0);
  });

  it('queries developers and aggregates skills and technologies', async () => {
    const mockProfiles = [
      {
        id: 'user-1',
        username: 'bobdev',
        full_name: 'Bob Builder',
        avatar_url: 'https://example.com/avatar.png',
        headline: 'Full-stack Architect',
        bio: 'Rust and Next.js lover',
        location: 'Berlin',
        timezone: 'CET',
        availability_hours_per_week: 20,
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockProfiles,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profile_skills') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ profile_id: 'user-1', skills: { name: 'React' } }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'profile_technologies') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ profile_id: 'user-1', technologies: { name: 'Next.js' } }],
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const result = await performGlobalSearch({
      query: 'bob',
      type: 'developers',
    });

    expect(result.developers).toHaveLength(1);
    expect(result.developers[0].username).toBe('bobdev');
    expect(result.developers[0].skills).toEqual(['React']);
    expect(result.developers[0].technologies).toEqual(['Next.js']);
  });

  it('filters out community posts linked to private projects when user is not a member', async () => {
    const mockPosts = [
      {
        id: 'post-public',
        title: 'Public post',
        content: 'Open update',
        post_type: 'project_update',
        tags: ['news'],
        likes_count: 2,
        comments_count: 1,
        created_at: '2026-10-01',
        project_id: 'p-pub',
        author: { id: 'u1', username: 'alice', full_name: 'Alice', avatar_url: null },
        project: { id: 'p-pub', slug: 'pub-proj', title: 'Public Project', visibility: 'public' },
      },
      {
        id: 'post-private',
        title: 'Secret update',
        content: 'Confidential update',
        post_type: 'technical_discussion',
        tags: ['secret'],
        likes_count: 0,
        comments_count: 0,
        created_at: '2026-10-02',
        project_id: 'p-priv',
        author: { id: 'u2', username: 'charlie', full_name: 'Charlie', avatar_url: null },
        project: { id: 'p-priv', slug: 'priv-proj', title: 'Private Project', visibility: 'private' },
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'community_posts') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: mockPosts,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    // Unauthenticated search: should only see the public project's post
    const result = await performGlobalSearch({
      query: 'update',
      type: 'posts',
      currentUserId: null,
    });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].id).toBe('post-public');
  });

  it('restricts workspace task searches strictly to projects the user belongs to', async () => {
    // 1. Anonymous visitor cannot search tasks
    const anonResult = await performGlobalSearch({
      query: 'auth',
      type: 'tasks',
      currentUserId: null,
    });
    expect(anonResult.tasks).toHaveLength(0);

    // 2. Authenticated user with project memberships
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Implement OAuth',
        description: 'Support GitHub',
        status: 'in_progress',
        priority: 'high',
        created_at: '2026-10-01',
        project: { id: 'proj-member', slug: 'my-proj', title: 'My Project' },
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'project_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ project_id: 'proj-member' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: mockTasks,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const memberResult = await performGlobalSearch({
      query: 'OAuth',
      type: 'tasks',
      currentUserId: 'user-authed-1',
    });

    expect(memberResult.tasks).toHaveLength(1);
    expect(memberResult.tasks[0].title).toBe('Implement OAuth');
    expect(memberResult.tasks[0].project.slug).toBe('my-proj');
  });
});
