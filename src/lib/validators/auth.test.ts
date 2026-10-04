import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from './auth';

describe('Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'developer@example.com',
        password: 'securepassword123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined();
      }
    });

    it('rejects passwords shorter than 6 characters', () => {
      const result = loginSchema.safeParse({
        email: 'dev@example.com',
        password: '123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toBeDefined();
      }
    });
  });

  describe('registerSchema', () => {
    it('accepts valid registration input', () => {
      const result = registerSchema.safeParse({
        fullName: 'Grace Hopper',
        email: 'grace@example.com',
        password: 'supersecretpass',
      });
      expect(result.success).toBe(true);
    });

    it('requires password to be at least 8 characters', () => {
      const result = registerSchema.safeParse({
        fullName: 'Grace Hopper',
        email: 'grace@example.com',
        password: 'short7',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toBeDefined();
      }
    });

    it('requires full name to have at least 2 characters', () => {
      const result = registerSchema.safeParse({
        fullName: 'G',
        email: 'grace@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.fullName).toBeDefined();
      }
    });
  });
});
