/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUpWithEmailAction, signInWithEmailAction } from './auth';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Auth Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUpWithEmailAction', () => {
    it('returns validation error on invalid email or short password', async () => {
      const result = await signUpWithEmailAction({
        fullName: 'A',
        email: 'invalid',
        password: '123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('returns conflict error if Supabase reports existing account', async () => {
      const mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'User already registered' },
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await signUpWithEmailAction({
        fullName: 'Existing User',
        email: 'exists@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFLICT');
        expect(result.error.message).toContain('already registered');
      }
    });

    it('returns success and userId on valid registration', async () => {
      const mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: 'usr-12345' } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await signUpWithEmailAction({
        fullName: 'New Developer',
        email: 'new@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe('usr-12345');
      }
    });
  });

  describe('signInWithEmailAction', () => {
    it('returns unauthorized error on invalid credentials', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid login credentials' },
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await signInWithEmailAction({
        email: 'user@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('returns success on valid credentials', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: { id: 'usr-valid' } },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const result = await signInWithEmailAction({
        email: 'user@example.com',
        password: 'correctpassword',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe('usr-valid');
      }
    });
  });
});
