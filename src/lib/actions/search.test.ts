/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { globalSearchAction } from './search';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/queries/search', () => ({
  performGlobalSearch: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { performGlobalSearch } from '@/lib/queries/search';

describe('globalSearchAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fails with validation error on empty query', async () => {
    const result = await globalSearchAction({
      q: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details?.q).toBeDefined();
    }
  });

  it('fails with validation error on invalid search type', async () => {
    const result = await globalSearchAction({
      q: 'react',
      type: 'invalid_type' as any,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details?.type).toBeDefined();
    }
  });

  it('successfully executes search for unauthenticated visitor', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const mockResults = {
      query: 'typescript',
      totalCount: 1,
      projects: [
        {
          id: 'proj-1',
          slug: 'bt',
          title: 'Build Together',
          tagline: 'Collab platform',
          description: 'Dev platform',
          category: 'developer-tools',
          stage: 'building',
          visibility: 'public',
          logo_url: null,
          owner: { username: 'alice', full_name: 'Alice Dev' },
        },
      ],
      developers: [],
      posts: [],
      tasks: [],
    };

    vi.mocked(performGlobalSearch).mockResolvedValue(mockResults as any);

    const result = await globalSearchAction({
      q: 'typescript',
      type: 'projects',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('typescript');
      expect(result.data.projects).toHaveLength(1);
      expect(result.data.projects[0].title).toBe('Build Together');
    }

    expect(performGlobalSearch).toHaveBeenCalledWith({
      query: 'typescript',
      type: 'projects',
      currentUserId: null,
      limit: 20,
    });
  });

  it('successfully executes search with authenticated user ID passed to query', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-999' } },
          error: null,
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const mockResults = {
      query: 'kanban',
      totalCount: 0,
      projects: [],
      developers: [],
      posts: [],
      tasks: [],
    };

    vi.mocked(performGlobalSearch).mockResolvedValue(mockResults as any);

    const result = await globalSearchAction({
      q: 'kanban',
      type: 'tasks',
      limit: 10,
    });

    expect(result.success).toBe(true);
    expect(performGlobalSearch).toHaveBeenCalledWith({
      query: 'kanban',
      type: 'tasks',
      currentUserId: 'usr-999',
      limit: 10,
    });
  });

  it('returns INTERNAL_ERROR if search query throws', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.mocked(performGlobalSearch).mockRejectedValue(new Error('DB failure'));

    const result = await globalSearchAction({
      q: 'failure',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INTERNAL_ERROR');
    }
  });
});
