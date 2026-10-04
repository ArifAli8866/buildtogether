import { describe, it, expect } from 'vitest';
import {
  submitContributionSchema,
  reviewContributionSchema,
  manageMemberRoleSchema,
  removeMemberSchema,
} from './contribution';

describe('submitContributionSchema', () => {
  const validPayload = {
    projectId: '11111111-1111-4111-8111-111111111111',
    projectRoleId: '22222222-2222-4222-8222-222222222222',
    pitch: 'I have 5 years of React experience and built multiple complex dashboards.',
    portfolioLinks: ['https://github.com/testuser', 'https://testuser.dev'],
    weeklyHours: 15,
  };

  it('validates a complete, valid contribution submission', () => {
    const result = submitContributionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeklyHours).toBe(15);
      expect(result.data.portfolioLinks).toHaveLength(2);
    }
  });

  it('validates submission without a specific roleId (general application)', () => {
    const result = submitContributionSchema.safeParse({
      ...validPayload,
      projectRoleId: null,
    });
    expect(result.success).toBe(true);
  });

  it('coerces string numbers for weeklyHours', () => {
    const result = submitContributionSchema.safeParse({
      ...validPayload,
      weeklyHours: '20',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeklyHours).toBe(20);
    }
  });

  it('fails if projectId is not a valid UUID', () => {
    const result = submitContributionSchema.safeParse({
      ...validPayload,
      projectId: 'invalid-id',
    });
    expect(result.success).toBe(false);
  });

  it('fails if pitch is shorter than 30 characters', () => {
    const result = submitContributionSchema.safeParse({
      ...validPayload,
      pitch: 'Too short',
    });
    expect(result.success).toBe(false);
  });

  it('fails if portfolio links contain an invalid URL', () => {
    const result = submitContributionSchema.safeParse({
      ...validPayload,
      portfolioLinks: ['not-a-valid-url'],
    });
    expect(result.success).toBe(false);
  });

  it('fails if more than 5 portfolio links are provided', () => {
    const result = submitContributionSchema.safeParse({
      ...validPayload,
      portfolioLinks: [
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
        'https://example.com/4',
        'https://example.com/5',
        'https://example.com/6',
      ],
    });
    expect(result.success).toBe(false);
  });

  it('fails if weeklyHours is less than 1 or greater than 80', () => {
    const resultLow = submitContributionSchema.safeParse({
      ...validPayload,
      weeklyHours: 0,
    });
    expect(resultLow.success).toBe(false);

    const resultHigh = submitContributionSchema.safeParse({
      ...validPayload,
      weeklyHours: 85,
    });
    expect(resultHigh.success).toBe(false);
  });
});

describe('reviewContributionSchema', () => {
  const validReview = {
    requestId: '33333333-3333-4333-8333-333333333333',
    decision: 'accepted' as const,
    reviewNotes: 'Great background, looking forward to working with you!',
  };

  it('validates accepted decision', () => {
    const result = reviewContributionSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it('validates rejected decision with feedback', () => {
    const result = reviewContributionSchema.safeParse({
      ...validReview,
      decision: 'rejected',
      reviewNotes: 'Role is currently filled with full capacity.',
    });
    expect(result.success).toBe(true);
  });

  it('validates under_review decision without notes', () => {
    const result = reviewContributionSchema.safeParse({
      requestId: validReview.requestId,
      decision: 'under_review',
    });
    expect(result.success).toBe(true);
  });

  it('fails for unauthorized decisions such as pending or owner', () => {
    const result = reviewContributionSchema.safeParse({
      ...validReview,
      decision: 'pending',
    });
    expect(result.success).toBe(false);
  });

  it('fails if reviewNotes exceeds 1000 characters', () => {
    const result = reviewContributionSchema.safeParse({
      ...validReview,
      reviewNotes: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe('manageMemberRoleSchema', () => {
  const validPayload = {
    projectId: '11111111-1111-4111-8111-111111111111',
    memberId: '44444444-4444-4444-8444-444444444444',
    newRole: 'maintainer' as const,
  };

  it('validates promotion to maintainer', () => {
    const result = manageMemberRoleSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('validates change to contributor or viewer', () => {
    expect(
      manageMemberRoleSchema.safeParse({ ...validPayload, newRole: 'contributor' }).success
    ).toBe(true);
    expect(
      manageMemberRoleSchema.safeParse({ ...validPayload, newRole: 'viewer' }).success
    ).toBe(true);
  });

  it('fails if attempting to set role to owner', () => {
    const result = manageMemberRoleSchema.safeParse({
      ...validPayload,
      newRole: 'owner',
    });
    expect(result.success).toBe(false);
  });
});

describe('removeMemberSchema', () => {
  it('validates valid projectId and memberId', () => {
    const result = removeMemberSchema.safeParse({
      projectId: '11111111-1111-4111-8111-111111111111',
      memberId: '44444444-4444-4444-8444-444444444444',
    });
    expect(result.success).toBe(true);
  });

  it('fails if ids are not UUIDs', () => {
    const result = removeMemberSchema.safeParse({
      projectId: 'not-a-uuid',
      memberId: 'also-not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
