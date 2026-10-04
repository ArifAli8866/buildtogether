/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProjectAction,
  updateProjectAction,
  addProjectRoleAction,
  deleteProjectAction,
} from './project';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Project Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleValidInput = {
    title: 'Distributed Log Engine',
    slug: 'distributed-log-engine',
    tagline: 'High-throughput stream processing engine written in modern Rust',
    description:
      'Distributed Log Engine provides partitioned message queues with sub-millisecond dispatch times.',
    problemStatement:
      'Existing message queues consume too much memory when handling large fan-outs.',
    proposedSolution:
      'A zero-copy ring buffer with memory-mapped files and asynchronous network polling.',
    category: 'Developer Tools',
    stage: 'planning' as const,
    visibility: 'public' as const,
    collaborationType: 'remote' as const,
    technologyIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
    roles: [
      {
        title: 'Core Systems Developer',
        description: 'Implement zero-copy memory buffers.',
        requiredSkills: ['Rust', 'Linux'],
        capacityCount: 1,
        commitmentHours: 15,
      },
    ],
    initialGoals: ['Benchmark memory bandwidth'],
  };

  describe('createProjectAction', () => {
    it('blocks unauthenticated callers with UNAUTHORIZED', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createProjectAction(sampleValidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects duplicate slugs with CONFLICT', async () => {
      const mockUser = { id: 'user-uuid-1' };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-proj' }, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createProjectAction(sampleValidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFLICT');
        expect(result.error.message).toContain('already exists');
      }
    });

    it('successfully creates project, establishes owner membership, and inserts roles', async () => {
      const mockUser = { id: 'user-uuid-1' };
      const createdProject = {
        id: 'new-proj-uuid',
        title: sampleValidInput.title,
        slug: sampleValidInput.slug,
        owner_id: mockUser.id,
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // slug check
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: createdProject, error: null }),
                }),
              }),
            };
          }
          if (table === 'project_members' || table === 'project_roles' || table === 'project_technologies' || table === 'goals') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await createProjectAction(sampleValidInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('new-proj-uuid');
        expect(result.data.slug).toBe(sampleValidInput.slug);
      }
    });
  });

  describe('updateProjectAction', () => {
    const updateInput = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Distributed Log Engine v2',
      tagline: 'High-throughput stream processing with zero allocations',
      description: 'Expanded technical description for v2 distributed log engine.',
      problemStatement: 'Existing message queues consume too much memory.',
      proposedSolution: 'A zero-copy ring buffer with memory-mapped files.',
      category: 'Developer Tools',
      stage: 'in_development' as const,
      visibility: 'public' as const,
      collaborationType: 'remote' as const,
      technologyIds: [],
    };

    it('denies update if user is not project owner or maintainer', async () => {
      const mockUser = { id: 'stranger-uuid' };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'contributor' }, error: null }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateProjectAction(updateInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('successfully updates project metadata when user is owner', async () => {
      const mockUser = { id: 'owner-uuid' };
      const mockUpdated = { ...updateInput, slug: 'distributed-log-engine' };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
            };
          }
          if (table === 'projects') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'project_technologies') {
            return {
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateProjectAction(updateInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(updateInput.title);
      }
    });
  });

  describe('addProjectRoleAction', () => {
    it('allows project admin to add open role', async () => {
      const mockUser = { id: 'admin-uuid' };
      const mockRole = {
        id: 'new-role-uuid',
        title: 'Security Auditor',
        required_skills: ['Cryptography'],
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'maintainer' }, error: null }),
            };
          }
          if (table === 'project_roles') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockRole, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await addProjectRoleAction('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
        title: 'Security Auditor',
        description: 'Audit cryptographic primitives and key derivations.',
        requiredSkills: ['Cryptography'],
        capacityCount: 1,
        commitmentHours: 5,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Security Auditor');
      }
    });
  });

  describe('deleteProjectAction', () => {
    it('prohibits non-owner from deleting project', async () => {
      const mockUser = { id: 'non-owner-uuid' };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { owner_id: 'real-owner-uuid', slug: 'some-project' },
            error: null,
          }),
        })),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteProjectAction('proj-uuid-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('successfully deletes project when user is owner', async () => {
      const mockUser = { id: 'owner-uuid' };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { owner_id: 'owner-uuid', slug: 'my-project' },
                error: null,
              }),
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteProjectAction('proj-uuid-1');

      expect(result.success).toBe(true);
    });
  });
});
