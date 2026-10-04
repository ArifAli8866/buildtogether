/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateProfileAction,
  addExperienceAction,
  deleteExperienceAction,
  uploadAvatarAction,
} from './profile';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Profile Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfileAction', () => {
    it('blocks unauthenticated callers with UNAUTHORIZED', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'No session' } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateProfileAction({
        fullName: 'Dev',
        username: 'dev_user',
        availabilityHours: 10,
        skillIds: [],
        technologyIds: [],
        socialLinks: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects update if username is already taken by another user', async () => {
      const mockUser = { id: 'user-1' };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-2' }, error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateProfileAction({
        fullName: 'Dev',
        username: 'taken_username',
        availabilityHours: 10,
        skillIds: [],
        technologyIds: [],
        socialLinks: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFLICT');
        expect(result.error.message).toContain('already taken');
      }
    });

    it('successfully updates own profile and syncs skills/technologies', async () => {
      const mockUser = { id: 'user-1' };
      const mockUpdatedProfile = {
        id: 'user-1',
        full_name: 'Updated Name',
        username: 'updated_user',
        availability_hours_per_week: 25,
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockUpdatedProfile, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'profile_skills' || table === 'profile_technologies') {
            return {
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          return {} as any;
        }),
      };

      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await updateProfileAction({
        fullName: 'Updated Name',
        username: 'updated_user',
        availabilityHours: 25,
        skillIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
        technologyIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
        socialLinks: {},
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.full_name).toBe('Updated Name');
      }
    });
  });

  describe('addExperienceAction', () => {
    it('blocks unauthenticated callers from adding experience', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'No session' } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await addExperienceAction({
        title: 'Engineer',
        companyOrProject: 'Acme',
        startDate: '2024-01-01',
        isCurrent: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('enforces insertion with profile_id of authenticated user', async () => {
      const mockUser = { id: 'user-1' };
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'exp-1', profile_id: 'user-1', title: 'Engineer' },
            error: null,
          }),
        }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          insert: insertMock,
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await addExperienceAction({
        title: 'Engineer',
        companyOrProject: 'Acme',
        startDate: '2024-01-01',
        isCurrent: true,
      });

      expect(result.success).toBe(true);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ profile_id: 'user-1' })
      );
    });
  });

  describe('deleteExperienceAction', () => {
    it('blocks unauthenticated callers from deleting experience', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'No session' } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteExperienceAction('exp-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('deletes experience scoped to authenticated user ID', async () => {
      const mockUser = { id: 'user-1' };
      const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
      const eqMock = vi.fn().mockReturnValue({
        eq: deleteEqMock,
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: eqMock,
          }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await deleteExperienceAction('exp-1');
      expect(result.success).toBe(true);
    });
  });

  describe('uploadAvatarAction', () => {
    it('blocks unauthenticated callers from uploading avatar', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'No session' } }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const formData = new FormData();
      formData.append('file', new Blob(['fake-img'], { type: 'image/png' }));

      const result = await uploadAvatarAction(formData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects files exceeding 2MB limit', async () => {
      const mockUser = { id: 'user-1' };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.png', {
        type: 'image/png',
      });
      const formData = new FormData();
      formData.append('file', largeFile);

      const result = await uploadAvatarAction(formData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('less than 2MB');
      }
    });

    it('rejects disallowed file MIME types', async () => {
      const mockUser = { id: 'user-1' };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const badFile = new File(['code'], 'script.sh', {
        type: 'application/x-sh',
      });
      const formData = new FormData();
      formData.append('file', badFile);

      const result = await uploadAvatarAction(formData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('Invalid file format');
      }
    });
  });
});
