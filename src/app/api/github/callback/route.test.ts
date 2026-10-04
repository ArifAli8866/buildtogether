/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/github/api', () => ({
  exchangeCodeForToken: vi.fn(),
  getAuthenticatedGitHubUser: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { exchangeCodeForToken, getAuthenticatedGitHubUser } from '@/lib/github/api';

describe('GitHub OAuth Callback Route Handler (GET /api/github/callback)', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const projectId = '22222222-2222-4222-8222-222222222222';
  const validNonce = 'test-random-nonce-12345';
  const validEncryptionKey =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = validEncryptionKey;
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  function createCallbackRequest(params: Record<string, string>): NextRequest {
    const url = new URL('http://localhost:3000/api/github/callback');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return new NextRequest(url.toString(), { method: 'GET' });
  }

  function encodeState(payload: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  it('redirects with error if GitHub OAuth returns an error', async () => {
    const cookieStore = { get: vi.fn(), delete: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(cookieStore as any);

    const req = createCallbackRequest({
      error: 'access_denied',
      error_description: 'The user has denied your application access.',
    });

    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/dashboard?error=');
    expect(location).toContain('denied');
  });

  it('redirects with error if code, state, or nonce cookie is missing', async () => {
    const cookieStore = { get: vi.fn().mockReturnValue(undefined), delete: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(cookieStore as any);

    const req = createCallbackRequest({ code: 'gh_code_123', state: 'some_state' });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(decodeURIComponent(location || '')).toContain('missing state session');
  });

  it('rejects CSRF state mismatch (state nonce does not match cookie)', async () => {
    const cookieStore = {
      get: vi.fn().mockReturnValue({ value: validNonce }),
      delete: vi.fn(),
    };
    vi.mocked(cookies).mockResolvedValue(cookieStore as any);

    const state = encodeState({
      nonce: 'different-attacker-nonce',
      userId,
      createdAt: Date.now(),
    });

    const req = createCallbackRequest({ code: 'gh_code_123', state });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('CSRF');
  });

  it('rejects expired OAuth state token (> 10 minutes)', async () => {
    const cookieStore = {
      get: vi.fn().mockReturnValue({ value: validNonce }),
      delete: vi.fn(),
    };
    vi.mocked(cookies).mockResolvedValue(cookieStore as any);

    const expiredTimestamp = Date.now() - 11 * 60 * 1000; // 11 mins ago
    const state = encodeState({
      nonce: validNonce,
      userId,
      createdAt: expiredTimestamp,
    });

    const req = createCallbackRequest({ code: 'gh_code_123', state });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('expired');
  });

  it('rejects when authenticated session does not match state userId', async () => {
    const cookieStore = {
      get: vi.fn().mockReturnValue({ value: validNonce }),
      delete: vi.fn(),
    };
    vi.mocked(cookies).mockResolvedValue(cookieStore as any);

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'other-logged-in-user-999' } },
        }),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const state = encodeState({
      nonce: validNonce,
      userId, // belongs to user1
      createdAt: Date.now(),
    });

    const req = createCallbackRequest({ code: 'gh_code_123', state });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(decodeURIComponent(location || '')).toContain('/login?error=Session mismatch');
  });

  it('exchanges code, encrypts token, upserts account, and redirects to workspace', async () => {
    const cookieStore = {
      get: vi.fn().mockReturnValue({ value: validNonce }),
      delete: vi.fn(),
    };
    vi.mocked(cookies).mockResolvedValue(cookieStore as any);

    const upsertAccountMock = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'user_github_accounts') {
          return { upsert: upsertAccountMock };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { slug: 'apollo-project' },
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      accessToken: 'gho_freshUserToken123456789',
      scope: 'read:user,repo',
      tokenType: 'bearer',
    });

    vi.mocked(getAuthenticatedGitHubUser).mockResolvedValue({
      id: 888888,
      login: 'octocat-dev',
      avatar_url: 'https://github.com/octocat-dev.png',
      name: 'Octo Cat',
      email: 'octo@github.com',
    });

    const state = encodeState({
      nonce: validNonce,
      userId,
      projectId,
      createdAt: Date.now(),
    });

    const req = createCallbackRequest({ code: 'gh_valid_code', state });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBe('http://localhost:3000/projects/apollo-project/workspace/github?connected=1');

    // Confirm that token was encrypted before upserting into user_github_accounts
    expect(upsertAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        github_user_id: 888888,
        github_username: 'octocat-dev',
        avatar_url: 'https://github.com/octocat-dev.png',
        scope: 'read:user,repo',
      }),
      { onConflict: 'user_id' }
    );

    // Verify plaintext token does NOT appear in upsert payload
    const upsertCallArg = upsertAccountMock.mock.calls[0][0];
    expect(upsertCallArg.encrypted_access_token).not.toBe('gho_freshUserToken123456789');
    expect(upsertCallArg.encrypted_access_token.split(':')).toHaveLength(3);
  });
});
