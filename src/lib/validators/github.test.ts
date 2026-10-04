import { describe, it, expect } from 'vitest';
import {
  connectRepoSchema,
  disconnectRepoSchema,
  syncRepoSchema,
  createPrFromReviewSchema,
} from './github';

describe('GitHub Validators', () => {
  const validUUID = '11111111-1111-4111-8111-111111111111';
  const validUUID2 = '22222222-2222-4222-8222-222222222222';

  describe('connectRepoSchema', () => {
    it('validates a valid repo connection with defaults', () => {
      const res = connectRepoSchema.safeParse({
        projectId: validUUID,
        repoId: 12345678,
        repoOwner: 'acme-corp',
        repoName: 'awesome-tool',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.defaultBranch).toBe('main');
        expect(res.data.repoOwner).toBe('acme-corp');
      }
    });

    it('rejects invalid repo owner or name with spaces or dangerous characters', () => {
      const res1 = connectRepoSchema.safeParse({
        projectId: validUUID,
        repoId: 12345,
        repoOwner: 'bad owner!',
        repoName: 'valid-repo',
      });
      expect(res1.success).toBe(false);

      const res2 = connectRepoSchema.safeParse({
        projectId: validUUID,
        repoId: 12345,
        repoOwner: 'valid',
        repoName: 'bad/repo/name',
      });
      expect(res2.success).toBe(false);
    });

    it('rejects invalid project UUID or negative repo ID', () => {
      expect(
        connectRepoSchema.safeParse({
          projectId: 'not-a-uuid',
          repoId: 123,
          repoOwner: 'owner',
          repoName: 'name',
        }).success
      ).toBe(false);

      expect(
        connectRepoSchema.safeParse({
          projectId: validUUID,
          repoId: -1,
          repoOwner: 'owner',
          repoName: 'name',
        }).success
      ).toBe(false);
    });
  });

  describe('disconnectRepoSchema & syncRepoSchema', () => {
    it('validates valid UUID for disconnect and sync', () => {
      expect(disconnectRepoSchema.safeParse({ projectId: validUUID }).success).toBe(true);
      expect(disconnectRepoSchema.safeParse({ projectId: 'invalid' }).success).toBe(false);

      expect(syncRepoSchema.safeParse({ projectId: validUUID }).success).toBe(true);
      expect(syncRepoSchema.safeParse({ projectId: 'invalid' }).success).toBe(false);
    });
  });

  describe('createPrFromReviewSchema', () => {
    it('validates a valid Pull Request creation request', () => {
      const res = createPrFromReviewSchema.safeParse({
        reviewId: validUUID,
        projectId: validUUID2,
        branchName: 'feature/auth-layer',
        prTitle: 'Add authentication layer',
        prBody: 'Implements JWT verification and session storage.',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.branchName).toBe('feature/auth-layer');
      }
    });

    it('rejects PR creation when title or body is too short or branch has illegal characters', () => {
      const shortTitle = createPrFromReviewSchema.safeParse({
        reviewId: validUUID,
        projectId: validUUID2,
        branchName: 'feature/auth',
        prTitle: 'ab', // < 3 chars
        prBody: 'Long enough description here',
      });
      expect(shortTitle.success).toBe(false);

      const badBranch = createPrFromReviewSchema.safeParse({
        reviewId: validUUID,
        projectId: validUUID2,
        branchName: 'feature with spaces',
        prTitle: 'Valid title',
        prBody: 'Valid description text here',
      });
      expect(badBranch.success).toBe(false);
    });
  });
});
