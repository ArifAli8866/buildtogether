import { describe, it, expect } from 'vitest';
import { updateProfileSchema, addExperienceSchema } from './profile';

describe('Profile Validation Schemas', () => {
  describe('updateProfileSchema', () => {
    it('accepts valid profile update data', () => {
      const validData = {
        fullName: 'Linus Torvalds',
        username: 'linus_torvalds',
        headline: 'Creator of Linux & Git',
        bio: 'I like building operating systems and tools.',
        location: 'Portland, OR',
        timezone: 'UTC-8',
        availabilityHours: 20,
        githubUsername: 'torvalds',
        portfolioUrl: 'https://kernel.org',
        socialLinks: { twitter: 'linus' },
        skillIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
        technologyIds: ['b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid username formats (spaces, special characters)', () => {
      const invalidData = {
        fullName: 'Linus Torvalds',
        username: 'linus torvalds!@#',
        availabilityHours: 10,
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.username).toBeDefined();
      }
    });

    it('rejects negative or excessive availability hours', () => {
      const resultNegative = updateProfileSchema.safeParse({
        fullName: 'Dev',
        username: 'dev_user',
        availabilityHours: -5,
      });
      expect(resultNegative.success).toBe(false);

      const resultExcessive = updateProfileSchema.safeParse({
        fullName: 'Dev',
        username: 'dev_user',
        availabilityHours: 120,
      });
      expect(resultExcessive.success).toBe(false);
    });

    it('validates skillIds and technologyIds as UUIDs', () => {
      const result = updateProfileSchema.safeParse({
        fullName: 'Dev',
        username: 'dev_user',
        availabilityHours: 10,
        skillIds: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.skillIds).toBeDefined();
      }
    });
  });

  describe('addExperienceSchema', () => {
    it('accepts valid experience entry', () => {
      const validExp = {
        title: 'Senior Systems Architect',
        companyOrProject: 'Open Source Foundation',
        startDate: '2023-01-15',
        endDate: '2025-06-30',
        isCurrent: false,
        description: 'Led kernel performance optimizations.',
      };

      const result = addExperienceSchema.safeParse(validExp);
      expect(result.success).toBe(true);
    });

    it('allows null endDate if isCurrent is true', () => {
      const currentExp = {
        title: 'Lead Maintainer',
        companyOrProject: 'Build Together',
        startDate: '2026-01-01',
        isCurrent: true,
      };

      const result = addExperienceSchema.safeParse(currentExp);
      expect(result.success).toBe(true);
    });

    it('rejects malformed date formats', () => {
      const invalidExp = {
        title: 'Developer',
        companyOrProject: 'Company',
        startDate: 'January 2024',
      };

      const result = addExperienceSchema.safeParse(invalidExp);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.startDate).toBeDefined();
      }
    });
  });
});
