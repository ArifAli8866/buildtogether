/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initiateGitHubOAuthAction,
  disconnectUserGitHubAccountAction,
  getAvailableRepositoriesAction,
  connectProjectRepositoryAction,
  disconnectProjectRepositoryAction,
  syncProjectRepositoryAction,
  createGitHubPullRequestFromReviewAction,
} from './github';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/github/api', () => ({
  getOAuthAuthorizationUrl: vi.fn(
    (state: string, redirectUri: string) =>
      `https://github.com/login/oauth/authorize?state=${state}&redirect_uri=${redirectUri}`
  ),
  listUserAccessibleRepositories: vi.fn(),
  getRepositoryDetails: vi.fn(),
  getRepositoryBranches: vi.fn(),
  registerRepositoryWebhook: vi.fn(),
  unregisterRepositoryWebhook: vi.fn(),
  createPullRequestWithChanges: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import {
  listUserAccessibleRepositories,
  getRepositoryDetails,
  getRepositoryBranches,
  registerRepositoryWebhook,
  unregisterRepositoryWebhook,
  createPullRequestWithChanges,
} from '@/lib/github/api';

describe('GitHub Server Actions', () => {
  const mockUser = { id: '11111111-1111-4111-8111-111111111111' };
  const mockOtherUser = { id: '99999999-9999-4999-8999-999999999999' };
  const projectId = '22222222-2222-4222-8222-222222222222';
  const reviewId = '33333333-3333-4333-8333-333333333333';

  const validEncryptionKey =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = validEncryptionKey;
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.GITHUB_CLIENT_ID = 'test_gh_client_id';
    process.env.GITHUB_WEBHOOK_SECRET = 'test_webhook_secret';
  });

  // ============================================================================
  // 1. OAuth Initiation
  // ============================================================================
  describe('initiateGitHubOAuthAction', () => {
    it('returns UNAUTHORIZED when no user session exists', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await initiateGitHubOAuthAction();
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('generates CSRF state, stores nonce cookie, and returns auth URL', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const cookieStore = { set: vi.fn() };
      vi.mocked(cookies).mockResolvedValue(cookieStore as any);

      const res = await initiateGitHubOAuthAction({
        projectId,
        returnPath: '/projects/test/workspace/github',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.authUrl).toContain('https://github.com/login/oauth/authorize');
        expect(cookieStore.set).toHaveBeenCalledWith(
          'bt_github_oauth_state',
          expect.any(String),
          expect.objectContaining({ httpOnly: true, maxAge: 600 })
        );
      }
    });
  });

  // ============================================================================
  // 2. Disconnect Personal GitHub Account
  // ============================================================================
  describe('disconnectUserGitHubAccountAction', () => {
    it('rejects unauthenticated caller', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await disconnectUserGitHubAccountAction();
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error.code).toBe('UNAUTHORIZED');
    });

    it('deletes user GitHub account on success', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({ delete: deleteMock }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await disconnectUserGitHubAccountAction();
      expect(res.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_github_accounts');
    });
  });

  // ============================================================================
  // 3. Available Repositories
  // ============================================================================
  describe('getAvailableRepositoriesAction', () => {
    it('rejects non-admin members with FORBIDDEN', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-project', owner_id: mockOtherUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { role: 'contributor' }, // Not admin!
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await getAvailableRepositoriesAction(projectId);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('FORBIDDEN');
      }
    });

    it('rejects when personal GitHub account is not connected', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-project', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'user_github_accounts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }), // No account
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await getAvailableRepositoriesAction(projectId);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('FORBIDDEN');
        expect(res.error.message).toContain('connect your personal GitHub account');
      }
    });

    it('fetches repositories when admin has connected GitHub account', async () => {
      const { encryptSecret } = await import('@/lib/crypto/tokens');
      const encryptedToken = encryptSecret('ghp_testToken12345');

      const mockRepos = [
        {
          id: 101,
          name: 'repo-one',
          full_name: 'test-org/repo-one',
          owner: 'test-org',
          is_private: false,
          html_url: 'https://github.com/test-org/repo-one',
          description: 'A test repo',
          default_branch: 'main',
          permissions: { admin: true, push: true, pull: true },
        },
      ];
      vi.mocked(listUserAccessibleRepositories).mockResolvedValue(mockRepos);

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-project', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'user_github_accounts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { encrypted_access_token: encryptedToken },
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await getAvailableRepositoriesAction(projectId);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toHaveLength(1);
        expect(res.data[0].full_name).toBe('test-org/repo-one');
      }
    });

    it('handles GitHub API failures and rate limits gracefully', async () => {
      const { encryptSecret } = await import('@/lib/crypto/tokens');
      const encryptedToken = encryptSecret('ghp_testToken12345');

      vi.mocked(listUserAccessibleRepositories).mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test-project', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'user_github_accounts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { encrypted_access_token: encryptedToken },
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await getAvailableRepositoriesAction(projectId);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('INTERNAL_ERROR');
        expect(res.error.message).toContain('API rate limit exceeded');
      }
    });
  });

  // ============================================================================
  // 4. Connect Project Repository
  // ============================================================================
  describe('connectProjectRepositoryAction', () => {
    it('rejects non-admin role with FORBIDDEN', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test', owner_id: mockOtherUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'project_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'contributor' } }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await connectProjectRepositoryAction({
        projectId,
        repoId: 12345,
        repoOwner: 'owner',
        repoName: 'repo',
      });

      expect(res.success).toBe(false);
      if (!res.success) expect(res.error.code).toBe('FORBIDDEN');
    });

    it('rejects when caller lacks push or admin permissions on GitHub repository', async () => {
      const { encryptSecret } = await import('@/lib/crypto/tokens');
      const encryptedToken = encryptSecret('ghp_testToken12345');

      vi.mocked(getRepositoryDetails).mockResolvedValue({
        id: 12345,
        name: 'repo',
        full_name: 'owner/repo',
        owner: 'owner',
        is_private: false,
        html_url: 'https://github.com/owner/repo',
        description: 'Test',
        default_branch: 'main',
        open_issues_count: 0,
        stars_count: 5,
        forks_count: 2,
        permissions: { admin: false, push: false, pull: true }, // Read-only!
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'user_github_accounts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { encrypted_access_token: encryptedToken },
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await connectProjectRepositoryAction({
        projectId,
        repoId: 12345,
        repoOwner: 'owner',
        repoName: 'repo',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('FORBIDDEN');
        expect(res.error.message).toContain('do not have write or admin permissions');
      }
    });

    it('successfully connects repository, registers webhook, and records activity', async () => {
      const { encryptSecret } = await import('@/lib/crypto/tokens');
      const encryptedToken = encryptSecret('ghp_testToken12345');

      vi.mocked(getRepositoryDetails).mockResolvedValue({
        id: 12345,
        name: 'repo',
        full_name: 'owner/repo',
        owner: 'owner',
        is_private: false,
        html_url: 'https://github.com/owner/repo',
        description: 'Test',
        default_branch: 'main',
        open_issues_count: 1,
        stars_count: 10,
        forks_count: 3,
        permissions: { admin: true, push: true, pull: true },
      });

      vi.mocked(registerRepositoryWebhook).mockResolvedValue({ hookId: 98765 });
      vi.mocked(getRepositoryBranches).mockResolvedValue([
        { name: 'main', commit_sha: 'sha1', protected: true },
        { name: 'develop', commit_sha: 'sha2', protected: false },
      ]);

      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'repo-record-id',
              project_id: projectId,
              repo_name: 'repo',
              repo_full_name: 'owner/repo',
            },
            error: null,
          }),
        }),
      });

      const insertActivityMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'user_github_accounts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { encrypted_access_token: encryptedToken },
                  }),
                }),
              }),
            };
          }
          if (table === 'project_github_repos') {
            return { upsert: upsertMock };
          }
          if (table === 'activity_logs') {
            return { insert: insertActivityMock };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await connectProjectRepositoryAction({
        projectId,
        repoId: 12345,
        repoOwner: 'owner',
        repoName: 'repo',
      });

      expect(res.success).toBe(true);
      expect(registerRepositoryWebhook).toHaveBeenCalled();
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: projectId,
          repo_id: 12345,
          webhook_id: 98765,
          branches_cached: ['main', 'develop'],
        }),
        { onConflict: 'project_id' }
      );
      expect(insertActivityMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'github_repo_connected',
          project_id: projectId,
        })
      );
    });
  });

  // ============================================================================
  // 5. Disconnect Project Repository
  // ============================================================================
  describe('disconnectProjectRepositoryAction', () => {
    it('unregisters webhook and deletes repo record', async () => {
      const { encryptSecret } = await import('@/lib/crypto/tokens');
      const encryptedToken = encryptSecret('ghp_testToken12345');

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const insertActivityMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'project_github_repos') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'repo-record-id',
                      repo_owner: 'owner',
                      repo_name: 'repo',
                      repo_full_name: 'owner/repo',
                      webhook_id: 98765,
                      encrypted_access_token: encryptedToken,
                    },
                  }),
                }),
              }),
              delete: deleteMock,
            };
          }
          if (table === 'activity_logs') {
            return { insert: insertActivityMock };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await disconnectProjectRepositoryAction({ projectId });

      expect(res.success).toBe(true);
      expect(unregisterRepositoryWebhook).toHaveBeenCalledWith(
        expect.any(String),
        'owner',
        'repo',
        98765
      );
      expect(deleteMock).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 6. Sync Project Repository
  // ============================================================================
  describe('syncProjectRepositoryAction', () => {
    it('syncs metadata and branches from GitHub', async () => {
      const { encryptSecret } = await import('@/lib/crypto/tokens');
      const encryptedToken = encryptSecret('ghp_testToken12345');

      vi.mocked(getRepositoryDetails).mockResolvedValue({
        id: 12345,
        name: 'repo',
        full_name: 'owner/repo',
        owner: 'owner',
        is_private: false,
        html_url: 'https://github.com/owner/repo',
        description: 'Test',
        default_branch: 'main',
        open_issues_count: 5,
        stars_count: 20,
        forks_count: 7,
      });

      vi.mocked(getRepositoryBranches).mockResolvedValue([
        { name: 'main', commit_sha: 'c1', protected: true },
        { name: 'v2', commit_sha: 'c2', protected: false },
      ]);

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'project_github_repos') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'repo-record-id',
                      repo_owner: 'owner',
                      repo_name: 'repo',
                      encrypted_access_token: encryptedToken,
                    },
                  }),
                }),
              }),
              update: updateMock,
            };
          }
          if (table === 'activity_logs') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await syncProjectRepositoryAction({ projectId });

      expect(res.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          stars_count: 20,
          forks_count: 7,
          open_issues_count: 5,
          branches_cached: ['main', 'v2'],
          sync_status: 'synced',
        })
      );
    });
  });

  // ============================================================================
  // 7. Approved Code Review to Pull Request Flow
  // ============================================================================
  describe('createGitHubPullRequestFromReviewAction', () => {
    it('HARD ARCHITECTURAL ENFORCEMENT: Rejects reviews that are NOT approved', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'code_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: reviewId,
                        status: 'review', // Under review, NOT approved!
                        title: 'Feature',
                        summary: 'Summary',
                      },
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await createGitHubPullRequestFromReviewAction({
        reviewId,
        projectId,
        branchName: 'feature/new-branch',
        prTitle: 'PR Title',
        prBody: 'PR Body',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('VALIDATION_ERROR');
        expect(res.error.message).toContain('Only approved code reviews');
      }
    });

    it('rejects duplicate PR creation if review already has github_pr_url', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'code_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: reviewId,
                        status: 'approved',
                        title: 'Feature',
                        summary: 'Summary',
                        github_pr_url: 'https://github.com/owner/repo/pull/12',
                      },
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await createGitHubPullRequestFromReviewAction({
        reviewId,
        projectId,
        branchName: 'feature/new-branch',
        prTitle: 'PR Title',
        prBody: 'PR Body',
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('VALIDATION_ERROR');
        expect(res.error.message).toContain('already been created');
      }
    });

    it('successfully pushes changes to GitHub and updates review metadata', async () => {
      const { encryptSecret } = await import('@/lib/crypto/tokens');
      const encryptedToken = encryptSecret('ghp_testToken12345');

      vi.mocked(createPullRequestWithChanges).mockResolvedValue({
        prUrl: 'https://github.com/owner/repo/pull/42',
        prNumber: 42,
        prStatus: 'open',
        headBranch: 'feature/auth-layer',
      });

      const updateReviewMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      const insertActivityMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: projectId, slug: 'test', owner_id: mockUser.id },
                  }),
                }),
              }),
            };
          }
          if (table === 'code_reviews') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: reviewId,
                        status: 'approved',
                        title: 'Approved Changes',
                        summary: 'Detailed summary',
                        base_branch: 'main',
                        target_branch: 'feature',
                        github_pr_url: null,
                      },
                    }),
                  }),
                }),
              }),
              update: updateReviewMock,
            };
          }
          if (table === 'project_github_repos') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      repo_owner: 'owner',
                      repo_name: 'repo',
                      default_branch: 'main',
                      encrypted_access_token: encryptedToken,
                    },
                  }),
                }),
              }),
            };
          }
          if (table === 'code_review_files') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { file_path: 'src/index.ts', change_type: 'modified', new_content: 'export * from "./app";' },
                  ],
                }),
              }),
            };
          }
          if (table === 'activity_logs') {
            return { insert: insertActivityMock };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const res = await createGitHubPullRequestFromReviewAction({
        reviewId,
        projectId,
        branchName: 'feature/auth-layer',
        prTitle: 'Add Auth Layer',
        prBody: 'PR Description',
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.prNumber).toBe(42);
        expect(res.data.prUrl).toBe('https://github.com/owner/repo/pull/42');
      }

      expect(createPullRequestWithChanges).toHaveBeenCalledWith(
        expect.any(String),
        'owner',
        'repo',
        expect.objectContaining({
          newBranchName: 'feature/auth-layer',
          prTitle: 'Add Auth Layer',
        })
      );

      expect(updateReviewMock).toHaveBeenCalledWith(
        expect.objectContaining({
          github_pr_url: 'https://github.com/owner/repo/pull/42',
          github_pr_number: 42,
          github_pr_status: 'open',
          github_head_branch: 'feature/auth-layer',
        })
      );

      expect(insertActivityMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'github_pull_request_created',
          project_id: projectId,
        })
      );
    });
  });
});
